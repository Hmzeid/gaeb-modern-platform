import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Building, type Allocation, type Tender, type Certificate, type ExCase, type Estimate, type CatalogueItem } from "./api";
import { CERT_NEXT, CERT_STAGES, TENDER_NEXT, TENDER_STAGES, EST_STAGES } from "./i18n";
import { fmtInt, fmtMoney, fmtPct } from "./format";
import { Panel, StatusChip, StageStepper, Drawer, DefList, Empty } from "./components";
import type { Ctx } from "./views-dash";

/* Shared helpers ─────────────────────────────────────────────────── */
function useAct(ctx: Ctx, reload: () => Promise<void>) {
  return async (fn: () => Promise<unknown>, okMsg?: string) => {
    try { await fn(); if (okMsg) ctx.notify(okMsg); await reload(); }
    catch (e: any) { ctx.notify(`${ctx.t.err}: ${e.message || e}`, true); }
  };
}
function FormRow({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", marginBottom: 12 }}>{children}</div>;
}
function F({ label, children, w = 170 }: { label: string; children: ReactNode; w?: number }) {
  return <label className="fld" style={{ width: w }}>{label}{children}</label>;
}

/* ═══════════════ SCHOOL MAP ═══════════════ */
export function SchoolMapView(ctx: Ctx & { initialQuery?: string }) {
  const { t, lang } = ctx;
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [govs, setGovs] = useState<{ code: number; name_en: string; name_ar: string }[]>([]);
  const [q, setQ] = useState(ctx.initialQuery ?? "");
  const [govFilter, setGovFilter] = useState("");
  const [sel, setSel] = useState<Building | null>(null);
  const [form, setForm] = useState({ name_en: "", name_ar: "", legacy_blcd: "", governorate_code: "", village_code: "" });
  const load = async () => {
    try { setBuildings(await api("/api/buildings?limit=200")); } catch (e: any) { ctx.notify(e.message, true); }
    try { setGovs(await api("/api/governorates")); } catch { /* optional */ }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (ctx.initialQuery !== undefined) setQ(ctx.initialQuery); }, [ctx.initialQuery]);
  const act = useAct(ctx, load);
  const govName = (code: number | null) => { const g = govs.find(x => x.code === code); return g ? (lang === "ar" ? g.name_ar : g.name_en) : "—"; };
  const rows = useMemo(() => buildings.filter(b => {
    const hit = !q || b.name_en.toLowerCase().includes(q.toLowerCase()) || b.name_ar.includes(q) || (b.legacy_blcd ?? "").includes(q);
    return hit && (!govFilter || String(b.governorate_code ?? "") === govFilter);
  }), [buildings, q, govFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title={t.newBuilding}>
        <FormRow>
          <F label={t.nameEn} w={200}><input className="inp" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></F>
          <F label={t.nameAr} w={200}><input className="inp" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></F>
          <F label={t.blcd} w={130}><input className="inp" value={form.legacy_blcd} onChange={e => setForm({ ...form, legacy_blcd: e.target.value })} /></F>
          <F label={t.governorate} w={170}>
            <select className="sel-inp" value={form.governorate_code} onChange={e => setForm({ ...form, governorate_code: e.target.value })}>
              <option value="">—</option>
              {govs.map(g => <option key={g.code} value={g.code}>{lang === "ar" ? g.name_ar : g.name_en}</option>)}
            </select></F>
          <F label={t.village} w={110}><input className="inp" value={form.village_code} onChange={e => setForm({ ...form, village_code: e.target.value })} /></F>
          <button className="btn" onClick={() => act(() => api("/api/buildings", { method: "POST", body: JSON.stringify({
            name_en: form.name_en, name_ar: form.name_ar, legacy_blcd: form.legacy_blcd || null,
            governorate_code: form.governorate_code ? Number(form.governorate_code) : null,
            village_code: form.village_code ? Number(form.village_code) : null }) }))}>{t.create}</button>
        </FormRow>
      </Panel>
      <Panel title={`${t.buildings} — ${fmtInt(rows.length, lang)}`} more={
        <span style={{ display: "flex", gap: 8 }}>
          <input className="inp" style={{ width: 210 }} placeholder={t.search} value={q} onChange={e => setQ(e.target.value)} aria-label={t.search} />
          <select className="sel-inp" style={{ width: 160 }} value={govFilter} onChange={e => setGovFilter(e.target.value)} aria-label={t.governorate}>
            <option value="">{t.allDirectorates}</option>
            {govs.map(g => <option key={g.code} value={g.code}>{lang === "ar" ? g.name_ar : g.name_en}</option>)}
          </select>
        </span>}>
        {rows.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>#</th><th>{t.blcd}</th><th>{t.nameEn}</th><th>{t.nameAr}</th><th>{t.governorate}</th></tr></thead>
            <tbody>{rows.map(b => (
              <tr key={b.id} onClick={() => setSel(b)} style={{ cursor: "pointer" }}>
                <td>{b.id}</td><td className="money">{b.legacy_blcd ?? "—"}</td><td>{b.name_en}</td><td>{b.name_ar}</td><td>{govName(b.governorate_code)}</td>
              </tr>))}
            </tbody></table>
        )}
      </Panel>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? (lang === "ar" ? sel.name_ar : sel.name_en) : ""}>
        {sel && <DefList rows={[
          ["#", String(sel.id)], [t.blcd, sel.legacy_blcd ?? "—"], [t.nameEn, sel.name_en], [t.nameAr, sel.name_ar],
          [t.governorate, govName(sel.governorate_code)],
        ]} />}
      </Drawer>
    </div>
  );
}

