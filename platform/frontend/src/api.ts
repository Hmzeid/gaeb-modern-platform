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
