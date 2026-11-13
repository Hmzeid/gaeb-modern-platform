// Locale-aware formatting. Money is stored as exact decimal strings by the
// API; formatting never re-rounds through binary floats for display of the
// stored value — grouping is applied to the decimal string itself.
import type { Lang } from "./i18n";

export function fmtInt(n: number | string, lang: Lang): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return String(n);
  return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 0 }).format(v);
}

/** Group a decimal string (e.g. "1250000.0000") without float corruption. */
export function fmtMoney(v: string | number | null | undefined, lang: Lang, currency = true): string {
  if (v === null || v === undefined || v === "") return "—";
  const s = String(v);
  const neg = s.startsWith("-");
  const [int, fracRaw = ""] = (neg ? s.slice(1) : s).split(".");
  const frac = fracRaw.replace(/0+$/, "");
  const grouped = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US").format(BigInt(int || "0"));
  const num = (neg ? "-" : "") + grouped + (frac ? (lang === "ar" ? "٫" : ".") + new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", { useGrouping: false }).format(Number("0." + frac)).slice(2) : "");
  return currency ? (lang === "ar" ? `${num} ج.م` : `EGP ${num}`) : num;
}

/** Compact axis/KPI money: EGP 4.82B / ٤٫٨٢ مليار ج.م style. */
export function fmtMoneyShort(v: string | number | null | undefined, lang: Lang): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  const units: [number, string, string][] = lang === "ar"
    ? [[1e9, "مليار", "مليار"], [1e6, "مليون", "مليون"], [1e3, "ألف", "ألف"]]
    : [[1e9, "B", "B"], [1e6, "M", "M"], [1e3, "K", "K"]];
  for (const [u, en] of units) {
    if (Math.abs(n) >= u) {
      const x = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 2 }).format(n / u);
      return lang === "ar" ? `${x} ${en} ج.م` : `EGP ${x}${en}`;
    }
  }
  return fmtMoney(v, lang);
}

export function fmtPct(part: number, whole: number, lang: Lang): string {
  if (!whole) return "—";
  const p = (part / whole) * 100;
  return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 1 }).format(p) + (lang === "ar" ? "٪" : "%");
}

export function fmtDateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 19).replace("T", " ");
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
