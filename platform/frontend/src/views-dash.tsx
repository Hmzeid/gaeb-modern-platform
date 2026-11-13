import { useEffect, useMemo, useState } from "react";
import { Building2, CircleDollarSign, FileCheck2, Gauge, Landmark, ScrollText, ClipboardList, AlertTriangle, ListChecks } from "lucide-react";
import { api, type Overview, type GovBuildings } from "./api";
import { TENDER_STAGES, type Lang, type Strs } from "./i18n";
import { fmtInt, fmtMoney, fmtMoneyShort, fmtPct, fmtDateTime } from "./format";
import { Chart, Kpi, Panel, StatusChip, SegBar, Empty, Skel } from "./components";
import * as echarts from "echarts";
import { EGYPT_ADM1, ADM1_BY_PCODE, pcodeForGov } from "./geo-data";

export interface Ctx { t: Strs; lang: Lang; notify: (m: string, e?: boolean) => void; go: (v: string) => void; goMapGov: (code: number) => void }

const C_GREEN = "#1f9d63", C_AMBER = "#e8a13a", C_RED = "#d9534f", C_BLUE = "#2563eb", C_TEAL = "#0e9f8a", C_VIOLET = "#7c6bd6", C_SKY = "#5ea8ff";
const CERT_COLORS: Record<string, string> = { draft: "#8494ad", certified: C_BLUE, billed: C_VIOLET, payment_authorized: C_AMBER, paid: C_GREEN };

