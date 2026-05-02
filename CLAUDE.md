# TillandsIA

**Mapeo ciudadano del heno motita con inteligencia artificial**

App móvil web que permite a cualquier persona fotografiar árboles infestados de heno motita (*Tillandsia recurvata*), clasificar automáticamente el nivel de infestación con IA, y registrar la ubicación GPS. Los registros se muestran en un mapa interactivo público. Sin registro, sin rostros, completamente anónimo.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 App Router (TypeScript, React 19) |
| Despliegue | Vercel (Fluid Compute) |
| Almacenamiento de fotos | Vercel Blob |
| Base de datos | Neon Postgres (Vercel Marketplace) |
| Clasificación IA | GPT-5.4 mini (vision) vía OpenAI API |
| Mapa | Leaflet + React-Leaflet |
| GPS | Browser Geolocation API |
| Cámara | `<input type="file" accept="image/*" capture="environment">` |
| Estilos | Tailwind CSS v4 (CSS-first) + shadcn/ui |

---

## Niveles de infestación

El modelo GPT-5.4 mini clasifica cada fotografía en uno de cinco niveles:

| Nivel | Etiqueta | Criterio visual |
|-------|----------|-----------------|
| 0 | Sin infestación | No se observa heno motita en el árbol |
| 1 | Leve | 1–25 % de ramas con heno motita |
| 2 | Moderada | 25–50 % de ramas afectadas |
| 3 | Severa | 50–75 % de ramas afectadas |
| 4 | Muy severa | Más del 75 % de ramas cubiertas |

La respuesta del modelo también incluye: especie de árbol detectada (si es identificable), notas descriptivas, y nivel de confianza (0–1).

---

## Reglas de privacidad

- **Sin registro ni login.** Cero cookies de seguimiento de usuarios.
- **Sin rostros.** Antes de almacenar, el prompt a GPT-5.4 mini verifica si hay rostros humanos; si los detecta, se rechaza la foto con mensaje al usuario.
- **Solo manos, ramas y árboles.** La UI guía al usuario explícitamente.
- **Sin IP ni datos personales almacenados.** Solo: foto, coordenadas GPS, nivel de infestación, timestamp.
- **Subidas ilimitadas.** Cualquier persona puede subir todas las fotos que quiera.

---

## Esquema de base de datos

```sql
CREATE TABLE observations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat         FLOAT       NOT NULL,
  lng         FLOAT       NOT NULL,
  accuracy    FLOAT,                          -- precisión GPS en metros
  photo_url   TEXT        NOT NULL,           -- URL pública de Vercel Blob
  level       SMALLINT    NOT NULL CHECK (level BETWEEN 0 AND 4),
  label       TEXT        NOT NULL,           -- "Leve", "Severa", etc.
  confidence  FLOAT,                          -- confianza del modelo (0–1)
  tree_species TEXT,                          -- especie detectada por el modelo
  ai_notes    TEXT                            -- descripción libre del modelo
);

CREATE INDEX ON observations (lat, lng);
CREATE INDEX ON observations (created_at DESC);
```

---

## Rutas de la aplicación

| Ruta | Descripción |
|------|-------------|
| `/` | Flujo principal: captura foto → GPS → clasificación → confirmación |
| `/mapa` | Mapa público con todos los registros; clic en pin → foto + datos |
| `/api/observations` | `GET` lista paginada; `POST` nueva observación |
| `/api/classify` | `POST` imagen → GPT-5.4 mini Vision → nivel de infestación |

---

## Estructura de directorios

```
tillandsia/
├── app/
│   ├── page.tsx                   # Landing + flujo de captura (mobile-first)
│   ├── mapa/
│   │   └── page.tsx               # Mapa interactivo
│   ├── api/
│   │   ├── observations/
│   │   │   └── route.ts           # GET (lista) + POST (nueva observación)
│   │   └── classify/
│   │       └── route.ts           # POST imagen → clasificación GPT-5.4 mini
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── CameraCapture.tsx          # Input cámara/archivo con preview
│   ├── LocationCapture.tsx        # Captura y muestra GPS
│   ├── ClassificationResult.tsx   # Muestra nivel + confianza + notas
│   ├── ObservationMap.tsx         # Mapa Leaflet con pins
│   └── UploadFlow.tsx             # Stepper: foto → ubicación → resultado
├── lib/
│   ├── db.ts                      # Cliente Neon Postgres (neon serverless)
│   ├── blob.ts                    # Helpers Vercel Blob
│   ├── classify.ts                # Lógica de clasificación con GPT-5.4 mini Vision
│   └── types.ts                   # Tipos TypeScript compartidos
└── public/
    └── icons/                     # Íconos de nivel de infestación para el mapa
```

---

## Variables de entorno

```bash
# OpenAI
OPENAI_API_KEY=

# Neon Postgres
DATABASE_URL=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Opcional: límite de tamaño de foto en MB (default: 10)
MAX_PHOTO_MB=10
```

Gestionar con `vercel env pull .env.local` en desarrollo.

---

## Comandos de desarrollo

```bash
npm install
vercel env pull .env.local   # requiere vercel CLI y proyecto vinculado
npm run dev                  # http://localhost:3000

# Migraciones de base de datos
npm run db:migrate            # aplica schema inicial
npm run db:studio             # Drizzle Studio (opcional)
```

---

## Decisiones arquitectónicas

**¿Por qué sin autenticación?**
El objetivo es máxima participación ciudadana. Cualquier fricción (registro, email) reduce drásticamente las contribuciones. La moderación de contenido la hace GPT-5.4 mini en el momento de la clasificación.

**¿Por qué GPT-5.4 mini y no un modelo fine-tuned?**
El dataset inicial es pequeño. GPT-5.4 mini con un prompt específico para *Tillandsia recurvata* funciona bien out-of-the-box y ya está validado en producción (CompostaLirio). Se puede migrar a un modelo fine-tuned cuando se acumulen suficientes observaciones etiquetadas.

**¿Por qué Leaflet y no Google Maps?**
Open-source, sin cuotas por uso, fácil integración con Next.js, y suficiente para este caso de uso. Tiles de OpenStreetMap.

**¿Por qué Vercel Blob y no S3?**
Integración nativa con Vercel, latencia baja desde las funciones, URL pública directa sin configuración adicional.

**Flujo de una observación:**
1. Usuario toma foto en el celular
2. Browser captura coordenadas GPS (lat, lng, accuracy)
3. `POST /api/classify` → foto a GPT-5.4 mini Vision → nivel + notas
4. El modelo verifica ausencia de rostros; rechaza si detecta alguno
5. Si pasa validación: foto a Vercel Blob, metadata a Neon Postgres
6. Usuario ve resultado y confirmación
7. Observación aparece en `/mapa` inmediatamente

---

## Contexto del proyecto

- **Especie objetivo:** *Tillandsia recurvata* ("heno motita") — epífita invasora que prolifera sobre mezquite, huizache y otros árboles del Valle del Mezquital, Hidalgo, México.
- **Propósito científico:** Generar un dataset georeferenciado de distribución e intensidad de infestación para apoyar estudios de control y prevención.
- **Audiencia:** Habitantes locales, investigadores, técnicos de campo, estudiantes.
- **Wiki de referencia:** `~/wiki/topics/heno-motita/` — contiene 71 fuentes y 19 artículos compilados sobre la especie.
