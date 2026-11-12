import { useEffect, useState } from "react";
import { api, getToken, setToken, type Certificate, type Building } from "./api";

// Bilingual shell: EN/AR toggle flips document direction; labels come from this dictionary.
const T = {
  en: { title: "GAEB Modern Platform", login: "Sign in", user: "Username", pass: "Password", logout: "Sign out",
    dashboard: "Dashboard", certificates: "Payment Certificates", buildings: "Buildings",
    gross: "Gross", deductions: "Deductions", net: "Net", status: "Status", kind: "Kind",
    newCert: "New certificate", qty: "Qty", price: "Price", retention: "Retention %", add: "Create (draft)",
    transition: "Advance", paymentRef: "Payment ref", role: "Role", err: "Error" },
  ar: { title: "منصة الهيئة العامة للأبنية التعليمية", login: "تسجيل الدخول", user: "اسم المستخدم", pass: "كلمة المرور", logout: "تسجيل الخروج",
    dashboard: "لوحة المتابعة", certificates: "المستخلصات", buildings: "المباني التعليمية",
    gross: "الإجمالي", deductions: "الاستقطاعات", net: "الصافي", status: "الحالة", kind: "النوع",
    newCert: "مستخلص جديد", qty: "الكمية", price: "السعر", retention: "نسبة الاحتجاز %", add: "إنشاء (مسودة)",
    transition: "تقديم الحالة", paymentRef: "مرجع السداد", role: "الدور", err: "خطأ" },
} as const;
type Lang = keyof typeof T;
const NEXT: Record<string, string> = { draft: "certified", certified: "billed", billed: "payment_authorized", payment_authorized: "paid" };

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];
  const [authed, setAuthed] = useState(!!getToken());
  const [role, setRole] = useState("");
  const [err, setErr] = useState("");
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [form, setForm] = useState({ username: "", password: "" });
  const [line, setLine] = useState({ qty: "100", price: "250.50", retention: "10" });
  const [payRef, setPayRef] = useState("");

  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; }, [lang]);
  async function load() {
    try {
      setCerts(await api<Certificate[]>("/api/certificates"));
      setBuildings(await api<Building[]>("/api/buildings"));
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { if (authed) load(); }, [authed]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try {
      const r = await api<{ token: string; role: string }>("/api/login", { method: "POST", body: JSON.stringify(form) });
      setToken(r.token); setRole(r.role); setAuthed(true);
    } catch (e: any) { setErr(e.message); }
  }
  async function logout() { try { await api("/api/logout", { method: "POST" }); } catch {} setToken(null); setAuthed(false); }
  async function createCert() {
    setErr("");
    try {
      await api("/api/certificates", { method: "POST", body: JSON.stringify({
        kind: "construction",
        items: [{ description: "Works executed", unit: "m2", qty: line.qty, price: line.price }],
        deductions: [{ kind: "retention", percent: line.retention }],
      })});
      load();
    } catch (e: any) { setErr(e.message); }
  }
  async function advance(c: Certificate) {
    setErr("");
    try {
      await api(`/api/certificates/${c.id}/transition`, { method: "POST",
        body: JSON.stringify({ to: NEXT[c.status], payment_ref: NEXT[c.status] === "paid" ? payRef : undefined }) });
      load();
    } catch (e: any) { setErr(e.message); }
  }

  if (!authed) return (
    <main className="wrap"><header><h1>{t.title}</h1>
      <button onClick={() => setLang(lang === "en" ? "ar" : "en")}>{lang === "en" ? "العربية" : "English"}</button></header>
      <form className="card" onSubmit={login}>
        <label>{t.user}<input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></label>
        <label>{t.pass}<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
        {err && <p className="err">{t.err}: {err}</p>}
        <button type="submit">{t.login}</button>
      </form></main>);

  return (
    <main className="wrap"><header><h1>{t.title}</h1><div>
      <span>{t.role}: {role} </span>
      <button onClick={() => setLang(lang === "en" ? "ar" : "en")}>{lang === "en" ? "العربية" : "English"}</button>
      <button onClick={logout}>{t.logout}</button></div></header>
      {err && <p className="err">{t.err}: {err}</p>}
      <section className="card"><h2>{t.dashboard}</h2>
        <p>{t.buildings}: {buildings.length} · {t.certificates}: {certs.length}</p></section>
      <section className="card"><h2>{t.newCert}</h2>
        <label>{t.qty}<input value={line.qty} onChange={e => setLine({ ...line, qty: e.target.value })} /></label>
        <label>{t.price}<input value={line.price} onChange={e => setLine({ ...line, price: e.target.value })} /></label>
        <label>{t.retention}<input value={line.retention} onChange={e => setLine({ ...line, retention: e.target.value })} /></label>
        <label>{t.paymentRef}<input value={payRef} onChange={e => setPayRef(e.target.value)} /></label>
        <button onClick={createCert}>{t.add}</button></section>
      <section className="card"><h2>{t.certificates}</h2>
        <table><thead><tr><th>#</th><th>{t.kind}</th><th>{t.status}</th><th>{t.gross}</th><th>{t.deductions}</th><th>{t.net}</th><th></th></tr></thead>
        <tbody>{certs.map(c => <tr key={c.id}><td>{c.id}</td><td>{c.kind}</td><td>{c.status}</td>
          <td>{c.gross}</td><td>{c.deductions}</td><td>{c.net}</td>
          <td>{NEXT[c.status] && <button onClick={() => advance(c)}>{t.transition} → {NEXT[c.status]}</button>}</td></tr>)}</tbody></table></section>
    </main>);
}
