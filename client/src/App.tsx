import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// ---------- Types & helpers ----------
type Lang = "en" | "ar";
type Scalar = string | number | boolean | null;
type Row = Record<string, Scalar>;
type Sess = { token: string; username: string; nameEn: string; nameAr: string; role: string };

const num = (v: Scalar | undefined): number => (typeof v === "number" ? v : Number(v ?? 0) || 0);
const str = (v: Scalar | undefined): string => (v == null ? "" : String(v));
const fmt = (n: number): string => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtMoney = (n: number): string => `EGP ${fmt(n)}`;
const fmtDateTime = (v: Scalar | undefined): string => {
  const s = str(v);
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
};

// ---------- i18n ----------
const T: Record<string, { en: string; ar: string }> = {
  dashboard: { en: "Dashboard", ar: "لوحة المتابعة" },
  reference: { en: "Reference Data", ar: "البيانات المرجعية" },
  schoolmap: { en: "School Map", ar: "الخريطة المدرسية" },
  budget: { en: "Budget", ar: "الموازنة" },
  purchases: { en: "Purchases & Contracts", ar: "المشتريات والعقود" },
  certificates: { en: "Payment Certificates", ar: "المستخلصات الفنية" },
  estimates: { en: "Estimates (BOQ)", ar: "المقايسات" },
  realestate: { en: "Real Estate", ar: "الملكية العقارية" },
  migration: { en: "Migration Center", ar: "مركز الترحيل" },
  audit: { en: "Audit Log", ar: "سجل التدقيق" },
  signOut: { en: "Sign out", ar: "تسجيل الخروج" },
  search: { en: "Search…", ar: "بحث…" },
  add: { en: "Add", ar: "إضافة" },
  edit: { en: "Edit", ar: "تعديل" },
  del: { en: "Delete", ar: "حذف" },
  save: { en: "Save", ar: "حفظ" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  confirmDelete: { en: "Tap again to confirm delete", ar: "اضغط مرة أخرى لتأكيد الحذف" },
  actions: { en: "Actions", ar: "إجراءات" },
  loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  noRows: { en: "No records found.", ar: "لا توجد سجلات." },
  role_admin: { en: "Admin", ar: "مدير النظام" },
  role_budget: { en: "Budget Officer", ar: "مسؤول الموازنة" },
  role_contracts: { en: "Contracts Officer", ar: "مسؤول العقود" },
  role_technical: { en: "Technical Officer", ar: "مسؤول فني" },
  role_viewer: { en: "Viewer (read-only)", ar: "مشاهد (قراءة فقط)" },
  readOnly: { en: "Your role is read-only for this module.", ar: "صلاحياتك للقراءة فقط في هذه الوحدة." },
};

type AppCtx = {
  token: string;
  lang: Lang;
  user: Sess;
  refs: Record<string, Row[]>;
  t: (k: string) => string;
  refName: (list: string, id: Scalar | undefined) => string;
  canWrite: (roles: string[]) => boolean;
};

const WRITE_ROLES: Record<string, string[]> = {
  governorates: ["admin"], centers: ["admin"], villages: ["admin"], stages: ["admin"], ownershipTypes: ["admin"],
  buildings: ["admin", "technical"], projects: ["admin", "technical"],
  fiscalYears: ["admin", "budget"], allocations: ["admin", "budget"], transactions: ["admin", "budget"],
  suppliers: ["admin", "contracts"], tenders: ["admin", "contracts"], offers: ["admin", "contracts"], claims: ["admin", "contracts"],
  lands: ["admin", "technical"], leases: ["admin", "technical"], expropriations: ["admin", "technical"],
  certificates: ["admin", "technical"], estimates: ["admin", "technical"],
};

// ---------- Shared UI ----------
const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";
const thCls = "px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-[var(--dim)] whitespace-nowrap";
const tdCls = "px-3 py-2 text-sm align-top";

function Btn(props: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "navy";
  disabled?: boolean;
  ariaLabel?: string;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles =
    props.variant === "primary"
      ? "bg-[var(--accent)] text-white hover:opacity-90"
      : props.variant === "danger"
        ? "bg-[var(--danger)] text-white hover:opacity-90"
        : props.variant === "navy"
          ? "bg-[var(--navy)] text-white hover:bg-[var(--navy2)]"
          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]";
  return (
    <button
      type={props.type ?? "button"}
      aria-label={props.ariaLabel}
      className={`${base} ${styles}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}

function Badge({ text, tone }: { text: string; tone?: string }) {
  const tones: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    blue: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    gray: "bg-stone-200 text-stone-700 dark:bg-stone-700/50 dark:text-stone-200",
    teal: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  };
  const map: Record<string, string> = {
    active: "green", completed: "green", migrated: "green", approved: "green", paid: "green", accepted: "green", settled: "green", allocated: "green", open: "blue",
    in_progress: "amber", submitted: "amber", under_review: "amber", evaluation: "amber", expiring: "amber", valuation: "amber", in_court: "amber", maintenance: "amber", completed_with_rejects: "amber",
    planned: "gray", draft: "gray", closed: "gray", available: "teal", under_construction: "blue", awarded: "teal", under_expropriation: "red", rejected: "red",
  };
  const cls = tones[tone ?? map[text] ?? "gray"] ?? tones.gray;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>{text.replaceAll("_", " ")}</span>;
}

function Progress({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-[var(--surface2)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${p}%` }} />
      </div>
      <span className="tnum text-xs text-[var(--dim)]">{p}%</span>
    </div>
  );
}

function Modal(props: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-label={props.title}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-5 shadow-xl sm:rounded-2xl ${props.wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{props.title}</h3>
          <Btn variant="ghost" ariaLabel="Close" onClick={props.onClose}>✕</Btn>
        </div>
        {props.children}
      </div>
    </div>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--dim)]">{props.label}</span>
      {props.children}
    </label>
  );
}

function ErrBox({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
      {error instanceof Error ? error.message : String(error)}
    </div>
  );
}

// ---------- Generic entity CRUD ----------
type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea";
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
};
type ColDef = { key: string; label: string; render?: (r: Row) => ReactNode };

