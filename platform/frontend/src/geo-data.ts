// Geographic reference data for the Geographic Intelligence view.
//
// Boundary source: Egypt — Subnational Administrative Boundaries (COD-AB),
// OCHA Field Information Services Section, via the Humanitarian Data
// Exchange (dataset cod-ab-egy), license CC BY-IGO. ADM1 (governorate)
// polygons simplified with a 0.006° Douglas-Peucker tolerance; names,
// P-codes and official centre coordinates are the source values.
//
// Identifier strategy: GAEB governorates carry legacy codes from the
// AS/400 reference data (POC business analysis, محافظه table). The join
// to OCHA P-codes below is an explicit, auditable table — for 26 of 27
// governorates the P-code is "EG" + the zero-padded legacy code; the
// single exception is Luxor (legacy 36 → EG29), created as a governorate
// after the P-code series was assigned.
import egyptAdm1 from "./assets/egypt-adm1.json";

export interface Adm1Feature {
  type: "Feature";
  properties: { pcode: string; name_en: string; name_ar: string; center_lon: number; center_lat: number };
  geometry: { type: string; coordinates: any };
}
export const EGYPT_ADM1 = egyptAdm1 as unknown as { type: "FeatureCollection"; features: Adm1Feature[] };
export const ADM1_BY_PCODE = new Map(EGYPT_ADM1.features.map(f => [f.properties.pcode, f]));

/** GAEB legacy governorate code → OCHA P-code (see header note). */
export const GOV_PCODE: Record<number, string> = {
  1: "EG01", 2: "EG02", 3: "EG03", 4: "EG04",
  11: "EG11", 12: "EG12", 13: "EG13", 14: "EG14", 15: "EG15", 16: "EG16",
  17: "EG17", 18: "EG18", 19: "EG19",
  21: "EG21", 22: "EG22", 23: "EG23", 24: "EG24", 25: "EG25", 26: "EG26",
  27: "EG27", 28: "EG28",
  31: "EG31", 32: "EG32", 33: "EG33", 34: "EG34", 35: "EG35",
  36: "EG29", // Luxor — the one divergence between the two code series
};
export const pcodeForGov = (code: number): string | undefined => GOV_PCODE[code];
