import { describe, it, expect } from "vitest";
import { parseClassification } from "../classify";

const validNivel0 = JSON.stringify({
  level: 0,
  label: "Sin infestación",
  confidence: 0.95,
  tree_species: "Prosopis laevigata",
  tree_species_common: "Mezquite",
  ai_notes: "Árbol sano, no se detecta heno motita.",
  infestation_active: null,
  branch_dieback: false,
  photo_angle: "canopy",
  has_human_face: false,
  rejection_reason: null,
});

const validNivel3 = JSON.stringify({
  level: 3,
  label: "Severa",
  confidence: 0.85,
  tree_species: "Prosopis laevigata",
  tree_species_common: "Mezquite",
  ai_notes: "Más del 50% de las ramas con cúmulos gris-plateados.",
  infestation_active: true,
  branch_dieback: true,
  photo_angle: "canopy",
  has_human_face: false,
  rejection_reason: null,
});

const faceDetected = JSON.stringify({
  level: 0,
  label: "Sin infestación",
  confidence: 0.0,
  tree_species: null,
  tree_species_common: null,
  ai_notes: null,
  infestation_active: null,
  branch_dieback: false,
  photo_angle: "insufficient",
  has_human_face: true,
  rejection_reason: "Foto contiene rostros humanos. Toma otra sin personas.",
});

const lowConfidence = JSON.stringify({
  level: 2,
  label: "Moderada",
  confidence: 0.35,
  tree_species: "Prosopis laevigata",
  tree_species_common: "Mezquite",
  ai_notes: "Foto borrosa, difícil estimar.",
  infestation_active: true,
  branch_dieback: false,
  photo_angle: "mixed",
  has_human_face: false,
  rejection_reason: null,
});

const nonTargetHost = JSON.stringify({
  level: 1,
  label: "Leve",
  confidence: 0.8,
  tree_species: "Quercus rugosa",
  tree_species_common: "Encino",
  ai_notes: "Encino con cúmulos en ramas exteriores.",
  infestation_active: true,
  branch_dieback: false,
  photo_angle: "canopy",
  has_human_face: false,
  rejection_reason: null,
});

const postTreatment = JSON.stringify({
  level: 2,
  label: "Moderada",
  confidence: 0.85,
  tree_species: "Prosopis laevigata",
  tree_species_common: "Mezquite",
  ai_notes: "Cúmulos café-secos, sugiere tratamiento previo con bicarbonato.",
  infestation_active: false,
  branch_dieback: false,
  photo_angle: "canopy",
  has_human_face: false,
  rejection_reason: null,
});

describe("parseClassification — fixtures válidas", () => {
  it("parsea nivel 0 sin infestación", () => {
    const r = parseClassification(validNivel0);
    expect(r.level).toBe(0);
    expect(r.label).toBe("Sin infestación");
    expect(r.has_human_face).toBe(false);
    expect(r.flag_reasons).toEqual([]);
  });

  it("parsea nivel 3 severo con árbol fuente", () => {
    const r = parseClassification(validNivel3);
    expect(r.level).toBe(3);
    expect(r.branch_dieback).toBe(true);
    expect(r.infestation_active).toBe(true);
    expect(r.flag_reasons).toEqual([]);
  });

  it("preserva rechazo por rostro humano", () => {
    const r = parseClassification(faceDetected);
    expect(r.has_human_face).toBe(true);
    expect(r.rejection_reason).toMatch(/rostros humanos/);
  });
});

describe("parseClassification — flags derivadas", () => {
  it("añade low_confidence si confidence < 0.5", () => {
    const r = parseClassification(lowConfidence);
    expect(r.flag_reasons).toContain("low_confidence");
  });

  it("añade non_target_host si especie no es de la lista del Valle", () => {
    const r = parseClassification(nonTargetHost);
    expect(r.flag_reasons).toContain("non_target_host");
  });

  it("añade post_treatment_appearance si infestation_active=false con nivel >0", () => {
    const r = parseClassification(postTreatment);
    expect(r.flag_reasons).toContain("post_treatment_appearance");
  });

  it("no añade non_target_host para mezquite/huizache/pirul", () => {
    const r = parseClassification(validNivel3);
    expect(r.flag_reasons).not.toContain("non_target_host");
  });
});

describe("parseClassification — entradas inválidas", () => {
  it("falla con JSON malformado", () => {
    expect(() => parseClassification("{this is not json")).toThrow(
      /no es JSON válido/,
    );
  });

  it("falla con level fuera de rango", () => {
    const bad = JSON.stringify({
      level: 7,
      label: "X",
      confidence: 0.5,
      tree_species: null,
      tree_species_common: null,
      ai_notes: null,
      infestation_active: null,
      branch_dieback: false,
      photo_angle: "canopy",
      has_human_face: false,
      rejection_reason: null,
    });
    expect(() => parseClassification(bad)).toThrow(/level inválido/);
  });

  it("falla con photo_angle desconocido", () => {
    const bad = JSON.stringify({
      level: 1,
      label: "Leve",
      confidence: 0.8,
      tree_species: null,
      tree_species_common: null,
      ai_notes: null,
      infestation_active: null,
      branch_dieback: false,
      photo_angle: "from_above",
      has_human_face: false,
      rejection_reason: null,
    });
    expect(() => parseClassification(bad)).toThrow(/photo_angle inválido/);
  });
});
