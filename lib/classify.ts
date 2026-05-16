import OpenAI from "openai";
import {
  type ClassificationResult,
  type FlagReason,
  type InfestationLevel,
  LEVEL_LABELS,
  type PhotoAngle,
} from "./types";

/**
 * Versión del prompt. Cuando se modifique el prompt, INCREMENTAR este valor.
 * Permite filtrar el dataset por iteración del clasificador y comparar la
 * calidad de clasificaciones tras cambios.
 */
export const CLASSIFIER_VERSION = "1.1";

/**
 * Modelo en uso. Si OpenAI cambia el alias, se actualiza esta constante y
 * se incrementa `CLASSIFIER_VERSION` (porque el comportamiento puede variar).
 */
export const MODEL_VERSION = "gpt-5.4-mini";

const HOSTS_OBJETIVO = [
  "Prosopis laevigata",
  "Vachellia farnesiana",
  "Acacia farnesiana",
  "Acacia schaffneri",
  "Schinus molle",
  "Myrtillocactus geometrizans",
];

/**
 * El prompt cita evidencia documentada en la wiki del proyecto:
 * - Umbral 50% como mortalidad de brotes en mezquite (Flores-Palacios 2014)
 * - Hosts preferidos: mezquite, huizache, pirul, A. schaffneri, garambullo
 * - Cúmulo gris vivo vs café post-tratamiento
 * - Ramas exteriores del dosel superior como zona preferencial
 * - Concepto de "árbol fuente" para nivel 4
 *
 * IMPORTANTE: cualquier modificación significativa requiere bumpear
 * CLASSIFIER_VERSION arriba.
 */
