import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutGrid, Globe2, School, CircleDollarSign, ScrollText, FileCheck2, BarChart3,
  Landmark, LineChart, DatabaseZap, ShieldCheck, Search, LogOut, Languages,
} from "lucide-react";
import { api, getToken, setToken } from "./api";
import { T, type Lang } from "./i18n";
import { ErrorBoundary, Skel, ToastCtx } from "./components";
import type { Ctx } from "./views-dash";
import { SchoolMapView, BudgetView, TendersView, CertificatesView, EstimatesView, RealEstateView } from "./views-ops";
// Chart-bearing views are code-split: ECharts loads only when a dashboard,
// the geo view or reports are opened.
const OverviewView = lazy(() => import("./views-dash").then(m => ({ default: m.OverviewView })));
const GeoView = lazy(() => import("./views-dash").then(m => ({ default: m.GeoView })));
const ReportsView = lazy(() => import("./views-reports").then(m => ({ default: m.ReportsView })));
const AdminView = lazy(() => import("./views-reports").then(m => ({ default: m.AdminView })));
const MigrationView = lazy(() => import("./views-migration").then(m => ({ default: m.MigrationView })));

type View = "overview" | "geo" | "map" | "budget" | "tenders" | "certificates" | "estimates" | "realestate" | "reports" | "migration" | "admin";
const VIEWS: View[] = ["overview", "geo", "map", "budget", "tenders", "certificates", "estimates", "realestate", "reports", "migration", "admin"];

