import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Info, Shield, BookOpen, Microscope } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre TillandsIA — Mapeo ciudadano del heno motita",
  description:
    "Información sobre el proyecto TillandsIA: especie objetivo, propósito científico, privacidad, y créditos.",
};

export default function SobrePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <section className="border-b border-[color:var(--caliza)] bg-[color:var(--papel)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-10 sm:px-6 sm:py-12">
          <span className="badge-science">Sobre el proyecto</span>
          <h1 className="font-display text-[2.1rem] font-semibold leading-[1.08] tracking-tight text-[color:var(--tinta)] sm:text-[2.6rem]">
            Ciencia abierta para entender al{" "}
            <em className="text-[color:var(--terracota)]">heno motita</em>
          </h1>
          <p className="sh-lead">
            Cómo funciona TillandsIA, en qué evidencia se apoya y cómo cuidamos
            tu privacidad mientras mapeamos el Valle del Mezquital.
          </p>
          <hr className="divider" aria-hidden="true" />
          <span className="rule-gold mt-2" aria-hidden="true" />
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <article className="field-card">
          <span className="badge-science !mb-3 !pb-1">Biología</span>
          <h2 className="mb-2 flex items-center gap-2 text-[1.2rem] font-semibold text-[color:var(--tinta)]">
            <Microscope className="h-5 w-5 text-[color:var(--mezquite-oscuro)]" aria-hidden="true" />
            ¿Qué es el heno motita?
          </h2>
          <div className="flex flex-col gap-3 text-[0.96rem] leading-relaxed text-[color:var(--tinta)]">
            <p>
              El <strong>heno motita</strong> (<em>Tillandsia recurvata</em>) es
              una bromeliácea epífita atmosférica nativa de América. En el Valle
              del Mezquital, Hidalgo, se ha convertido en una plaga invasora que
              afecta principalmente al <strong>mezquite</strong>{" "}
              (<em>Prosopis laevigata</em>), al <strong>huizache</strong>{" "}
              (<em>Vachellia farnesiana</em>) y a otras especies arbóreas y
              cactáceas.
            </p>
            <p>
              No es un parásito nutricional — no extrae savia del árbol — pero
              actúa como <em>parásita estructural</em>: sus cúmulos obstruyen el
              xilema y reducen la fotosíntesis del hospedero. A partir del{" "}
              <strong>50% de cobertura de ramas</strong> se documenta mortalidad
              significativa de brotes (Flores-Palacios et al. 2014). Hay
              aproximadamente <strong>200 ha</strong> de mezquite muerto
              documentadas en el Valle.
            </p>
          </div>
        </article>

        <article className="field-card">
          <span className="badge-science !mb-3 !pb-1">Propósito</span>
          <h2 className="mb-2 flex items-center gap-2 text-[1.2rem] font-semibold text-[color:var(--tinta)]">
            <Info className="h-5 w-5 text-[color:var(--mezquite-oscuro)]" aria-hidden="true" />
            ¿Qué hace este proyecto?
          </h2>
          <div className="flex flex-col gap-3 text-[0.96rem] leading-relaxed text-[color:var(--tinta)]">
            <p>
              TillandsIA es un esfuerzo de <strong>ciencia ciudadana</strong>{" "}
              para generar un mapa público de la distribución y severidad del
              heno motita en el Valle del Mezquital.
            </p>
            <p>
              Cualquier persona puede tomar una foto de un árbol con su celular.
              Un modelo de visión computacional clasifica el nivel de
              infestación (0 a 4) e identifica la especie del hospedero. La
              observación se publica anónimamente, en tiempo real, en el{" "}
              <Link href="/mapa">mapa público</Link>.
            </p>
            <p>
              Los datos sirven a investigadores, técnicos forestales, brigadas
              comunitarias y autoridades para priorizar dónde concentrar los
              esfuerzos de control —{" "}
              <strong>especialmente los árboles &gt;50% infestados</strong>, que
              son los que dispersan más semillas a sus vecinos.
            </p>
          </div>
        </article>

        <article className="field-card">
          <span className="badge-science !mb-3 !pb-1">Privacidad</span>
          <h2 className="mb-2 flex items-center gap-2 text-[1.2rem] font-semibold text-[color:var(--tinta)]">
            <Shield className="h-5 w-5 text-[color:var(--mezquite-oscuro)]" aria-hidden="true" />
            Cómo cuidamos tus datos
          </h2>
          <ul className="flex list-none flex-col gap-2 text-[0.95rem] leading-relaxed text-[color:var(--tinta)]">
            <li className="flex gap-3">
              <span
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 bg-[color:var(--terracota)]"
                aria-hidden="true"
              />
              <span>
                <strong>Sin registro ni login.</strong> No te pedimos correo,
                nombre, ni nada.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 bg-[color:var(--terracota)]"
                aria-hidden="true"
              />
              <span>
                <strong>Sin cookies de seguimiento.</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 bg-[color:var(--terracota)]"
                aria-hidden="true"
              />
              <span>
                <strong>Sin rostros.</strong> Si la foto contiene una persona,
                el modelo la rechaza antes de publicarla.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 bg-[color:var(--terracota)]"
                aria-hidden="true"
              />
              <span>
                <strong>Sin metadatos privados.</strong> Eliminamos toda la
                información de la foto (cámara, GPS embebido, fecha) antes de
                guardarla.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="mt-2 inline-block h-1.5 w-1.5 shrink-0 bg-[color:var(--terracota)]"
                aria-hidden="true"
              />
              <span>
                <strong>Sin tu IP.</strong> Solo guardamos un código irreversible
                (HMAC-SHA-256) para evitar abuso, no tu dirección.
              </span>
            </li>
          </ul>
        </article>

        <aside className="nota-campo warning">
          <span className="nota-titulo">Disclaimer científico</span>
          <p className="text-[0.94rem] leading-relaxed text-[color:var(--tinta)]">
            La clasificación es automática y debe validarse en campo antes de
            usarse para decisiones de manejo, aplicación de químicos o poda. Los
            datos del mapa son indicativos, no definitivos. Las fotografías se
            utilizarán para etiquetado manual y luego entrenar un modelo
            específico para heno motita.
          </p>
        </aside>

        <section className="ficha-tecnica">
          <header className="ficha-tecnica-header flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[color:var(--tinta)]" aria-hidden="true" />
            Marco normativo
          </header>
          <p className="text-[0.94rem] leading-relaxed text-[color:var(--tinta)]">
            <strong>Decreto ZRE Presa Endhó</strong> (DOF 26/09/2024): declara
            36,637 ha del Valle del Mezquital como Zona de Restauración
            Ecológica e identifica al heno motita como especie invasora objetivo
            de control obligatorio.
          </p>
        </section>

        <article className="field-card">
          <span className="badge-science !mb-3 !pb-1">Referencias</span>
          <h2 className="mb-2 text-[1.2rem] font-semibold text-[color:var(--tinta)]">
            Créditos y referencias científicas
          </h2>
          <div className="flex flex-col gap-3 text-[0.94rem] leading-relaxed text-[color:var(--tinta)]">
            <p>
              El prompt del clasificador y los criterios visuales se basan en
              una revisión de literatura compilada en una wiki interna del
              proyecto, con 65 fuentes peer-reviewed y notas técnicas.
              Referencias clave:
            </p>
            <ul className="flex list-none flex-col gap-1.5 text-[0.85rem] text-[color:var(--corteza)]">
              <li className="flex gap-3">
                <span
                  className="mt-2 inline-block h-1 w-1 shrink-0 bg-[color:var(--corteza)]"
                  aria-hidden="true"
                />
                <span>
                  Flores-Palacios et al. 2014 — umbral 50% de cobertura para
                  mortalidad de brotes en mezquite.
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="mt-2 inline-block h-1 w-1 shrink-0 bg-[color:var(--corteza)]"
                  aria-hidden="true"
                />
                <span>
                  Aguilar-Rodríguez et al. 2007, 2016 — anatomía del parasitismo
                  estructural en <em>P. laevigata</em>.
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="mt-2 inline-block h-1 w-1 shrink-0 bg-[color:var(--corteza)]"
                  aria-hidden="true"
                />
                <span>
                  Bernal, Valverde &amp; Hernández-Rosas 2005 — preferencia
                  cuantitativa de hospedero en bosques semiáridos.
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="mt-2 inline-block h-1 w-1 shrink-0 bg-[color:var(--corteza)]"
                  aria-hidden="true"
                />
                <span>
                  PLOS ONE 2017 — limitación de dispersión por lluvia
                  (justificación de la ventana enero–abril).
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="mt-2 inline-block h-1 w-1 shrink-0 bg-[color:var(--corteza)]"
                  aria-hidden="true"
                />
                <span>
                  Reséndiz-Vega et al. 2024 (UTTT) — efectividad de bicarbonato
                  10% como complemento al control mecánico.
                </span>
              </li>
            </ul>
          </div>
        </article>

        <p className="mt-3 text-center font-mono text-[0.72rem] uppercase tracking-[0.05em] text-[color:var(--corteza)]">
          ¿Encontraste un error en una clasificación? Toma otra foto, el sistema
          mejora con uso. ¿Sugerencias o reportes?{" "}
          <a
            href="https://github.com/oscolv/TillandsIA/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abre un issue en GitHub
          </a>
          .
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
