#!/usr/bin/env node
/**
 * Phase 9 (Section 11): executive review screenshot package.
 * Captures full-resolution screens from the actual running application
 * (synthetic gaeb_docs demo data) into docs/phase9-ui-release/executive-review/.
 * Env: CHROME_PATH (required), GAEB_WEB_URL, E2E_PASSWORD.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "docs", "phase9-ui-release", "executive-review");
mkdirSync(OUT, { recursive: true });
const WEB = process.env.GAEB_WEB_URL || "http://127.0.0.1:5173";
const wait = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
await page.goto(WEB, { waitUntil: "networkidle2", timeout: 60000 });
await wait(600);
const inputs = await page.$$("input");
await inputs[0].type("admin");
await inputs[1].type(process.env.E2E_PASSWORD || "docs-demo-123");
await page.evaluate(() => { [...document.querySelectorAll("button")].find(b => /sign in/i.test(b.textContent || ""))?.click(); });
await wait(1800);

async function shot(name, view, vp = [1920, 1080]) {
  await page.setViewport({ width: vp[0], height: vp[1] });
  await page.evaluate(v => { location.hash = `#/${v}`; }, view);
  await wait(1500);
  await page.screenshot({ path: join(OUT, name), type: "png" });
  console.log("shot", name);
}
async function setLang(ar) {
  const isAr = await page.evaluate(() => document.documentElement.dir === "rtl");
  if (ar !== isAr) {
    await page.evaluate(() => { [...document.querySelectorAll("button")].find(x => /العربية|English/.test(x.textContent || ""))?.click(); });
    await wait(800);
  }
}
async function drawerShot(name, view, rowSelector = "table.dt tbody tr") {
  await shot("_tmp.png", view);
  const clicked = await page.evaluate(sel => { const tr = document.querySelector(sel); if (tr) { tr.click(); return true; } return false; }, rowSelector);
  await wait(700);
  if (clicked) await page.screenshot({ path: join(OUT, name), type: "png" });
  console.log("drawer", name, clicked ? "captured" : "NO ROW");
  await page.keyboard.press("Escape");
  await wait(400);
}

for (const [name, view] of [
  ["exec-overview.png", "overview"], ["exec-geo.png", "geo"], ["exec-map.png", "map"],
  ["exec-budget.png", "budget"], ["exec-tenders.png", "tenders"], ["exec-certificates.png", "certificates"],
  ["exec-estimates.png", "estimates"], ["exec-realestate.png", "realestate"], ["exec-reports.png", "reports"],
  ["exec-admin.png", "admin"], ["exec-migration.png", "migration"],
]) await shot(name, view);

await drawerShot("drawer-building.png", "map");
await drawerShot("drawer-certificate.png", "certificates");
await drawerShot("drawer-tender.png", "tenders");
await drawerShot("drawer-estimate.png", "estimates");

await setLang(true);
for (const [name, view] of [
  ["exec-overview-ar.png", "overview"], ["exec-geo-ar.png", "geo"], ["exec-migration-ar.png", "migration"],
  ["exec-map-ar.png", "map"], ["exec-certificates-ar.png", "certificates"],
]) await shot(name, view);
await setLang(false);

await shot("exec-overview-tablet.png", "overview", [1024, 768]);
await shot("exec-migration-tablet.png", "migration", [1024, 768]);
await shot("exec-overview-mobile.png", "overview", [390, 844]);
await shot("exec-map-mobile.png", "map", [390, 844]);
const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
console.log("mobile horizontal overflow check:", JSON.stringify(overflow));
console.log("page errors:", errors.length);
await browser.close();