/* ═══════════════ BUDGET ═══════════════ */
export function BudgetView(ctx: Ctx) {
  const { t, lang } = ctx;
  const [allocs, setAllocs] = useState<Allocation[]>([]);
  const [form, setForm] = useState({ fiscal_year: "2026", chapter: "1", item: "1", allocated: "1000000" });
  const load = async () => { try { setAllocs(await api("/api/budget")); } catch (e: any) { ctx.notify(e.message, true); } };
  useEffect(() => { load(); }, []);
  const act = useAct(ctx, load);
  const totA = allocs.reduce((a, x) => a + Number(x.allocated), 0);
  const totS = allocs.reduce((a, x) => a + Number(x.spent), 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title={t.newAlloc}>
        <FormRow>
          <F label={t.fy} w={110}><input className="inp" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: e.target.value })} /></F>
          <F label={t.chapter} w={90}><input className="inp" value={form.chapter} onChange={e => setForm({ ...form, chapter: e.target.value })} /></F>
          <F label={t.item} w={90}><input className="inp" value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} /></F>
          <F label={t.allocated} w={160}><input className="inp" value={form.allocated} onChange={e => setForm({ ...form, allocated: e.target.value })} /></F>
          <button className="btn" onClick={() => act(() => api("/api/budget", { method: "POST", body: JSON.stringify({
            fiscal_year: form.fiscal_year, chapter: Number(form.chapter), item: Number(form.item), allocated: form.allocated }) }))}>{t.create}</button>
        </FormRow>
      </Panel>
      <Panel title={t.nav_budget} hint={totA ? `${t.k_exec}: ${fmtPct(totS, totA, lang)}` : undefined}>
        {allocs.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>{t.fy}</th><th>{t.chapter}</th><th>{t.item}</th><th className="num">{t.allocated}</th><th className="num">{t.committed}</th><th className="num">{t.spent}</th><th className="num">{t.available}</th><th style={{ width: 130 }}>{t.utilization}</th></tr></thead>
            <tbody>{allocs.map(a => { const u = Number(a.allocated) ? (Number(a.spent) / Number(a.allocated)) * 100 : 0; return (
              <tr key={a.id}><td>{a.fiscal_year}</td><td>{a.chapter}</td><td>{a.item}</td>
                <td className="num money">{fmtMoney(a.allocated, lang, false)}</td><td className="num money">{fmtMoney(a.committed, lang, false)}</td>
                <td className="num money">{fmtMoney(a.spent, lang, false)}</td><td className="num money">{fmtMoney(a.available, lang, false)}</td>
                <td><div className="prog"><i style={{ width: `${Math.min(100, u)}%` }} /></div></td></tr> ); })}
            </tbody></table>
        )}
      </Panel>
    </div>
  );
}