/* ═══════════════ PORTFOLIO OVERVIEW (Concept D light executive) ═══════════════ */
export function OverviewView({ t, lang, go }: Ctx) {
  const [ov, setOv] = useState<Overview | null>(null);
  const [govs, setGovs] = useState<GovBuildings[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [tab, setTab] = useState("summary");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try { setOv(await api("/api/overview")); } catch (e: any) { setErr(e.message); }
      try { setGovs(await api("/api/reports/buildings-by-governorate")); } catch { /* optional */ }
      try { setAudit(await api("/api/audit")); } catch { /* role-gated */ }
      try { setMetrics(await api("/api/migration/metrics")); } catch { /* role-gated */ }
    })();
  }, []);

  const certTotal = useMemo(() => (ov?.certificatesByStatus ?? []).reduce((a, r) => a + r.n, 0), [ov]);
  const paidN = ov?.certificatesByStatus.find(r => r.status === "paid")?.n ?? 0;
  const govCount = govs.filter(g => g.buildings > 0).length;
  const execPct = ov?.money ? (Number(ov.money.budget.spent) / Math.max(1, Number(ov.money.budget.allocated))) * 100 : null;

  const donutOption = useMemo(() => {
    const rows = ov?.certificatesByStatus ?? [];
    return {
      tooltip: { trigger: "item" as const },
      series: [{
        type: "pie", radius: ["62%", "88%"], label: { show: false },
        itemStyle: { borderColor: "#fff", borderWidth: 2 },
        data: rows.map(r => ({ value: r.n, name: (t as any)[`st_${r.status}`] ?? r.status, itemStyle: { color: CERT_COLORS[r.status] ?? C_SKY } })),
      }],
      graphic: { elements: [{ type: "text", left: "center", top: "44%", style: { text: fmtInt(certTotal, lang), fill: "#16233c", font: "800 19px Inter", textAlign: "center" } }] },
    };
  }, [ov, certTotal, lang, t]);

  const gaugeOption = useMemo(() => ({
    series: [{
      type: "gauge", startAngle: 210, endAngle: -30, min: 0, max: 100, radius: "100%",
      progress: { show: true, width: 11, itemStyle: { color: C_GREEN } },
      axisLine: { lineStyle: { width: 11, color: [[1, "#e6ebf2"]] as any } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, pointer: { show: false }, anchor: { show: false },
      detail: { formatter: "{value}%", color: "#16233c", fontSize: 19, fontWeight: 800, offsetCenter: [0, 0] },
      data: [{ value: execPct === null ? 0 : Math.round(execPct * 10) / 10 }],
    }],
  }), [execPct]);

  if (err) return <Panel><p style={{ color: "var(--color-bad)" }}>{t.err}: {err}</p></Panel>;
  if (!ov) return <div style={{ display: "grid", gap: 12 }}><Skel h={110} /><Skel h={300} /></div>;

  const healthRows: { name: string; parts: { pct: number; color: string }[]; note: string }[] = [];
  if (certTotal) healthRows.push({ name: t.nav_certs, parts: [
    { pct: (paidN / certTotal) * 100, color: C_GREEN },
    { pct: (((ov.certificatesByStatus.find(r => r.status === "draft")?.n ?? 0)) / certTotal) * 100, color: C_AMBER },
    { pct: Math.max(0, 100 - (paidN / certTotal) * 100 - ((ov.certificatesByStatus.find(r => r.status === "draft")?.n ?? 0) / certTotal) * 100), color: C_SKY },
  ], note: `${fmtInt(paidN, lang)} / ${fmtInt(certTotal, lang)} ${t.st_paid.toLowerCase()}` });
  const tenderTotal = ov.tendersByStage.reduce((a, r) => a + r.n, 0);
  if (tenderTotal) {
    const contracted = (ov.tendersByStage.find(r => r.stage === "contracted")?.n ?? 0) + (ov.tendersByStage.find(r => r.stage === "awarded")?.n ?? 0);
    const early = ov.tendersByStage.filter(r => ["draft", "booklet", "published"].includes(r.stage)).reduce((a, r) => a + r.n, 0);
    healthRows.push({ name: t.nav_tenders, parts: [
      { pct: (contracted / tenderTotal) * 100, color: C_GREEN }, { pct: (early / tenderTotal) * 100, color: C_AMBER },
      { pct: Math.max(0, 100 - (contracted / tenderTotal) * 100 - (early / tenderTotal) * 100), color: C_SKY }],
      note: `${fmtInt(contracted, lang)} / ${fmtInt(tenderTotal, lang)} ${t.st_contracted.toLowerCase()}` });
  }
  if (metrics) {
    const acc = metrics.recordsLoaded + metrics.recordsRejected > 0 ? (metrics.recordsLoaded / (metrics.recordsLoaded + metrics.recordsRejected)) * 100 : 0;
    healthRows.push({ name: t.nav_migration, parts: [{ pct: acc, color: C_TEAL }, { pct: 100 - acc, color: C_RED }],
      note: `${fmtInt(metrics.recordsLoaded, lang)} ${t.accepted} · ${fmtInt(metrics.recordsRejected, lang)} ${t.quarantined}` });
  }

  const stageTiles = TENDER_STAGES.map(s => ({ s, n: ov.tendersByStage.find(r => r.stage === s)?.n ?? 0 }));
  const pipelineN = stageTiles.filter(x => ["draft", "booklet", "published", "bids_open", "bids_closed"].includes(x.s)).reduce((a, x) => a + x.n, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 21 }}>{t.nav_overview}</h1>
          <div style={{ color: "var(--color-ink2)", fontSize: 13, marginTop: 2 }}>{t.ov_sub}</div>
        </div>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
          <span style={{ border: "1px solid var(--color-line)", background: "#eef1f6", color: "var(--color-ink2)", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 600 }}>{t.allDirectorates}</span>
          <span style={{ border: "1px solid var(--color-line)", background: "#eef1f6", color: "var(--color-ink2)", borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 600 }}>{t.fiscalYear} 2026/27</span>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {([["summary", t.tab_summary], ["health", t.tab_health], ["financials", t.tab_fin], ["delivery", t.tab_del], ["risks", t.tab_risk]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {(tab === "summary" || tab === "financials") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <Kpi label={t.k_buildings} value={fmtInt(ov.counts.buildings, lang)} color={C_BLUE} icon={<Building2 size={15} />}
            sub={govCount ? `${fmtInt(govCount, lang)} ${t.covered.toLowerCase()}` : undefined} />
          <Kpi label={t.k_invest} value={ov.money ? fmtMoneyShort(ov.money.budget.allocated, lang) : "—"} color={C_TEAL} icon={<CircleDollarSign size={15} />}
            sub={ov.money ? t.vs_prev : t.no_money} />
          <Kpi label={t.k_tenders} value={fmtInt(ov.counts.tenders, lang)} color={C_VIOLET} icon={<ScrollText size={15} />}
            sub={`${fmtInt(tenderTotal ? pipelineN : 0, lang)} ${t.in_pipeline}`} />
          <Kpi label={t.k_paid} value={ov.money ? fmtMoneyShort(ov.money.certificates.paidNet, lang) : "—"} color={C_GREEN} icon={<FileCheck2 size={15} />}
            sub={certTotal ? fmtPct(paidN, certTotal, lang) : undefined} />
          <Kpi label={t.k_exec} value={execPct === null ? "—" : fmtPct(Number(ov.money!.budget.spent), Number(ov.money!.budget.allocated), lang)} color={C_AMBER} icon={<Gauge size={15} />}
            sub={ov.money ? `${fmtMoneyShort(ov.money.budget.spent, lang)} ${t.spent.toLowerCase()}` : t.no_money} />
        </div>
      )}

      {(tab === "summary" || tab === "health" || tab === "risks") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 12 }}>
          <Panel span={5} title={t.cert_summary}>
            {certTotal === 0 ? <Empty text={t.empty} /> : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 8, alignItems: "center" }}>
                <Chart option={donutOption} height={200} lang={lang} onClick={() => go("certificates")} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  {ov.certificatesByStatus.map(r => (
                    <div key={r.status} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: CERT_COLORS[r.status] ?? C_SKY, flex: "none" }} />
                      <span>{(t as any)[`st_${r.status}`] ?? r.status}</span>
                      <b style={{ marginInlineStart: "auto" }}>{fmtInt(r.n, lang)}</b>
                      <span style={{ color: "var(--color-ink3)", width: 38, textAlign: "end" }}>{fmtPct(r.n, certTotal, lang)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
          <Panel span={7} title={t.module_health} more={<button className="btn sec sm" onClick={() => go("reports")}>{t.view_modules} →</button>}>
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--color-ink2)", marginBottom: 6, flexWrap: "wrap" }}>
              <span><i style={{ width: 9, height: 9, borderRadius: "50%", display: "inline-block", background: C_GREEN, marginInlineEnd: 5 }} />{t.health_on}</span>
              <span><i style={{ width: 9, height: 9, borderRadius: "50%", display: "inline-block", background: C_AMBER, marginInlineEnd: 5 }} />{t.health_risk}</span>
              <span><i style={{ width: 9, height: 9, borderRadius: "50%", display: "inline-block", background: C_SKY, marginInlineEnd: 5 }} />{t.in_execution}</span>
            </div>
            {healthRows.length === 0 ? <Empty text={t.empty} /> : healthRows.map(r => (
              <div key={r.name} style={{ display: "grid", gridTemplateColumns: "130px 1fr 190px", gap: 10, alignItems: "center", padding: "5.5px 0", fontSize: 12.5 }}>
                <span style={{ color: "var(--color-ink2)", fontWeight: 500 }}>{r.name}</span>
                <SegBar parts={r.parts} />
                <span style={{ color: "var(--color-ink3)", textAlign: "end" }}>{r.note}</span>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {(tab === "summary" || tab === "delivery") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 12 }}>
          <Panel span={7} title={t.tenders_by_stage} more={<button className="btn sec sm" onClick={() => go("tenders")}>{t.view_stages} →</button>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(86px,1fr))", gap: 8, marginTop: 4 }}>
              {stageTiles.map(x => (
                <button key={x.s} onClick={() => go("tenders")} title={t.nav_tenders}
                  style={{ background: "#eef3fb", border: "1px solid transparent", borderRadius: 9, padding: "9px 11px", textAlign: "start", cursor: "pointer", font: "inherit" }}>
                  <div style={{ fontSize: 11, color: "var(--color-ink2)", fontWeight: 600 }}>{(t as any)[`st_${x.s}`] ?? x.s}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>{fmtInt(x.n, lang)}</div>
                </button>
              ))}
            </div>
            {tenderTotal > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-ink3)", fontSize: 11.5, borderTop: "2px solid var(--color-line)", marginTop: 10, paddingTop: 5 }}>
                <span>{fmtPct(pipelineN, tenderTotal, lang)} {t.in_pipeline}</span>
                <span>{fmtPct(tenderTotal - pipelineN, tenderTotal, lang)} {t.in_execution}</span>
              </div>
            )}
          </Panel>
          <Panel span={5} title={t.budget_real} more={<button className="btn sec sm" onClick={() => go("reports")}>{t.open_financials} →</button>}>
            {!ov.money ? <p style={{ color: "var(--color-ink2)", fontSize: 13 }}>{t.no_money}</p> : (
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ width: 128, flex: "none" }}><Chart option={gaugeOption} height={128} lang={lang} /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, flex: 1 }}>
                  {([[t.allocated, ov.money.budget.allocated], [t.committed, ov.money.budget.committed], [t.spent, ov.money.budget.spent], [t.available, ov.money.budget.available]] as const).map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
                      <span style={{ color: "var(--color-ink2)" }}>{l}</span><b className="money">{fmtMoneyShort(v, lang)}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}

      {(tab === "summary" || tab === "health" || tab === "risks") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 12 }}>
          <Panel span={5} title={t.queues}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {([[t.q_certs, ov.queues.certificates_draft, "certificates", C_AMBER], [t.q_est, ov.queues.estimates_draft, "estimates", C_BLUE], [t.q_appr, ov.queues.approvals_active, "migration", C_TEAL]] as const).map(([l, n, v, c]) => (
                <button key={l} onClick={() => go(v)} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f7fafd", border: "1px solid var(--color-line)", borderRadius: 9, padding: "10px 12px", cursor: "pointer", textAlign: "start" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{l}</span>
                  <b style={{ marginInlineStart: "auto", fontSize: 16 }}>{fmtInt(n, lang)}</b>
                </button>
              ))}
            </div>
          </Panel>
          <Panel span={7} title={t.recent} more={audit.length > 0 ? <button className="btn sec sm" onClick={() => go("admin")}>{t.view_activity} →</button> : undefined}>
            {audit.length === 0 ? <Empty text={t.empty} /> : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {audit.slice(0, 6).map((a: any) => (
                  <div key={a.id} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid #eef1f6", fontSize: 13 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, background: "#eef3fb", display: "grid", placeItems: "center", flex: "none" }}><ListChecks size={13} /></span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.action}</div>
                      <div style={{ color: "var(--color-ink3)", fontSize: 12 }}>{a.entity} {a.entity_id ?? ""} · {a.username ?? "—"}</div>
                    </div>
                    <span style={{ marginInlineStart: "auto", color: "var(--color-ink3)", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDateTime(a.at, lang)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === "financials" && !ov.money && <Panel><p style={{ color: "var(--color-ink2)" }}>{t.no_money}</p></Panel>}
      {tab === "risks" && (
        <Panel title={t.tab_risk}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--color-ink2)" }}>
            <AlertTriangle size={16} color={C_AMBER} style={{ flex: "none", marginTop: 2 }} />
            <span>{t.q_certs}: <b style={{ color: "var(--color-ink)" }}>{fmtInt(ov.queues.certificates_draft, lang)}</b>
              {metrics ? <> · {t.quarantined}: <b style={{ color: "var(--color-ink)" }}>{fmtInt(metrics.recordsRejected, lang)}</b></> : null}
              {" "}· {t.q_est}: <b style={{ color: "var(--color-ink)" }}>{fmtInt(ov.queues.estimates_draft, lang)}</b></span>
          </div>
        </Panel>
      )}
      <div style={{ color: "var(--color-ink3)", fontSize: 12, textAlign: "center" }}>{t.footer_note}</div>
    </div>
  );
}

/* ═══════════════ GEOGRAPHIC INTELLIGENCE (Concept D dark, real boundaries) ═══════════════ */
let mapRegistered = false;
function ensureMap() {
  if (mapRegistered) return;
  const fc = {
    type: "FeatureCollection",
    features: EGYPT_ADM1.features.map(f => ({
      type: "Feature",
      properties: { name: f.properties.pcode, name_en: f.properties.name_en, name_ar: f.properties.name_ar },
      geometry: f.geometry,
    })),
  };
  echarts.registerMap("egypt-adm1", fc as any);
  mapRegistered = true;
}

export function GeoView({ t, lang, goMapGov }: Ctx) {
  const [govs, setGovs] = useState<GovBuildings[]>([]);
  const [ov, setOv] = useState<Overview | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null); // OCHA P-code
  ensureMap(); // must register before the chart child initializes (effects run child-first)
  useEffect(() => {
    (async () => {
      try { setGovs(await api("/api/reports/buildings-by-governorate")); } catch { /* optional */ }
      try { setOv(await api("/api/overview")); } catch { /* optional */ }
      try { setMetrics(await api("/api/migration/metrics")); } catch { /* optional */ }
    })();
  }, []);

  const byPcode = useMemo(() => {
    const m = new Map<string, GovBuildings>();
    for (const g of govs) { const p = pcodeForGov(g.code); if (p) m.set(p, g); }
    return m;
  }, [govs]);
  const total = govs.reduce((a, g) => a + g.buildings, 0);
  const covered = govs.filter(g => g.buildings > 0).length;
  const regionCount = EGYPT_ADM1.features.length;
  const acceptPct = metrics && metrics.recordsLoaded + metrics.recordsRejected > 0
    ? Math.round((metrics.recordsLoaded / (metrics.recordsLoaded + metrics.recordsRejected)) * 1000) / 10 : null;

  const mapOption = useMemo(() => {
    const max = Math.max(1, ...govs.map(g => g.buildings));
    const nameOf = (pcode: string) => {
      const row = byPcode.get(pcode);
      const f = ADM1_BY_PCODE.get(pcode);
      return lang === "ar" ? (row?.name_ar || f?.properties.name_ar || pcode) : (row?.name_en || f?.properties.name_en || pcode);
    };
    return {
      tooltip: { backgroundColor: "#0e2138", borderColor: "#1c3658", textStyle: { color: "#eaf1fd" },
        formatter: (p: any) => `${nameOf(p.name)}<br/>${t.nav_map}: <b>${fmtInt(p.value ?? 0, lang)}</b>` },
      visualMap: { min: 0, max, left: lang === "ar" ? undefined : 12, right: lang === "ar" ? 12 : undefined, bottom: 14,
        calculable: true, textStyle: { color: "#a9bcdf", fontSize: 11 },
        inRange: { color: ["#14304f", "#0e5f6e", "#0e9f8a", "#2dd4bf"] },
        text: [fmtInt(max, lang), fmtInt(0, lang)] },
      series: [{
        type: "map", map: "egypt-adm1", roam: true, scaleLimit: { min: 0.9, max: 5 },
        layoutCenter: ["50%", "52%"], layoutSize: "96%",
        label: { show: false },
        itemStyle: { borderColor: "#2b4f7e", borderWidth: 0.7, areaColor: "#14304f" },
        emphasis: { label: { show: true, color: "#fff", fontSize: 11.5, fontWeight: 600,
            formatter: (p: any) => nameOf(p.name) },
          itemStyle: { areaColor: "#1d5f8a" } },
        select: { itemStyle: { areaColor: "#2dd4bf" }, label: { show: true, color: "#06281f", fontWeight: 700,
            formatter: (p: any) => nameOf(p.name) } },
        selectedMode: "single",
        data: EGYPT_ADM1.features.map(f => ({ name: f.properties.pcode, value: byPcode.get(f.properties.pcode)?.buildings ?? 0 })),
      }],
    };
  }, [govs, byPcode, lang, t]);

  const rankOption = useMemo(() => {
    const top = [...govs].sort((a, b) => b.buildings - a.buildings).slice(0, 8);
    return {
      grid: { left: 6, right: 26, top: 2, bottom: 0, containLabel: true },
      xAxis: { type: "value" as const, show: false },
      yAxis: { type: "category" as const, inverse: true, data: top.map(g => lang === "ar" ? g.name_ar : g.name_en),
        axisLabel: { color: "#a9bcdf", fontSize: 11.5 }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{ type: "bar", data: top.map(g => g.buildings), itemStyle: { color: "#2dd4bf", borderRadius: [0, 4, 4, 0] }, barWidth: "52%",
        label: { show: true, position: "right" as const, color: "#a9bcdf", fontSize: 11, formatter: (p: any) => fmtInt(p.value, lang) } }],
      tooltip: { show: false },
    };
  }, [govs, lang]);

  const gaugeOption = useMemo(() => ({
    series: [{
      type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100, radius: "96%",
      progress: { show: true, width: 10, itemStyle: { color: "#2dd4bf" } },
      axisLine: { lineStyle: { width: 10, color: [[1, "#1c3658"]] as any } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, pointer: { show: false }, anchor: { show: false },
      detail: { formatter: (v: number) => fmtPct(v, 100, lang), color: "#fff", fontSize: 20, fontWeight: 800, offsetCenter: [0, 4] },
      data: [{ value: acceptPct ?? 0 }],
    }],
  }), [acceptPct, lang]);

  const attention: { sev: "hi" | "md" | "lo"; title: string; sub: string }[] = [];
  if (ov && ov.queues.certificates_draft > 0) attention.push({ sev: "md", title: `${t.q_certs}: ${fmtInt(ov.queues.certificates_draft, lang)}`, sub: t.nav_certs });
  if (metrics && metrics.recordsRejected > 0) attention.push({ sev: "hi", title: `${fmtInt(metrics.recordsRejected, lang)} ${t.quarantined}`, sub: t.nav_migration });
  if (ov && ov.queues.estimates_draft > 0) attention.push({ sev: "lo", title: `${t.q_est}: ${fmtInt(ov.queues.estimates_draft, lang)}`, sub: t.nav_estimates });
  if (ov && ov.counts.expropriation_cases > 0) attention.push({ sev: "lo", title: `${t.cases}: ${fmtInt(ov.counts.expropriation_cases, lang)}`, sub: t.nav_estate });

  const selRow = selected ? byPcode.get(selected) : undefined;
  const selFeat = selected ? ADM1_BY_PCODE.get(selected) : undefined;

  return (
    <div className="dark" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17 }}>{t.nav_geo}</h2>
          <div className="hint" style={{ fontSize: 12.5, marginTop: 2 }}>{t.geo_sub}</div>
        </div>
        <span style={{ marginInlineStart: "auto" }} className="chip">{t.covered}: {fmtInt(covered, lang)} / {fmtInt(regionCount, lang)}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        {([[t.k_buildings, fmtInt(total, lang)], [t.covered, `${fmtInt(covered, lang)} / ${fmtInt(regionCount, lang)}`],
           [t.migrated, acceptPct === null ? "—" : fmtPct(acceptPct, 100, lang)], [t.k_tenders, ov ? fmtInt(ov.counts.tenders, lang) : "—"],
           [t.k_cases, ov ? fmtInt(ov.counts.expropriation_cases, lang) : "—"]] as const).map(([l, v]) => (
          <div className="gk" key={l}>
            <div style={{ fontSize: 11.5, color: "#8fa8cc" }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.9fr 1fr", gap: 12 }} className="geo-grid">
        <div className="gpanel">
          <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>{t.geo_map}</h3>
          <Chart option={mapOption} height={430} lang={lang} onClick={(p: any) => { if (p?.name) setSelected(p.name); }} />
          <div className="hint" style={{ fontSize: 11.5, marginTop: 6 }}>{t.geo_attr}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {selected && selFeat && (
            <div className="gpanel" aria-live="polite">
              <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>{lang === "ar" ? selFeat.properties.name_ar : selFeat.properties.name_en}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "#a9bcdf" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t.nav_map}</span><b style={{ color: "#fff", fontSize: 15 }}>{fmtInt(selRow?.buildings ?? 0, lang)}</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t.share}</span><b style={{ color: "#fff" }}>{total > 0 ? fmtPct(selRow?.buildings ?? 0, total, lang) : "—"}</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t.pcode}</span><b style={{ color: "#fff" }}>{selected}</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t.gov_code}</span><b style={{ color: "#fff" }}>{selRow ? fmtInt(selRow.code, lang) : "—"}</b></div>
              </div>
              {selRow && (
                <button className="btn teal sm" style={{ marginTop: 10 }} onClick={() => goMapGov(selRow.code)}>{t.view_in_map} →</button>
              )}
            </div>
          )}
          <div className="gpanel">
            <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>{t.geo_alerts}</h3>
            {attention.length === 0 ? <div style={{ color: "#7e97bb", fontSize: 12.5 }}>{t.empty}</div> : attention.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 9, padding: "7.5px 0", borderBottom: i < attention.length - 1 ? "1px solid #16304f" : "0", fontSize: 12.5 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 4, padding: "1.5px 6px", height: "fit-content",
                  background: a.sev === "hi" ? "#3a1620" : a.sev === "md" ? "#3a2c10" : "#12312c",
                  color: a.sev === "hi" ? "#ff9d9d" : a.sev === "md" ? "#ffcf87" : "#5eead4" }}>{a.sev === "hi" ? "!" : a.sev === "md" ? "•" : "i"}</span>
                <div><div style={{ fontWeight: 600, color: "#eaf1fd" }}>{a.title}</div><div style={{ color: "#7e97bb", fontSize: 11.5 }}>{a.sub}</div></div>
              </div>
            ))}
          </div>
          <div className="gpanel">
            <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>{t.migrated}</h3>
            <Chart option={gaugeOption} height={150} lang={lang} />
          </div>
        </div>
        <div className="gpanel">
          <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>{t.geo_rank}</h3>
          <Chart option={rankOption} height={170} lang={lang} />
        </div>
        <div className="gpanel">
          <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>{t.cert_summary}</h3>
          {ov && ov.certificatesByStatus.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5 }}>
              {ov.certificatesByStatus.map(r => (
                <div key={r.status} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#a9bcdf" }}>{(t as any)[`st_${r.status}`] ?? r.status}</span><b style={{ color: "#fff" }}>{fmtInt(r.n, lang)}</b>
                </div>
              ))}
            </div>
          ) : <div style={{ color: "#7e97bb", fontSize: 12.5 }}>{t.empty}</div>}
        </div>
      </div>
    </div>
  );
}
