import { useEffect, useMemo, useState } from "react";
import { api, getToken, type BudgetUtil, type CertSummary, type GovBuildings } from "./api";
import { fmtInt, fmtMoney, fmtPct, fmtDateTime } from "./format";
import { Chart, Panel, StatusChip, Empty } from "./components";
import type { Ctx } from "./views-dash";

/* ═══════════════ REPORTS & ANALYTICS ═══════════════ */
export function ReportsView(ctx: Ctx) {
  const { t, lang } = ctx;
  const [budgetUtil, setBudgetUtil] = useState<BudgetUtil[]>([]);
  const [certSummary, setCertSummary] = useState<CertSummary[]>([]);
  const [govs, setGovs] = useState<GovBuildings[]>([]);
  useEffect(() => {
    (async () => {
      try { setBudgetUtil(await api("/api/reports/budget-utilization")); } catch (e: any) { ctx.notify(e.message, true); }
      try { setCertSummary(await api("/api/reports/certificates-summary")); } catch { /* finance-gated */ }
      try { setGovs(await api("/api/reports/buildings-by-governorate")); } catch { /* optional */ }
    })();
  }, []);

  const downloadCsv = async () => {
    const res = await fetch("/api/reports/budget-utilization.csv", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) { ctx.notify(`CSV: HTTP ${res.status}`, true); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = "budget-utilization.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const govOption = useMemo(() => {
    const top = [...govs].filter(g => g.buildings > 0).sort((a, b) => b.buildings - a.buildings).slice(0, 12);
    return {
      grid: { left: 6, right: 26, top: 4, bottom: 0, containLabel: true },
      xAxis: { type: "value" as const, show: false },
      yAxis: { type: "category" as const, inverse: true, data: top.map(g => lang === "ar" ? g.name_ar : g.name_en),
        axisLabel: { color: "#54678a", fontSize: 11.5 }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{ type: "bar", data: top.map(g => g.buildings), itemStyle: { color: "#0e9f8a", borderRadius: [0, 4, 4, 0] }, barWidth: "55%",
        label: { show: true, position: "right" as const, color: "#54678a", fontSize: 11, formatter: (p: any) => fmtInt(p.value, lang) } }],
      tooltip: { show: false },
    };
  }, [govs, lang]);

  const certOption = useMemo(() => ({
    tooltip: { trigger: "axis" as const },
    grid: { left: 6, right: 6, top: 26, bottom: 0, containLabel: true },
    xAxis: { type: "category" as const, data: certSummary.map(r => (t as any)[`st_${r.status}`] ?? r.status), axisLabel: { color: "#54678a", fontSize: 11 } },
    yAxis: { type: "value" as const, axisLabel: { color: "#8494ad", fontSize: 11 }, splitLine: { lineStyle: { color: "#edf1f6" } } },
    series: [
      { name: t.gross, type: "bar", data: certSummary.map(r => Number(r.gross)), itemStyle: { color: "#2563eb", borderRadius: [4, 4, 0, 0] }, barWidth: "38%" },
      { name: t.net, type: "bar", data: certSummary.map(r => Number(r.net)), itemStyle: { color: "#1f9d63", borderRadius: [4, 4, 0, 0] }, barWidth: "38%" },
    ],
    legend: { top: 0, textStyle: { color: "#54678a", fontSize: 11.5 } },
  }), [certSummary, t]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title={`${t.nav_budget} — ${t.budget_util}`} more={<button className="btn sec sm" onClick={downloadCsv}>{t.download_csv} ↓</button>}>
        {budgetUtil.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>{t.fy}</th><th className="num">{t.count}</th><th className="num">{t.allocated}</th><th className="num">{t.committed}</th><th className="num">{t.spent}</th><th className="num">{t.available}</th><th style={{ width: 130 }}>{t.utilization}</th></tr></thead>
            <tbody>{budgetUtil.map(r => { const u = Number(r.allocated) ? (Number(r.spent) / Number(r.allocated)) * 100 : 0; return (
              <tr key={r.fiscal_year}><td>{r.fiscal_year}</td><td className="num">{fmtInt(r.lines, lang)}</td>
                <td className="num money">{fmtMoney(r.allocated, lang, false)}</td><td className="num money">{fmtMoney(r.committed, lang, false)}</td>
                <td className="num money">{fmtMoney(r.spent, lang, false)}</td><td className="num money">{fmtMoney(r.available, lang, false)}</td>
                <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="prog" style={{ flex: 1 }}><i style={{ width: `${Math.min(100, u)}%` }} /></div><span style={{ fontSize: 12 }}>{fmtPct(Number(r.spent), Number(r.allocated), lang)}</span></div></td></tr> ); })}
            </tbody></table>
        )}
      </Panel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(380px,100%),1fr))", gap: 14 }}>
        <Panel title={`${t.nav_certs} — ${t.cert_summary}`}>
          {certSummary.length === 0 ? <Empty text={t.empty} /> : <>
            <Chart option={certOption} height={220} lang={lang} />
            <table className="dt" style={{ marginTop: 8 }}><thead><tr><th>{t.status}</th><th className="num">#</th><th className="num">{t.gross}</th><th className="num">{t.ded}</th><th className="num">{t.net}</th></tr></thead>
              <tbody>{certSummary.map(r => (
                <tr key={r.status}><td><StatusChip s={r.status} t={t} /></td><td className="num">{fmtInt(r.count, lang)}</td>
                  <td className="num money">{fmtMoney(r.gross, lang, false)}</td><td className="num money">{fmtMoney(r.deductions, lang, false)}</td><td className="num money">{fmtMoney(r.net, lang, false)}</td></tr>))}
              </tbody></table>
          </>}
        </Panel>
        <Panel title={t.buildings_by_gov}>
          {govs.filter(g => g.buildings > 0).length === 0 ? <Empty text={t.empty} /> : <>
            <Chart option={govOption} height={220} lang={lang} />
            <table className="dt" style={{ marginTop: 8 }}><thead><tr><th>{t.governorate}</th><th className="num">{t.buildings}</th></tr></thead>
              <tbody>{govs.map(g => <tr key={g.code}><td>{lang === "ar" ? g.name_ar : g.name_en}</td><td className="num">{fmtInt(g.buildings, lang)}</td></tr>)}</tbody></table>
          </>}
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════ ADMINISTRATION (audit) ═══════════════ */