/* ═══════════════ TENDERS ═══════════════ */
export function TendersView(ctx: Ctx) {
  const { t, lang } = ctx;
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [title, setTitle] = useState("");
  const [sel, setSel] = useState<Tender | null>(null);
  const load = async () => { try { const r = await api<Tender[]>("/api/tenders"); setTenders(r); if (sel) setSel(r.find(x => x.id === sel.id) ?? null); } catch (e: any) { ctx.notify(e.message, true); } };
  useEffect(() => { load(); }, []);
  const act = useAct(ctx, load);
  const advance = (x: Tender) => act(() => api(`/api/tenders/${x.id}/transition`, { method: "POST", body: JSON.stringify({ to: TENDER_NEXT[x.stage] }) }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title={t.newTender}>
        <FormRow>
          <F label={t.tenderTitle} w={340}><input className="inp" value={title} onChange={e => setTitle(e.target.value)} /></F>
          <button className="btn" onClick={() => act(() => api("/api/tenders", { method: "POST", body: JSON.stringify({ title }) }))}>{t.create}</button>
        </FormRow>
      </Panel>
      <Panel title={t.nav_tenders}>
        {tenders.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>#</th><th>{t.tenderTitle}</th><th>{t.legacyRef}</th><th>{t.stage}</th><th>{t.actions}</th></tr></thead>
            <tbody>{tenders.map(x => (
              <tr key={x.id} onClick={() => setSel(x)} style={{ cursor: "pointer" }}>
                <td>{x.id}</td><td>{x.title}</td>
                <td className="money">{x.legacy_no ? `PBYTENDR № ${x.legacy_no}` : "—"}</td>
                <td><StatusChip s={x.stage} t={t} /></td>
                <td onClick={e => e.stopPropagation()}>{TENDER_NEXT[x.stage] && <button className="btn sm sec" onClick={() => advance(x)}>{t.advance} → {(t as any)[`st_${TENDER_NEXT[x.stage]}`] ?? TENDER_NEXT[x.stage]}</button>}</td>
              </tr>))}
            </tbody></table>
        )}
      </Panel>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.title ?? ""}>
        {sel && <>
          <StageStepper stages={TENDER_STAGES} current={sel.stage} t={t} />
          <DefList rows={[["#", String(sel.id)], [t.stage, <StatusChip s={sel.stage} t={t} />],
            [t.legacyRef, sel.legacy_no ? `PBYTENDR № ${sel.legacy_no} · type ${sel.legacy_type ?? "—"}` : "—"]]} />
          {TENDER_NEXT[sel.stage] && <div style={{ marginTop: 16 }}><button className="btn" onClick={() => advance(sel)}>{t.advance} → {(t as any)[`st_${TENDER_NEXT[sel.stage]}`] ?? TENDER_NEXT[sel.stage]}</button></div>}
        </>}
      </Drawer>
    </div>
  );
}

/* ═══════════════ CERTIFICATES ═══════════════ */
export function CertificatesView(ctx: Ctx) {
  const { t, lang } = ctx;
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [line, setLine] = useState({ qty: "100", price: "250.50", retention: "10" });
  const [payRef, setPayRef] = useState("");
  const [sel, setSel] = useState<Certificate | null>(null);
  const load = async () => { try { const r = await api<Certificate[]>("/api/certificates"); setCerts(r); if (sel) setSel(r.find(x => x.id === sel.id) ?? null); } catch (e: any) { ctx.notify(e.message, true); } };
  useEffect(() => { load(); }, []);
  const act = useAct(ctx, load);
  const advance = (c: Certificate) => act(() => api(`/api/certificates/${c.id}/transition`, { method: "POST",
    body: JSON.stringify({ to: CERT_NEXT[c.status], payment_ref: CERT_NEXT[c.status] === "paid" ? payRef : undefined }) }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title={t.newCert}>
        <FormRow>
          <F label={t.qty} w={100}><input className="inp" value={line.qty} onChange={e => setLine({ ...line, qty: e.target.value })} /></F>
          <F label={t.price} w={120}><input className="inp" value={line.price} onChange={e => setLine({ ...line, price: e.target.value })} /></F>
          <F label={t.retention} w={110}><input className="inp" value={line.retention} onChange={e => setLine({ ...line, retention: e.target.value })} /></F>
          <F label={t.payRef} w={150}><input className="inp" value={payRef} onChange={e => setPayRef(e.target.value)} /></F>
          <button className="btn" onClick={() => act(() => api("/api/certificates", { method: "POST", body: JSON.stringify({ kind: "construction",
            items: [{ description: "Works executed", unit: "m2", qty: line.qty, price: line.price }],
            deductions: [{ kind: "retention", percent: line.retention }] }) }))}>{t.create}</button>
        </FormRow>
      </Panel>
      <Panel title={t.nav_certs}>
        {certs.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>#</th><th>{t.kind}</th><th>{t.status}</th><th className="num">{t.gross}</th><th className="num">{t.ded}</th><th className="num">{t.net}</th><th>{t.actions}</th></tr></thead>
            <tbody>{certs.map(c => (
              <tr key={c.id} onClick={() => setSel(c)} style={{ cursor: "pointer" }}>
                <td>{c.id}</td><td><StatusChip s={c.kind} t={t} /></td><td><StatusChip s={c.status} t={t} /></td>
                <td className="num money">{fmtMoney(c.gross, lang, false)}</td><td className="num money">{fmtMoney(c.deductions, lang, false)}</td><td className="num money">{fmtMoney(c.net, lang, false)}</td>
                <td onClick={e => e.stopPropagation()}>{CERT_NEXT[c.status] && <button className="btn sm sec" onClick={() => advance(c)}>{t.advance} → {(t as any)[`st_${CERT_NEXT[c.status]}`] ?? CERT_NEXT[c.status]}</button>}</td>
              </tr>))}
            </tbody></table>
        )}
      </Panel>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `${t.nav_certs} #${sel.id}` : ""}>
        {sel && <>
          <StageStepper stages={CERT_STAGES} current={sel.status} t={t} />
          <DefList rows={[[t.kind, <StatusChip s={sel.kind} t={t} />], [t.status, <StatusChip s={sel.status} t={t} />],
            [t.gross, fmtMoney(sel.gross, lang)], [t.ded, fmtMoney(sel.deductions, lang)], [t.net, fmtMoney(sel.net, lang)],
            [t.payRef, sel.payment_ref ?? "—"]]} />
          {CERT_NEXT[sel.status] && <div style={{ marginTop: 16 }}><button className="btn" onClick={() => advance(sel)}>{t.advance} → {(t as any)[`st_${CERT_NEXT[sel.status]}`] ?? CERT_NEXT[sel.status]}</button></div>}
        </>}
      </Drawer>
    </div>
  );
}

