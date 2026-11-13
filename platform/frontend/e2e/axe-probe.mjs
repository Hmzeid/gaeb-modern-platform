import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.goto(process.env.GAEB_WEB_URL || "http://127.0.0.1:5173", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise(r => setTimeout(r, 700));
const inputs = await page.$$("input");
await inputs[0].type("admin"); await inputs[1].type("docs-demo-123");
await page.evaluate(() => { [...document.querySelectorAll("button")].find(b => /sign in/i.test(b.textContent || ""))?.click(); });
await new Promise(r => setTimeout(r, 1600));
await page.evaluate(() => { location.hash = "#/migration"; });
await new Promise(r => setTimeout(r, 1500));
const wide = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.right > 391 && r.width > 0 && r.left < 391) out.push(`${el.tagName}.${(el.className || "").toString().slice(0, 26)} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
    if (out.length > 10) break;
  }
  return { sw: document.documentElement.scrollWidth, out };
});
console.log(JSON.stringify(wide, null, 1));
await browser.close();
