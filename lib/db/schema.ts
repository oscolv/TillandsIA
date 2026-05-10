import {
  boolean,
  doublePrecision,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Una observación = una foto geo-referenciada de un árbol clasificado por el modelo.
 *
 * Campos sensibles a privacidad:
 * - `ip_hash`: HMAC-SHA-256 del IP con `RATE_LIMIT_SALT`. Nunca el IP plano.
 * - No se almacena user agent, cookies, o cualquier otro identificador.
 *
 * Campos científicos (derivados de la wiki):
 * - `level` 0-4 con umbral crítico en 3 (50% cobertura → mortalidad de brotes en mezquite).
 * - `infestation_active`: cúmulo gris vivo vs café post-tratamiento.
 * - `branch_dieback`: ramas muertas → parasitismo avanzado.
 * - `season_window`: created_at en enero-abril (ventana óptima previa a dispersión).
 *
 * Versionado:
 * - `classifier_version` y `model_version` permiten filtrar el dataset por
 *   iteración del prompt o cambio de modelo. Nunca se reutilizan valores.
 */
export const observations = pgTable(
  "observations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Geo
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    accuracy: doublePrecision("accuracy"),
    municipality: text("municipality"),

    // Foto
    photoUrl: text("photo_url").notNull(),

    // Clasificación
    level: smallint("level").notNull(),
    label: text("label").notNull(),
    confidence: doublePrecision("confidence"),
    treeSpecies: text("tree_species"),
    treeSpeciesCommon: text("tree_species_common"),
    aiNotes: text("ai_notes"),

    // Indicadores derivados de la wiki
    infestationActive: boolean("infestation_active"),
    branchDieback: boolean("branch_dieback"),
    photoAngle: text("photo_angle"),
    seasonWindow: boolean("season_window").notNull().default(false),

    // Moderación
    flagged: boolean("flagged").notNull().default(false),
    flagReasons: text("flag_reasons")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),

    // Versionado y privacidad
    classifierVersion: text("classifier_version").notNull(),
    modelVersion: text("model_version").notNull(),
    ipHash: text("ip_hash").notNull(),

    // Integridad: sha256 hex de la imagen sanitizada que el modelo vio.
    // Nullable para registros legacy anteriores a la migración.
    imageHash: text("image_hash"),

    // Revisión humana — convierte el dataset de etiquetas IA en uno corregido.
    // Estados: pending | accepted | corrected | rejected.
    humanReviewStatus: text("human_review_status").notNull().default("pending"),
    humanLevel: smallint("human_level"),
    reviewerNotes: text("reviewer_notes"),
    // Cuándo el revisor cambió el status fuera de 'pending'. NULL si sigue pendiente.
    // Sirve para medir tiempo captura → revisión y detectar atascos en la cola.
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // 'train' | 'val' | 'test' — asignado al exportar el dataset etiquetado.
    trainingSplit: text("training_split"),
  },
  (table) => [
    index("observations_lat_lng_idx").on(table.lat, table.lng),
    index("observations_created_at_idx").on(table.createdAt.desc()),
    index("observations_level_idx").on(table.level, table.createdAt.desc()),
    index("observations_flagged_idx")
      .on(table.flagged)
      .where(sql`${table.flagged} = true`),
    index("observations_image_hash_idx").on(table.imageHash),
    index("observations_review_idx").on(
      table.humanReviewStatus,
      table.createdAt.desc(),
    ),
    index("observations_reviewed_at_idx").on(table.reviewedAt.desc()),
  ],
);

export type ObservationRow = typeof observations.$inferSelect;
export type ObservationInsert = typeof observations.$inferInsert;

/**
 * Bitácora de cada llamada a `/api/classify`, exitosa o rechazada.
 *
 * Para qué sirve:
 *  - Tasa de rechazo por motivo a lo largo del tiempo (rostros, foto
 *    insuficiente, etc.). Un alza repentina de "rejected_face" indica
 *    que la guía visual de la UI necesita reforzarse.
 *  - Tasa de abandono: clasificadas que nunca se confirman. Si la confirma
 *    el usuario, se crea una fila en `observations` con el mismo `image_hash`.
 *  - Drift de confianza: media diaria/semanal de `confidence` en eventos
 *    `classified` revela degradación del modelo o cambios estacionales.
 *
 * Sin FK a `observations` por simplicidad: la unión se hace por `image_hash`
 * cuando hace falta. Una clasificación rechazada por el modelo nunca tiene
 * observación asociada.
 */
export const classificationEvents = pgTable(
  "classification_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // 'classified' | 'rejected_face' | 'rejected_insufficient'
    //   | 'rejected_other' | 'error'
    outcome: text("outcome").notNull(),

    // Confianza reportada por el modelo. NULL para `error` o casos donde
    // no haya un valor numérico (p. ej. el modelo respondió pero el JSON
    // no parseó). Los `rejected_*` sí pueden traer confianza si el modelo
    // alcanzó a evaluar la imagen antes del flag.
    confidence: doublePrecision("confidence"),

    // Privacidad: igual que en `observations`, hash HMAC del IP, nunca el IP.
    ipHash: text("ip_hash").notNull(),

    // Hash sha256 de la imagen sanitizada. Permite cruzar contra
    // `observations.image_hash` para distinguir clasificadas-y-confirmadas
    // de clasificadas-y-abandonadas. NULL si el evento es `error` antes
    // de obtener una imagen sanitizable.
    imageHash: text("image_hash"),

    // Versionado del clasificador en el momento del evento. Útil para
    // segmentar el dashboard por iteración del prompt.
    classifierVersion: text("classifier_version").notNull(),
    modelVersion: text("model_version").notNull(),
  },
  (table) => [
    index("classification_events_created_at_idx").on(table.createdAt.desc()),
    index("classification_events_outcome_idx").on(
      table.outcome,
      table.createdAt.desc(),
    ),
    index("classification_events_image_hash_idx").on(table.imageHash),
  ],
);

export type ClassificationEventRow = typeof classificationEvents.$inferSelect;
export type ClassificationEventInsert =
  typeof classificationEvents.$inferInsert;
