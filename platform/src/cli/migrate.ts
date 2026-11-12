import { readFileSync } from "node:fs";
import { pool } from "../db.js";
const sql = readFileSync(new URL("../../migrations/001_operational_schema.sql", import.meta.url), "utf8");
await pool.query(sql);
console.log("operational schema applied");
await pool.end();
