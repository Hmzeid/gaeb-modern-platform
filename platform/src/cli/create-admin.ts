import { pool } from "../db.js";
import { hashPassword } from "../auth.js";
const [username, password] = process.argv.slice(2);
if (!username || !password) { console.error("usage: create-admin <username> <password(min 10 chars)>"); process.exit(1); }
await pool.query("INSERT INTO app.users (username, password_hash, role, name_en) VALUES ($1,$2,'admin',$1) ON CONFLICT (username) DO NOTHING",
  [username, hashPassword(password)]);
console.log(`admin user '${username}' ensured (no-op if it already existed)`);
await pool.end();