/* ═══════════════ ESTIMATES ═══════════════ */
export function EstimatesView(ctx: Ctx) {
  const { t, lang } = ctx;
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [catForm, setCatForm] = useState({ code: "", name_en: "", name_ar: "", unit: "m2", standard_price: "100" });
  const [estForm, setEstForm] = useState({ title: "", catalogue_item_id: "", qty: "10" });
  const load = async () => { try { setEstimates(await api("/api/estimates")); setCatalogue(await api("/api/catalogue")); } catch (e: any) { ctx.notify(e.message, true); } };
  useEffect(() => { load(); }, []);
  const act = useAct(ctx, load);
  const trans = (x: Estimate, to: string) => act(() => api(`/api/estimates/${x.id}/transition`, { method: "POST", body: JSON.stringify({ to }) }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title={t.catalogue}>
        <FormRow>
          <F label={t.code} w={110}><input className="inp" value={catForm.code} onChange={e => setCatForm({ ...catForm, code: e.target.value })} /></F>
          <F label={t.nameEn} w={170}><input className="inp" value={catForm.name_en} onChange={e => setCatForm({ ...catForm, name_en: e.target.value })} /></F>
          <F label={t.nameAr} w={170}><input className="inp" value={catForm.name_ar} onChange={e => setCatForm({ ...catForm, name_ar: e.target.value })} /></F>
          <F label={t.unit} w={80}><input className="inp" value={catForm.unit} onChange={e => setCatForm({ ...catForm, unit: e.target.value })} /></F>
          <F label={t.price} w={110}><input className="inp" value={catForm.standard_price} onChange={e => setCatForm({ ...catForm, standard_price: e.target.value })} /></F>
          <button className="btn" onClick={() => act(() => api("/api/catalogue", { method: "POST", body: JSON.stringify(catForm) }))}>{t.create}</button>
        </FormRow>
        {catalogue.length > 0 && (
          <table className="dt"><thead><tr><th>{t.code}</th><th>{t.nameEn}</th><th>{t.nameAr}</th><th>{t.unit}</th><th className="num">{t.price}</th></tr></thead>
            <tbody>{catalogue.map(i => <tr key={i.id}><td className="money">{i.code}</td><td>{i.name_en}</td><td>{i.name_ar}</td><td>{i.unit}</td><td className="num money">{fmtMoney(i.standard_price, lang, false)}</td></tr>)}</tbody></table>
        )}
      </Panel>
      <Panel title={t.nav_estimates}>
        <FormRow>
          <F label={t.estTitle} w={240}><input className="inp" value={estForm.title} onChange={e => setEstForm({ ...estForm, title: e.target.value })} /></F>
          <F label={t.catalogue} w={240}>
            <select className="sel-inp" value={estForm.catalogue_item_id} onChange={e => setEstForm({ ...estForm, catalogue_item_id: e.target.value })}>
              <option value="">—</option>
              {catalogue.map(i => <option key={i.id} value={i.id}>{i.code} — {lang === "ar" ? i.name_ar : i.name_en}</option>)}
            </select></F>
          <F label={t.qty} w={90}><input className="inp" value={estForm.qty} onChange={e => setEstForm({ ...estForm, qty: e.target.value })} /></F>
          <button className="btn" onClick={() => act(() => api("/api/estimates", { method: "POST", body: JSON.stringify({ title: estForm.title,
            items: [{ catalogue_item_id: Number(estForm.catalogue_item_id), qty: estForm.qty }] }) }))}>{t.create}</button>
        </FormRow>
        {estimates.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>#</th><th>{t.estTitle}</th><th>{t.status}</th><th>{t.revision}</th><th className="num">{t.total}</th><th>{t.actions}</th></tr></thead>
            <tbody>{estimates.map(x => (
              <tr key={x.id}><td>{x.id}</td><td>{x.title}</td><td><StatusChip s={x.status} t={t} /></td><td>{x.revision}</td>
                <td className="num money">{fmtMoney(x.total, lang, false)}</td>
                <td>{x.status === "draft" && <button className="btn sm sec" onClick={() => trans(x, "reviewed")}>{t.advance} → {t.st_reviewed}</button>}
                  {x.status === "reviewed" && <span style={{ display: "inline-flex", gap: 6 }}>
                    <button className="btn sm sec" onClick={() => trans(x, "approved")}>{t.advance} → {t.st_approved}</button>
                    <button className="btn sm sec" onClick={() => trans(x, "draft")}>↩ {t.returnDraft}</button></span>}</td></tr>))}
            </tbody></table>
        )}
        <div style={{ marginTop: 10 }}><StageStepper stages={EST_STAGES} current="draft" t={t} /></div>
      </Panel>
    </div>
  );
}

