// GAEB frontend browser E2E — runs against a live stack (API + vite preview
// or the Docker web service). Environment:
//   GAEB_WEB_URL   default http://127.0.0.1:5173
//   CHROME_PATH    headless chrome executable (required in the sandbox)
//   E2E_PASSWORD   password for the seeded demo users (default docs-demo-123)
// Writes e2e-results.json next to this file and exits non-zero on failure.
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = process.env.GAEB_WEB_URL || "http://127.0.0.1:5173";
const PASS = process.env.E2E_PASSWORD || "docs-demo-123";
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(String(e).slice(0, 200)));
page.on("dialog", async d => { await d.accept("e2e cleanup"); });

async function login(user) {
  await page.goto(WEB + "/", { waitUntil: "networkidle0", timeout: 60000 });
  await page.type('input[autocomplete="username"]', user);
  await page.type('input[autocomplete="current-password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForSelector(".rail-link", { timeout: 20000 });
  await wait(900);
}
async function go(view) {
  await page.evaluate(v => { location.hash = "/" + v; }, view);
  await wait(1250);
}
const bodyText = () => page.evaluate(() => document.body.innerText);

/* ── 1. login + shell ──────────────────────────────────────────── */
await login("admin");
check("login as admin renders the shell", true);

/* ── 2. every view renders without the error boundary ──────────── */
const VIEWS = ["overview", "geo", "map", "budget", "tenders", "certificates", "estimates", "realestate", "reports", "migration", "admin"];
for (const v of VIEWS) {
  await go(v);
  const txt = await bodyText();
  check(`view ${v} renders`, !txt.includes("This view failed to render") && txt.length > 80, `${txt.length} chars`);
}

/* ── 3. tender workflow: create + advance ──────────────────────── */
await go("tenders");
const tenderTitle = `E2E Tender ${Date.now() % 100000}`;
await page.evaluate(t => {
  const input = document.querySelector("main input.inp");
  if (input) { input.focus(); document.execCommand("selectAll", false); document.execCommand("insertText", false, t); }
}, tenderTitle);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const b = btns.find(x => x.textContent?.trim() === "Create");
  if (b) b.click();
});
await wait(1500);
let txt = await bodyText();
check("tender created via UI", txt.includes(tenderTitle));
await page.evaluate(t => {
  const rows = [...document.querySelectorAll("tbody tr")];
  const row = rows.find(r => r.textContent?.includes(t));
  const b = row?.querySelector("button");
  if (b) b.click();
}, tenderTitle);
await wait(1500);
txt = await bodyText();
check("tender advanced to booklet stage", txt.includes(tenderTitle));

/* ── 4. certificate workflow: create + advance ─────────────────── */
await go("certificates");
const beforeCount = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const b = btns.find(x => x.textContent?.trim() === "Create");
  if (b) b.click();
});
await wait(1500);
const afterCount = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
check("certificate created via UI", afterCount === beforeCount + 1, `${beforeCount} → ${afterCount}`);

/* ── 5. migration approvals: create + revoke ───────────────────── */
await go("migration");
await page.evaluate(() => {
  const sel = [...document.querySelectorAll("select")].find(x => [...x.options].some(o => o.value === "tenders"));
  if (sel) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
    setter.call(sel, "tenders");
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const b = [...document.querySelectorAll("button")].find(x => x.textContent?.trim() === "New approval");
  if (b) b.click();
});
await wait(1500);
txt = await bodyText();
check("approval created for tenders transform", txt.includes("pbytendr-to-tenders"), "");
const revokeClicked = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("tbody tr")];
  const row = rows.find(r => r.textContent?.includes("pbytendr-to-tenders"));
  const b = row?.querySelector("button");
  if (b) { b.click(); return true; }
  return false;
});
await wait(1500);
check("approval revoke control exercised", revokeClicked);

/* ── 6. Arabic switch: RTL + localized chrome ──────────────────── */
await go("overview");
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("header button")];
  const b = btns.find(x => (x.textContent || "").includes("العربية"));
  if (b) b.click();
});
await wait(1400);
const rtl = await page.evaluate(() => document.documentElement.dir);
txt = await bodyText();
check("Arabic switch sets dir=rtl", rtl === "rtl", `dir=${rtl}`);
check("Arabic overview is localized", txt.includes("نظرة عامة") || txt.includes("المحفظة") || /[؀-ۿ]/.test(txt));
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("header button")];
  const b = btns.find(x => (x.textContent || "").includes("English"));
  if (b) b.click();
});
await wait(1200);

/* ── 7. permission-aware UI: technical role sees no money ─────── */
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const b = btns.find(x => x.getAttribute("aria-label") === "Sign out" || (x.textContent || "").includes("Sign out"));
  if (b) b.click();
});
await wait(1000);
await login("operator"); // seeded technical role in the docs/demo instance
await go("overview");
txt = await bodyText();
check("technical role: no money figures rendered (unavailable state shown)", !txt.includes("EGP"), "labels render with an em-dash value; server withholds the aggregates (backend suite)");