function PilotPanel({ ctx }: { ctx: Ctx & { role: string; username: string } }) {
  const { t } = ctx;
  const [pilots, setPilots] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [authz, setAuthz] = useState<any>(null);
  const [name, setName] = useState("");
  const [evKey, setEvKey] = useState("charter_approved");
  const [evType, setEvType] = useState("");
  const [evSignatory, setEvSignatory] = useState("");
  const [dsKey, setDsKey] = useState("");
  const [dsRef, setDsRef] = useState("");
  const [dsSha, setDsSha] = useState("");
  const isAdmin = ctx.role === "admin";
  const canVerify = ctx.role === "admin" || ctx.role === "budget";
  const ATTEST_KEYS = ["charter_approved", "scope_approved", "bd_decisions", "extract_authorization", "environment_approved", "backup_restore_verified", "monitoring_alerts_verified", "transfer_mechanism_approved", "participants_assigned", "security_prerequisites"];
  const loadPilots = async () => { try { setPilots(await api("/api/pilots")); } catch { /* requires migration.run */ } };
  useEffect(() => { loadPilots(); }, []);
  const open = async (id: number) => {
    try {
      setDetail(await api(`/api/pilots/${id}`));
      setEvidence(await api(`/api/pilots/${id}/evidence`));
      setDatasets(await api(`/api/pilots/${id}/datasets`));
      setAuthz(await api(`/api/pilots/${id}/authorization`));
    } catch (e: any) { ctx.notify(e.message, true); }
  };
  const act = async (fn: () => Promise<any>, reopen = true) => { try { await fn(); await loadPilots(); if (reopen && detail) await open(detail.id); } catch (e: any) { ctx.notify(e.message, true); } };
  const evStatus = (st: string) => (t as any)[`ev_${st.toLowerCase()}`] ?? st;
  const hashLabel = (h: string) => h === "verified-bytes" ? t.hash_verified : h === "declared-unverified" ? t.hash_unverified : t.hash_none;
  const submitEvidence = (ev: any) => { const ref = window.prompt(t.doc_ref); if (ref) act(() => api(`/api/pilots/${detail.id}/evidence/${ev.id}/submit`, { method: "POST", body: JSON.stringify({ documentRef: ref }) })); };
  const verifyEvidence = (ev: any, decision: string) => act(() => api(`/api/pilots/${detail.id}/evidence/${ev.id}/verify`, { method: "POST", body: JSON.stringify({ decision }) }));
  const revokeEvidence = (ev: any) => { const r = window.prompt(t.suspension_reason); if (r) act(() => api(`/api/pilots/${detail.id}/evidence/${ev.id}/revoke`, { method: "POST", body: JSON.stringify({ reason: r }) })); };
  return (
    <Panel title={t.pilots}>
      <p className="hint" style={{ marginTop: 0 }}>{t.pilot_hint}</p>
      {detail && authz && (
        <p className="hint" role="status">{t.auth_status}: <b>{authz.eligible ? t.eligible : t.not_eligible}</b>{!authz.eligible && authz.reasons?.length ? ` — ${authz.reasons.join("; ")}` : ""}</p>
      )}
      {isAdmin && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-ink2)" }}>{t.pilot_name}
            <input className="inp" style={{ width: 300 }} value={name} onChange={e => setName(e.target.value)} /></label>
          <button className="btn" onClick={() => act(async () => { const p: any = await api("/api/pilots", { method: "POST", body: JSON.stringify({ name }) }); setName(""); await open(p.id); }, false)}>{t.new_pilot}</button>
        </div>
      )}
      {pilots.length > 0 && (
        <table className="dt" style={{ marginTop: 10 }}><thead><tr><th>#</th><th>{t.pilot_name}</th><th>{t.pilot_env}</th><th>{t.status}</th></tr></thead>
          <tbody>{pilots.map((p: any) => (
            <tr key={p.id} onClick={() => open(p.id)} style={{ cursor: "pointer" }}><td>{p.id}</td><td>{p.name}</td><td>{p.environment}</td><td><StatusChip s={p.status} t={t} /></td></tr>
          ))}</tbody></table>
      )}
      {detail && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <b>{detail.name}</b><StatusChip s={detail.status} t={t} />
            {isAdmin && detail.status === "draft" && <button className="btn sm" onClick={() => act(() => api(`/api/pilots/${detail.id}/activate`, { method: "POST", body: "{}" }))}>{t.activate_pilot}</button>}
            {isAdmin && detail.status === "active" && <button className="btn sm sec" onClick={() => { const r = window.prompt(t.suspension_reason); if (r) act(() => api(`/api/pilots/${detail.id}/suspend`, { method: "POST", body: JSON.stringify({ reason: r }) })); }}>{t.suspend_pilot}</button>}
            {isAdmin && detail.status === "suspended" && <button className="btn sm" onClick={() => act(() => api(`/api/pilots/${detail.id}/reactivate`, { method: "POST", body: "{}" }))}>{t.reactivate_pilot}</button>}
            {isAdmin && detail.status === "active" && <button className="btn sm danger" onClick={() => act(() => api(`/api/pilots/${detail.id}/close`, { method: "POST", body: "{}" }))}>{t.close_pilot}</button>}
          </div>
          <table className="dt"><thead><tr><th>{t.conditions}</th><th>{t.kind}</th><th>{t.status}</th><th>{t.evidence}</th><th>{t.actions}</th></tr></thead>
            <tbody>{detail.conditions.map((c: any) => (
              <tr key={c.condition_key}>
                <td>{(t as any)[`cond_${c.condition_key}`] ?? c.condition_key}</td>
                <td>{c.kind === "auto" ? t.auto_lbl : t.attest_lbl}</td>
                <td><StatusChip s={c.status} t={t} /></td>
                <td style={{ fontSize: 12 }}>{c.evidence_ref ?? "—"}</td>
                <td>{isAdmin && detail.status === "draft" && c.status !== "satisfied" && c.kind === "auto" &&
                  <button className="btn sm sec" onClick={() => act(() => api(`/api/pilots/${detail.id}/conditions/${c.condition_key}/verify`, { method: "POST", body: "{}" }))}>{t.verify_btn}</button>}</td>
              </tr>))}
            </tbody></table>

          <h3 style={{ fontSize: 13, margin: "14px 0 6px" }}>{t.evidence}</h3>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 8 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-ink2)" }}>{t.select_condition}
              <select className="inp" aria-label={t.select_condition} value={evKey} onChange={e => setEvKey(e.target.value)}>
                {ATTEST_KEYS.map(k => <option key={k} value={k}>{(t as any)[`cond_${k}`] ?? k}</option>)}
              </select></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-ink2)" }}>{t.doc_type}
              <input className="inp" value={evType} onChange={e => setEvType(e.target.value)} /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-ink2)" }}>{t.signatory}
              <input className="inp" value={evSignatory} onChange={e => setEvSignatory(e.target.value)} /></label>
            <button className="btn sm" onClick={() => act(() => api(`/api/pilots/${detail.id}/evidence`, { method: "POST", body: JSON.stringify({ conditionKey: evKey, documentType: evType || undefined, signatory: evSignatory || undefined }) }))}>{t.submit_evidence}</button>
          </div>
          {canVerify && <p className="hint">{t.own_evidence_note}</p>}
          {evidence.length > 0 && (
            <table className="dt"><thead><tr><th>#</th><th>{t.select_condition}</th><th>{t.doc_ref}</th><th>{t.status}</th><th>SHA-256</th><th>{t.actions}</th></tr></thead>
              <tbody>{evidence.map((ev: any) => (
                <tr key={ev.id}>
                  <td>{ev.ref}</td>
                  <td>{(t as any)[`cond_${ev.condition_key}`] ?? ev.condition_key}</td>
                  <td style={{ fontSize: 12 }}>{ev.document_ref ?? "—"}</td>
                  <td>{evStatus(ev.status)}</td>
                  <td style={{ fontSize: 12 }}>{hashLabel(ev.hash_status)}</td>
                  <td style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {ev.status === "PENDING" && <button className="btn sm sec" onClick={() => submitEvidence(ev)}>{t.submit_evidence}</button>}
                    {canVerify && ev.status === "SUBMITTED" && <>
                      <button className="btn sm" onClick={() => verifyEvidence(ev, "VERIFIED")}>{t.verify_ev}</button>
                      <button className="btn sm sec" onClick={() => verifyEvidence(ev, "REJECTED")}>{t.reject_ev}</button></>}
                    {canVerify && ev.status === "VERIFIED" && <button className="btn sm danger" onClick={() => revokeEvidence(ev)}>{t.revoke_ev}</button>}
                  </td>
                </tr>))}
              </tbody></table>
          )}

          <h3 style={{ fontSize: 13, margin: "14px 0 6px" }}>{t.datasets}</h3>
          {isAdmin && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 8 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-ink2)" }}>{t.dataset_key}
                <input className="inp" value={dsKey} onChange={e => setDsKey(e.target.value)} /></label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-ink2)" }}>{t.extract_ref}
                <input className="inp" value={dsRef} onChange={e => setDsRef(e.target.value)} /></label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-ink2)" }}>{t.file_sha}
                <input className="inp" value={dsSha} onChange={e => setDsSha(e.target.value)} /></label>
              <button className="btn sm" onClick={() => act(() => api(`/api/pilots/${detail.id}/datasets`, { method: "POST", body: JSON.stringify({ datasetKey: dsKey, extractRef: dsRef || undefined, sourceSha256: dsSha || undefined }) }))}>{t.register_dataset}</button>
            </div>
          )}
          {datasets.length > 0 && (
            <table className="dt"><thead><tr><th>{t.dataset_key}</th><th>{t.extract_ref}</th><th>{t.status}</th><th>{t.actions}</th></tr></thead>
              <tbody>{datasets.map((d: any) => (
                <tr key={d.id}><td>{d.dataset_key}</td><td style={{ fontSize: 12 }}>{d.extract_ref ?? "—"}</td><td><StatusChip s={d.status} t={t} /></td>
                  <td>{isAdmin && d.status === "registered" && <button className="btn sm sec" onClick={() => act(() => api(`/api/pilots/${detail.id}/datasets/${d.id}/authorize`, { method: "POST", body: "{}" }))}>{t.authorize_dataset}</button>}</td></tr>
              ))}</tbody></table>
          )}
        </div>
      )}
    </Panel>
  );
}

