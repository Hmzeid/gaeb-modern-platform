// Record mapping approvals through the authenticated API. The approver identity is
// the session behind GAEB_API_TOKEN — there is deliberately no --by flag and no direct
// database write path: self-declared approver names are not accepted anywhere.
// Usage: GAEB_API_URL=http://localhost:8080 GAEB_API_TOKEN=<session token> \
//   node approve-mapping.js <buildings|tenders|expropriation|certificates> --mode demo|customer --evidence "reference"
const args = process.argv.slice(2);
const transform = args[0];
const mode = args.includes("--mode") ? args[args.indexOf("--mode") + 1] : "demo";
const evidenceRef = args.includes("--evidence") ? args[args.indexOf("--evidence") + 1] : "";
const url = process.env.GAEB_API_URL, token = process.env.GAEB_API_TOKEN;
if (!transform || !url || !token) { console.error("usage: approve-mapping <transform> --mode demo|customer --evidence REF  (env: GAEB_API_URL, GAEB_API_TOKEN)"); process.exit(1); }
const res = await fetch(`${url}/api/migration/approvals`, { method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ transform, mode, evidenceRef }) });
const body = await res.json().catch(() => ({}));
if (!res.ok) { console.error(`approval refused: HTTP ${res.status} ${body.error ?? ""}`); process.exit(1); }
console.log(`approved via API: ${JSON.stringify(body)}`);
