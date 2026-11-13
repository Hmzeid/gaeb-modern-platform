import { useEffect, useState } from "react";
import { api, apiRaw, type MigBatch, type MigReject } from "./api";
import { INTAKE_STAGES } from "./i18n";
import { fmtInt } from "./format";
import { Panel, StatusChip, Empty } from "./components";
import type { Ctx } from "./views-dash";

const JOB_NEXT: Record<string, string[]> = {
  QUEUED: ["VALIDATING", "CANCELLED"], VALIDATING: ["RUNNING", "FAILED", "CANCELLED"],
  RUNNING: ["RECONCILING", "FAILED", "CANCELLED", "RECOVERING"], RECONCILING: ["COMPLETED", "FAILED", "CANCELLED"],
  RECOVERING: ["QUEUED", "RUNNING", "FAILED", "CANCELLED"], FAILED: ["QUEUED", "CANCELLED"], COMPLETED: [], CANCELLED: [],
};
const TRANSFORMS = ["buildings", "tenders", "expropriation", "certificates"];

export function MigrationView(ctx: Ctx & { goMap: () => void }) {
  const { t, lang } = ctx;
  const [inv, setInv] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [batches, setBatches] = useState<MigBatch[]>([]);
  const [rejects, setRejects] = useState<MigReject[]>([]);
  const [batchSel, setBatchSel] = useState("");
  const [approvals, setApprovals] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [recon, setRecon] = useState<any>(null);
  const [intake, setIntake] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [member, setMember] = useState("PBLBULDG");
  const [file, setFile] = useState<ArrayBuffer | null>(null);
  const [fix, setFix] = useState("");
  const [fixId, setFixId] = useState<number | null>(null);
  const [liveBatch, setLiveBatch] = useState("");
  const [liveProg, setLiveProg] = useState<any>(null);
  const [liveOn, setLiveOn] = useState(false);
  const [appr, setAppr] = useState({ transform: "buildings", mode: "demo", evidenceRef: "" });
  const [jobForm, setJobForm] = useState({ member: "PBLBULDG", layoutName: "pblbuldg", sourceSha256: "" });

  const load = async () => {
    try {
      setInv(await api("/api/migration/inventory"));
      setBatches(await api("/api/migration/batches"));
      setApprovals(await api("/api/migration/approvals"));
    } catch (e: any) { ctx.notify(e.message, true); }
    try { setIntake(await api("/api/migration/intake")); } catch { setIntake([]); }
    try { setMetrics(await api("/api/migration/metrics")); } catch { setMetrics(null); }
    try { setJobs(await api("/api/migration/jobs")); } catch { setJobs([]); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!liveOn || !liveBatch) return;
    let stop = false;
    const tick = async () => {
      try { const p = await api(`/api/migration/batches/${encodeURIComponent(liveBatch)}/progress`); if (!stop) setLiveProg(p); }
      catch { if (!stop) setLiveProg(null); }
    };
    tick();
    const iv = setInterval(tick, 2000);
    return () => { stop = true; clearInterval(iv); };
  }, [liveOn, liveBatch]);

  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); await load(); } catch (e: any) { ctx.notify(`${t.err}: ${e.message || e}`, true); }
  };
  const invCounts = inv ? Object.entries(inv.items.reduce((m: any, i: any) => ((m[i.status] = (m[i.status] || 0) + 1), m), {})).map(([k, v]) => `${k}: ${v}`).join(" · ") : "…";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* inventory + import */}
      <Panel title={`${t.migration} — ${t.inventory}`} hint={inv ? `${fmtInt(inv.total, lang)} ${t.objects} — ${invCounts}` : ""}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label className="fld" style={{ minWidth: 260 }}>{t.chooseFile} (PBLBULDG)
            <input type="file" onChange={async e => { const f = e.target.files?.[0]; setFile(f ? await f.arrayBuffer() : null); }} />
          </label>
          <button className="btn sec" disabled={!file} onClick={() => act(async () => setPreview(await apiRaw("/api/migration/preview?layout=pblbuldg", file!)))}>{t.preview}</button>
          <button className="btn teal" disabled={!file} onClick={() => act(async () => {
            const r: any = await apiRaw("/api/migration/import?layout=pblbuldg", file!);
            setMsg(`batch ${r.batchId}: loaded ${r.loaded}, rejected ${r.rejected.length}, staged ${r.stagedRowsForBatch}${r.alreadyRecorded ? " (already recorded — retry changed nothing)" : ""}`);
            setLiveBatch(r.batchId);
          })}>{t.runImport}</button>
        </div>
        {msg && <p style={{ fontSize: 13, margin: "10px 0 0" }}>{msg}</p>}
        {preview && <>
          <h4 style={{ margin: "14px 0 6px", fontSize: 13 }}>{t.preview} — batch {preview.batchId}</h4>
          <div style={{ overflowX: "auto" }}>
            <table className="dt"><thead><tr>{Object.keys(preview.preview[0] ?? {}).map(k => <th key={k}>{k}</th>)}</tr></thead>
              <tbody>{preview.preview.map((r: any, i: number) => <tr key={i}>{Object.values(r).map((v: any, j: number) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody></table>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--color-ink2)" }}>{t.control_totals}: {JSON.stringify(preview.controlTotals)} · {t.source_totals}: {JSON.stringify(preview.sourceTotals)} · {t.rejects}: {preview.rejected.length}</p>
        </>}
      </Panel>

      {/* live monitor + operations */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))", gap: 14 }}>
        <div className="dark" style={{ padding: "14px 16px" }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 13.5 }}>{t.live_monitor}</h4>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="inp" style={{ background: "#0e2138", borderColor: "#1c3658", color: "#eaf1fd" }} placeholder="batch id" value={liveBatch} onChange={e => setLiveBatch(e.target.value)} />
            <button className="btn teal" onClick={() => setLiveOn(!liveOn)}>{liveOn ? t.stop : t.watch}</button>
          </div>
          {liveProg && (
            <div aria-live="polite" style={{ marginTop: 12, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b style={{ color: "#fff" }}>{liveProg.batchId}</b>
                <span>{liveProg.status}{liveProg.percentComplete !== null && liveProg.percentComplete !== undefined ? ` · ${liveProg.percentComplete}%` : ""}</span>
              </div>
              <div className="prog" style={{ background: "#1c3658", margin: "8px 0" }}><i style={{ width: `${liveProg.percentComplete ?? 0}%` }} /></div>
              <div style={{ color: "#a9bcdf" }}>
                {t.processed} {fmtInt(liveProg.processed, lang)} · {t.accepted} {fmtInt(liveProg.loaded, lang)} · {t.quarantined} {fmtInt(liveProg.rejected, lang)} · checkpoint {fmtInt(liveProg.checkpointRecord, lang)} · keys {fmtInt(liveProg.keysIndexed, lang)}
              </div>
              <div style={{ color: "#7e97bb", fontSize: 12 }}>
                {liveProg.recordsPerSec ? `${liveProg.recordsPerSec} rec/s` : ""}{liveProg.etaSeconds ? ` · ETA ~${liveProg.etaSeconds}s` : ""}
              </div>
            </div>
          )}
        </div>
        {metrics && (
          <Panel title={t.operations}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, textAlign: "center" }}>
              {([[t.batches, metrics.batches], [t.accepted, metrics.recordsLoaded], [t.quarantined, metrics.recordsRejected],
                 ["keys", metrics.indexedKeys], [t.approvals, metrics.activeApprovals], [t.jobs, (metrics.jobsByState ?? []).reduce((a: number, x: any) => a + x.n, 0)]] as const).map(([l, v]) => (
                <div key={l} style={{ background: "#f7fafd", borderRadius: 9, padding: "10px 6px" }}>
                  <div style={{ fontSize: 19, fontWeight: 800 }}>{fmtInt(v, lang)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-ink2)" }}>{l}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--color-ink2)", margin: "10px 0 0" }}>
              {t.intake}: {(metrics.intakeByStage ?? []).map((x: any) => `${x.stage} ${x.n}`).join(" · ") || "—"}<br />
              {t.jobs}: {(metrics.jobsByState ?? []).map((x: any) => `${x.state} ${x.n}`).join(" · ") || "—"}
            </p>
          </Panel>
        )}
      </div>

      {/* batches */}
      <Panel title={t.batches}>
        {batches.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>{t.batch}</th><th>{t.layout}</th><th className="num">{t.total}</th><th className="num">{t.accepted}</th><th className="num">{t.quarantined}</th><th>{t.actions}</th></tr></thead>
            <tbody>{batches.map(b => (
              <tr key={b.batch_id} className={batchSel === b.batch_id ? "sel" : ""}>
                <td className="money" style={{ fontSize: 12 }}>{b.batch_id}</td><td>{b.layout_name}</td>
                <td className="num">{fmtInt(b.total_records, lang)}</td><td className="num">{fmtInt(b.loaded, lang)}</td><td className="num">{fmtInt(b.rejected, lang)}</td>
                <td><span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn sm sec" onClick={() => act(async () => { setBatchSel(b.batch_id); setRejects(await api(`/api/migration/batches/${b.batch_id}/rejects`)); })}>{t.rejects}</button>
                  <button className="btn sm sec" onClick={() => act(async () => { const r: any = await api("/api/migration/transform", { method: "POST", body: JSON.stringify({ name: "buildings", batchId: b.batch_id }) }); setMsg(`transform buildings on ${b.batch_id}: inserted ${r.inserted}`); })}>{t.transform}</button>
                  <button className="btn sm sec" onClick={() => act(async () => setRecon(await api(`/api/migration/batches/${b.batch_id}/reconciliation`)))}>{t.reconciliation}</button>
                </span></td>
              </tr>))}
            </tbody></table>
        )}
        {batchSel && <>
          <h4 style={{ margin: "16px 0 6px", fontSize: 13 }}>{t.rejects} — {batchSel}</h4>
          {rejects.length === 0 ? <Empty text={t.empty} /> : (
            <table className="dt"><thead><tr><th>#</th><th>Offset</th><th>{t.reason}</th><th>{t.actions}</th></tr></thead>
              <tbody>{rejects.map(r => (
                <tr key={r.id}><td>{r.id}</td><td>{r.record_offset}</td><td style={{ fontSize: 12.5 }}>{r.reason}{r.resubmitted_batch ? ` → ${r.resubmitted_batch}` : ""}</td>
                  <td>{!r.resubmitted_batch && <button className="btn sm sec" onClick={() => { setFixId(r.id); setFix('{"BLCD":"","SHNM":"","VGCD":""}'); }}>{t.resubmit}</button>}</td></tr>))}
              </tbody></table>
          )}
          {fixId !== null && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input className="inp" style={{ flex: 1 }} value={fix} onChange={e => setFix(e.target.value)} aria-label={t.resubmit} />
              <button className="btn sm" onClick={() => act(async () => { await api(`/api/migration/rejects/${fixId}/resubmit`, { method: "POST", body: JSON.stringify({ values: JSON.parse(fix) }) }); setFixId(null); setRejects(await api(`/api/migration/batches/${batchSel}/rejects`)); })}>{t.resubmit} #{fixId}</button>
            </div>
          )}
          <p style={{ marginTop: 12 }}><button className="btn sec sm" onClick={ctx.goMap}>{t.viewInModule} →</button></p>
        </>}
      </Panel>

      {/* reconciliation */}
      {recon && (
        <Panel title={`${t.reconciliation} — ${recon.batchId}`}>
          <p style={{ fontSize: 13, margin: "0 0 8px" }}>
            {t.source} {fmtInt(recon.sourceRecords, lang)} = {t.accepted} {fmtInt(recon.loadedRecords, lang)} + {t.quarantined} {fmtInt(recon.quarantinedRecords, lang)} · {t.equation}: {String(recon.countEquationHolds)} · {t.duplicates}: {fmtInt(recon.duplicateOccurrences, lang)} · {t.runs}: {recon.runs}
          </p>
          <p style={{ fontSize: 12.5, color: "var(--color-ink2)" }}>{t.control_totals}: {JSON.stringify(recon.controlTotals)} · {t.source_totals}: {JSON.stringify(recon.sourceTotals)}</p>
          <table className="dt"><thead><tr><th>{t.reason}</th><th className="num">{t.quarantined}</th></tr></thead>
            <tbody>{recon.quarantineReasons.map((q: any, i: number) => <tr key={i}><td>{q.reason}</td><td className="num">{q.count}</td></tr>)}</tbody></table>
        </Panel>
      )}

      {/* approvals */}
      <Panel title={t.approvals}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", marginBottom: 12 }}>
          <label className="fld" style={{ width: 170 }}>{t.transformName}
            <select className="sel-inp" value={appr.transform} onChange={e => setAppr({ ...appr, transform: e.target.value })}>
              {TRANSFORMS.map(x => <option key={x} value={x}>{x}</option>)}
            </select></label>
          <label className="fld" style={{ width: 120 }}>{t.mode}
            <select className="sel-inp" value={appr.mode} onChange={e => setAppr({ ...appr, mode: e.target.value })}>
              <option value="demo">demo</option><option value="customer">customer</option>
            </select></label>
          <label className="fld" style={{ width: 240 }}>{t.evidence}
            <input className="inp" value={appr.evidenceRef} onChange={e => setAppr({ ...appr, evidenceRef: e.target.value })} /></label>
          <button className="btn sm" onClick={() => act(() => api("/api/migration/approvals", { method: "POST", body: JSON.stringify(appr) }))}>{t.approve_new}</button>
        </div>
        {approvals.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>{t.member}</th><th>{t.field}</th><th>{t.transformName}</th><th>{t.approvedBy}</th><th>{t.evidence}</th><th>{t.actions}</th></tr></thead>
            <tbody>{approvals.map((x, i) => (
              <tr key={i}><td>{x.legacy_member}</td><td>{x.legacy_field}</td><td>{x.transform_name}</td>
                <td>{x.approved_by}</td><td style={{ fontSize: 12.5 }}>{x.evidence_ref}</td>
                <td><button className="btn sm danger" onClick={() => act(async () => {
                  const reason = window.prompt(t.reason + ":"); if (!reason) return;
                  const short = String(x.transform_name).split("-to-")[1] ?? x.transform_name;
                  await api("/api/migration/approvals/revoke", { method: "POST", body: JSON.stringify({ transform: short, reason }) });
                })}>{t.revoke}</button></td></tr>))}
            </tbody></table>
        )}
      </Panel>

      {/* import jobs */}
      <Panel title={t.jobs}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", marginBottom: 12 }}>
          <label className="fld" style={{ width: 150 }}>{t.member}<input className="inp" value={jobForm.member} onChange={e => setJobForm({ ...jobForm, member: e.target.value })} /></label>
          <label className="fld" style={{ width: 150 }}>{t.layout}<input className="inp" value={jobForm.layoutName} onChange={e => setJobForm({ ...jobForm, layoutName: e.target.value })} /></label>
          <label className="fld" style={{ width: 260 }}>SHA-256<input className="inp" value={jobForm.sourceSha256} onChange={e => setJobForm({ ...jobForm, sourceSha256: e.target.value })} /></label>
          <button className="btn sm" onClick={() => act(() => api("/api/migration/jobs", { method: "POST", body: JSON.stringify({ member: jobForm.member, layoutName: jobForm.layoutName, sourceSha256: jobForm.sourceSha256 || undefined }) }))}>{t.create}</button>
        </div>
        {jobs.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>#</th><th>{t.member}</th><th>{t.layout}</th><th>{t.state}</th><th>{t.actions}</th></tr></thead>
            <tbody>{jobs.map(j => (
              <tr key={j.id}><td>{j.id}</td><td>{j.member}</td><td>{j.layout_name}</td><td><StatusChip s={j.state} t={t} /></td>
                <td><span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                  {(j.state === "QUEUED" || j.state === "RECOVERING") && <button className="btn sm sec" onClick={() => act(() => api(`/api/migration/jobs/${j.id}/claim`, { method: "POST", body: JSON.stringify({ worker: "ui-console" }) }))}>{t.claim}</button>}
                  {(JOB_NEXT[j.state] ?? []).map(to => (
                    <button key={to} className="btn sm sec" onClick={() => act(() => api(`/api/migration/jobs/${j.id}/transition`, { method: "POST", body: JSON.stringify({ to }) }))}>{t.transition} → {to}</button>
                  ))}
                </span></td></tr>))}
            </tbody></table>
        )}
      </Panel>

      {/* intake */}
      <Panel title={t.intake}>
        <div style={{ display: "flex", gap: 10, alignItems: "end", marginBottom: 12 }}>
          <label className="fld" style={{ width: 180 }}>{t.member}<input className="inp" value={member} onChange={e => setMember(e.target.value)} /></label>
          <button className="btn sm" onClick={() => act(() => api("/api/migration/intake", { method: "POST", body: JSON.stringify({ member, dataClass: "customer" }) }))}>{t.registerDataset}</button>
        </div>
        {intake.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>#</th><th>{t.member}</th><th>{t.class}</th><th>{t.stage}</th><th>{t.by}</th><th>{t.actions}</th></tr></thead>
            <tbody>{intake.map(d => (
              <tr key={d.id}><td>{d.id}</td><td>{d.member}</td><td>{d.data_class}</td><td><StatusChip s={d.stage} t={t} /></td><td>{d.created_by}</td>
                <td>{!["accepted", "rejected"].includes(d.stage) && <button className="btn sm sec" onClick={() => act(async () => {
                  const ev = window.prompt(`${t.evidence}:`); if (!ev) return;
                  const to = INTAKE_STAGES[INTAKE_STAGES.indexOf(d.stage) + 1];
                  await api(`/api/migration/intake/${d.id}/advance`, { method: "POST", body: JSON.stringify({ to, evidence: ev }) });
                })}>{t.advance} →</button>}</td></tr>))}
            </tbody></table>
        )}
      </Panel>
    </div>
  );
}