export function AdminView(ctx: Ctx & { username: string; role: string }) {
  const { t, lang } = ctx;
  const [audit, setAudit] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    (async () => { try { setAudit(await api("/api/audit")); } catch { setDenied(true); } })();
    (async () => { try { setUsers(await api("/api/users")); } catch { /* admin-only endpoint */ } })();
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title={t.nav_admin}>
        <div style={{ display: "flex", gap: 22, fontSize: 13, flexWrap: "wrap" }}>
          <span>{t.admin_users}: <b>{ctx.username || "—"}</b></span>
          <span>{t.role}: <b>{ctx.role || "—"}</b></span>
          <span>{t.session}: <b>8h</b></span>
        </div>
      </Panel>
      {users.length > 0 && (
        <Panel title={t.users_dir}>
          <table className="dt"><thead><tr><th>{t.username}</th><th>{t.name}</th><th>{t.role}</th><th>{t.status}</th></tr></thead>
            <tbody>{users.map((u: any) => (
              <tr key={u.id}><td>{u.username}</td><td>{lang === "ar" ? (u.name_ar || u.name_en) : (u.name_en || u.name_ar) || "—"}</td>
                <td>{u.role}</td><td><StatusChip s={u.is_active ? "active" : "revoked"} t={t} /></td></tr>))}
            </tbody></table>
        </Panel>
      )}
      <PilotPanel ctx={ctx} />
      <Panel title={t.audit}>
        {denied ? <Empty text={t.err} /> : audit.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>{t.decreeDate}</th><th>{t.by}</th><th>{t.actions}</th><th>{t.member}</th></tr></thead>
            <tbody>{audit.slice(0, 100).map((a: any) => (
              <tr key={a.id}><td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(a.at, lang)}</td><td>{a.username ?? "—"}</td><td>{a.action}</td><td>{a.entity} {a.entity_id ?? ""}</td></tr>))}
            </tbody></table>
        )}
      </Panel>
    </div>
  );
}
