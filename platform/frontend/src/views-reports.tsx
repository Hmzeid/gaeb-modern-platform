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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))", gap: 14 }}>
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
