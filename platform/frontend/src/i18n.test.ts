import { describe, it, expect } from "vitest";
import { T, statusTone, TENDER_STAGES, CERT_STAGES, INTAKE_STAGES } from "./i18n";

describe("i18n dictionary parity", () => {
  it("every English key exists in Arabic and vice versa", () => {
    const en = Object.keys(T.en).sort();
    const ar = Object.keys(T.ar).sort();
    expect(ar).toEqual(en);
  });
  it("no translation value is empty in either language", () => {
    for (const [k, v] of Object.entries(T.en)) expect(String(v).length, `en:${k}`).toBeGreaterThan(0);
    for (const [k, v] of Object.entries(T.ar)) expect(String(v).length, `ar:${k}`).toBeGreaterThan(0);
  });
  it("every workflow stage has a status label in both languages", () => {
    for (const s of [...TENDER_STAGES, ...CERT_STAGES, ...INTAKE_STAGES]) {
      expect((T.en as any)[`st_${s}`], `en st_${s}`).toBeTruthy();
      expect((T.ar as any)[`st_${s}`], `ar st_${s}`).toBeTruthy();
    }
  });
});

describe("statusTone", () => {
  it("maps terminal-good states to ok and failures to bad", () => {
    expect(statusTone("paid")).toBe("ok");
    expect(statusTone("approved")).toBe("ok");
    expect(statusTone("FAILED")).toBe("bad");
    expect(statusTone("rejected")).toBe("bad");
  });
  it("maps in-flight states to info and drafts to muted", () => {
    expect(statusTone("certified")).toBe("info");
    expect(statusTone("draft")).toBe("mut");
  });
});
