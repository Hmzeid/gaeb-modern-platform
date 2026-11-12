import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
const base = "postgres://gaeb@127.0.0.1:54399";
const p0 = new pg.Pool({ connectionString: `${base}/postgres` });
try { await p0.query("CREATE DATABASE gaeb_recovery"); } catch (e) { if (!/already exists/.test(e.message)) throw e; }
await p0.end();
const p = new pg.Pool({ connectionString: `${base}/gaeb_recovery` });
for (const f of readdirSync(new URL("../migrations/", import.meta.url)).filter(x => x.endsWith(".sql")).sort())
  await p.query(readFileSync(new URL(`../migrations/${f}`, import.meta.url), "utf8"));
await p.query(readFileSync(new URL("../../migration/reconciled/schema_v2.sql", import.meta.url), "utf8"));
console.log("gaeb_recovery schema applied");
await p.end();