function viewFromHash(): View {
  const h = location.hash.replace(/^#\/?/, "") as View;
  return VIEWS.includes(h) ? h : "overview";
}

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];
  const [authed, setAuthed] = useState(!!getToken());
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [view, setView] = useState<View>(viewFromHash);
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [badges, setBadges] = useState<{ tenders?: number; certs?: number }>({});
  const [toasts, setToasts] = useState<{ id: number; msg: string; err?: boolean }[]>([]);

  const notify = useCallback((msg: string, isErr?: boolean) => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, msg, err: isErr }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 5200);
  }, []);

  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; }, [lang]);
  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const go = useCallback((v: string) => { location.hash = `/${v}`; }, []);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const ov: any = await api("/api/overview");
        setBadges({ tenders: ov.counts.tenders, certs: ov.queues.certificates_draft });
      } catch { /* badges are decorative */ }
    })();
  }, [authed, view]);

  const [mapGov, setMapGov] = useState<number | null>(null);
  const ctx: Ctx = useMemo(() => ({ t, lang, notify, go: (v: string) => go(v),
    goMapGov: (code: number) => { setMapGov(code); go("map"); } }), [t, lang, notify, go]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try {
      const r = await api<{ token: string; role: string }>("/api/login", { method: "POST", body: JSON.stringify(form) });
      setToken(r.token); setRole(r.role); setUsername(form.username); setAuthed(true);
    } catch (e: any) { setErr(e.message); }
  }
  async function logout() {
    try { await api("/api/logout", { method: "POST" }); } catch { /* session already gone */ }
    setToken(null); setAuthed(false); setRole(""); setUsername("");
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0a1a33,#081426)", display: "grid", placeItems: "center", padding: 20 }}>
        <form onSubmit={login} style={{ background: "#fff", borderRadius: 14, padding: "28px 30px", width: "min(400px,94vw)", boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg,#0e9f8a,#2563eb)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 19 }}>G</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>GAEB</div>
              <div style={{ fontSize: 11.5, color: "var(--color-ink2)" }}>{t.authority}</div>
            </div>
            <button type="button" className="btn sec sm" style={{ marginInlineStart: "auto" }} onClick={() => setLang(lang === "en" ? "ar" : "en")}>
              <Languages size={13} /> {t.lang}
            </button>
          </div>
          <h1 style={{ fontSize: 19, margin: "14px 0 2px" }}>{t.welcome}</h1>
          <p style={{ color: "var(--color-ink2)", fontSize: 13, margin: "0 0 16px" }}>{t.title}</p>
          <label className="fld" style={{ marginBottom: 10 }}>{t.user}
            <input className="inp" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required autoComplete="username" /></label>
          <label className="fld" style={{ marginBottom: 14 }}>{t.pass}
            <input className="inp" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" /></label>
          {err && <p style={{ color: "var(--color-bad)", fontSize: 13 }} role="alert">{t.err}: {err}</p>}
          <button type="submit" className="btn" style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}>{t.login}</button>
        </form>
      </div>
    );
  }

  const nav: { group: string; items: [View, string, React.ReactNode, number?][] }[] = [
    { group: t.grp_exec, items: [
      ["overview", t.nav_overview, <LayoutGrid size={17} />],
      ["geo", t.nav_geo, <Globe2 size={17} />],
    ]},
    { group: t.grp_ops, items: [
      ["map", t.nav_map, <School size={17} />],
      ["budget", t.nav_budget, <CircleDollarSign size={17} />],
      ["tenders", t.nav_tenders, <ScrollText size={17} />, badges.tenders],
      ["certificates", t.nav_certs, <FileCheck2 size={17} />, badges.certs],
      ["estimates", t.nav_estimates, <BarChart3 size={17} />],
      ["realestate", t.nav_estate, <Landmark size={17} />],
    ]},
    { group: t.grp_gov, items: [
      ["migration", t.nav_migration, <DatabaseZap size={17} />],
      ["reports", t.nav_reports, <LineChart size={17} />],
      ["admin", t.nav_admin, <ShieldCheck size={17} />],
    ]},
  ];
  const initials = (username || "GA").slice(0, 2).toUpperCase();

  return (
    <ToastCtx.Provider value={notify}>
      <div className="shell" style={{ display: "grid", gridTemplateColumns: "224px 1fr", minHeight: "100vh" }}>
        <aside className="rail" style={{ background: "linear-gradient(180deg,#0a1a33,#081426)", color: "#c7d5ee", padding: "18px 14px", display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 0, height: "100vh" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "0 6px 14px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#0e9f8a,#2563eb)", display: "grid", placeItems: "center", fontWeight: 800, color: "#fff", fontSize: 16 }}>G</div>
            <div>
              <b style={{ color: "#fff", fontSize: 15, letterSpacing: ".06em", display: "block" }}>GAEB</b>
              <span style={{ fontSize: 10, color: "#7e97bb", letterSpacing: ".06em" }}>{t.authority}</span>
            </div>
          </div>
          <nav className="rail-nav" aria-label="primary" style={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
            {nav.map(g => (
              <div key={g.group}>
                <div className="rail-h">{g.group}</div>
                {g.items.map(([v, label, icon, bdg]) => (
                  <a key={v} href={`#/${v}`} className={`rail-link ${view === v ? "on" : ""}`} aria-current={view === v ? "page" : undefined}>
                    {icon}<span>{label}</span>
                    {bdg !== undefined && bdg > 0 && <span className="bdg">{bdg}</span>}
                  </a>
                ))}
              </div>
            ))}
          </nav>
          <div style={{ marginTop: "auto", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#0e9f8a)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <b style={{ color: "#fff", fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>{username || "—"}</b>
              <span style={{ fontSize: 11.5, color: "#8fa8cc" }}>{role ? `${t.role}: ${role}` : ""}</span>
            </div>
            <button onClick={logout} aria-label={t.logout} title={t.logout} style={{ marginInlineStart: "auto", background: "none", border: 0, color: "#a9bcdf", cursor: "pointer" }}><LogOut size={16} /></button>
          </div>
        </aside>

        <div style={{ minWidth: 0 }}>
          <h1 className="sr-only">GAEB — General Authority for Educational Buildings</h1>
          <header className="topbar" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 26px", background: "#fff", borderBottom: "1px solid var(--color-line)", position: "sticky", top: 0, zIndex: 30 }}>
            <form onSubmit={e => { e.preventDefault(); setMapQuery(search); go("map"); }} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 460 }}>
              <Search size={15} color="#8494ad" />
              <input className="inp" style={{ border: 0, background: "#f4f6fa" }} placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} aria-label={t.search} />
            </form>
            <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn sec sm" onClick={() => setLang(lang === "en" ? "ar" : "en")}><Languages size={13} /> {t.lang}</button>
              <button className="btn sec sm" onClick={logout}><LogOut size={13} /> {t.logout}</button>
            </div>
          </header>

          <main className="main" style={{ padding: "22px 26px 30px", maxWidth: 1520, margin: "0 auto" }}>
            <ErrorBoundary key={view}>
            <Suspense fallback={<Skel h={300} />}>
              {view === "overview" && <OverviewView {...ctx} />}
              {view === "geo" && <GeoView {...ctx} />}
              {view === "map" && <SchoolMapView {...ctx} initialQuery={mapQuery} initialGov={mapGov} />}
              {view === "budget" && <BudgetView {...ctx} />}
              {view === "tenders" && <TendersView {...ctx} />}
              {view === "certificates" && <CertificatesView {...ctx} />}
              {view === "estimates" && <EstimatesView {...ctx} />}
              {view === "realestate" && <RealEstateView {...ctx} />}
              {view === "reports" && <ReportsView {...ctx} />}
              {view === "migration" && <MigrationView {...ctx} goMap={() => go("map")} />}
              {view === "admin" && <AdminView {...ctx} username={username} role={role} />}
            </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        <div className="toast" aria-live="polite">
          {toasts.map(x => <div key={x.id} className={`tst ${x.err ? "err" : ""}`}>{x.msg}</div>)}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}
