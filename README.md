# TillandsIA

**Mapeo ciudadano del heno motita en el Valle del Mezquital con inteligencia artificial.**

App móvil web que permite a cualquier persona fotografiar un árbol infestado de *Tillandsia recurvata* ("heno motita"), clasificar el nivel de infestación con un modelo de visión, y registrar la observación geo-referenciada en un mapa público. Sin registro, sin cookies de seguimiento, completamente anónimo.

Producción: <https://tillandsia-nu.vercel.app/>

---

## ¿Cómo funciona?

```
foto del árbol  →  GPS del navegador  →  GPT-5.4 mini Vision
      ↓                                          ↓
sanitización (sharp, sin EXIF)         clasificación + chequeo de rostros
      ↓                                          ↓
       └────  cache atando hash↔clasificación  ──┘
                          ↓
              confirmación del usuario
                          ↓
            Vercel Blob + Neon Postgres
                          ↓
               aparece en /mapa público
```

El usuario sólo ve tres pasos: **foto → ubicación → resultado.**

---

## Niveles de infestación

| Nivel | Etiqueta | Criterio visual |
|-------|----------|-----------------|
| 0 | Sin infestación | No se observa heno motita |
| 1 | Leve | 1–25 % de ramas con cúmulos |
| 2 | Moderada | 25–50 % afectadas |
| 3 | Severa | 50–75 % — umbral crítico de mortalidad de brotes (Flores-Palacios 2014) |
| 4 | Muy severa | >75 % — "árbol fuente" prioritario (Valverde & Bernal 2010) |

El modelo también devuelve: especie del hospedero, si la infestación está activa o post-tratamiento, presencia de ramas muertas, ángulo de foto y nivel de confianza.

---

## Privacidad

- **Sin registro ni login.** Cero cookies de identificación.
- **Sin rostros.** El prompt rechaza explícitamente cualquier foto donde el modelo detecte un rostro humano (incluso parcial o de fondo).
- **Sin EXIF.** `sharp` re-encoda cada foto a JPEG sin metadatos antes de almacenarla; el GPS interno de la cámara se descarta.
- **Sin IP plano.** Sólo se almacena `HMAC-SHA-256(ip, RATE_LIMIT_SALT)` para rate-limiting.
- **Datos almacenados:** foto sanitizada, coordenadas GPS, nivel de infestación, timestamp, hash de IP.

---

## Integridad del dataset

El cliente **no** es autoridad sobre la clasificación. Si lo fuera, cualquier persona técnica podría enviar `level: 4, confidence: 0.99` con cualquier foto y envenenar el dataset.

Flujo seguro:

1. `POST /api/classify` sanitiza la imagen, la clasifica con GPT-5.4 mini, calcula `sha256(imagen)` y guarda `{imageHash → classification}` en Upstash con TTL de 15 min. Devuelve `imageHash` y `classification` (esta última solo para mostrar al usuario).
2. `POST /api/observations` recibe `{photoBase64, imageHash, lat, lng}` — **no recibe la classification**. El servidor:
   - Recalcula `sha256(photoBase64)` y verifica que coincide con `imageHash`.
   - Lee la classification real desde Upstash usando ese hash.
   - Si el hash no coincide o el cache expiró, rechaza.

Resultado: la clasificación queda atada criptográficamente a la imagen exacta que el modelo vio.

### Revisión humana

Cada observación entra al dataset con `human_review_status = 'pending'`. Un revisor puede marcarla como:

- `accepted` — la etiqueta del modelo es correcta.
- `corrected` — `human_level` contiene la etiqueta correcta.
- `rejected` — foto inválida (líquenes, no hospedero, fuera de zona, etc.).

El campo `training_split` (`train | val | test`) se asigna al exportar el dataset etiquetado para entrenar un modelo fine-tuned.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 App Router (TypeScript, React 19) |
| Despliegue | Vercel (Fluid Compute, Node runtime) |
| Almacenamiento de fotos | Vercel Blob |
| Base de datos | Neon Postgres + Drizzle ORM |
| Cache / rate-limit | Upstash Redis (sliding window 10/h) |
| Clasificación | OpenAI GPT-5.4 mini (structured outputs) |
| Sanitización | `sharp` (re-encode JPEG sin EXIF) |
| Mapa | Leaflet + React-Leaflet, tiles de OpenStreetMap |
| Estilos | Tailwind CSS v4 + shadcn/ui |

---

## Esquema de base de datos

```sql
CREATE TABLE observations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Geo
  lat                  FLOAT       NOT NULL,
  lng                  FLOAT       NOT NULL,
  accuracy             FLOAT,
  municipality         TEXT,

  -- Foto
  photo_url            TEXT        NOT NULL,
  image_hash           TEXT,                          -- sha256 hex de la foto sanitizada

  -- Clasificación
  level                SMALLINT    NOT NULL,          -- 0..4
  label                TEXT        NOT NULL,
  confidence           FLOAT,
  tree_species         TEXT,
  tree_species_common  TEXT,
  ai_notes             TEXT,
  infestation_active   BOOLEAN,                       -- gris vivo vs café post-tratamiento
  branch_dieback       BOOLEAN,
  photo_angle          TEXT,                          -- canopy | trunk | mixed | insufficient
  season_window        BOOLEAN     NOT NULL DEFAULT false,

  -- Moderación
  flagged              BOOLEAN     NOT NULL DEFAULT false,
  flag_reasons         TEXT[]      NOT NULL DEFAULT '{}',

  -- Revisión humana (convierte etiquetas IA en dataset corregido)
  human_review_status  TEXT        NOT NULL DEFAULT 'pending',
  human_level          SMALLINT,
  reviewer_notes       TEXT,
  training_split       TEXT,                          -- train | val | test

  -- Versionado y privacidad
  classifier_version   TEXT        NOT NULL,
  model_version        TEXT        NOT NULL,
  ip_hash              TEXT        NOT NULL           -- HMAC-SHA-256(ip, salt)
);
```

