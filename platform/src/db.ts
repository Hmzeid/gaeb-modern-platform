import pg from "pg";
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export async function audit(userId: number | null, action: string, entity: string, entityId: string, detail: object = {}) {
  await pool.query("INSERT INTO app.audit_log (user_id, action, entity, entity_id, detail) VALUES ($1,$2,$3,$4,$5)",
    [userId, action, entity, entityId, JSON.stringify(detail)]);
}