function EntityCrud(props: {
  app: AppCtx;
  entity: string;
  title: string;
  subtitle?: string;
  columns: ColDef[];
  fields: FieldDef[];
  filters?: Array<{ key: string; label: string; options: Array<{ value: string; label: string }> }>;
  fixedValues?: Record<string, Scalar>;
}) {
  const { app, entity } = props;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [formErr, setFormErr] = useState<unknown>(null);

  const list = useQuery({
    queryKey: ["rows", entity, search],
    queryFn: () => api.listRows({ token: app.token, entity, search }),
  });

  const save = useMutation({
    mutationFn: async (args: { id: number | null; values: Row }) =>
      await api.saveRow({ token: app.token, entity, id: args.id, values: args.values }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rows", entity] });
      void qc.invalidateQueries({ queryKey: ["refs"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setEditing(null);
      setCreating(false);
      setFormErr(null);
    },
    onError: (e) => setFormErr(e),
  });
  const del = useMutation({
    mutationFn: async (id: number) => await api.deleteRow({ token: app.token, entity, id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rows", entity] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      setConfirmDel(null);
    },
    onError: (e) => setFormErr(e),
  });

  const rows = useMemo(() => {
    let rs = list.data?.rows ?? [];
    for (const f of props.filters ?? []) {
      const v = filterVals[f.key];
      if (v) rs = rs.filter((r) => str(r[f.key]) === v);
    }
    if (props.fixedValues) {
      for (const [k, v] of Object.entries(props.fixedValues)) rs = rs.filter((r) => r[k] === v);
    }
    return rs;
  }, [list.data, filterVals, props.filters, props.fixedValues]);

  const writable = app.canWrite(WRITE_ROLES[entity] ?? ["admin"]);
  const showForm = creating || editing;

  const submitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: Row = { ...(props.fixedValues ?? {}) };
    for (const f of props.fields) {
      const raw = fd.get(f.key);
      if (f.type === "number") values[f.key] = raw === "" || raw == null ? 0 : Number(raw);
      else if (f.type === "select" && f.options?.every((o) => o.value === "" || !Number.isNaN(Number(o.value)))) {
        values[f.key] = raw === "" || raw == null ? null : Number(raw);
      } else values[f.key] = raw == null ? "" : String(raw);
    }
    save.mutate({ id: editing ? num(editing.id) : null, values });
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{props.title}</h2>
          {props.subtitle ? <p className="text-sm text-[var(--dim)]">{props.subtitle}</p> : null}
        </div>
        {writable ? (
          <Btn variant="primary" onClick={() => { setCreating(true); setEditing(null); setFormErr(null); }}>
            + {app.t("add")}
          </Btn>
        ) : null}
      </div>
      {!writable ? <p className="mb-3 text-xs text-[var(--dim)]">{app.t("readOnly")}</p> : null}
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          aria-label={app.t("search")}
          className={`${inputCls} max-w-xs`}
          placeholder={app.t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {(props.filters ?? []).map((f) => (
          <select
            key={f.key}
            aria-label={f.label}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            value={filterVals[f.key] ?? ""}
            onChange={(e) => setFilterVals((s) => ({ ...s, [f.key]: e.target.value }))}
          >
            <option value="">{f.label}: All</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}
      </div>
      <ErrBox error={list.error ?? formErr} />
      {list.isPending ? (
        <p className="py-8 text-center text-sm text-[var(--dim)]">{app.t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--dim)]">{app.t("noRows")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface2)]/50">
                {props.columns.map((c) => (
                  <th key={c.key} className={thCls}>{c.label}</th>
                ))}
                {writable ? <th className={thCls}>{app.t("actions")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={num(r.id)} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface2)]/40">
                  {props.columns.map((c) => (
                    <td key={c.key} className={tdCls}>{c.render ? c.render(r) : str(r[c.key]) || "—"}</td>
                  ))}
                  {writable ? (
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <button
                        type="button"
                        aria-label={`${app.t("edit")} ${num(r.id)}`}
                        className="me-2 text-sm font-medium text-[var(--accent)]"
                        onClick={() => { setEditing(r); setCreating(false); setFormErr(null); }}
                      >
                        {app.t("edit")}
                      </button>
                      <button
                        type="button"
                        aria-label={`${app.t("del")} ${num(r.id)}`}
                        className="text-sm font-medium text-[var(--danger)]"
                        onClick={() => {
                          if (confirmDel === num(r.id)) del.mutate(num(r.id));
                          else setConfirmDel(num(r.id));
                        }}
                      >
                        {confirmDel === num(r.id) ? app.t("confirmDelete") : app.t("del")}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm ? (
        <Modal
          title={`${editing ? app.t("edit") : app.t("add")} — ${props.title}`}
          onClose={() => { setEditing(null); setCreating(false); }}
        >
          <form onSubmit={submitForm} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {props.fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === "select" ? (
                  <select name={f.key} aria-label={f.label} className={inputCls} defaultValue={editing ? str(editing[f.key]) : ""} required={f.required}>
                    <option value="">—</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea name={f.key} aria-label={f.label} className={inputCls} rows={3} defaultValue={editing ? str(editing[f.key]) : ""} required={f.required} />
                ) : (
                  <input
                    name={f.key}
                    aria-label={f.label}
                    className={inputCls}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    step={f.type === "number" ? "any" : undefined}
                    defaultValue={editing ? str(editing[f.key]) : ""}
                    required={f.required}
                  />
                )}
              </Field>
            ))}
            <div className="col-span-full">
              <ErrBox error={formErr} />
            </div>
            <div className="col-span-full flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => { setEditing(null); setCreating(false); }}>{app.t("cancel")}</Btn>
              <Btn variant="primary" type="submit" disabled={save.isPending}>{app.t("save")}</Btn>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

// ---------- Login ----------
const DEMO_ACCOUNTS = [
  { u: "admin", p: "admin123", role: "role_admin" },
  { u: "budget", p: "budget123", role: "role_budget" },
  { u: "contracts", p: "contracts123", role: "role_contracts" },
  { u: "technical", p: "tech123", role: "role_technical" },
  { u: "viewer", p: "viewer123", role: "role_viewer" },
];

function Login(props: { lang: Lang; setLang: (l: Lang) => void; onLogin: (s: Sess) => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState<unknown>(null);
  const ar = props.lang === "ar";
  const login = useMutation({
    mutationFn: async () => await api.login({ username, password }),
    onSuccess: (d) => props.onLogin(d),
    onError: (e) => setErr(e),
  });
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--navy)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <p className="text-xs font-semibold tracking-widest text-teal-300 uppercase">
            {ar ? "الهيئة العامة للأبنية التعليمية" : "General Authority for Educational Buildings"}
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            {ar ? "منصة تحديث نظام AS/400" : "AS/400 Modernization Platform"}
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            {ar ? "ترحيل مكتبة NEWLIBGAEB — IBM i V6R1 — إلى منصة حديثة" : "Migrating library NEWLIBGAEB (IBM i V6R1) to a modern platform"}
          </p>
        </div>
        <form
          className="rounded-2xl bg-[var(--surface)] p-6 shadow-xl"
          onSubmit={(e) => { e.preventDefault(); setErr(null); login.mutate(); }}
        >
          <div className="grid gap-3">
            <Field label={ar ? "اسم المستخدم" : "Username"}>
              <input aria-label="Username" className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </Field>
            <Field label={ar ? "كلمة المرور" : "Password"}>
              <input aria-label="Password" className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            <ErrBox error={err} />
            <Btn variant="primary" type="submit" disabled={login.isPending}>
              {login.isPending ? "…" : ar ? "تسجيل الدخول" : "Sign in"}
            </Btn>
          </div>
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="mb-2 text-xs font-medium text-[var(--dim)]">{ar ? "حسابات تجريبية — اضغط للتعبئة:" : "Demo accounts — tap to fill:"}</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.u}
                  type="button"
                  aria-label={`Use demo account ${a.u}`}
                  className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs hover:bg-[var(--surface2)]"
                  onClick={() => { setUsername(a.u); setPassword(a.p); }}
                >
                  {a.u} · {T[a.role]?.[props.lang]}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            aria-label="Toggle language"
            className="mt-4 w-full text-center text-sm font-medium text-[var(--accent)]"
            onClick={() => props.setLang(ar ? "en" : "ar")}
          >
            {ar ? "English" : "العربية"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
const LEGACY_STATS = [
  { en: "Source members analyzed", ar: "عضو مصدر تم تحليله", v: 502 },
  { en: "Data files (135 PF + 34 LF)", ar: "ملفات بيانات (135 فيزيائي + 34 منطقي)", v: 169 },
  { en: "Fields mapped", ar: "حقل تمت مقابلته", v: 1107 },
  { en: "Programs (270 RPG)", ar: "برنامج (270 RPG)", v: 333 },
  { en: "Modern tables generated", ar: "جدول حديث تم إنشاؤه", v: 125 },
];
const SUBSYSTEMS: Array<{ key: string; en: string; ar: string; files: number; programs: number }> = [
  { key: "budget", en: "Budget", ar: "الموازنة", files: 43, programs: 110 },
  { key: "schoolmap", en: "School Map", ar: "الخريطة المدرسية", files: 47, programs: 84 },
  { key: "certificates", en: "Technical Abstracts", ar: "المستخلصات الفنية", files: 25, programs: 25 },
  { key: "purchases", en: "Purchases & Contracts", ar: "المشتريات والعقود", files: 16, programs: 16 },
  { key: "estimates", en: "Estimates", ar: "المقايسات", files: 0, programs: 38 },
  { key: "realestate", en: "Real Estate", ar: "الملكية العقارية", files: 38, programs: 60 },
];
const APPROACH: Array<{ en: string; ar: string; den: string; dar: string }> = [
  { en: "1 · Analyze", ar: "١ · التحليل", den: "Parse all 502 SEU source members; inventory 169 files, 1,107 fields, keys and program dependencies.", dar: "تحليل ٥٠٢ عضو مصدر وحصر ١٦٩ ملفًا و١١٠٧ حقول والمفاتيح واعتماديات البرامج." },
  { en: "2 · Map", ar: "٢ · المقابلة", den: "Map every DDS field to a modern typed column; decode packed decimals, CCSID 420 Arabic text and coded values.", dar: "مقابلة كل حقل DDS بعمود حديث؛ فك الأعداد المضغوطة والنص العربي CCSID 420 والقيم المشفرة." },
  { en: "3 · Stage & validate", ar: "٣ · التجهيز والتحقق", den: "Land legacy extracts in staging tables; validate keys, lookups and amounts before anything touches production tables.", dar: "إنزال المستخلصات في جداول تجهيز والتحقق من المفاتيح والقيم المرجعية والمبالغ قبل الإنتاج." },
  { en: "4 · Load", ar: "٤ · التحميل", den: "Run ETL jobs per module with full reject reporting — duplicates and bad codes are rejected with reasons, never silently dropped.", dar: "تشغيل مهام ETL لكل وحدة مع تقرير كامل بالمرفوض وأسبابه — لا يُسقَط أي سجل بصمت." },
  { en: "5 · Reconcile & cut over", ar: "٥ · المطابقة والتحول", den: "Reconcile counts and totals against the AS/400, run both systems in parallel for one fiscal cycle, then cut over module by module.", dar: "مطابقة الأعداد والإجماليات مع AS/400 وتشغيل النظامين بالتوازي لدورة مالية ثم التحول وحدةً وحدة." },
];

function Dashboard({ app }: { app: AppCtx }) {
  const q = useQuery({ queryKey: ["dashboard", app.token], queryFn: () => api.getDashboard({ token: app.token }) });
  const ar = app.lang === "ar";
  const c = q.data?.counts ?? {};
  const statusOf = (key: string) => q.data?.modules.find((m) => m.key === key);
  const cards: Array<{ label: string; value: string }> = [
    { label: ar ? "مبنى تعليمي مسجل" : "Educational buildings", value: fmt(num(c.buildings)) },
    { label: ar ? "إجمالي الاعتمادات (ج.م)" : "Total allocated (EGP)", value: fmt(num(c.totalAllocated)) },
    { label: ar ? "إجمالي المنصرف (ج.م)" : "Total spent (EGP)", value: fmt(num(c.totalSpent)) },
    { label: ar ? "مناقصات مفتوحة/قيد التقييم" : "Tenders open / in evaluation", value: fmt(num(c.tendersOpen)) },
    { label: ar ? "مستخلصات قيد المراجعة" : "Certificates pending review", value: fmt(num(c.certsPending)) },
    { label: ar ? "قطعة أرض مسجلة" : "Land parcels", value: fmt(num(c.lands)) },
    { label: ar ? "عقد إيجار نشط" : "Active leases", value: fmt(num(c.leasesActive)) },
    { label: ar ? "مقايسة" : "Estimate documents", value: fmt(num(c.estimates)) },
  ];
  return (
    <div className="grid gap-6">
      <section>
        <h2 className="mb-1 text-xl font-semibold">{ar ? "نظرة عامة على الترحيل — NEWLIBGAEB" : "Migration overview — NEWLIBGAEB"}</h2>
        <p className="mb-4 text-sm text-[var(--dim)]">
          {ar ? "أرقام التحليل الفعلية من نظام AS/400 القديم (IBM i V6R1)." : "Real analysis figures from the legacy AS/400 estate (IBM i V6R1)."}
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {LEGACY_STATS.map((s) => (
            <div key={s.en} className="rounded-xl bg-[var(--navy)] p-4 text-white">
              <div className="tnum text-3xl font-bold">{fmt(s.v)}</div>
              <div className="mt-1 text-xs text-slate-300">{ar ? s.ar : s.en}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-3 font-semibold">{ar ? "حالة الترحيل حسب النظام الفرعي" : "Migration status by subsystem"}</h3>
        <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          {SUBSYSTEMS.map((s) => {
            const st = statusOf(s.key);
            return (
              <div key={s.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{ar ? s.ar : s.en} <span className="text-[var(--dim)]">· {ar ? s.en : s.ar}</span></span>
                  <span className="tnum text-xs text-[var(--dim)]">
                    {s.files > 0 ? `${s.files} ${ar ? "ملف" : "files"} · ` : ""}{s.programs} {ar ? "برنامج" : "programs"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1"><Progress pct={st?.percent ?? 0} /></div>
                  {st ? <Badge text={st.status} /> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-semibold">{ar ? "بيانات المنصة الحديثة الآن" : "Live data in the modern platform"}</h3>
        {q.isPending ? <p className="text-sm text-[var(--dim)]">{app.t("loading")}</p> : <ErrBox error={q.error} />}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="tnum text-xl font-bold break-all sm:text-2xl">{card.value}</div>
              <div className="mt-1 text-xs text-[var(--dim)]">{card.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-1 font-semibold">{ar ? "المنهجية المثلى للترحيل" : "The recommended migration approach"}</h3>
        <p className="mb-4 text-sm text-[var(--dim)]">
          {ar ? "كيف تنتقل الهيئة من AS/400 إلى هذه المنصة دون فقدان بيانات أو توقف عمل." : "How GAEB moves off the AS/400 without losing data or stopping operations."}
        </p>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {APPROACH.map((a) => (
            <li key={a.en} className="rounded-lg bg-[var(--surface2)]/60 p-3">
              <div className="mb-1 text-sm font-semibold text-[var(--accent)]">{ar ? a.ar : a.en}</div>
              <p className="text-sm text-[var(--dim)]">{ar ? a.dar : a.den}</p>
            </li>
          ))}
          <li className="rounded-lg bg-[var(--accent-soft)] p-3">
            <div className="mb-1 text-sm font-semibold text-[var(--accent)]">{ar ? "جرّبها الآن" : "Try it now"}</div>
            <p className="text-sm text-[var(--dim)]">
              {ar ? "من «مركز الترحيل» شغّل مهمة ترحيل الخريطة المدرسية أو الموازنة وشاهد السجلات تُحمَّل والمكررة تُرفض بأسباب واضحة." : "In Migration Center, run the School Map or Budget job and watch records load — and duplicates get rejected with reasons."}
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}

// ---------- Reference Data ----------
function ReferencePage({ app }: { app: AppCtx }) {
  const [tab, setTab] = useState("governorates");
  const govOpts = (app.refs.governorates ?? []).map((g) => ({ value: String(g.id), label: `${str(g.code)} — ${app.lang === "ar" ? str(g.nameAr) : str(g.nameEn)}` }));
  const centerOpts = (app.refs.centers ?? []).map((c) => ({ value: String(c.id), label: app.lang === "ar" ? str(c.nameAr) : str(c.nameEn) }));
  const nameCols: ColDef[] = [
    { key: "nameEn", label: "Name (EN)" },
    { key: "nameAr", label: "الاسم (AR)" },
  ];
  const nameFields: FieldDef[] = [
    { key: "nameEn", label: "Name (EN)", required: true },
    { key: "nameAr", label: "الاسم (AR)", required: true },
  ];
  const tabs = [
    { key: "governorates", label: app.lang === "ar" ? "المحافظات" : "Governorates" },
    { key: "centers", label: app.lang === "ar" ? "المراكز" : "Centers" },
    { key: "villages", label: app.lang === "ar" ? "القرى" : "Villages" },
    { key: "stages", label: app.lang === "ar" ? "المراحل التعليمية" : "Education Stages" },
    { key: "ownershipTypes", label: app.lang === "ar" ? "أنواع الملكية" : "Ownership Types" },
  ];
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Reference data">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            role="tab"
            aria-selected={tab === tb.key}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === tb.key ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-[var(--surface)]"}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>
      {tab === "governorates" ? (
        <EntityCrud app={app} entity="governorates" title={app.lang === "ar" ? "المحافظات" : "Governorates"}
          columns={[{ key: "code", label: "Code" }, ...nameCols]} fields={[{ key: "code", label: "Code", required: true }, ...nameFields]} />
      ) : tab === "centers" ? (
        <EntityCrud app={app} entity="centers" title={app.lang === "ar" ? "المراكز" : "Centers"}
          columns={[...nameCols, { key: "governorateId", label: app.lang === "ar" ? "المحافظة" : "Governorate", render: (r) => app.refName("governorates", r.governorateId) }]}
          fields={[...nameFields, { key: "governorateId", label: "Governorate", type: "select", options: govOpts, required: true }]} />
      ) : tab === "villages" ? (
        <EntityCrud app={app} entity="villages" title={app.lang === "ar" ? "القرى" : "Villages"}
          columns={[...nameCols, { key: "centerId", label: app.lang === "ar" ? "المركز" : "Center", render: (r) => app.refName("centers", r.centerId) }]}
          fields={[...nameFields, { key: "centerId", label: "Center", type: "select", options: centerOpts, required: true }]} />
      ) : tab === "stages" ? (
        <EntityCrud app={app} entity="stages" title={app.lang === "ar" ? "المراحل التعليمية" : "Education Stages"} columns={nameCols} fields={nameFields} />
      ) : (
        <EntityCrud app={app} entity="ownershipTypes" title={app.lang === "ar" ? "أنواع ملكية المباني" : "Building Ownership Types"} columns={nameCols} fields={nameFields} />
      )}
    </div>
  );
}

// ---------- School Map ----------
function SchoolMapPage({ app }: { app: AppCtx }) {
  const [tab, setTab] = useState("buildings");
  const ar = app.lang === "ar";
  const opts = (list: string, code = false) =>
    (app.refs[list] ?? []).map((r) => ({
      value: String(r.id),
      label: code ? `${str(r.code)} — ${ar ? str(r.nameAr) : str(r.nameEn)}` : ar ? str(r.nameAr) : str(r.nameEn),
    }));
  return (
    <div>
      <div className="mb-4 flex gap-1.5">
        {(["buildings", "projects"] as const).map((k) => (
          <button key={k} aria-label={k === "buildings" ? "Buildings" : "Projects"}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === k ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-[var(--surface)]"}`}
            onClick={() => setTab(k)}>
            {k === "buildings" ? (ar ? "المباني التعليمية" : "Educational Buildings") : (ar ? "مشروعات الإنشاء" : "Construction Projects")}
          </button>
        ))}
      </div>
      {tab === "buildings" ? (
        <EntityCrud
          app={app} entity="buildings"
          title={ar ? "سجل المباني التعليمية" : "Educational Buildings Registry"}
          subtitle="Legacy: SRCPLAN · PBLBULDG (key BLCD) · PLN105PF"
          filters={[
            { key: "governorateId", label: ar ? "المحافظة" : "Governorate", options: opts("governorates", true) },
            { key: "stageId", label: ar ? "المرحلة" : "Stage", options: opts("stages") },
            { key: "status", label: ar ? "الحالة" : "Status", options: ["active", "under_construction", "maintenance", "planned"].map((s) => ({ value: s, label: s.replaceAll("_", " ") })) },
          ]}
          columns={[
            { key: "code", label: "BLCD" },
            { key: "nameEn", label: ar ? "الاسم" : "Name", render: (r) => (<span>{ar ? str(r.nameAr) : str(r.nameEn)}<span className="block text-xs text-[var(--dim)]">{ar ? str(r.nameEn) : str(r.nameAr)}</span></span>) },
            { key: "governorateId", label: ar ? "المحافظة" : "Governorate", render: (r) => app.refName("governorates", r.governorateId) },
            { key: "stageId", label: ar ? "المرحلة" : "Stage", render: (r) => app.refName("stages", r.stageId) },
            { key: "plotArea", label: ar ? "مساحة الأرض م²" : "Plot m²", render: (r) => <span className="tnum">{fmt(num(r.plotArea))}</span> },
            { key: "classrooms", label: ar ? "فصول" : "Classrooms", render: (r) => <span className="tnum">{fmt(num(r.classrooms))}</span> },
            { key: "status", label: ar ? "الحالة" : "Status", render: (r) => <Badge text={str(r.status)} /> },
          ]}
          fields={[
            { key: "code", label: "Building code (BLCD)", required: true },
            { key: "nameEn", label: "Name (EN)", required: true },
            { key: "nameAr", label: "الاسم (AR)", required: true },
            { key: "governorateId", label: "Governorate", type: "select", options: opts("governorates", true) },
            { key: "centerId", label: "Center", type: "select", options: opts("centers") },
            { key: "villageId", label: "Village", type: "select", options: opts("villages") },
            { key: "stageId", label: "Education stage", type: "select", options: opts("stages") },
            { key: "eduType", label: "Education type (General / Language / STEM)" },
            { key: "ownershipId", label: "Ownership", type: "select", options: opts("ownershipTypes") },
            { key: "landOwner", label: "Land owner" },
            { key: "plotArea", label: "Plot area (m²)", type: "number" },
            { key: "buildingArea", label: "Building area (m²)", type: "number" },
            { key: "floors", label: "Floors", type: "number" },
            { key: "classrooms", label: "Classrooms", type: "number" },
            { key: "status", label: "Status", type: "select", options: ["active", "under_construction", "maintenance", "planned"].map((s) => ({ value: s, label: s })) },
          ]}
        />
      ) : (
        <EntityCrud
          app={app} entity="projects"
          title={ar ? "مشروعات إنشاء المدارس" : "School Construction Projects"}
          subtitle="Legacy: SRCPLAN project tracking"
          columns={[
            { key: "nameEn", label: ar ? "المشروع" : "Project", render: (r) => (<span>{ar ? str(r.nameAr) : str(r.nameEn)}<span className="block text-xs text-[var(--dim)]">{app.refName("buildings", r.buildingId)}</span></span>) },
            { key: "budget", label: ar ? "الميزانية" : "Budget", render: (r) => <span className="tnum">{fmtMoney(num(r.budget))}</span> },
            { key: "progress", label: ar ? "الإنجاز" : "Progress", render: (r) => <Progress pct={num(r.progress)} /> },
            { key: "status", label: ar ? "الحالة" : "Status", render: (r) => <Badge text={str(r.status)} /> },
            { key: "endDate", label: ar ? "الانتهاء" : "Ends" },
          ]}
          fields={[
            { key: "buildingId", label: "Building", type: "select", options: opts("buildings", true) },
            { key: "nameEn", label: "Name (EN)", required: true },
            { key: "nameAr", label: "الاسم (AR)", required: true },
            { key: "status", label: "Status", type: "select", options: ["planned", "in_progress", "completed", "on_hold"].map((s) => ({ value: s, label: s })) },
            { key: "startDate", label: "Start date", type: "date" },
            { key: "endDate", label: "End date", type: "date" },
            { key: "budget", label: "Budget (EGP)", type: "number" },
            { key: "progress", label: "Progress %", type: "number" },
          ]}
        />
      )}
    </div>
  );
}

// ---------- Budget ----------
function BudgetPage({ app }: { app: AppCtx }) {
  const [tab, setTab] = useState("allocations");
  const ar = app.lang === "ar";
  const dash = useQuery({ queryKey: ["dashboard", app.token], queryFn: () => api.getDashboard({ token: app.token }) });
  const c = dash.data?.counts ?? {};
  const allocated = num(c.totalAllocated);
  const spent = num(c.totalSpent);
  const govOpts = (app.refs.governorates ?? []).map((g) => ({ value: String(g.id), label: `${str(g.code)} — ${ar ? str(g.nameAr) : str(g.nameEn)}` }));
  const fyOpts = (app.refs.fiscalYears ?? []).map((f) => ({ value: String(f.id), label: str(f.label) }));
  const allocOpts = (app.refs.allocations ?? []).map((a) => ({ value: String(a.id), label: `${str(a.item)} — ${str(a.chapter).split("—")[0]?.trim()}` }));
  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="tnum text-2xl font-bold">{fmtMoney(allocated)}</div>
          <div className="text-xs text-[var(--dim)]">{ar ? "إجمالي الاعتمادات" : "Total allocated"}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="tnum text-2xl font-bold">{fmtMoney(spent)}</div>
          <div className="text-xs text-[var(--dim)]">{ar ? "إجمالي المنصرف" : "Total spent"}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="tnum text-2xl font-bold text-[var(--accent)]">{fmtMoney(allocated - spent)}</div>
          <div className="mb-2 text-xs text-[var(--dim)]">{ar ? "المتبقي" : "Remaining"}</div>
          <Progress pct={allocated > 0 ? Math.round((spent / allocated) * 100) : 0} />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["allocations", "transactions", "fiscalYears"] as const).map((k) => (
          <button key={k} aria-label={k}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === k ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-[var(--surface)]"}`}
            onClick={() => setTab(k)}>
            {k === "allocations" ? (ar ? "الاعتمادات" : "Allocations") : k === "transactions" ? (ar ? "المدفوعات والمقبوضات" : "Payments & Receipts") : (ar ? "السنوات المالية" : "Fiscal Years")}
          </button>
        ))}
      </div>
      {tab === "allocations" ? (
        <EntityCrud app={app} entity="allocations" title={ar ? "اعتمادات الموازنة" : "Budget Allocations"} subtitle="Legacy: BALANC5 · CBABDALW (keys LWYEAR + LWTAS)"
          columns={[
            { key: "chapter", label: ar ? "الباب" : "Chapter" },
            { key: "item", label: ar ? "البند" : "Item" },
            { key: "governorateId", label: ar ? "المحافظة" : "Governorate", render: (r) => app.refName("governorates", r.governorateId) },
            { key: "allocated", label: ar ? "المعتمد" : "Allocated", render: (r) => <span className="tnum">{fmtMoney(num(r.allocated))}</span> },
            { key: "spent", label: ar ? "المنصرف / المتبقي" : "Spent / Remaining", render: (r) => (<span className="tnum">{fmtMoney(num(r.spent))}<span className="block text-xs text-[var(--accent)]">{fmtMoney(num(r.allocated) - num(r.spent))} {ar ? "متبقي" : "left"}</span></span>) },
            { key: "pct", label: ar ? "نسبة الصرف" : "Spent %", render: (r) => <Progress pct={num(r.allocated) > 0 ? Math.round((num(r.spent) / num(r.allocated)) * 100) : 0} /> },
          ]}
          fields={[
            { key: "fiscalYearId", label: "Fiscal year", type: "select", options: fyOpts },
            { key: "chapter", label: "Chapter (باب)", required: true },
            { key: "item", label: "Item", required: true },
            { key: "governorateId", label: "Governorate", type: "select", options: govOpts },
            { key: "allocated", label: "Allocated (EGP)", type: "number" },
            { key: "spent", label: "Spent (EGP)", type: "number" },
          ]} />
      ) : tab === "transactions" ? (
        <EntityCrud app={app} entity="transactions" title={ar ? "المدفوعات والمقبوضات" : "Payments & Receipts"} subtitle="Legacy: CBARECPF receipts register"
          columns={[
            { key: "txnDate", label: ar ? "التاريخ" : "Date" },
            { key: "kind", label: ar ? "النوع" : "Type", render: (r) => <Badge text={str(r.kind)} tone={str(r.kind) === "receipt" ? "green" : "amber"} /> },
            { key: "description", label: ar ? "البيان" : "Description" },
            { key: "refNo", label: "Ref" },
            { key: "amount", label: ar ? "المبلغ" : "Amount", render: (r) => <span className="tnum">{fmtMoney(num(r.amount))}</span> },
          ]}
          fields={[
            { key: "kind", label: "Type", type: "select", options: [{ value: "payment", label: "Payment" }, { value: "receipt", label: "Receipt" }], required: true },
            { key: "txnDate", label: "Date", type: "date", required: true },
            { key: "description", label: "Description", required: true },
            { key: "amount", label: "Amount (EGP)", type: "number" },
            { key: "allocationId", label: "Allocation", type: "select", options: allocOpts },
            { key: "refNo", label: "Reference no." },
          ]} />
      ) : (
        <EntityCrud app={app} entity="fiscalYears" title={ar ? "السنوات المالية" : "Fiscal Years"}
          columns={[{ key: "year", label: "Year" }, { key: "label", label: "Label" }, { key: "status", label: "Status", render: (r) => <Badge text={str(r.status)} /> }]}
          fields={[
            { key: "year", label: "Year (e.g. 2026/2027)", required: true },
            { key: "label", label: "Label", required: true },
            { key: "status", label: "Status", type: "select", options: [{ value: "open", label: "open" }, { value: "closed", label: "closed" }] },
          ]} />
      )}
    </div>
  );
}

// ---------- Purchases & Contracts ----------
function TenderDetail({ app, tenderId, onBack }: { app: AppCtx; tenderId: number; onBack: () => void }) {
  const ar = app.lang === "ar";
  const q = useQuery({ queryKey: ["tender", app.token, tenderId], queryFn: () => api.getTenderDetail({ token: app.token, tenderId }) });
  const t = q.data?.tender;
  const supplierOpts = (app.refs.suppliers ?? []).map((s) => ({ value: String(s.id), label: ar ? str(s.nameAr) : str(s.nameEn) }));
  return (
    <section>
      <Btn variant="ghost" onClick={onBack}>← {ar ? "كل المناقصات" : "All tenders"}</Btn>
      {q.isPending ? <p className="py-6 text-sm text-[var(--dim)]">{app.t("loading")}</p> : <ErrBox error={q.error} />}
      {t ? (
        <div className="mt-3 grid gap-5">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">{str(t.number)} — {ar ? str(t.titleAr) : str(t.titleEn)}</h2>
                <p className="text-sm text-[var(--dim)]">{str(t.tenderType)} · {str(t.openDate)} → {str(t.closeDate)}</p>
              </div>
              <Badge text={str(t.status)} />
            </div>
          </div>
          <EntityCrud
            app={app} entity="offers" title={ar ? "عروض الموردين" : "Supplier Offers"} subtitle="Legacy: PBYPARTT (keys TYPE + TETNNO + TNSRNO)"
            fixedValues={{ tenderId }}
            columns={[
              { key: "supplierId", label: ar ? "المورد" : "Supplier", render: (r) => app.refName("suppliers", r.supplierId) },
              { key: "amount", label: ar ? "القيمة" : "Amount", render: (r) => <span className="tnum">{fmtMoney(num(r.amount))}</span> },
              { key: "status", label: ar ? "الحالة" : "Status", render: (r) => <Badge text={str(r.status)} /> },
            ]}
            fields={[
              { key: "supplierId", label: "Supplier", type: "select", options: supplierOpts, required: true },
              { key: "amount", label: "Amount (EGP)", type: "number" },
              { key: "status", label: "Status", type: "select", options: ["submitted", "under_review", "accepted", "rejected"].map((s) => ({ value: s, label: s })) },
            ]}
          />
          <div>
            <h3 className="mb-2 font-semibold">{ar ? "المطالبات المرتبطة" : "Related claims"}</h3>
            {(q.data?.claims ?? []).length === 0 ? (
              <p className="text-sm text-[var(--dim)]">{app.t("noRows")}</p>
            ) : (
              <div className="grid gap-2">
                {(q.data?.claims ?? []).map((cl) => (
                  <div key={num(cl.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                    <span>{str(cl.description)} <span className="text-[var(--dim)]">· {app.refName("suppliers", cl.supplierId)}</span></span>
                    <span className="flex items-center gap-2"><span className="tnum">{fmtMoney(num(cl.amount))}</span><Badge text={str(cl.status)} /></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PurchasesPage({ app }: { app: AppCtx }) {
  const [tab, setTab] = useState<"tenders" | "suppliers" | "claims">("tenders");
  const [selected, setSelected] = useState<number | null>(null);
  const ar = app.lang === "ar";
  if (selected != null) return <TenderDetail app={app} tenderId={selected} onBack={() => setSelected(null)} />;
  const supplierOpts = (app.refs.suppliers ?? []).map((s) => ({ value: String(s.id), label: ar ? str(s.nameAr) : str(s.nameEn) }));
  const tenderOpts = (app.refs.tenders ?? []).map((t) => ({ value: String(t.id), label: `${str(t.number)} — ${str(t.titleEn)}` }));
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["tenders", "suppliers", "claims"] as const).map((k) => (
          <button key={k} aria-label={k}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === k ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-[var(--surface)]"}`}
            onClick={() => setTab(k)}>
            {k === "tenders" ? (ar ? "المناقصات" : "Tenders") : k === "suppliers" ? (ar ? "الموردون والمقاولون" : "Suppliers") : (ar ? "المطالبات" : "Claims")}
          </button>
        ))}
      </div>
      {tab === "tenders" ? (
        <div>
          <EntityCrud app={app} entity="tenders" title={ar ? "المناقصات" : "Tenders"} subtitle="Legacy: CONTRACT · PBYTENDR (keys TYPE + TETNNO)"
            columns={[
              { key: "number", label: "No." },
              { key: "titleEn", label: ar ? "العنوان" : "Title", render: (r) => (<button type="button" aria-label={`Open tender ${str(r.number)}`} className="text-start font-medium text-[var(--accent)]" onClick={() => setSelected(num(r.id))}>{ar ? str(r.titleAr) : str(r.titleEn)}<span className="block text-xs font-normal text-[var(--dim)]">{str(r.tenderType)} · {str(r.openDate)} → {str(r.closeDate)}</span></button>) },
              { key: "status", label: ar ? "الحالة" : "Status", render: (r) => <Badge text={str(r.status)} /> },
            ]}
            fields={[
              { key: "number", label: "Tender number", required: true },
              { key: "tenderType", label: "Type", type: "select", options: ["Construction", "Maintenance", "Supplies", "Services"].map((s) => ({ value: s, label: s })), required: true },
              { key: "titleEn", label: "Title (EN)", required: true },
              { key: "titleAr", label: "العنوان (AR)", required: true },
              { key: "status", label: "Status", type: "select", options: ["open", "evaluation", "awarded", "closed"].map((s) => ({ value: s, label: s })) },
              { key: "openDate", label: "Open date", type: "date" },
              { key: "closeDate", label: "Close date", type: "date" },
            ]} />
          <p className="mt-2 text-xs text-[var(--dim)]">{ar ? "اضغط على عنوان المناقصة لعرض العروض والمطالبات." : "Tap a tender title to see its offers and claims."}</p>
        </div>
      ) : tab === "suppliers" ? (
        <EntityCrud app={app} entity="suppliers" title={ar ? "الموردون والمقاولون" : "Suppliers & Contractors"}
          columns={[
            { key: "nameEn", label: ar ? "الاسم" : "Name", render: (r) => (<span>{ar ? str(r.nameAr) : str(r.nameEn)}<span className="block text-xs text-[var(--dim)]">{ar ? str(r.nameEn) : str(r.nameAr)}</span></span>) },
            { key: "contact", label: ar ? "التواصل" : "Contact" },
            { key: "taxId", label: ar ? "الرقم الضريبي" : "Tax ID" },
          ]}
          fields={[
            { key: "nameEn", label: "Name (EN)", required: true },
            { key: "nameAr", label: "الاسم (AR)", required: true },
            { key: "contact", label: "Contact (email)" },
            { key: "taxId", label: "Tax ID" },
          ]} />
      ) : (
        <EntityCrud app={app} entity="claims" title={ar ? "مطالبات الموردين" : "Supplier Claims"} subtitle="Legacy: PBYCLAIM"
          columns={[
            { key: "claimDate", label: ar ? "التاريخ" : "Date" },
            { key: "description", label: ar ? "البيان" : "Description" },
            { key: "supplierId", label: ar ? "المورد" : "Supplier", render: (r) => app.refName("suppliers", r.supplierId) },
            { key: "amount", label: ar ? "القيمة" : "Amount", render: (r) => <span className="tnum">{fmtMoney(num(r.amount))}</span> },
            { key: "status", label: ar ? "الحالة" : "Status", render: (r) => <Badge text={str(r.status)} /> },
          ]}
          fields={[
            { key: "tenderId", label: "Tender", type: "select", options: tenderOpts },
            { key: "supplierId", label: "Supplier", type: "select", options: supplierOpts },
            { key: "amount", label: "Amount (EGP)", type: "number" },
            { key: "description", label: "Description", required: true },
            { key: "status", label: "Status", type: "select", options: ["open", "under_review", "approved", "rejected"].map((s) => ({ value: s, label: s })) },
            { key: "claimDate", label: "Date", type: "date" },
          ]} />
      )}
    </div>
  );
}

// ---------- Documents with line items (Certificates & Estimates) ----------
type DocItem = { description: string; unit: string; quantity: number; price: number };

function DocEditor(props: {
  app: AppCtx;
  kind: "cert" | "est";
  doc: Row | null;
  items: DocItem[];
  onClose: () => void;
}) {
  const { app, kind } = props;
  const qc = useQueryClient();
  const ar = app.lang === "ar";
  const [items, setItems] = useState<DocItem[]>(props.items.length ? props.items : [{ description: "", unit: "", quantity: 0, price: 0 }]);
  const [err, setErr] = useState<unknown>(null);
  const buildingOpts = (app.refs.buildings ?? []).map((b) => ({ value: String(b.id), label: `${str(b.code)} — ${ar ? str(b.nameAr) : str(b.nameEn)}` }));
  const gross = items.reduce((s, i) => s + i.quantity * i.price, 0);

  const save = useMutation({
    mutationFn: async (values: Row) => {
      if (kind === "cert") {
        const ded = num(values.deductionsPct);
        void ded;
        return await api.saveCertificate({ token: app.token, id: props.doc ? num(props.doc.id) : null, values, items });
      }
      return await api.saveEstimate({
        token: app.token, id: props.doc ? num(props.doc.id) : null, values,
        items: items.map((i) => ({ description: i.description, unit: i.unit, quantity: i.quantity, unitPrice: i.price })),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [kind === "cert" ? "certs" : "ests"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      props.onClose();
    },
    onError: (e) => setErr(e),
  });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    const getN = (k: string) => Number(fd.get(k) ?? 0) || 0;
    const values: Row =
      kind === "cert"
        ? { certNo: get("certNo"), buildingId: get("buildingId") ? Number(get("buildingId")) : null, contractor: get("contractor"), contractRef: get("contractRef"), certType: get("certType"), periodFrom: get("periodFrom"), periodTo: get("periodTo"), deductionsPct: getN("deductionsPct"), status: props.doc ? str(props.doc.status) || "draft" : "draft" }
        : { docNo: get("docNo"), buildingId: get("buildingId") ? Number(get("buildingId")) : null, projectName: get("projectName"), estType: get("estType"), status: get("status") || "draft" };
    save.mutate(values);
  };

  const d = props.doc ?? {};
  return (
    <Modal wide title={`${props.doc ? app.t("edit") : app.t("add")} — ${kind === "cert" ? (ar ? "مستخلص" : "Certificate") : (ar ? "مقايسة" : "Estimate")}`} onClose={props.onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kind === "cert" ? (
            <>
              <Field label={ar ? "رقم المستخلص" : "Certificate no."}><input name="certNo" aria-label="Certificate number" className={inputCls} defaultValue={str(d.certNo)} required /></Field>
              <Field label={ar ? "المبنى" : "Building"}>
                <select name="buildingId" aria-label="Building" className={inputCls} defaultValue={str(d.buildingId)}>
                  <option value="">—</option>
                  {buildingOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label={ar ? "المقاول" : "Contractor"}><input name="contractor" aria-label="Contractor" className={inputCls} defaultValue={str(d.contractor)} required /></Field>
              <Field label={ar ? "رقم العقد" : "Contract ref"}><input name="contractRef" aria-label="Contract reference" className={inputCls} defaultValue={str(d.contractRef)} /></Field>
              <Field label={ar ? "النوع" : "Type"}>
                <select name="certType" aria-label="Certificate type" className={inputCls} defaultValue={str(d.certType) || "construction"}>
                  <option value="construction">{ar ? "إنشاءات" : "Construction"}</option>
                  <option value="maintenance">{ar ? "صيانة" : "Maintenance"}</option>
                </select>
              </Field>
              <Field label={ar ? "نسبة الخصومات %" : "Deductions %"}><input name="deductionsPct" aria-label="Deductions percent" type="number" step="any" className={inputCls} defaultValue={str(d.deductionsPct)} /></Field>
              <Field label={ar ? "من" : "Period from"}><input name="periodFrom" aria-label="Period from" type="date" className={inputCls} defaultValue={str(d.periodFrom)} /></Field>
              <Field label={ar ? "إلى" : "Period to"}><input name="periodTo" aria-label="Period to" type="date" className={inputCls} defaultValue={str(d.periodTo)} /></Field>
            </>
          ) : (
            <>
              <Field label={ar ? "رقم المقايسة" : "Estimate no."}><input name="docNo" aria-label="Estimate number" className={inputCls} defaultValue={str(d.docNo)} required /></Field>
              <Field label={ar ? "المبنى" : "Building"}>
                <select name="buildingId" aria-label="Building" className={inputCls} defaultValue={str(d.buildingId)}>
                  <option value="">—</option>
                  {buildingOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label={ar ? "النوع" : "Type"}>
                <select name="estType" aria-label="Estimate type" className={inputCls} defaultValue={str(d.estType) || "construction"}>
                  <option value="construction">{ar ? "إنشاءات" : "Construction"}</option>
                  <option value="maintenance">{ar ? "صيانة" : "Maintenance"}</option>
                </select>
              </Field>
              <Field label={ar ? "اسم المشروع" : "Project name"}><input name="projectName" aria-label="Project name" className={inputCls} defaultValue={str(d.projectName)} required /></Field>
              <Field label={ar ? "الحالة" : "Status"}>
                <select name="status" aria-label="Status" className={inputCls} defaultValue={str(d.status) || "draft"}>
                  {["draft", "under_review", "approved"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </>
          )}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">{ar ? "بنود الأعمال" : "Line items"}</h4>
            <Btn variant="ghost" onClick={() => setItems((s) => [...s, { description: "", unit: "", quantity: 0, price: 0 }])}>+ {ar ? "بند" : "Item"}</Btn>
          </div>
          <div className="grid gap-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border)] p-2 sm:grid-cols-[1fr_90px_90px_110px_110px_36px]">
                <input aria-label={`Item ${idx + 1} description`} className={inputCls} placeholder={ar ? "وصف البند" : "Description"} value={it.description}
                  onChange={(e) => setItems((s) => s.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} />
                <input aria-label={`Item ${idx + 1} unit`} className={inputCls} placeholder={ar ? "الوحدة" : "Unit"} value={it.unit}
                  onChange={(e) => setItems((s) => s.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)))} />
                <input aria-label={`Item ${idx + 1} quantity`} className={inputCls} type="number" step="any" placeholder="Qty" value={it.quantity || ""}
                  onChange={(e) => setItems((s) => s.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) || 0 } : x)))} />
                <input aria-label={`Item ${idx + 1} ${kind === "cert" ? "price" : "unit price"}`} className={inputCls} type="number" step="any" placeholder={ar ? "السعر" : "Price"} value={it.price || ""}
                  onChange={(e) => setItems((s) => s.map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) || 0 } : x)))} />
                <div className="tnum flex items-center px-1 text-sm font-medium">{fmtMoney(it.quantity * it.price)}</div>
                <Btn variant="ghost" ariaLabel={`Remove item ${idx + 1}`} onClick={() => setItems((s) => s.filter((_, i) => i !== idx))}>✕</Btn>
              </div>
            ))}
          </div>
          <div className="tnum mt-2 text-end text-sm font-semibold">
            {ar ? "الإجمالي: " : "Gross total: "}{fmtMoney(gross)}
            {kind === "cert" ? <span className="ms-3 text-[var(--dim)]">{ar ? "الصافي يظهر بعد الحفظ حسب نسبة الخصم" : "Net is computed on save from the deductions %"}</span> : null}
          </div>
        </div>
        <ErrBox error={err} />
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={props.onClose}>{app.t("cancel")}</Btn>
          <Btn variant="primary" type="submit" disabled={save.isPending}>{app.t("save")}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function DocsPage({ app, kind }: { app: AppCtx; kind: "cert" | "est" }) {
  const ar = app.lang === "ar";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ doc: Row | null; items: DocItem[] } | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const writable = app.canWrite(WRITE_ROLES[kind === "cert" ? "certificates" : "estimates"] ?? ["admin"]);

  const certs = useQuery({ queryKey: ["certs", app.token, search], queryFn: () => api.getCertificates({ token: app.token, search }), enabled: kind === "cert" });
  const ests = useQuery({ queryKey: ["ests", app.token, search], queryFn: () => api.getEstimates({ token: app.token, search }), enabled: kind === "est" });

  const advance = useMutation({
    mutationFn: async (args: { id: number; status: string }) => await api.setCertificateStatus({ token: app.token, id: args.id, status: args.status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["certs"] }),
    onError: (e) => setErr(e),
  });
  const del = useMutation({
    mutationFn: async (id: number) => (kind === "cert" ? await api.deleteCertificate({ token: app.token, id }) : await api.deleteEstimate({ token: app.token, id })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [kind === "cert" ? "certs" : "ests"] });
      setConfirmDel(null);
    },
    onError: (e) => setErr(e),
  });

  const nextStatus: Record<string, string> = { draft: "submitted", submitted: "approved", approved: "paid" };
  const loading = kind === "cert" ? certs.isPending : ests.isPending;
  const loadErr = kind === "cert" ? certs.error : ests.error;

  const cards: Array<{ doc: Row; items: Row[]; gross: number; net: number }> =
    kind === "cert"
      ? (certs.data?.certificates ?? []).map((c) => ({ doc: c.cert, items: c.items, gross: c.gross, net: c.net }))
      : (ests.data?.estimates ?? []).map((e) => ({ doc: e.estimate, items: e.items, gross: e.total, net: e.total }));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{kind === "cert" ? (ar ? "المستخلصات الفنية" : "Technical Abstracts / Payment Certificates") : (ar ? "المقايسات" : "Estimates / BOQ")}</h2>
          <p className="text-sm text-[var(--dim)]">{kind === "cert" ? "Legacy: INV001PF / INVO01PF (keys BLCD + SUBTYP + TTNCD + DOCCD)" : "Legacy: SRCPLAN estimates"}</p>
        </div>
        {writable ? <Btn variant="primary" onClick={() => setEditor({ doc: null, items: [] })}>+ {app.t("add")}</Btn> : null}
      </div>
      {!writable ? <p className="mb-3 text-xs text-[var(--dim)]">{app.t("readOnly")}</p> : null}
      <input aria-label={app.t("search")} className={`${inputCls} mb-3 max-w-xs`} placeholder={app.t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
      <ErrBox error={loadErr ?? err} />
      {loading ? <p className="py-8 text-center text-sm text-[var(--dim)]">{app.t("loading")}</p> : cards.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--dim)]">{app.t("noRows")}</p>
      ) : (
        <div className="grid gap-3">
          {cards.map(({ doc, items, gross, net }) => {
            const id = num(doc.id);
            const status = str(doc.status);
            const docItems: DocItem[] = items.map((i) => ({
              description: str(i.description), unit: str(i.unit),
              quantity: num(i.quantity), price: num(kind === "cert" ? i.price : i.unitPrice),
            }));
            return (
              <article key={id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">
                      {str(kind === "cert" ? doc.certNo : doc.docNo)}
                      <span className="ms-2 text-sm font-normal text-[var(--dim)]">
                        {kind === "cert" ? `${str(doc.contractor)} · ${str(doc.contractRef)}` : str(doc.projectName)}
                      </span>
                    </h3>
                    <p className="text-xs text-[var(--dim)]">
                      {app.refName("buildings", doc.buildingId)}
                      {kind === "cert" ? ` · ${str(doc.certType)} · ${str(doc.periodFrom)} → ${str(doc.periodTo)}` : ` · ${str(doc.estType)}`}
                    </p>
                  </div>
                  <Badge text={status} />
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className={thCls}>{ar ? "البند" : "Item"}</th>
                        <th className={thCls}>{ar ? "الوحدة" : "Unit"}</th>
                        <th className={thCls}>{ar ? "الكمية" : "Qty"}</th>
                        <th className={thCls}>{ar ? "السعر" : "Price"}</th>
                        <th className={thCls}>{ar ? "القيمة" : "Total"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((i) => (
                        <tr key={num(i.id)} className="border-b border-[var(--border)] last:border-0">
                          <td className={tdCls}>{str(i.description)}</td>
                          <td className={tdCls}>{str(i.unit)}</td>
                          <td className={`${tdCls} tnum`}>{fmt(num(i.quantity))}</td>
                          <td className={`${tdCls} tnum`}>{fmtMoney(num(kind === "cert" ? i.price : i.unitPrice))}</td>
                          <td className={`${tdCls} tnum`}>{fmtMoney(num(i.quantity) * num(kind === "cert" ? i.price : i.unitPrice))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="tnum mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <span>{ar ? "الإجمالي" : "Gross"}: <strong>{fmtMoney(gross)}</strong></span>
                  {kind === "cert" ? (
                    <>
                      <span>{ar ? "خصومات" : "Deductions"} ({num(doc.deductionsPct)}%): <strong>{fmtMoney(gross - net)}</strong></span>
                      <span className="text-[var(--accent)]">{ar ? "الصافي المستحق" : "Net payable"}: <strong>{fmtMoney(net)}</strong></span>
                    </>
                  ) : null}
                </div>
                {writable ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Btn variant="ghost" onClick={() => setEditor({ doc, items: docItems })}>{app.t("edit")}</Btn>
                    {kind === "cert" && nextStatus[status] ? (
                      <Btn variant="navy" onClick={() => advance.mutate({ id, status: nextStatus[status] ?? "" })}>
                        {ar ? "تقديم إلى" : "Advance to"}: {nextStatus[status]}
                      </Btn>
                    ) : null}
                    <Btn variant="danger" onClick={() => { if (confirmDel === id) del.mutate(id); else setConfirmDel(id); }}>
                      {confirmDel === id ? app.t("confirmDelete") : app.t("del")}
                    </Btn>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      {editor ? <DocEditor app={app} kind={kind} doc={editor.doc} items={editor.items} onClose={() => setEditor(null)} /> : null}
    </section>
  );
}

// ---------- Real Estate ----------
function RealEstatePage({ app }: { app: AppCtx }) {
  const [tab, setTab] = useState<"lands" | "leases" | "expropriations">("lands");
  const ar = app.lang === "ar";
  const govOpts = (app.refs.governorates ?? []).map((g) => ({ value: String(g.id), label: `${str(g.code)} — ${ar ? str(g.nameAr) : str(g.nameEn)}` }));
  const buildingOpts = (app.refs.buildings ?? []).map((b) => ({ value: String(b.id), label: `${str(b.code)} — ${ar ? str(b.nameAr) : str(b.nameEn)}` }));
  const landOpts = (app.refs.lands ?? []).map((l) => ({ value: String(l.id), label: `${str(l.code)} — ${str(l.locationEn)}` }));
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["lands", "leases", "expropriations"] as const).map((k) => (
          <button key={k} aria-label={k}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === k ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-[var(--surface)]"}`}
            onClick={() => setTab(k)}>
            {k === "lands" ? (ar ? "قطع الأراضي" : "Land Parcels") : k === "leases" ? (ar ? "عقود الإيجار" : "Leases") : (ar ? "قضايا نزع الملكية" : "Expropriation Cases")}
          </button>
        ))}
      </div>
      {tab === "lands" ? (
        <EntityCrud app={app} entity="lands" title={ar ? "سجل قطع الأراضي" : "Land Parcels"} subtitle="Legacy: RECORD · PRC002PF (key LNDCOD)"
          columns={[
            { key: "code", label: "LNDCOD" },
            { key: "locationEn", label: ar ? "الموقع" : "Location", render: (r) => (<span>{ar ? str(r.locationAr) : str(r.locationEn)}<span className="block text-xs text-[var(--dim)]">{app.refName("governorates", r.governorateId)}</span></span>) },
            { key: "area", label: ar ? "المساحة م²" : "Area m²", render: (r) => <span className="tnum">{fmt(num(r.area))}</span> },
            { key: "ownership", label: ar ? "الملكية" : "Ownership" },
            { key: "status", label: ar ? "الحالة" : "Status", render: (r) => <Badge text={str(r.status)} /> },
          ]}
          fields={[
            { key: "code", label: "Land code (LNDCOD)", required: true },
            { key: "locationEn", label: "Location (EN)", required: true },
            { key: "locationAr", label: "الموقع (AR)", required: true },
            { key: "governorateId", label: "Governorate", type: "select", options: govOpts },
            { key: "area", label: "Area (m²)", type: "number" },
            { key: "ownership", label: "Ownership" },
            { key: "status", label: "Status", type: "select", options: ["available", "allocated", "under_expropriation"].map((s) => ({ value: s, label: s })) },
          ]} />
      ) : tab === "leases" ? (
        <EntityCrud app={app} entity="leases" title={ar ? "عقود إيجار المباني" : "Building Leases"} subtitle="Legacy: SRCRENT1 · REMV01PF / RNT003PF"
          columns={[
            { key: "buildingId", label: ar ? "المبنى" : "Building", render: (r) => app.refName("buildings", r.buildingId) },
            { key: "lessor", label: ar ? "المؤجر" : "Lessor" },
            { key: "annualRent", label: ar ? "الإيجار السنوي" : "Annual rent", render: (r) => <span className="tnum">{fmtMoney(num(r.annualRent))}</span> },
            { key: "endDate", label: ar ? "ينتهي" : "Ends" },
            { key: "status", label: ar ? "الحالة" : "Status", render: (r) => <Badge text={str(r.status)} /> },
          ]}
          fields={[
            { key: "buildingId", label: "Building", type: "select", options: buildingOpts },
            { key: "lessor", label: "Lessor", required: true },
            { key: "annualRent", label: "Annual rent (EGP)", type: "number" },
            { key: "startDate", label: "Start date", type: "date" },
            { key: "endDate", label: "End date", type: "date" },
            { key: "status", label: "Status", type: "select", options: ["active", "expiring", "ended"].map((s) => ({ value: s, label: s })) },
          ]} />
      ) : (
        <EntityCrud app={app} entity="expropriations" title={ar ? "قضايا نزع الملكية" : "Expropriation Cases"} subtitle="Legacy: RECORD"
          columns={[
            { key: "caseNo", label: ar ? "رقم القضية" : "Case no." },
            { key: "landId", label: ar ? "الأرض" : "Land", render: (r) => app.refName("lands", r.landId) },
            { key: "owner", label: ar ? "المالك" : "Owner" },
            { key: "compensation", label: ar ? "التعويض" : "Compensation", render: (r) => <span className="tnum">{fmtMoney(num(r.compensation))}</span> },
            { key: "status", label: ar ? "الحالة" : "Status", render: (r) => <Badge text={str(r.status)} /> },
          ]}
          fields={[
            { key: "caseNo", label: "Case number", required: true },
            { key: "landId", label: "Land parcel", type: "select", options: landOpts },
            { key: "owner", label: "Owner", required: true },
            { key: "compensation", label: "Compensation (EGP)", type: "number" },
            { key: "status", label: "Status", type: "select", options: ["open", "valuation", "in_court", "settled"].map((s) => ({ value: s, label: s })) },
          ]} />
      )}
    </div>
  );
}

// ---------- Migration Center ----------
function MigrationPage({ app }: { app: AppCtx }) {
  const ar = app.lang === "ar";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [subsystem, setSubsystem] = useState("");
  const [fileId, setFileId] = useState<number | null>(null);
  const [runErr, setRunErr] = useState<unknown>(null);
  const [lastRun, setLastRun] = useState<{ module: string; messages: string[] } | null>(null);
  const [openJob, setOpenJob] = useState<number | null>(null);

  const mig = useQuery({ queryKey: ["migration", app.token], queryFn: () => api.getMigration({ token: app.token }) });
  const legacy = useQuery({
    queryKey: ["legacy", app.token, search, subsystem, fileId],
    queryFn: () => api.getLegacy({ token: app.token, search, subsystem, fileId }),
  });
  const run = useMutation({
    mutationFn: async (module: "schoolmap" | "budget") => await api.runMigration({ token: app.token, module }),
    onSuccess: (d, module) => {
      setLastRun({ module, messages: d.messages });
      void qc.invalidateQueries({ queryKey: ["migration"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["rows"] });
      void qc.invalidateQueries({ queryKey: ["refs"] });
    },
    onError: (e) => setRunErr(e),
  });

  const st = mig.data?.staging ?? {};
  const canRun = app.user.role !== "viewer";
  const jobMessages = (j: Row): string[] => {
    try {
      const p: unknown = JSON.parse(str(j.messages) || "[]");
      return Array.isArray(p) ? p.map((x) => String(x)) : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="grid gap-6">
      <section>
        <h2 className="mb-1 text-xl font-semibold">{ar ? "مهام الترحيل (ETL)" : "Migration jobs (ETL)"}</h2>
        <p className="mb-3 text-sm text-[var(--dim)]">
          {ar ? "تُستخرج الصفوف من جداول التجهيز بشكلها القديم، وتُتحقق، ثم تُحمَّل في الجداول الحديثة. الصفوف غير الصالحة تُرفض مع السبب." : "Rows are extracted from legacy-shaped staging tables, validated, and loaded into the modern tables. Invalid rows are rejected with reasons."}
        </p>
        <ErrBox error={runErr} />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {([
            { module: "schoolmap" as const, title: ar ? "الخريطة المدرسية — المباني" : "School Map — Buildings", src: "PBLBULDG → buildings", pending: num(st.buildingsPending), loaded: num(st.buildingsLoaded) },
            { module: "budget" as const, title: ar ? "الموازنة — الاعتمادات" : "Budget — Appropriations", src: "CBABDALW → allocations", pending: num(st.budgetPending), loaded: num(st.budgetLoaded) },
          ]).map((card) => (
            <div key={card.module} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="tnum text-xs text-[var(--dim)]">{card.src}</p>
                </div>
                <Btn variant="primary" disabled={!canRun || run.isPending || card.pending === 0} onClick={() => { setRunErr(null); run.mutate(card.module); }}>
                  {run.isPending ? "…" : ar ? "تشغيل الترحيل" : "Run migration"}
                </Btn>
              </div>
              <div className="tnum mt-3 flex gap-4 text-sm">
                <span>{ar ? "قيد الانتظار" : "Pending"}: <strong>{card.pending}</strong></span>
                <span>{ar ? "تم تحميله" : "Loaded"}: <strong>{card.loaded}</strong></span>
              </div>
              {lastRun?.module === card.module ? (
                <div className="mt-3 max-h-44 overflow-y-auto rounded-lg bg-[var(--navy)] p-3 font-mono text-xs leading-relaxed text-teal-100">
                  {lastRun.messages.map((m, i) => <div key={i}>{m}</div>)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {!canRun ? <p className="mt-2 text-xs text-[var(--dim)]">{app.t("readOnly")}</p> : null}
      </section>

      <section>
        <h3 className="mb-2 font-semibold">{ar ? "صفوف التجهيز" : "Staging rows"}</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full border-collapse">
              <thead><tr className="border-b border-[var(--border)] bg-[var(--surface2)]/50">
                <th className={thCls}>BLCD</th><th className={thCls}>{ar ? "المدرسة" : "School"}</th><th className={thCls}>Gov</th><th className={thCls}>{ar ? "الحالة" : "State"}</th>
              </tr></thead>
              <tbody>
                {(mig.data?.stagingRows.buildings ?? []).map((r) => (
                  <tr key={num(r.id)} className="border-b border-[var(--border)] last:border-0">
                    <td className={`${tdCls} tnum`}>{str(r.blcd)}</td>
                    <td className={tdCls}>{str(r.nameEn)}</td>
                    <td className={`${tdCls} tnum`}>{str(r.govCode)}</td>
                    <td className={tdCls}>{num(r.loaded) === 1 ? <Badge text="loaded" tone="green" /> : <Badge text="pending" tone="amber" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full border-collapse">
              <thead><tr className="border-b border-[var(--border)] bg-[var(--surface2)]/50">
                <th className={thCls}>LWYEAR/LWTAS</th><th className={thCls}>{ar ? "البند" : "Item"}</th><th className={thCls}>Gov</th><th className={thCls}>{ar ? "المبلغ" : "Amount"}</th><th className={thCls}>{ar ? "الحالة" : "State"}</th>
              </tr></thead>
              <tbody>
                {(mig.data?.stagingRows.budget ?? []).map((r) => (
                  <tr key={num(r.id)} className="border-b border-[var(--border)] last:border-0">
                    <td className={`${tdCls} tnum`}>{str(r.lwyear)}/{str(r.lwtas)}</td>
                    <td className={tdCls}>{str(r.item)}</td>
                    <td className={`${tdCls} tnum`}>{str(r.govCode)}</td>
                    <td className={`${tdCls} tnum`}>{fmt(num(r.amount))}</td>
                    <td className={tdCls}>{num(r.loaded) === 1 ? <Badge text="loaded" tone="green" /> : <Badge text="pending" tone="amber" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">{ar ? "سجل المهام" : "Job history"}</h3>
        {(mig.data?.jobs ?? []).length === 0 ? (
          <p className="text-sm text-[var(--dim)]">{ar ? "لم تُشغَّل أي مهمة بعد." : "No jobs run yet."}</p>
        ) : (
          <div className="grid gap-2">
            {(mig.data?.jobs ?? []).map((j) => (
              <div key={num(j.id)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <button type="button" aria-label={`Toggle job ${num(j.id)} log`} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-start text-sm" onClick={() => setOpenJob(openJob === num(j.id) ? null : num(j.id))}>
                  <strong>#{num(j.id)} {str(j.module)}</strong>
                  <Badge text={str(j.status)} />
                  <span className="tnum">{ar ? "قُرئ" : "Read"} {num(j.rowsRead)} · {ar ? "حُمّل" : "Loaded"} {num(j.rowsLoaded)} · {ar ? "رُفض" : "Rejected"} {num(j.rowsRejected)}</span>
                  <span className="text-[var(--dim)]">{str(j.startedBy)} · {fmtDateTime(j.createdAt)}</span>
                </button>
                {openJob === num(j.id) ? (
                  <div className="mt-2 max-h-52 overflow-y-auto rounded-lg bg-[var(--navy)] p-3 font-mono text-xs leading-relaxed text-teal-100">
                    {jobMessages(j).map((m, i) => <div key={i}>{m}</div>)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 font-semibold">{ar ? "جرد الملفات القديمة" : "Legacy inventory"}</h3>
        <p className="mb-3 text-sm text-[var(--dim)]">{ar ? "اضغط على أي ملف لعرض مقابلة حقوله بالجداول الحديثة." : "Select a file to see its field mapping to the modern schema."}</p>
        <div className="mb-3 flex flex-wrap gap-2">
          <input aria-label={app.t("search")} className={`${inputCls} max-w-xs`} placeholder={app.t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select aria-label="Subsystem" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" value={subsystem} onChange={(e) => setSubsystem(e.target.value)}>
            <option value="">{ar ? "كل الأنظمة" : "All subsystems"}</option>
            {["Budget", "School Map", "Purchases & Contracts", "Technical Abstracts", "Real Estate"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <ErrBox error={legacy.error} />
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-[var(--border)] bg-[var(--surface2)]/50">
              <th className={thCls}>Member</th><th className={thCls}>{ar ? "النظام" : "Subsystem"}</th><th className={thCls}>{ar ? "النوع" : "Kind"}</th><th className={thCls}>{ar ? "حقول" : "Fields"}</th><th className={thCls}>{ar ? "المفاتيح" : "Keys"}</th><th className={thCls}>{ar ? "الوصف" : "Description"}</th><th className={thCls}>{ar ? "الجدول الحديث" : "Modern table"}</th>
            </tr></thead>
            <tbody>
              {(legacy.data?.files ?? []).map((f) => (
                <tr key={num(f.id)} className={`cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface2)]/40 ${fileId === num(f.id) ? "bg-[var(--accent-soft)]" : ""}`}
                  onClick={() => setFileId(num(f.id))}>
                  <td className={`${tdCls} tnum font-semibold`}>{str(f.member)}</td>
                  <td className={tdCls}>{str(f.subsystem)}</td>
                  <td className={tdCls}><Badge text={str(f.kind)} tone={str(f.kind) === "PF" ? "blue" : "gray"} /></td>
                  <td className={`${tdCls} tnum`}>{num(f.fieldCount)}</td>
                  <td className={`${tdCls} tnum text-xs`}>{str(f.keysText)}</td>
                  <td className={tdCls}>{str(f.description)}</td>
                  <td className={`${tdCls} tnum text-[var(--accent)]`}>{str(f.modernTable)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {fileId != null ? (
          <div className="mt-4">
            <h4 className="mb-2 font-semibold">
              {ar ? "مقابلة الحقول" : "Field mapping"} — {(legacy.data?.files ?? []).find((f) => num(f.id) === fileId)?.member ?? ""}
            </h4>
            {(legacy.data?.mappings ?? []).length === 0 ? (
              <p className="text-sm text-[var(--dim)]">{ar ? "لا توجد مقابلة حقول موثقة لهذا الملف بعد — تُستكمل في مرحلة التحليل التفصيلي." : "No field-level mapping documented for this file yet — completed during detailed analysis."}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <table className="w-full border-collapse">
                  <thead><tr className="border-b border-[var(--border)] bg-[var(--surface2)]/50">
                    <th className={thCls}>{ar ? "حقل DDS" : "DDS field"}</th><th className={thCls}>{ar ? "النوع القديم" : "Legacy type"}</th><th className={thCls}>→</th><th className={thCls}>{ar ? "العمود الحديث" : "Modern column"}</th><th className={thCls}>{ar ? "النوع الحديث" : "Modern type"}</th><th className={thCls}>{ar ? "ملاحظات التحويل" : "Transform notes"}</th>
                  </tr></thead>
                  <tbody>
                    {(legacy.data?.mappings ?? []).map((m) => (
                      <tr key={num(m.id)} className="border-b border-[var(--border)] last:border-0">
                        <td className={`${tdCls} tnum font-medium`}>{str(m.legacyField)}</td>
                        <td className={`${tdCls} tnum text-xs`}>{str(m.legacyType)}</td>
                        <td className={tdCls}>→</td>
                        <td className={`${tdCls} tnum font-medium text-[var(--accent)]`}>{str(m.modernColumn)}</td>
                        <td className={`${tdCls} tnum text-xs`}>{str(m.modernType)}</td>
                        <td className={tdCls}>{str(m.notes) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

// ---------- Audit ----------
function AuditPage({ app }: { app: AppCtx }) {
  const ar = app.lang === "ar";
  const q = useQuery({ queryKey: ["audit", app.token], queryFn: () => api.getAudit({ token: app.token, limit: 80 }) });
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">{ar ? "سجل التدقيق" : "Audit Log"}</h2>
      <ErrBox error={q.error} />
      {q.isPending ? <p className="py-8 text-center text-sm text-[var(--dim)]">{app.t("loading")}</p> : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-[var(--border)] bg-[var(--surface2)]/50">
              <th className={thCls}>{ar ? "الوقت" : "Time"}</th><th className={thCls}>{ar ? "المستخدم" : "User"}</th><th className={thCls}>{ar ? "الإجراء" : "Action"}</th><th className={thCls}>{ar ? "الكيان" : "Entity"}</th><th className={thCls}>{ar ? "التفاصيل" : "Details"}</th>
            </tr></thead>
            <tbody>
              {(q.data?.entries ?? []).map((e) => (
                <tr key={num(e.id)} className="border-b border-[var(--border)] last:border-0">
                  <td className={`${tdCls} tnum whitespace-nowrap`}>{fmtDateTime(e.createdAt)}</td>
                  <td className={tdCls}>{str(e.username)}</td>
                  <td className={tdCls}><Badge text={str(e.action)} tone={str(e.action) === "delete" ? "red" : str(e.action) === "migration" ? "teal" : "blue"} /></td>
                  <td className={tdCls}>{str(e.entity)} · {str(e.entityLabel)}</td>
                  <td className={`${tdCls} max-w-xs truncate text-xs text-[var(--dim)]`}>{str(e.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------- App shell ----------
const NAV: Array<{ key: string; icon: string }> = [
  { key: "dashboard", icon: "▦" },
  { key: "schoolmap", icon: "🏫" },
  { key: "budget", icon: "💰" },
  { key: "purchases", icon: "📑" },
  { key: "certificates", icon: "🧾" },
  { key: "estimates", icon: "📐" },
  { key: "realestate", icon: "🗺" },
  { key: "reference", icon: "🗂" },
  { key: "migration", icon: "⇄" },
  { key: "audit", icon: "🕘" },
];
const MODULE_AR: Record<string, string> = {
  dashboard: "لوحة المتابعة", reference: "البيانات المرجعية", schoolmap: "الخريطة المدرسية", budget: "الموازنة",
  purchases: "المشتريات والعقود", certificates: "المستخلصات الفنية", estimates: "المقايسات", realestate: "الملكية العقارية",
  migration: "مركز الترحيل", audit: "سجل التدقيق",
};

export function App() {
  const qc = useQueryClient();
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("gaeb-lang") === "ar" ? "ar" : "en"));
  const [sess, setSess] = useState<Sess | null>(() => {
    try {
      const raw = localStorage.getItem("gaeb-session");
      return raw ? (JSON.parse(raw) as Sess) : null;
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState("dashboard");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    void api.ensureSeed({}).then(() => setSeeded(true)).catch(() => setSeeded(true));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("gaeb-lang", lang);
  }, [lang]);

  const refsQ = useQuery({
    queryKey: ["refs", sess?.token],
    queryFn: () => api.getRefs({ token: sess?.token ?? "" }),
    enabled: !!sess && seeded,
  });

  const app: AppCtx | null = useMemo(() => {
    if (!sess) return null;
    const refs = refsQ.data?.refs ?? {};
    return {
      token: sess.token,
      lang,
      user: sess,
      refs,
      t: (k) => T[k]?.[lang] ?? k,
      refName: (list, id) => {
        if (id == null || id === "") return "—";
        const row = (refs[list] ?? []).find((r) => num(r.id) === num(id as Scalar));
        if (!row) return `#${String(id)}`;
        if (list === "buildings" || list === "lands") return `${str(row.code)} — ${lang === "ar" ? str(row.nameAr || row.locationEn) : str(row.nameEn || row.locationEn)}`;
        if (list === "governorates") return `${str(row.code)} — ${lang === "ar" ? str(row.nameAr) : str(row.nameEn)}`;
        return lang === "ar" ? str(row.nameAr || row.nameEn) : str(row.nameEn || row.nameAr);
      },
      canWrite: (roles) => roles.includes(sess.role),
    };
  }, [sess, lang, refsQ.data]);

  if (!seeded) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--dim)]">Loading…</div>;
  }
  if (!sess || !app) {
    return <Login lang={lang} setLang={setLangState} onLogin={(s) => { localStorage.setItem("gaeb-session", JSON.stringify(s)); setSess(s); }} />;
  }

  const logout = async () => {
    try { await api.logout({ token: sess.token }); } catch { /* session already gone */ }
    localStorage.removeItem("gaeb-session");
    setSess(null);
    void qc.clear();
  };

  const navLabel = (key: string) => (lang === "ar" ? MODULE_AR[key] ?? key : T[key]?.en ?? key);
  const navSub = (key: string) => (lang === "ar" ? T[key]?.en ?? "" : MODULE_AR[key] ?? "");

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[var(--navy)] text-white lg:flex">
          <div className="border-b border-white/10 px-5 pt-safe pb-4">
            <p className="text-[11px] font-semibold tracking-widest text-teal-300 uppercase">GAEB · NEWLIBGAEB</p>
            <p className="mt-1 text-sm font-semibold">{lang === "ar" ? "منصة التحديث والترحيل" : "Modernization Platform"}</p>
            <p className="text-xs text-slate-300">{lang === "ar" ? "الهيئة العامة للأبنية التعليمية" : "General Authority for Educational Buildings"}</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-3" aria-label="Modules">
            {NAV.map((n) => (
              <button key={n.key} type="button" aria-label={navLabel(n.key)} aria-current={page === n.key ? "page" : undefined}
                className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start ${page === n.key ? "bg-white/15" : "hover:bg-white/10"}`}
                onClick={() => setPage(n.key)}>
                <span aria-hidden="true">{n.icon}</span>
                <span>
                  <span className="block text-sm font-medium">{navLabel(n.key)}</span>
                  <span className="block text-[11px] text-slate-300">{navSub(n.key)}</span>
                </span>
              </button>
            ))}
          </nav>
          <div className="border-t border-white/10 p-4">
            <p className="text-sm font-medium">{lang === "ar" ? sess.nameAr : sess.nameEn}</p>
            <p className="text-xs text-slate-300">{T[`role_${sess.role}`]?.[lang] ?? sess.role} · {sess.username}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" aria-label="Toggle language" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm" onClick={() => setLangState(lang === "ar" ? "en" : "ar")}>
                {lang === "ar" ? "English" : "العربية"}
              </button>
              <button type="button" aria-label={(T["signOut"]?.[lang] ?? "Sign out")} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm" onClick={() => void logout()}>
                {(T["signOut"]?.[lang] ?? "Sign out")}
              </button>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1">
          {/* Mobile header + nav */}
          <header className="sticky top-0 z-40 bg-[var(--navy)] text-white lg:hidden">
            <div className="flex items-center justify-between px-4 pt-safe pb-2">
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-teal-300 uppercase">GAEB · NEWLIBGAEB</p>
                <p className="text-sm font-semibold">{lang === "ar" ? "منصة التحديث والترحيل" : "Modernization Platform"}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" aria-label="Toggle language" className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs" onClick={() => setLangState(lang === "ar" ? "en" : "ar")}>
                  {lang === "ar" ? "EN" : "عربي"}
                </button>
                <button type="button" aria-label={(T["signOut"]?.[lang] ?? "Sign out")} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs" onClick={() => void logout()}>
                  {(T["signOut"]?.[lang] ?? "Sign out")}
                </button>
              </div>
            </div>
            <nav className="flex gap-1.5 overflow-x-auto px-3 pb-3" aria-label="Modules">
              {NAV.map((n) => (
                <button key={n.key} type="button" aria-label={navLabel(n.key)} aria-current={page === n.key ? "page" : undefined}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${page === n.key ? "bg-white text-[var(--navy)]" : "bg-white/10"}`}
                  onClick={() => setPage(n.key)}>
                  {navLabel(n.key)}
                </button>
              ))}
            </nav>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-5 pb-10">
            <div className="mb-4 hidden items-baseline justify-between lg:flex">
              <h1 className="text-2xl font-bold">
                {navLabel(page)} <span className="ms-2 text-base font-normal text-[var(--dim)]">{navSub(page)}</span>
              </h1>
              <span className="text-sm text-[var(--dim)]">{lang === "ar" ? sess.nameAr : sess.nameEn} · {T[`role_${sess.role}`]?.[lang]}</span>
            </div>
            {page === "dashboard" ? <Dashboard app={app} /> : null}
            {page === "reference" ? <ReferencePage app={app} /> : null}
            {page === "schoolmap" ? <SchoolMapPage app={app} /> : null}
            {page === "budget" ? <BudgetPage app={app} /> : null}
            {page === "purchases" ? <PurchasesPage app={app} /> : null}
            {page === "certificates" ? <DocsPage app={app} kind="cert" /> : null}
            {page === "estimates" ? <DocsPage app={app} kind="est" /> : null}
            {page === "realestate" ? <RealEstatePage app={app} /> : null}
            {page === "migration" ? <MigrationPage app={app} /> : null}
            {page === "audit" ? <AuditPage app={app} /> : null}
          </main>
        </div>
      </div>
    </div>
  );
}
