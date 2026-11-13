#!/usr/bin/env node
/**
 * Phase 9 (A2): automated visual regression.
 *
 * Captures deterministic screenshots of the running application and
 * diffs them against reviewed baselines in e2e/baselines/.
 *
 *   node e2e/visual.mjs            compare against baselines
 *   node e2e/visual.mjs --update   (re)write baselines after review
 *
 * Determinism controls: fixed viewports, animations/transitions
 * disabled by injected CSS, network-idle waits, the seeded synthetic
 * demo dataset (gaeb_docs). A diff above the threshold writes a
 * side-by-side diff artifact to e2e/visual-diffs/ and fails the run.
 * Baselines are NEVER updated implicitly — a human reviews the diff
 * and re-runs with --update, which is the documented review process.
 *
 * Env: CHROME_PATH (required), GAEB_WEB_URL (default 127.0.0.1:5173),
 * E2E_PASSWORD (default docs-demo-123).
 */
import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, "baselines");
const DIFFS = join(HERE, "visual-diffs");
const WEB = process.env.GAEB_WEB_URL || "http://127.0.0.1:5173";
const UPDATE = process.argv.includes("--update");
const THRESHOLD_PCT = 0.5; // max differing pixels, percent of frame

const VIEWS = ["overview", "geo", "map", "budget", "tenders", "certificates", "estimates", "realestate", "reports", "migration", "admin"];
const SHOTS = [
  ...VIEWS.map(v => ({ name: `${v}-en-desktop`, view: v, lang: "en", vp: [1440, 900] })),
  ...VIEWS.map(v => ({ name: `${v}-ar-desktop`, view: v, lang: "ar", vp: [1440, 900] })),
  ...["overview", "geo", "map", "migration"].map(v => ({ name: `${v}-en-tablet`, view: v, lang: "en", vp: [1024, 768] })),
  ...["overview", "migration"].map(v => ({ name: `${v}-ar-tablet`, view: v, lang: "ar", vp: [1024, 768] })),
  ...["overview", "map", "migration"].map(v => ({ name: `${v}-en-mobile`, view: v, lang: "en", vp: [390, 844] })),
];
const wait = ms => new Promise(r => setTimeout(r, ms));

mkdirSync(BASE, { recursive: true });
mkdirSync(DIFFS, { recursive: true });

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto(WEB, { waitUntil: "networkidle2", timeout: 60000 });
await wait(600);
const inputs = await page.$$("input");
await inputs[0].type("admin");
await inputs[1].type(process.env.E2E_PASSWORD || "docs-demo-123");
await page.evaluate(() => { [...document.querySelectorAll("button")].find(b => /sign in/i.test(b.textContent || ""))?.click(); });
await wait(1800);
await page.evaluate(() => {
  const st = document.createElement("style");
  st.textContent = "* { animation: none !important; transition: none !important; caret-color: transparent !important; }";
  document.head.appendChild(st);
});

async function setLang(lang) {
  const cur = await page.evaluate(() => document.documentElement.lang || (document.documentElement.dir === "rtl" ? "ar" : "en"));
  const isAr = await page.evaluate(() => document.documentElement.dir === "rtl");
  if ((lang === "ar") !== isAr) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find(x => /العربية|English/.test(x.textContent || ""));
      if (b) b.click();
    });
    await wait(700);
  }
  return cur;
}

let pass = 0, fail = 0, written = 0;
const failures = [];
for (const shot of SHOTS) {
  await page.setViewport({ width: shot.vp[0], height: shot.vp[1] });
  await setLang(shot.lang);
  await page.evaluate(v => { location.hash = `#/${v}`; }, shot.view);
  await wait(1400);
  const buf = await page.screenshot({ type: "png" });
  const file = join(BASE, `${shot.name}.png`);
  if (UPDATE || !existsSync(file)) {
    writeFileSync(file, buf);
    written++;
    console.log(`BASELINE  ${shot.name}`);
    continue;
  }
  const base = PNG.sync.read(readFileSync(file));
  const cur = PNG.sync.read(buf);
  if (base.width !== cur.width || base.height !== cur.height) {
    fail++; failures.push(`${shot.name}: size changed ${base.width}x${base.height} -> ${cur.width}x${cur.height}`);
    console.log(`FAIL      ${shot.name} (size changed)`);
    continue;
  }
  const diff = new PNG({ width: base.width, height: base.height });
  const n = pixelmatch(base.data, cur.data, diff.data, base.width, base.height, { threshold: 0.12 });
  const pct = (n / (base.width * base.height)) * 100;
  if (pct > THRESHOLD_PCT) {
    fail++; failures.push(`${shot.name}: ${pct.toFixed(2)}% pixels differ`);
    writeFileSync(join(DIFFS, `${shot.name}.diff.png`), PNG.sync.write(diff));
    writeFileSync(join(DIFFS, `${shot.name}.current.png`), buf);
    console.log(`FAIL      ${shot.name} (${pct.toFixed(2)}% > ${THRESHOLD_PCT}%)`);
  } else {
    pass++;
    console.log(`PASS      ${shot.name} (${pct.toFixed(2)}%)`);
  }
}
await browser.close();
console.log(`\nVISUAL: ${pass} pass, ${fail} fail, ${written} baselines written (${SHOTS.length} shots)`);
if (failures.length) console.log("Failures:\n - " + failures.join("\n - "));
process.exit(fail ? 1 : 0);
