import pg from "pg";
import { TRANSFORMS, transformHash } from "../migration/transform.js";

// Record authenticated mapping approvals for a transform. Run by an administrator who
// has reviewed the mapping against the mapping register and the source evidence.
// Usage: DATABASE_URL=... node approve-mapping.js <buildings|tenders|expropriation|certificates> --by "Name (role)" --evidence "register ref / sign-off ref"
// The approval binds the approver + evidence to the hash of the CURRENT transform
// definition; if the definition changes afterwards, the transform refuses to run
// until it is re-approved.
const args = process.argv.slice(2);
const name = args[0];
const by = args.includes("--by") ? args[args.indexOf("--by") + 1] : undefined;
const evidence = args.includes("--evidence") ? args[args.indexOf("--evidence") + 1] : "";
const spec = TRANSFORMS[name];
if (!spec || !by) { console.error("usage: approve-mapping <transform> --by NAME --evidence REF"); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required"); process.exit(1); }
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const hash = transformHash(spec);
  for (const f of spec.fields)
    await client.query(`INSERT INTO mig.mapping_approvals (legacy_member, legacy_field, target_table, target_column, transform_name, transform_hash, approved_by, evidence_ref)
      VALUES ($1,$2,'app',$3,$4,$5,$6,$7)
      ON CONFLICT (legacy_member, legacy_field, transform_name) DO UPDATE SET transform_hash = EXCLUDED.transform_hash, approved_by = EXCLUDED.approved_by, evidence_ref = EXCLUDED.evidence_ref, approved_at = now(), target_column = EXCLUDED.target_column`,
      [spec.legacyMember, f.legacy, f.target, spec.name, hash, by, evidence]);
  console.log(`approved ${spec.fields.length} field mapping(s) for ${spec.name} by ${by} (hash ${hash.slice(0, 12)}…)`);
} finally { await client.end(); }
