import { useEffect, useState } from "react";
import { api, apiRaw, getToken, setToken, type Certificate, type Building, type Allocation, type Tender, type ExCase, type Estimate, type CatalogueItem, type BudgetUtil, type CertSummary, type MigBatch, type MigReject } from "./api";

const T = {
  en: { title: "GAEB Modern Platform", login: "Sign in", user: "Username", pass: "Password", logout: "Sign out", role: "Role", err: "Error",
    dash: "Dashboard", certs: "Certificates", map: "School Map", budget: "Budget", tenders: "Tenders", estate: "Real Estate", estimates: "Estimates", reports: "Reports", catalogue: "Item catalogue", code: "Code", unit: "Unit", total: "Total", revision: "Rev.",
    gross: "Gross", ded: "Deductions", net: "Net", status: "Status", kind: "Kind", advance: "Advance",
    newCert: "New certificate", qty: "Qty", price: "Price", retention: "Retention %", payRef: "Payment ref", create: "Create",
    nameEn: "Name (EN)", nameAr: "Name (AR)", blcd: "Legacy code (BLCD)", buildings: "Buildings",
    fy: "Fiscal year", chapter: "Chapter", item: "Item", allocated: "Allocated", committed: "Committed", spent: "Spent", available: "Available",
    tenderTitle: "Tender title", stage: "Stage", cases: "Expropriation cases", decree: "Decree no.", decreeDate: "Decree date", gazette: "Gazette no.", recordDecree: "Record decree", compensation: "Compensation", migration: "Migration Center", preview: "Preview decode", runImport: "Run import", batches: "Import batches", rejects: "Quarantined records", resubmit: "Resubmit corrected", transform: "Run transform", approvals: "Mapping approvals", inventory: "Legacy inventory", chooseFile: "IBM i extract file (PBLBULDG layout)", viewInModule: "View in School Map" },
  ar: { title: "منصة الهيئة العامة للأبنية التعليمية", login: "تسجيل الدخول", user: "اسم المستخدم", pass: "كلمة المرور", logout: "تسجيل الخروج", role: "الدور", err: "خطأ",
    dash: "لوحة المتابعة", certs: "المستخلصات", map: "الخريطة المدرسية", budget: "الموازنة", tenders: "المناقصات", estate: "الملكية العقارية", estimates: "المقايسات", reports: "التقارير", catalogue: "دليل البنود", code: "الكود", unit: "الوحدة", total: "الإجمالي", revision: "مراجعة",
    gross: "الإجمالي", ded: "الاستقطاعات", net: "الصافي", status: "الحالة", kind: "النوع", advance: "تقديم",
    newCert: "مستخلص جديد", qty: "الكمية", price: "السعر", retention: "نسبة الاحتجاز %", payRef: "مرجع السداد", create: "إنشاء",
    nameEn: "الاسم (إنجليزي)", nameAr: "الاسم (عربي)", blcd: "الكود القديم", buildings: "المباني",
    fy: "السنة المالية", chapter: "الباب", item: "البند", allocated: "المعتمد", committed: "المرتبط", spent: "المنصرف", available: "المتاح",
    tenderTitle: "عنوان المناقصة", stage: "المرحلة", cases: "قضايا نزع الملكية", decree: "رقم القرار", decreeDate: "تاريخ القرار", gazette: "رقم الجريدة الرسمية", recordDecree: "تسجيل القرار", compensation: "التعويض", migration: "مركز الترحيل", preview: "معاينة فك الترميز", runImport: "تشغيل الاستيراد", batches: "دفعات الاستيراد", rejects: "السجلات المعزولة", resubmit: "إعادة إرسال بعد التصحيح", transform: "تشغيل التحويل", approvals: "اعتمادات الربط", inventory: "جرد النظام القديم", chooseFile: "ملف استخراج IBM i (تخطيط PBLBULDG)", viewInModule: "عرض في الخريطة المدرسية" },
} as const;
type Lang = keyof typeof T;
type Tab = "dash" | "certs" | "map" | "budget" | "tenders" | "estate" | "estimates" | "reports" | "migration";
const CERT_NEXT: Record<string, string> = { draft: "certified", certified: "billed", billed: "payment_authorized", payment_authorized: "paid" };
const TENDER_NEXT: Record<string, string> = { draft: "booklet", booklet: "published", published: "bids_open", bids_open: "bids_closed", bids_closed: "exclusion_review", exclusion_review: "envelope_committee", envelope_committee: "financial_evaluation", financial_evaluation: "award_committee", award_committee: "negotiation", negotiation: "awarded", awarded: "contracted" };