/* ═══════════════ REAL ESTATE ═══════════════ */
export function RealEstateView(ctx: Ctx) {
  const { t, lang } = ctx;
  const [cases, setCases] = useState<ExCase[]>([]);
  const [dForm, setDForm] = useState({ decree_no: "", decree_date: "", gazette_no: "" });
  const load = async () => { try { setCases(await api("/api/realestate/cases")); } catch (e: any) { ctx.notify(e.message, true); } };
  useEffect(() => { load(); }, []);
  const act = useAct(ctx, load);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title={t.newCase}>
        <FormRow>
          <F label={t.decree} w={140}><input className="inp" value={dForm.decree_no} onChange={e => setDForm({ ...dForm, decree_no: e.target.value })} /></F>
          <F label={t.decreeDate} w={150}><input className="inp" type="date" value={dForm.decree_date} onChange={e => setDForm({ ...dForm, decree_date: e.target.value })} /></F>
          <F label={t.gazette} w={140}><input className="inp" value={dForm.gazette_no} onChange={e => setDForm({ ...dForm, gazette_no: e.target.value })} /></F>
          <button className="btn" onClick={() => act(() => api("/api/realestate/cases", { method: "POST", body: JSON.stringify({}) }))}>{t.create}</button>
        </FormRow>
        <div style={{ fontSize: 12, color: "var(--color-ink3)" }}>{t.recordDecree}: {t.decree} / {t.decreeDate} / {t.gazette}</div>
      </Panel>
      <Panel title={t.cases}>
        {cases.length === 0 ? <Empty text={t.empty} /> : (
          <table className="dt"><thead><tr><th>#</th><th>{t.status}</th><th>{t.decree}</th><th>{t.decreeDate}</th><th className="num">{t.compensation}</th><th>{t.actions}</th></tr></thead>
            <tbody>{cases.map(c => (
              <tr key={c.id}><td>{c.id}</td><td><StatusChip s={c.stage} t={t} /></td><td>{c.decree_no ?? "—"}</td><td>{c.decree_date ?? "—"}</td>
                <td className="num money">{c.compensation ? fmtMoney(c.compensation, lang, false) : "—"}</td>
                <td>{c.stage === "pre_decree" && <button className="btn sm sec" onClick={() => act(() => api(`/api/realestate/cases/${c.id}/decree`, { method: "POST", body: JSON.stringify(dForm) }))}>{t.recordDecree}</button>}</td></tr>))}
            </tbody></table>
        )}
      </Panel>
    </div>
  );
}
