import { readFileSync, readdirSync } from "node:fs";
import { pool } from "../db.js";
const dir = new URL("../../migrations/", import.meta.url);
for (const f of readdirSync(dir).filter(x => x.endsWith(".sql")).sort()) {
  await pool.query(readFileSync(new URL(f, dir), "utf8"));
  console.log("applied", f);
}
await pool.end();
