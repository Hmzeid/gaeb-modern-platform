// Thin client for the standalone GAEB API. The token lives in sessionStorage
// (cleared when the tab closes) and mirrors the server-side revocable session.
const base = import.meta.env.VITE_API_BASE ?? "";
export function getToken(): string | null { return sessionStorage.getItem("gaeb_token"); }
export function setToken(t: string | null) { t ? sessionStorage.setItem("gaeb_token", t) : sessionStorage.removeItem("gaeb_token"); }
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(base + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...(init.headers || {}) },
  });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}
export interface Certificate { id: number; kind: string; status: string; gross: string; deductions: string; net: string; payment_ref: string | null }
export interface Building { id: number; name_en: string; name_ar: string; legacy_blcd: string | null; governorate_code: number | null }
export interface Allocation { id: number; fiscal_year: string; chapter: number; item: number; allocated: string; committed: string; spent: string; available: string }
export interface Tender { id: number; title: string; stage: string; legacy_type: number | null; legacy_no: number | null }
export interface ExCase { id: number; stage: string; decree_no: string | null; decree_date: string | null; gazette_no: string | null; compensation: string | null }
export interface Estimate { id: number; title: string; status: string; revision: number; total: string }
export interface CatalogueItem { id: number; code: string; name_en: string; name_ar: string; unit: string; standard_price: string }
export interface BudgetUtil { fiscal_year: string; lines: number; allocated: string; committed: string; spent: string; available: string }
export interface CertSummary { status: string; count: number; gross: string; deductions: string; net: string }
