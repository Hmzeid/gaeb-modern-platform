import { describe, it, expect } from "vitest";
import { EGYPT_ADM1, ADM1_BY_PCODE, GOV_PCODE, pcodeForGov } from "./geo-data";

describe("Egypt ADM1 boundary asset (OCHA COD-AB via HDX, CC BY-IGO)", () => {
  it("contains exactly 27 governorate features with names in both languages", () => {
    expect(EGYPT_ADM1.features).toHaveLength(27);
    for (const f of EGYPT_ADM1.features) {
      expect(f.properties.pcode).toMatch(/^EG\d{2}$/);
      expect(f.properties.name_en.length).toBeGreaterThan(0);
      expect(f.properties.name_ar.length).toBeGreaterThan(0);
      expect(f.geometry).toBeTruthy();
    }
  });
  it("has unique P-codes", () => {
    const codes = EGYPT_ADM1.features.map(f => f.properties.pcode);
    expect(new Set(codes).size).toBe(27);
    expect(ADM1_BY_PCODE.size).toBe(27);
  });
});

describe("GAEB legacy code → P-code join", () => {
  it("maps all 27 GAEB governorate codes onto boundary features", () => {
    const codes = Object.keys(GOV_PCODE).map(Number);
    expect(codes).toHaveLength(27);
    for (const code of codes) {
      const p = pcodeForGov(code);
      expect(p, `GAEB code ${code}`).toBeTruthy();
      expect(ADM1_BY_PCODE.has(p!), `P-code ${p} exists in boundary data`).toBe(true);
    }
    // and every boundary feature is reachable from exactly one GAEB code
    const used = new Set(Object.values(GOV_PCODE));
    expect(used.size).toBe(27);
  });
  it("follows the zero-padded rule except for the documented Luxor exception", () => {
    for (const [code, pcode] of Object.entries(GOV_PCODE)) {
      if (Number(code) === 36) expect(pcode).toBe("EG29"); // Luxor
      else expect(pcode).toBe("EG" + code.padStart(2, "0"));
    }
  });
  it("spot-checks the anchor governorates", () => {
    expect(pcodeForGov(1)).toBe("EG01"); // Cairo
    expect(pcodeForGov(2)).toBe("EG02"); // Alexandria
    expect(pcodeForGov(21)).toBe("EG21"); // Giza
    expect(pcodeForGov(28)).toBe("EG28"); // Aswan
    expect(ADM1_BY_PCODE.get("EG01")?.properties.name_en).toBe("Cairo");
  });
});
