import { describe, it, expect } from "vitest";
import { municipalityFor, MUNICIPALITIES } from "../municipalities";

describe("municipalityFor", () => {
  it("identifica Tula de Allende", () => {
    expect(municipalityFor(20.05, -99.34)).toBe("Tula de Allende");
  });

  it("identifica Ixmiquilpan", () => {
    expect(municipalityFor(20.48, -99.22)).toBe("Ixmiquilpan");
  });

  it("identifica Cardonal", () => {
    expect(municipalityFor(20.62, -99.10)).toBe("Cardonal");
  });

  it("identifica Tepeji del Río", () => {
    expect(municipalityFor(19.92, -99.34)).toBe("Tepeji del Río");
  });

  it("identifica Tezontepec de Aldama", () => {
    expect(municipalityFor(20.19, -99.27)).toBe("Tezontepec de Aldama");
  });

  it("identifica Tecozautla", () => {
    expect(municipalityFor(20.55, -99.55)).toBe("Tecozautla");
  });

  it("retorna null para CDMX (fuera del Valle)", () => {
    expect(municipalityFor(19.43, -99.13)).toBe(null);
  });

  it("retorna null para coordenadas no finitas", () => {
    expect(municipalityFor(Number.NaN, -99.2)).toBe(null);
    expect(municipalityFor(20.5, Number.POSITIVE_INFINITY)).toBe(null);
  });

  it("dataset incluye al menos los 8 municipios del Decreto ZRE Endhó", () => {
    const zreMunicipalities = [
      "Tula de Allende",
      "Tepeji del Río",
      "Atotonilco de Tula",
      "Atitalaquia",
      "Tlaxcoapan",
      "Tlahuelilpan",
      "Tezontepec de Aldama",
      "Tepetitlán",
    ];
    const names = MUNICIPALITIES.map((m) => m.name);
    for (const m of zreMunicipalities) {
      expect(names).toContain(m);
    }
  });
});