export const CLASSIFY_SYSTEM_PROMPT = `Eres un experto en ecología forestal especializado en *Tillandsia recurvata* ("heno motita"), una bromeliácea epífita invasora del Valle del Mezquital, Hidalgo, México.

# Lo que clasificas
Una fotografía de un árbol o cactácea, tomada por un ciudadano colaborador con su celular. Tu tarea es:
1. Verificar que la foto sea apropiada (no rostros, sea árbol/planta, ángulo suficiente).
2. Estimar el nivel de infestación de heno motita (0 a 4).
3. Identificar la especie del hospedero si es posible.
4. Detectar señales de tratamiento previo o daño avanzado.

# Señales visuales de Tillandsia recurvata

VIVA Y ACTIVA:
- Cúmulos esféricos compactos, gris-plateados o gris-verdosos
- Sin raíces visibles al suelo; adheridos directamente a ramas
- Hojas curvadas hacia atrás cubiertas de tricomas blanquecinos
- Cubren preferencialmente las ramas exteriores del dosel superior

POST-TRATAMIENTO (muerta pero adherida):
- Cúmulos café-grisáceos, secos
- Pueden persistir 18 meses a 10 años tras fumigación con bicarbonato (LSU AgCenter, INIFAP)
- El musgo muerto NO cae inmediatamente — esto es normal y esperado

NO ES heno motita:
- Líquenes (incrustantes, planos sobre la corteza, no esféricos)
- Musgos verdaderos (verdes vibrantes, sobre tronco no en ramas exteriores)
- Otras Tillandsia más grandes (T. usneoides "barba española" cuelga, no es esférica)
- Bromeliáceas con tanque (cisterna central, hojas anchas)

# Escala de niveles (criterio: % de ramas visiblemente afectadas)

- Nivel 0 — Sin infestación: no se observa heno motita
- Nivel 1 — Leve: 1–25% de ramas con cúmulos
- Nivel 2 — Moderada: 25–50% de ramas afectadas
- Nivel 3 — Severa: 50–75% — UMBRAL CRÍTICO de mortalidad de brotes en mezquite (Flores-Palacios et al. 2014)
- Nivel 4 — Muy severa: >75% — "ÁRBOL FUENTE" priorítario de control (Valverde & Bernal 2010)

Mira TODAS las ramas visibles antes de estimar, no solo las más afectadas.
Si solo se ve el tronco o una rama aislada, marca \`photo_angle: "insufficient"\`.

# Hospederos del Valle del Mezquital

Comunes y esperados:
- Mezquite (Prosopis laevigata): hospedero principal, parasitismo estructural confirmado
- Huizache (Vachellia farnesiana / Acacia farnesiana): hospedero secundario
- Acacia schaffneri (uña de gato)
- Pirul (Schinus molle): común en áreas urbanas
- Garambullo (Myrtillocactus geometrizans) y otras cactáceas

Si la especie identificada no está en esta lista (ej: encino, ficus ornamental, eucalipto), añade "non_target_host" a \`flag_reasons\`.

# Indicadores adicionales

- \`infestation_active\`: true si los cúmulos se ven gris-plateados (vivos), false si son café-secos (post-tratamiento), null si no se puede determinar.
- \`branch_dieback\`: true si hay ramas claramente muertas o sin hojas en árboles que deberían tener hojas. Señal de parasitismo avanzado.
- \`photo_angle\`: "canopy" (dosel visible), "trunk" (solo tronco), "mixed" (ambos), "insufficient" (no se puede clasificar).

# Privacidad — NO NEGOCIABLE

Si detectas CUALQUIER rostro humano (incluso parcial, lejano, o en segundo plano), establece:
- \`has_human_face: true\`
- \`rejection_reason: "Foto contiene rostros humanos. Toma otra sin personas."\`

Si la foto no muestra árbol/planta (es un objeto, paisaje sin vegetación, comida, etc.):
- \`rejection_reason: "La foto no muestra un árbol o planta. Toma otra de un árbol completo."\`

Si la foto es ilegible (muy oscura, borrosa, fuera de foco):
- \`photo_angle: "insufficient"\`
- \`rejection_reason: "La foto no es lo suficientemente clara para clasificar."\`

# Multifoto

Cuando recibas varias fotos en el mismo mensaje, todas son del MISMO árbol
tomadas por la misma persona en distintos ángulos/zoom para ayudarte a
clasificar mejor. Integra todas las vistas en UNA sola clasificación:
- Para \`tree_species\` y \`tree_species_common\`, prefiere la toma más cercana
  (acercamiento de ramas / hojas / corteza).
- Para \`level\`, usa la toma más amplia que muestre más ramas del dosel.
- Para \`has_human_face\` y \`rejection_reason\`, basta con que UNA foto tenga
  rostro o sea inválida para rechazar TODA la observación.
- Reporta el \`photo_angle\` más informativo del conjunto.
- La \`confidence\` debe reflejar el conjunto completo, no una sola foto.

# Confianza

Establece \`confidence\` entre 0 y 1:
- 0.9–1.0: foto nítida, ángulo de dosel claro, especie conocida, infestación inequívoca
- 0.7–0.9: clasificación clara con leve ambigüedad
- 0.5–0.7: foto regular o nivel difícil de estimar (por ejemplo, en frontera entre niveles)
- <0.5: marca también con flag_reasons que incluya "low_confidence"

Sé honesto. Es preferible un confidence bajo que una clasificación falsa.

# Formato de respuesta

Responde EXCLUSIVAMENTE con el JSON estructurado solicitado. No agregues comentarios, markdown, ni texto fuera del JSON.`;

/**
 * Schema JSON para structured outputs de OpenAI.
 * Incluye `additionalProperties: false` y todos los campos como required
 * (que es como structured outputs garantiza shape).
 */
const CLASSIFY_JSON_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: [
    "level",
    "label",
    "confidence",
    "tree_species",
    "tree_species_common",
    "ai_notes",
    "infestation_active",
    "branch_dieback",
    "photo_angle",
    "has_human_face",
    "rejection_reason",
  ],
  properties: {
    level: { type: "integer", enum: [0, 1, 2, 3, 4] },
    label: {
      type: "string",
      enum: ["Sin infestación", "Leve", "Moderada", "Severa", "Muy severa"],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    tree_species: { type: ["string", "null"] },
    tree_species_common: { type: ["string", "null"] },
    ai_notes: { type: ["string", "null"] },
    infestation_active: { type: ["boolean", "null"] },
    branch_dieback: { type: "boolean" },
    photo_angle: {
      type: "string",
      enum: ["canopy", "trunk", "mixed", "insufficient"],
    },
    has_human_face: { type: "boolean" },
    rejection_reason: { type: ["string", "null"] },
  },
};

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no está configurada");
  }
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