---

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Flujo principal: foto → GPS → clasificación → confirmación |
| `/mapa` | Mapa público con todos los registros |
| `/sobre` | Información del proyecto |
| `POST /api/classify` | Sanitiza, clasifica y cachea `{imageHash → classification}` |
| `POST /api/observations` | Persiste tras verificar el hash y leer la classification del cache |
| `GET /api/observations` | Lista pública para alimentar el mapa |

---

## Variables de entorno

```bash
OPENAI_API_KEY=                 # OpenAI API key (acceso a GPT-5.4 mini)
DATABASE_URL=                   # Neon Postgres connection string
BLOB_READ_WRITE_TOKEN=          # Vercel Blob

# Upstash Redis (rate limit + cache de classification)
KV_REST_API_URL=                # o UPSTASH_REDIS_REST_URL
KV_REST_API_TOKEN=              # o UPSTASH_REDIS_REST_TOKEN

# Sal para HMAC del IP — debe ser un secreto, ≥32 bytes aleatorios
RATE_LIMIT_SALT=

# Opcional
MAX_PHOTO_MB=10
```

En desarrollo: `vercel env pull .env.local` (requiere `vercel link`).

---

## Desarrollo local

```bash
npm install
vercel env pull .env.local
npm run dev                # http://localhost:3000
```

### Base de datos

```bash
npm run db:generate        # genera migración a partir de cambios en schema.ts
npm run db:migrate         # aplica migraciones pendientes (tsx scripts/migrate.ts)
npm run db:push            # sincroniza schema directamente (sólo dev)
npm run db:studio          # Drizzle Studio
```

### Tests

```bash
npm test                   # vitest run (47 tests)
npm run test:watch
```

---

## Modelo IA

`MODEL_VERSION` y `CLASSIFIER_VERSION` están hard-codeados a propósito en `lib/classify.ts`. Cualquier cambio de modelo o de prompt **debe** bumpear `CLASSIFIER_VERSION`, porque el comportamiento del clasificador puede variar y queremos poder filtrar el dataset por iteración. Hay un test snapshot del prompt para detectar cambios accidentales.

El prompt cita evidencia documentada en la wiki del proyecto:

- Umbral del 50 % como mortalidad de brotes en mezquite (Flores-Palacios et al. 2014).
- Hospederos preferidos del Valle del Mezquital: mezquite, huizache, pirul, *A. schaffneri*, garambullo.
- Diferencia visual entre cúmulo gris vivo y café post-tratamiento (LSU AgCenter, INIFAP).
- Concepto de "árbol fuente" para nivel 4 (Valverde & Bernal 2010).

---

## Limitaciones conocidas

- Las observaciones cercanas a estructuras humanas pueden mostrar bardas, casas o calles en el fondo. El proyecto privilegia el valor científico de la coordenada exacta sobre la ofuscación geográfica.
- El modelo puede confundir líquenes incrustantes, musgos verdaderos o *Tillandsia usneoides* con *T. recurvata* en fotos de baja calidad — por eso existe `human_review_status`.
- En conexiones rurales muy intermitentes el `fetchWithRetry` reintenta automáticamente errores de red, 5xx y 408; no reintenta 4xx, 422 ni 429.

---

## Estructura del repo

```
app/
  page.tsx                      # flujo de captura
  mapa/page.tsx                 # mapa público
  sobre/page.tsx                # acerca del proyecto
  api/
    classify/route.ts           # POST: sanitiza + clasifica + cachea
    observations/route.ts       # POST: verifica hash + persiste; GET: lista pública
components/
  CameraCapture.tsx             # input cámara/archivo con preview
  LocationCapture.tsx           # geolocation API
  ClassificationResult.tsx      # nivel + confianza + notas
  ObservationMap.tsx            # Leaflet con pins por nivel
  UploadFlow.tsx                # stepper foto → GPS → resultado
lib/
  classify.ts                   # prompt + structured outputs + parser
  classification-cache.ts       # sha256 + Upstash get/set (puente classify↔observations)
  sanitize-image.ts             # sharp re-encode + dim check + magic bytes
  hash-ip.ts                    # HMAC-SHA-256 del IP
  rate-limit.ts                 # Upstash sliding window 10/h
  validate-coords.ts            # bbox del Valle del Mezquital
  municipalities.ts             # mapeo coords → municipio
  db/                           # Drizzle schema + cliente Neon
drizzle/                        # migraciones SQL versionadas
```

---

## Licencia

Por definir. Las contribuciones de fotos quedan bajo licencia libre para uso científico no comercial.