export default function App() {
  const [lang, setLang] = useState<Lang>("en"); const t = T[lang];
  const [authed, setAuthed] = useState(!!getToken()); const [role, setRole] = useState("");
  const [tab, setTab] = useState<Tab>("dash"); const [err, setErr] = useState("");
  const [certs, setCerts] = useState<Certificate[]>([]); const [buildings, setBuildings] = useState<Building[]>([]);
  const [allocs, setAllocs] = useState<Allocation[]>([]); const [tenders, setTenders] = useState<Tender[]>([]);
  const [cases, setCases] = useState<ExCase[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]); const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [budgetUtil, setBudgetUtil] = useState<BudgetUtil[]>([]); const [certSummary, setCertSummary] = useState<CertSummary[]>([]);
  const [migInv, setMigInv] = useState<{ total: number; items: { member: string; subsystem: string; status: string }[] } | null>(null);
  const [migPreview, setMigPreview] = useState<any>(null); const [migBatches, setMigBatches] = useState<MigBatch[]>([]);
  const [migRejects, setMigRejects] = useState<MigReject[]>([]); const [migBatchSel, setMigBatchSel] = useState("");
  const [migApprovals, setMigApprovals] = useState<any[]>([]); const [migMsg, setMigMsg] = useState("");
  const [migRecon, setMigRecon] = useState<any>(null); const [migIntake, setMigIntake] = useState<any[]>([]);
  const [migAudit, setMigAudit] = useState<any[]>([]); const [migMember, setMigMember] = useState("PBLBULDG");
  const [migMetrics, setMigMetrics] = useState<any>(null);
  const [liveBatch, setLiveBatch] = useState(""); const [liveProg, setLiveProg] = useState<any>(null);
  const [liveOn, setLiveOn] = useState(false);
  const [migFile, setMigFile] = useState<ArrayBuffer | null>(null);
  const [migFix, setMigFix] = useState(""); const [migFixId, setMigFixId] = useState<number | null>(null);
  const loadMigration = async () => { try {
    setMigInv(await api("/api/migration/inventory")); setMigBatches(await api("/api/migration/batches")); setMigApprovals(await api("/api/migration/approvals"));
    try { setMigIntake(await api("/api/migration/intake")); } catch { setMigIntake([]); }
    try { setMigAudit(await api("/api/audit")); } catch { setMigAudit([]); }
    try { setMigMetrics(await api("/api/migration/metrics")); } catch { setMigMetrics(null); }
  } catch (e: any) { setErr(String(e.message || e)); } };
  useEffect(() => { if (tab === "migration" && authed) loadMigration(); }, [tab, authed]);
  useEffect(() => {
    if (!liveOn || !liveBatch) return;
    let stop = false;
    const tick = async () => {
      try { const p = await api(`/api/migration/batches/${encodeURIComponent(liveBatch)}/progress`); if (!stop) setLiveProg(p); } catch { if (!stop) setLiveProg(null); }
    };
    tick();
    const iv = setInterval(tick, 2000);
    return () => { stop = true; clearInterval(iv); };
  }, [liveOn, liveBatch]);
  const [catForm, setCatForm] = useState({ code: "", name_en: "", name_ar: "", unit: "m2", standard_price: "100" });
  const [estForm, setEstForm] = useState({ title: "", catalogue_item_id: "", qty: "10" });
  const [form, setForm] = useState({ username: "", password: "" });
  const [line, setLine] = useState({ qty: "100", price: "250.50", retention: "10" });
  const [payRef, setPayRef] = useState("");
  const [bForm, setBForm] = useState({ name_en: "", name_ar: "", legacy_blcd: "" });
  const [aForm, setAForm] = useState({ fiscal_year: "2026", chapter: "1", item: "1", allocated: "1000000" });
  const [tForm, setTForm] = useState({ title: "" });
  const [dForm, setDForm] = useState({ decree_no: "", decree_date: "", gazette_no: "" });

  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; }, [lang]);
  async function load() {
    try {
      const [c, b, a, tn, cs, es, cat, bu, csum] = await Promise.all([
        api<Certificate[]>("/api/certificates").catch(() => []), api<Building[]>("/api/buildings").catch(() => []),
        api<Allocation[]>("/api/budget").catch(() => []), api<Tender[]>("/api/tenders").catch(() => []),
        api<ExCase[]>("/api/realestate/cases").catch(() => []),
        api<Estimate[]>("/api/estimates").catch(() => []), api<CatalogueItem[]>("/api/catalogue").catch(() => []),
        api<BudgetUtil[]>("/api/reports/budget-utilization").catch(() => []), api<CertSummary[]>("/api/reports/certificates-summary").catch(() => [])]);
      setCerts(c); setBuildings(b); setAllocs(a); setTenders(tn); setCases(cs); setEstimates(es); setCatalogue(cat); setBudgetUtil(bu); setCertSummary(csum);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { if (authed) load(); }, [authed]);
  async function login(e: React.FormEvent) { e.preventDefault(); setErr("");
    try { const r = await api<{ token: string; role: string }>("/api/login", { method: "POST", body: JSON.stringify(form) });
      setToken(r.token); setRole(r.role); setAuthed(true); } catch (e: any) { setErr(e.message); } }
  async function logout() { try { await api("/api/logout", { method: "POST" }); } catch {} setToken(null); setAuthed(false); }
  async function act(fn: () => Promise<unknown>) { setErr(""); try { await fn(); load(); } catch (e: any) { setErr(e.message); } }

  if (!authed) return (<main className="wrap"><header><h1>{t.title}</h1>
    <button onClick={() => setLang(lang === "en" ? "ar" : "en")}>{lang === "en" ? "العربية" : "English"}</button></header>
    <form className="card" onSubmit={login}>
      <label>{t.user}<input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></label>
      <label>{t.pass}<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
      {err && <p className="err">{t.err}: {err}</p>}<button type="submit">{t.login}</button></form></main>);

  const tabs: [Tab, string][] = [["dash", t.dash], ["certs", t.certs], ["map", t.map], ["budget", t.budget], ["tenders", t.tenders], ["estate", t.estate], ["estimates", t.estimates], ["reports", t.reports], ["migration", t.migration]];
  return (<main className="wrap"><header><h1>{t.title}</h1><div><span>{t.role}: {role} </span>
    <button onClick={() => setLang(lang === "en" ? "ar" : "en")}>{lang === "en" ? "العربية" : "English"}</button>
    <button onClick={logout}>{t.logout}</button></div></header>
    <nav className="tabs">{tabs.map(([k, label]) => <button key={k} className={tab === k ? "tab active" : "tab"} onClick={() => setTab(k)}>{label}</button>)}</nav>
    {err && <p className="err">{t.err}: {err}</p>}

    {tab === "dash" && <section className="card"><h2>{t.dash}</h2>
      <p>{t.buildings}: {buildings.length} · {t.certs}: {certs.length} · {t.tenders}: {tenders.length} · {t.cases}: {cases.length}</p></section>}

    {tab === "certs" && <><section className="card"><h2>{t.newCert}</h2>
      <label>{t.qty}<input value={line.qty} onChange={e => setLine({ ...line, qty: e.target.value })} /></label>
      <label>{t.price}<input value={line.price} onChange={e => setLine({ ...line, price: e.target.value })} /></label>
      <label>{t.retention}<input value={line.retention} onChange={e => setLine({ ...line, retention: e.target.value })} /></label>
      <label>{t.payRef}<input value={payRef} onChange={e => setPayRef(e.target.value)} /></label>
      <button onClick={() => act(() => api("/api/certificates", { method: "POST", body: JSON.stringify({ kind: "construction",
        items: [{ description: "Works executed", unit: "m2", qty: line.qty, price: line.price }],
        deductions: [{ kind: "retention", percent: line.retention }] }) }))}>{t.create}</button></section>
      <section className="card"><h2>{t.certs}</h2><table><thead><tr><th>#</th><th>{t.kind}</th><th>{t.status}</th><th>{t.gross}</th><th>{t.ded}</th><th>{t.net}</th><th></th></tr></thead>
      <tbody>{certs.map(c => <tr key={c.id}><td>{c.id}</td><td>{c.kind}</td><td>{c.status}</td><td>{c.gross}</td><td>{c.deductions}</td><td>{c.net}</td>
        <td>{CERT_NEXT[c.status] && <button onClick={() => act(() => api(`/api/certificates/${c.id}/transition`, { method: "POST",
          body: JSON.stringify({ to: CERT_NEXT[c.status], payment_ref: CERT_NEXT[c.status] === "paid" ? payRef : undefined }) }))}>{t.advance} → {CERT_NEXT[c.status]}</button>}</td></tr>)}</tbody></table></section></>}

    {tab === "map" && <><section className="card"><h2>{t.buildings}</h2>
      <label>{t.nameEn}<input value={bForm.name_en} onChange={e => setBForm({ ...bForm, name_en: e.target.value })} /></label>
      <label>{t.nameAr}<input value={bForm.name_ar} onChange={e => setBForm({ ...bForm, name_ar: e.target.value })} /></label>
      <label>{t.blcd}<input value={bForm.legacy_blcd} onChange={e => setBForm({ ...bForm, legacy_blcd: e.target.value })} /></label>
      <button onClick={() => act(() => api("/api/buildings", { method: "POST", body: JSON.stringify(bForm) }))}>{t.create}</button></section>
      <section className="card"><table><thead><tr><th>#</th><th>{t.blcd}</th><th>{t.nameEn}</th><th>{t.nameAr}</th></tr></thead>
      <tbody>{buildings.map(b => <tr key={b.id}><td>{b.id}</td><td>{b.legacy_blcd ?? ""}</td><td>{b.name_en}</td><td>{b.name_ar}</td></tr>)}</tbody></table></section></>}

    {tab === "budget" && <><section className="card"><h2>{t.budget}</h2>
      <label>{t.fy}<input value={aForm.fiscal_year} onChange={e => setAForm({ ...aForm, fiscal_year: e.target.value })} /></label>
      <label>{t.chapter}<input value={aForm.chapter} onChange={e => setAForm({ ...aForm, chapter: e.target.value })} /></label>
      <label>{t.item}<input value={aForm.item} onChange={e => setAForm({ ...aForm, item: e.target.value })} /></label>
      <label>{t.allocated}<input value={aForm.allocated} onChange={e => setAForm({ ...aForm, allocated: e.target.value })} /></label>
      <button onClick={() => act(() => api("/api/budget", { method: "POST", body: JSON.stringify({ fiscal_year: aForm.fiscal_year,
        chapter: Number(aForm.chapter), item: Number(aForm.item), allocated: aForm.allocated }) }))}>{t.create}</button></section>
      <section className="card"><table><thead><tr><th>{t.fy}</th><th>{t.chapter}</th><th>{t.item}</th><th>{t.allocated}</th><th>{t.committed}</th><th>{t.spent}</th><th>{t.available}</th></tr></thead>
      <tbody>{allocs.map(a => <tr key={a.id}><td>{a.fiscal_year}</td><td>{a.chapter}</td><td>{a.item}</td><td>{a.allocated}</td><td>{a.committed}</td><td>{a.spent}</td><td>{a.available}</td></tr>)}</tbody></table></section></>}

    {tab === "tenders" && <><section className="card"><h2>{t.tenders}</h2>
      <label>{t.tenderTitle}<input value={tForm.title} onChange={e => setTForm({ title: e.target.value })} /></label>
      <button onClick={() => act(() => api("/api/tenders", { method: "POST", body: JSON.stringify(tForm) }))}>{t.create}</button></section>
      <section className="card"><table><thead><tr><th>#</th><th>{t.tenderTitle}</th><th>{t.stage}</th><th></th></tr></thead>
      <tbody>{tenders.map(x => <tr key={x.id}><td>{x.id}</td><td>{x.title}</td><td>{x.stage}</td>
        <td>{TENDER_NEXT[x.stage] && <button onClick={() => act(() => api(`/api/tenders/${x.id}/transition`, { method: "POST",
          body: JSON.stringify({ to: TENDER_NEXT[x.stage] }) }))}>{t.advance} → {TENDER_NEXT[x.stage]}</button>}</td></tr>)}</tbody></table></section></>}

    {tab === "estate" && <><section className="card"><h2>{t.cases}</h2>
      <button onClick={() => act(() => api("/api/realestate/cases", { method: "POST", body: JSON.stringify({}) }))}>{t.create}</button>
      <label>{t.decree}<input value={dForm.decree_no} onChange={e => setDForm({ ...dForm, decree_no: e.target.value })} /></label>
      <label>{t.decreeDate}<input value={dForm.decree_date} onChange={e => setDForm({ ...dForm, decree_date: e.target.value })} /></label>
      <label>{t.gazette}<input value={dForm.gazette_no} onChange={e => setDForm({ ...dForm, gazette_no: e.target.value })} /></label></section>
      <section className="card"><table><thead><tr><th>#</th><th>{t.status}</th><th>{t.decree}</th><th>{t.compensation}</th><th></th></tr></thead>
      <tbody>{cases.map(c => <tr key={c.id}><td>{c.id}</td><td>{c.stage}</td><td>{c.decree_no ?? ""}</td><td>{c.compensation ?? ""}</td>
        <td>{c.stage === "pre_decree" && <button onClick={() => act(() => api(`/api/realestate/cases/${c.id}/decree`, { method: "POST",
          body: JSON.stringify(dForm) }))}>{t.recordDecree}</button>}</td></tr>)}</tbody></table></section></>}

    {tab === "estimates" && <><section className="card"><h2>{t.catalogue}</h2>
      <label>{t.code}<input value={catForm.code} onChange={e => setCatForm({ ...catForm, code: e.target.value })} /></label>
      <label>{t.nameEn}<input value={catForm.name_en} onChange={e => setCatForm({ ...catForm, name_en: e.target.value })} /></label>
      <label>{t.nameAr}<input value={catForm.name_ar} onChange={e => setCatForm({ ...catForm, name_ar: e.target.value })} /></label>
      <label>{t.unit}<input value={catForm.unit} onChange={e => setCatForm({ ...catForm, unit: e.target.value })} /></label>
      <label>{t.price}<input value={catForm.standard_price} onChange={e => setCatForm({ ...catForm, standard_price: e.target.value })} /></label>
      <button onClick={() => act(() => api("/api/catalogue", { method: "POST", body: JSON.stringify(catForm) }))}>{t.create}</button>
      <table><thead><tr><th>{t.code}</th><th>{t.nameEn}</th><th>{t.nameAr}</th><th>{t.unit}</th><th>{t.price}</th></tr></thead>
      <tbody>{catalogue.map(i => <tr key={i.id}><td>{i.code}</td><td>{i.name_en}</td><td>{i.name_ar}</td><td>{i.unit}</td><td>{i.standard_price}</td></tr>)}</tbody></table></section>
      <section className="card"><h2>{t.estimates}</h2>
      <label>{t.tenderTitle}<input value={estForm.title} onChange={e => setEstForm({ ...estForm, title: e.target.value })} /></label>
      <label>{t.catalogue}<select value={estForm.catalogue_item_id} onChange={e => setEstForm({ ...estForm, catalogue_item_id: e.target.value })}>
        <option value="">—</option>{catalogue.map(i => <option key={i.id} value={i.id}>{i.code} — {lang === "ar" ? i.name_ar : i.name_en}</option>)}</select></label>
      <label>{t.qty}<input value={estForm.qty} onChange={e => setEstForm({ ...estForm, qty: e.target.value })} /></label>
      <button onClick={() => act(() => api("/api/estimates", { method: "POST", body: JSON.stringify({ title: estForm.title,
        items: [{ catalogue_item_id: Number(estForm.catalogue_item_id), qty: estForm.qty }] }) }))}>{t.create}</button>
      <table><thead><tr><th>#</th><th>{t.tenderTitle}</th><th>{t.status}</th><th>{t.revision}</th><th>{t.total}</th><th></th></tr></thead>
      <tbody>{estimates.map(x => <tr key={x.id}><td>{x.id}</td><td>{x.title}</td><td>{x.status}</td><td>{x.revision}</td><td>{x.total}</td>
        <td>{x.status === "draft" && <button onClick={() => act(() => api(`/api/estimates/${x.id}/transition`, { method: "POST", body: JSON.stringify({ to: "reviewed" }) }))}>{t.advance} → reviewed</button>}
        {x.status === "reviewed" && <><button onClick={() => act(() => api(`/api/estimates/${x.id}/transition`, { method: "POST", body: JSON.stringify({ to: "approved" }) }))}>{t.advance} → approved</button>
        <button onClick={() => act(() => api(`/api/estimates/${x.id}/transition`, { method: "POST", body: JSON.stringify({ to: "draft" }) }))}>↩ draft</button></>}</td></tr>)}</tbody></table></section></>}

    {tab === "reports" && <><section className="card"><h2>{t.budget} — {t.reports}</h2>
      <table><thead><tr><th>{t.fy}</th><th>{t.allocated}</th><th>{t.committed}</th><th>{t.spent}</th><th>{t.available}</th></tr></thead>
      <tbody>{budgetUtil.map(r => <tr key={r.fiscal_year}><td>{r.fiscal_year}</td><td>{r.allocated}</td><td>{r.committed}</td><td>{r.spent}</td><td>{r.available}</td></tr>)}</tbody></table>
      <p><button onClick={async () => { const { getToken } = await import("./api");
        const res = await fetch("/api/reports/budget-utilization.csv", { headers: { Authorization: `Bearer ${getToken()}` } });
        if (!res.ok) { setErr(`CSV: HTTP ${res.status}`); return; }
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement("a"); a.href = url; a.download = "budget-utilization.csv"; a.click(); URL.revokeObjectURL(url); }}>CSV ↓</button></p></section>
      <section className="card"><h2>{t.certs} — {t.reports}</h2>
      <table><thead><tr><th>{t.status}</th><th>#</th><th>{t.gross}</th><th>{t.ded}</th><th>{t.net}</th></tr></thead>
      <tbody>{certSummary.map(r => <tr key={r.status}><td>{r.status}</td><td>{r.count}</td><td>{r.gross}</td><td>{r.deductions}</td><td>{r.net}</td></tr>)}</tbody></table></section></>}

    {tab === "migration" && <><section className="card"><h2>{t.migration} — {t.inventory}</h2>
      <p>{migInv ? `${migInv.total} legacy objects — ` + Object.entries(migInv.items.reduce((m: any, i: any) => (m[i.status] = (m[i.status] || 0) + 1, m), {})).map(([k, v]) => `${k}: ${v}`).join(" · ") : "…"}</p>
      <p><label>{t.chooseFile} <input type="file" onChange={async e => { const f = e.target.files?.[0]; setMigFile(f ? await f.arrayBuffer() : null); }} /></label></p>
      <p><button disabled={!migFile} onClick={() => act(async () => setMigPreview(await apiRaw("/api/migration/preview?layout=pblbuldg", migFile!)))}>{t.preview}</button>{" "}
      <button disabled={!migFile} onClick={() => act(async () => { const r: any = await apiRaw("/api/migration/import?layout=pblbuldg", migFile!); setMigMsg(`batch ${r.batchId}: loaded ${r.loaded}, rejected ${r.rejected.length}, staged ${r.stagedRowsForBatch}${r.alreadyRecorded ? " (already recorded — retry changed nothing)" : ""}`); await loadMigration(); })}>{t.runImport}</button></p>
      {migMsg && <p>{migMsg}</p>}
      {migPreview && <><h3>{t.preview} — batch {migPreview.batchId}</h3>
      <table><thead><tr>{Object.keys(migPreview.preview[0] ?? {}).map(k => <th key={k}>{k}</th>)}</tr></thead>
      <tbody>{migPreview.preview.map((r: any, i: number) => <tr key={i}>{Object.values(r).map((v: any, j: number) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody></table>
      <p>control totals: {JSON.stringify(migPreview.controlTotals)} · source totals: {JSON.stringify(migPreview.sourceTotals)} · rejected: {migPreview.rejected.length}</p></>}
      </section>
      <section className="card"><h2>{lang === "ar" ? "مراقبة الاستيراد المباشرة" : "Live import monitor"}</h2>
      <div className="row">
      <input placeholder="batch id" value={liveBatch} onChange={e => setLiveBatch(e.target.value)} />
      <button onClick={() => setLiveOn(!liveOn)}>{liveOn ? (lang === "ar" ? "إيقاف" : "Stop") : (lang === "ar" ? "مراقبة" : "Watch")}</button>
      </div>
      {liveProg && <div aria-live="polite">
      <p>{liveProg.batchId} · {liveProg.status}{liveProg.percentComplete !== null ? ` · ${liveProg.percentComplete}%` : ""}</p>
      <p>{lang === "ar" ? "تمت معالجة" : "processed"} {liveProg.processed} · {lang === "ar" ? "مقبول" : "accepted"} {liveProg.loaded} · {lang === "ar" ? "معزول" : "quarantined"} {liveProg.rejected} · checkpoint {liveProg.checkpointRecord} · keys {liveProg.keysIndexed}</p>
      <p>{liveProg.recordsPerSec ? `${liveProg.recordsPerSec} rec/s` : ""}{liveProg.etaSeconds ? ` · ETA ~${liveProg.etaSeconds}s (${lang === "ar" ? "تقدير" : "estimate"})` : ""}</p>
      </div>}
      </section>
      {migMetrics && <section className="card"><h2>Operations</h2>
      <p>batches {migMetrics.batches} · loaded {migMetrics.recordsLoaded} · quarantined {migMetrics.recordsRejected} · indexed keys {migMetrics.indexedKeys} · active approvals {migMetrics.activeApprovals} · last batch {migMetrics.lastBatchAt ? String(migMetrics.lastBatchAt).slice(0, 19).replace("T", " ") : "—"}</p>
      <p>intake: {migMetrics.intakeByStage.map((x: any) => `${x.stage} ${x.n}`).join(" · ") || "—"} · jobs: {migMetrics.jobsByState.map((x: any) => `${x.state} ${x.n}`).join(" · ") || "—"}</p></section>}
      <section className="card"><h2>{t.batches}</h2>
      <table><thead><tr><th>Batch</th><th>Layout</th><th>Total</th><th>Loaded</th><th>Rejected</th><th></th></tr></thead>
      <tbody>{migBatches.map(b => <tr key={b.batch_id}><td>{b.batch_id}</td><td>{b.layout_name}</td><td>{b.total_records}</td><td>{b.loaded}</td><td>{b.rejected}</td>
        <td><button onClick={() => act(async () => { setMigBatchSel(b.batch_id); setMigRejects(await api(`/api/migration/batches/${b.batch_id}/rejects`)); })}>{t.rejects}</button>{" "}
        <button onClick={() => act(async () => { const r: any = await api("/api/migration/transform", { method: "POST", body: JSON.stringify({ name: "buildings", batchId: b.batch_id }) }); setMigMsg(`transform buildings on ${b.batch_id}: inserted ${r.inserted}`); await load(); })}>{t.transform}</button>{" "}
        <button onClick={() => act(async () => setMigRecon(await api(`/api/migration/batches/${b.batch_id}/reconciliation`)))}>Reconciliation</button></td></tr>)}</tbody></table>
      {migBatchSel && <><h3>{t.rejects} — {migBatchSel}</h3>
      <table><thead><tr><th>#</th><th>Offset</th><th>Reason</th><th></th></tr></thead>
      <tbody>{migRejects.map(r => <tr key={r.id}><td>{r.id}</td><td>{r.record_offset}</td><td>{r.reason}{r.resubmitted_batch ? ` → ${r.resubmitted_batch}` : ""}</td>
        <td>{!r.resubmitted_batch && <button onClick={() => { setMigFixId(r.id); setMigFix('{"BLCD":"","SHNM":"","VGCD":""}'); }}>{t.resubmit}</button>}</td></tr>)}</tbody></table>
      {migFixId !== null && <p><input style={{ width: "70%" }} value={migFix} onChange={e => setMigFix(e.target.value)} />{" "}
        <button onClick={() => act(async () => { await api(`/api/migration/rejects/${migFixId}/resubmit`, { method: "POST", body: JSON.stringify({ values: JSON.parse(migFix) }) }); setMigFixId(null); setMigRejects(await api(`/api/migration/batches/${migBatchSel}/rejects`)); })}>{t.resubmit} #{migFixId}</button></p>}</>}
      <p><button onClick={() => setTab("map")}>{t.viewInModule} →</button></p></section>
      {migRecon && <section className="card"><h2>Reconciliation — {migRecon.batchId}</h2>
      <p>source {migRecon.sourceRecords} = loaded {migRecon.loadedRecords} + quarantined {migRecon.quarantinedRecords} · equation holds: {String(migRecon.countEquationHolds)} · duplicates preserved: {migRecon.duplicateOccurrences} · runs: {migRecon.runs}</p>
      <p>control totals: {JSON.stringify(migRecon.controlTotals)} · source totals: {JSON.stringify(migRecon.sourceTotals)}</p>
      <table><thead><tr><th>Quarantine reason</th><th>Count</th></tr></thead><tbody>{migRecon.quarantineReasons.map((q: any, i: number) => <tr key={i}><td>{q.reason}</td><td>{q.count}</td></tr>)}</tbody></table></section>}
      <section className="card"><h2>Intake pipeline</h2>
      <p><input value={migMember} onChange={e => setMigMember(e.target.value)} />{" "}
      <button onClick={() => act(async () => { await api("/api/migration/intake", { method: "POST", body: JSON.stringify({ member: migMember, dataClass: "customer" }) }); await loadMigration(); })}>Register received dataset</button></p>
      <table><thead><tr><th>#</th><th>Member</th><th>Class</th><th>Stage</th><th>By</th><th></th></tr></thead>
      <tbody>{migIntake.map(d => <tr key={d.id}><td>{d.id}</td><td>{d.member}</td><td>{d.data_class}</td><td>{d.stage}</td><td>{d.created_by}</td>
      <td>{!["accepted", "rejected"].includes(d.stage) && <button onClick={() => act(async () => { const ev = window.prompt("Evidence for this stage transition:"); if (!ev) return; const stages = ["received","registered","verified","profiled","mapped","approved","imported","reconciled","reviewed","accepted"]; const to = stages[stages.indexOf(d.stage) + 1]; await api(`/api/migration/intake/${d.id}/advance`, { method: "POST", body: JSON.stringify({ to, evidence: ev }) }); await loadMigration(); })}>Advance →</button>}</td></tr>)}</tbody></table></section>
      {migAudit.length > 0 && <section className="card"><h2>Audit trail (admin)</h2>
      <table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
      <tbody>{migAudit.slice(0, 50).map((a: any) => <tr key={a.id}><td>{String(a.at).slice(0, 19).replace("T", " ")}</td><td>{a.username ?? "—"}</td><td>{a.action}</td><td>{a.entity} {a.entity_id ?? ""}</td></tr>)}</tbody></table></section>}
      <section className="card"><h2>{t.approvals}</h2>
      <table><thead><tr><th>Member</th><th>Field</th><th>Transform</th><th>Approved by</th><th>Evidence</th></tr></thead>
      <tbody>{migApprovals.map((x, i) => <tr key={i}><td>{x.legacy_member}</td><td>{x.legacy_field}</td><td>{x.transform_name}</td><td>{x.approved_by}</td><td>{x.evidence_ref}</td></tr>)}</tbody></table></section></>}
  </main>);
}