/**
 * Clasifica 1–3 fotos sanitizadas (Buffers JPEG) del MISMO árbol. Devuelve
 * una sola clasificación agregada con flags derivadas aplicadas
 * (low_confidence, non_target_host).
 *
 * No persiste nada — eso es responsabilidad del API route caller.
 */
export async function classifyImage(
  bufs: Buffer[],
): Promise<ClassificationResult> {
  if (bufs.length < 1 || bufs.length > 3) {
    throw new Error(`classifyImage requiere 1–3 fotos, recibió ${bufs.length}`);
  }

  const client = getClient();
  const imageParts = bufs.map((buf) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:image/jpeg;base64,${buf.toString("base64")}`,
      detail: "high" as const,
    },
  }));

  const intro =
    bufs.length === 1
      ? "Clasifica esta fotografía siguiendo el protocolo del sistema."
      : `Clasifica estas ${bufs.length} fotografías del MISMO árbol siguiendo el protocolo del sistema. Usa la mejor toma cercana para identificar la especie y considera todas para evaluar severidad.`;

  const response = await client.chat.completions.create({
    model: MODEL_VERSION,
    messages: [
      { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
      {
        role: "user",
        content: [{ type: "text", text: intro }, ...imageParts],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "classification",
        schema: CLASSIFY_JSON_SCHEMA,
        strict: true,
      },
    },
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("El modelo no devolvió contenido");
  }
  return parseClassification(raw);
}

/**
 * Parser exportado para testing con fixtures (sin tocar la API real).
 * Aplica las flags derivadas: `low_confidence`, `non_target_host`,
 * `post_treatment_appearance`.
 */
export function parseClassification(raw: string): ClassificationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Respuesta del modelo no es JSON válido: ${raw.slice(0, 200)}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Respuesta del modelo no es un objeto");
  }

  const o = parsed as Record<string, unknown>;

  const level = o.level as number;
  if (![0, 1, 2, 3, 4].includes(level)) {
    throw new Error(`level inválido: ${level}`);
  }

  const photo_angle = o.photo_angle as PhotoAngle;
  if (!["canopy", "trunk", "mixed", "insufficient"].includes(photo_angle)) {
    throw new Error(`photo_angle inválido: ${photo_angle}`);
  }

  const confidence = typeof o.confidence === "number" ? o.confidence : 0;
  const tree_species = (o.tree_species as string | null) ?? null;
  const tree_species_common = (o.tree_species_common as string | null) ?? null;
  const has_human_face = Boolean(o.has_human_face);
  const branch_dieback = Boolean(o.branch_dieback);
  const infestation_active =
    o.infestation_active === null ? null : Boolean(o.infestation_active);

  // Derivar flags
  const flag_reasons: FlagReason[] = [];
  if (confidence < 0.5) flag_reasons.push("low_confidence");
  if (
    tree_species &&
    !HOSTS_OBJETIVO.some((h) =>
      tree_species.toLowerCase().includes(h.toLowerCase()),
    )
  ) {
    flag_reasons.push("non_target_host");
  }
  if (level >= 1 && infestation_active === false) {
    flag_reasons.push("post_treatment_appearance");
  }

  return {
    level: level as InfestationLevel,
    label: LEVEL_LABELS[level as InfestationLevel],
    confidence,
    tree_species,
    tree_species_common,
    ai_notes: (o.ai_notes as string | null) ?? null,
    infestation_active,
    branch_dieback,
    photo_angle,
    has_human_face,
    rejection_reason: (o.rejection_reason as string | null) ?? null,
    flag_reasons,
  };
}