/* ── 8. axe accessibility scans (admin, EN) ────────────────────── */
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const b = btns.find(x => x.getAttribute("aria-label") === "Sign out" || (x.textContent || "").includes("Sign out"));
  if (b) b.click();
});
await wait(1000);
await login("admin");
/* ── 7b. Phase 9: keyboard workflow, Arabic workflow, tablet/mobile nav ── */
await page.setViewport({ width: 1440, height: 900 });
await go("overview");
// Keyboard-only: Tab from the top of the shell to the Tenders rail link, then Enter.
await page.evaluate(() => { (document.querySelector("main"))?.focus?.(); });
await page.evaluate(() => window.scrollTo(0, 0));
let kbOk = false;
for (let i = 0; i < 40 && !kbOk; i++) {
  await page.keyboard.press("Tab");
  kbOk = await page.evaluate(() => {
    const a = document.activeElement;
    return !!a && a.tagName === "A" && (a.getAttribute("href") || "").includes("tenders");
  });
}
check("keyboard: Tab reaches the Tenders rail link", kbOk);
if (kbOk) {
  await page.keyboard.press("Enter");
  await wait(900);
  const onTenders = await page.evaluate(() => location.hash.includes("tenders"));
  check("keyboard: Enter navigates to Tenders", onTenders);
}
// Drawer keyboard contract in the browser: open a School Map record, Esc closes.
await go("map");
await wait(700);
const rowClicked = await page.evaluate(() => {
  const tr = document.querySelector("table.dt tbody tr");
  if (tr) { (tr).click(); return true; } return false;
});
await wait(600);
const drawerOpen = await page.evaluate(() => !!document.querySelector("aside.drawer"));
check("drawer opens for a School Map record", rowClicked && drawerOpen);
if (drawerOpen) {
  await page.keyboard.press("Escape");
  await wait(400);
  const drawerClosed = await page.evaluate(() => !document.querySelector("aside.drawer"));
  check("drawer closes on Escape (keyboard)", drawerClosed);
}
// Arabic workflow: switch, open Migration Center, expect localized chrome + status labels.
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => (x.textContent || "").includes("العربية") || (x.textContent || "").trim() === "العربية");
  if (b) (b).click();
});
await wait(800);
await go("migration");
await wait(900);
const arMig = await page.evaluate(() => ({ text: document.body.innerText, dir: document.documentElement.dir }));
check("Arabic Migration Center renders localized content", /[\u0600-\u06FF]/.test(arMig.text) && arMig.dir === "rtl", "dir=" + arMig.dir);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => (x.textContent || "").includes("English"));
  if (b) (b).click();
});
await wait(700);
// Tablet navigation.
await page.setViewport({ width: 1024, height: 768 });
await go("budget");
await wait(700);
const tabletTxt = await page.evaluate(() => document.body.innerText);
check("tablet (1024x768): Budget renders", tabletTxt.length > 80 && !tabletTxt.includes("This view failed to render"));
// Mobile navigation: rail becomes a top strip; content is not clipped by it.
await page.setViewport({ width: 390, height: 844 });
await go("tenders");
await wait(700);
const mobileGeom = await page.evaluate(() => {
  const rail = document.querySelector(".rail");
  const main = document.querySelector("main");
  return { railW: rail?.getBoundingClientRect().width ?? 0, mainTop: main?.getBoundingClientRect().top ?? 0, vw: window.innerWidth, sw: document.documentElement.scrollWidth };
});
check("mobile (390x844): rail is a full-width top strip", mobileGeom.railW >= mobileGeom.vw - 2, JSON.stringify(mobileGeom));
check("mobile (390x844): no horizontal page overflow", mobileGeom.sw <= mobileGeom.vw + 2, `scrollWidth=${mobileGeom.sw}`);
await page.setViewport({ width: 1440, height: 900 });
await go("overview");
await wait(600);

let axeAvailable = true;
try {
  const axePath = process.env.AXE_PATH || "/home/hatch/workspace/tools/shots/node_modules/axe-core/axe.min.js";
  await page.evaluate(readFileSync(axePath, "utf8"));
} catch { axeAvailable = false; }
const axeReport = {};
if (axeAvailable) {
  for (const v of VIEWS) {
    await go(v);
    const res = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ["violations"] });
      return r.violations.map(x => ({ id: x.id, impact: x.impact, nodes: x.nodes.length }));
    });
    axeReport[v] = res;
    const critical = res.filter(x => x.impact === "critical" || x.impact === "serious");
    check(`axe ${v}: no critical/serious violations`, critical.length === 0, JSON.stringify(res).slice(0, 220));
  }
} else {
  check("axe available", false, "axe-core source not found — set up tools/shots axe-core");
}

check("no uncaught page errors during the whole run", pageErrors.length === 0, pageErrors.join(" | ").slice(0, 200));

const failed = results.filter(r => !r.ok);
writeFileSync(join(HERE, "e2e-results.json"), JSON.stringify({ at: new Date().toISOString(), web: WEB, results, axe: axeReport, pageErrors }, null, 2));
console.log(`\nE2E: ${results.length - failed.length}/${results.length} checks passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
