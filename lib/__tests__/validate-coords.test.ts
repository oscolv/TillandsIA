import { describe, it, expect } from "vitest";
import {
  isInsideMezquital,
  validateCoords,
  VALLE_BBOX,
} from "../validate-coords";

describe("isInsideMezquital", () => {
  it("acepta el centro del Valle (Ixmiquilpan)", () => {
    expect(isInsideMezquital(20.48, -99.22)).toBe(true);
  });

  it("acepta Tula de Allende", () => {
    expect(isInsideMezquital(20.05, -99.34)).toBe(true);
  });

  it("acepta Tecozautla", () => {
    expect(isInsideMezquital(20.55, -99.55)).toBe(true);
  });

  it("rechaza CDMX", () => {
    expect(isInsideMezquital(19.43, -99.13)).toBe(false);
  });

  it("rechaza Guadalajara", () => {
    expect(isInsideMezquital(20.66, -103.35)).toBe(false);
  });

  it("acepta los bordes exactos del bbox", () => {
    expect(isInsideMezquital(VALLE_BBOX.latMin, VALLE_BBOX.lngMin)).toBe(true);
    expect(isInsideMezquital(VALLE_BBOX.latMax, VALLE_BBOX.lngMax)).toBe(true);
  });

  it("rechaza fuera del borde por épsilon", () => {
    expect(
      isInsideMezquital(VALLE_BBOX.latMin - 0.01, VALLE_BBOX.lngMin),
    ).toBe(false);
  });

  it("rechaza NaN", () => {
    expect(isInsideMezquital(Number.NaN, -99.2)).toBe(false);
    expect(isInsideMezquital(20.5, Number.NaN)).toBe(false);
  });

  it("rechaza Infinity", () => {
    expect(isInsideMezquital(Number.POSITIVE_INFINITY, -99.2)).toBe(false);
  });
});

describe("validateCoords", () => {
  it("acepta coordenadas válidas", () => {
    expect(validateCoords(20.5, -99.2)).toBe(null);
  });

  it("rechaza NaN", () => {
    expect(validateCoords(Number.NaN, -99.2)).toBe("Latitud inválida");
    expect(validateCoords(20.5, Number.NaN)).toBe("Longitud inválida");
  });

  it("rechaza tipos no-number", () => {
    expect(validateCoords("20.5", -99.2)).toMatch(/Latitud inválida/);
    expect(validateCoords(null, -99.2)).toMatch(/Latitud inválida/);
    expect(validateCoords(20.5, undefined)).toMatch(/Longitud inválida/);
  });

  it("rechaza fuera del rango global", () => {
    expect(validateCoords(91, 0)).toMatch(/Latitud fuera de rango/);
    expect(validateCoords(-91, 0)).toMatch(/Latitud fuera de rango/);
    expect(validateCoords(0, 181)).toMatch(/Longitud fuera de rango/);
    expect(validateCoords(0, -181)).toMatch(/Longitud fuera de rango/);
  });
});
