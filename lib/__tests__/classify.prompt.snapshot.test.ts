import { describe, it, expect } from "vitest";
import {
  CLASSIFY_SYSTEM_PROMPT,
  CLASSIFIER_VERSION,
  MODEL_VERSION,
} from "../classify";

/**
 * Snapshot del prompt completo. Si alguien lo edita sin querer, este test
 * fallará y forzará una revisión consciente. El prompt es el corazón
 * científico del proyecto — modificarlo cambia la calidad del dataset.
 *
 * Cuando el cambio sea intencional:
 *   1. INCREMENTAR CLASSIFIER_VERSION
 *   2. Correr `npm run test -- -u` para actualizar el snapshot
 *   3. Documentar el cambio en el commit
 */
describe("classify prompt", () => {
  it("matches snapshot", () => {
    expect(CLASSIFY_SYSTEM_PROMPT).toMatchSnapshot();
  });

  it("contiene el umbral 50% del Valle del Mezquital", () => {
    expect(CLASSIFY_SYSTEM_PROMPT).toMatch(/50.*?75/);
    expect(CLASSIFY_SYSTEM_PROMPT).toMatch(/Flores-Palacios/);
  });

  it("nombra los hospederos objetivo", () => {
    expect(CLASSIFY_SYSTEM_PROMPT).toMatch(/Prosopis laevigata/);
    expect(CLASSIFY_SYSTEM_PROMPT).toMatch(/Vachellia farnesiana/);
  });

  it("instruye sobre detección de rostros", () => {
    expect(CLASSIFY_SYSTEM_PROMPT).toMatch(/rostros? humanos?/i);
    expect(CLASSIFY_SYSTEM_PROMPT).toMatch(/has_human_face/);
  });

  it("define el concepto de árbol fuente", () => {
    expect(CLASSIFY_SYSTEM_PROMPT).toMatch(/ÁRBOL FUENTE/i);
  });
});

describe("versioning", () => {
  it("CLASSIFIER_VERSION está definida", () => {
    expect(CLASSIFIER_VERSION).toMatch(/^\d+\.\d+/);
  });

  it("MODEL_VERSION coincide con gpt-5.4-mini", () => {
    expect(MODEL_VERSION).toBe("gpt-5.4-mini");
  });
});
