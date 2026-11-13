import { Component, createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { statusTone, type Strs } from "./i18n";

/* ── toasts ─────────────────────────────────────────────────────── */
export const ToastCtx = createContext<(msg: string, err?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ── error boundary: one broken view must never white-screen the app ── */
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: string }> {
  state = { err: "" };
  static getDerivedStateFromError(e: any) { return { err: String(e?.message || e) }; }
  render() {
    if (this.state.err) {
      return (
        <div className="card" role="alert" style={{ borderColor: "var(--color-bad)" }}>
          <h3 style={{ color: "var(--color-bad)" }}>This view failed to render</h3>
          <p style={{ fontSize: 13, color: "var(--color-ink2)" }}>{this.state.err}</p>
          <button className="btn sec sm" onClick={() => this.setState({ err: "" })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── status chip: one component renders every enum in the system ── */
export function StatusChip({ s, t }: { s: string | null | undefined; t: Strs }) {
  if (!s) return <span className="st mut">—</span>;
  const label = (t as any)[`st_${s}`] ?? s.replace(/_/g, " ");
  return <span className={`st ${statusTone(s)}`}>{label}</span>;
}

/* ── KPI card (Stratify pattern: label, icon chip, value, delta) ── */
export function Kpi({ label, value, sub, color, icon }: { label: string; value: ReactNode; sub?: ReactNode; color: string; icon: ReactNode }) {
  return (
    <div className="kpi">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="lab">{label}</span>
        <span className="ic" style={{ background: color }}>{icon}</span>
      </div>
      <div className="val">{value}</div>
      {sub !== undefined && <div className="d">{sub}</div>}
    </div>
  );
}

/* ── panel with the standard header row ─────────────────────────── */
export function Panel({ title, hint, more, children, span }: { title?: string; hint?: string; more?: ReactNode; children: ReactNode; span?: number }) {
  return (
    <section className="card" style={span ? { gridColumn: `span ${span}` } : undefined}>
      {(title || more) && (
        <div className="ph">
          {title && <h3>{title}</h3>}
          {hint && <span className="hint">{hint}</span>}
          {more}
        </div>
      )}
      {children}
    </section>
  );
}

/* ── ECharts wrapper (lazy, disposes, RTL font aware) ───────────── */
export function Chart({ option, height = 230, lang, onClick }: { option: Record<string, any>; height?: number; lang: string; onClick?: (params: any) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<any>(null);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;
  const optRef = useRef(option);
  optRef.current = option;
  const langRef = useRef(lang);
  langRef.current = lang;
  const apply = () => {
    if (!inst.current) return;
    const font = langRef.current === "ar" ? "IBM Plex Sans Arabic" : "Inter";
    inst.current.setOption({ textStyle: { fontFamily: font }, ...optRef.current }, { notMerge: false });
  };
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // ECharts loads on first chart mount so the entry bundle stays lean.
      const echarts = await import("echarts");
      if (cancelled || !ref.current) return;
      if (!inst.current) {
        inst.current = echarts.init(ref.current);
        inst.current.on("click", (p: any) => clickRef.current?.(p));
      }
      apply();
    })();
    const onR = () => inst.current?.resize();
    window.addEventListener("resize", onR);
    return () => { cancelled = true; window.removeEventListener("resize", onR); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { apply(); }, [option, lang]);
  useEffect(() => () => { inst.current?.dispose(); inst.current = null; }, []);
  return <div ref={ref} style={{ height, width: "100%" }} role="img" aria-label="chart" />;
}

/* ── stage stepper (tenders / certificates / estimates) ─────────── */
export function StageStepper({ stages, current, t }: { stages: string[]; current: string; t: Strs }) {
  const idx = stages.indexOf(current);
  return (
    <div className="steps" role="list" aria-label="stage progress">
      {stages.map((s, i) => (
        <div key={s} role="listitem" className={`step ${i < idx ? "done" : i === idx ? "now" : ""}`}>
          {(t as any)[`st_${s}`] ?? s.replace(/_/g, " ")}
        </div>
      ))}
    </div>
  );
}

/* ── segmented health bar ───────────────────────────────────────── */
export function SegBar({ parts }: { parts: { pct: number; color: string }[] }) {
  return <div className="seg">{parts.map((p, i) => <i key={i} style={{ width: `${p.pct}%`, background: p.color }} />)}</div>;
}

/* ── drawer (record inspector) ──────────────────────────────────── */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const restoreRef = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    const root = ref.current;
    if (root) {
      const first = root.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabIndex]:not([tabIndex='-1'])");
      (first ?? root).focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !ref.current) return;
      // Focus trap (Phase 9, R-C-1): Tab cycles inside the modal drawer.
      const items = [...ref.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabIndex]:not([tabIndex='-1'])")]
      if (items.length === 0) { e.preventDefault(); ref.current.focus(); return; }
      const firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const prev = restoreRef.current as HTMLElement | null;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} ref={ref} tabIndex={-1}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
          <button className="btn sec sm" style={{ marginInlineStart: "auto" }} onClick={onClose} aria-label="close">✕</button>
        </div>
        {children}
      </aside>
    </>
  );
}

/* ── definition list for drawers ────────────────────────────────── */
export function DefList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl style={{ display: "grid", gridTemplateColumns: "130px 1fr", rowGap: 8, fontSize: 13, margin: 0 }}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: "contents" }}>
          <dt style={{ color: "var(--color-ink2)" }}>{k}</dt>
          <dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Empty({ text }: { text: string }) { return <div className="empty">{text}</div>; }
export function Skel({ h = 90 }: { h?: number }) { return <div className="skel" style={{ height: h }} />; }
