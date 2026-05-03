import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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

      <section className="border-b border-[color:var(--rule)] bg-[color:var(--linen)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-10 sm:px-6 sm:py-12">
          <span className="eyebrow">Sobre el proyecto</span>
          <h1 className="font-display text-3xl font-black leading-[1.1] tracking-tight text-[color:var(--green)] sm:text-4xl">
            Ciencia abierta para entender al{" "}
            <em className="not-italic text-[color:var(--ochre)]">heno motita</em>
          </h1>
          <p className="max-w-xl text-[1rem] leading-relaxed text-[color:var(--ink-m)]">
            Cómo funciona TillandsIA, en qué evidencia se apoya y cómo
            cuidamos tu privacidad mientras mapeamos el Valle del Mezquital.
          </p>
          <div className="rule-gold mt-1" aria-hidden="true" />
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <Card className="card-editorial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5" aria-hidden="true" />
              ¿Qué es el heno motita?
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none flex flex-col gap-3">
            <p>
              El <strong>heno motita</strong> (<em>Tillandsia recurvata</em>) es
              una bromeliácea epífita atmosférica nativa de América. En el
              Valle del Mezquital, Hidalgo, se ha convertido en una plaga
              invasora que afecta principalmente al{" "}
              <strong>mezquite</strong> (<em>Prosopis laevigata</em>), al{" "}
              <strong>huizache</strong> (<em>Vachellia farnesiana</em>) y a
              otras especies arbóreas y cactáceas.
            </p>
            <p>
              No es un parásito nutricional — no extrae savia del árbol — pero
              actúa como <em>parásita estructural</em>: sus cúmulos obstruyen
              el xilema y reducen la fotosíntesis del hospedero. A partir del{" "}
              <strong>50% de cobertura de ramas</strong> se documenta
              mortalidad significativa de brotes (Flores-Palacios et al. 2014).
              Hay aproximadamente <strong>200 ha</strong> de mezquite muerto
              documentadas en el Valle.
            </p>
          </CardContent>
        </Card>

        <Card className="card-editorial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" aria-hidden="true" />
              ¿Qué hace este proyecto?
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              TillandsIA es un esfuerzo de <strong>ciencia ciudadana</strong>{" "}
              para generar un mapa público de la distribución y severidad del
              heno motita en el Valle del Mezquital.
            </p>
            <p>
              Cualquier persona puede tomar una foto de un árbol con su
              celular. Un modelo de visión computacional clasifica el nivel de
              infestación (0 a 4) e identifica la especie del hospedero. La
              observación se publica anónimamente, en tiempo real, en el{" "}
              <Link href="/mapa" className="underline">
                mapa público
              </Link>
              .
            </p>
            <p>
              Los datos sirven a investigadores, técnicos forestales, brigadas
              comunitarias y autoridades para priorizar dónde concentrar los
              esfuerzos de control —{" "}
              <strong>especialmente los árboles &gt;50% infestados</strong>,
              que son los que dispersan más semillas a sus vecinos.
            </p>
          </CardContent>
        </Card>

        <Card className="card-editorial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" aria-hidden="true" />
              Privacidad
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <ul className="list-disc list-inside flex flex-col gap-1">
              <li>
                <strong>Sin registro ni login.</strong> No te pedimos correo,
                nombre, ni nada.
              </li>
              <li>
                <strong>Sin cookies de seguimiento.</strong>
              </li>
              <li>
                <strong>Sin rostros.</strong> Si la foto contiene una persona,
                el modelo la rechaza antes de publicarla.
              </li>
              <li>
                <strong>Sin metadatos privados.</strong> Eliminamos toda la
                información de la foto (cámara, GPS embebido, fecha) antes de
                guardarla.
              </li>
              <li>
                <strong>Sin tu IP.</strong> Solo guardamos un código
                irreversible (HMAC-SHA-256) para evitar abuso, no tu
                dirección.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Disclaimer científico</AlertTitle>
          <AlertDescription>
            La clasificación es automática y debe validarse en campo antes de
            usarse para decisiones de manejo, aplicación de químicos o poda.
            Los datos del mapa son indicativos, no definitivos. Las
            fotografías se utilizarán para etiquetado manual y luego entrenar
            un modelo específico para heno motita.
          </AlertDescription>
        </Alert>

        <Card className="card-editorial">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              Marco normativo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              <strong>Decreto ZRE Presa Endhó</strong> (DOF 26/09/2024):
              Declara 36,637 ha del Valle del Mezquital como Zona de
              Restauración Ecológica e identifica al heno motita como especie
              invasora objetivo de control obligatorio.
            </p>
          </CardContent>
        </Card>

        <Card className="card-editorial">
          <CardHeader>
            <CardTitle>Créditos y referencias científicas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm flex flex-col gap-2">
            <p>
              El prompt del clasificador y los criterios visuales se basan en
              una revisión de literatura compilada en una wiki interna del
              proyecto, con 65 fuentes peer-reviewed y notas técnicas.
              Referencias clave:
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground flex flex-col gap-1">
              <li>
                Flores-Palacios et al. 2014 — umbral 50% de cobertura para
                mortalidad de brotes en mezquite.
              </li>
              <li>
                Aguilar-Rodríguez et al. 2007, 2016 — anatomía del parasitismo
                estructural en <em>P. laevigata</em>.
              </li>
              <li>
                Bernal, Valverde &amp; Hernández-Rosas 2005 — preferencia
                cuantitativa de hospedero en bosques semiáridos.
              </li>
              <li>
                PLOS ONE 2017 — limitación de dispersión por lluvia
                (justificación de la ventana enero–abril).
              </li>
              <li>
                Reséndiz-Vega et al. 2024 (UTTT) — efectividad de bicarbonato
                10% como complemento al control mecánico.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Separator />

        <p className="text-xs text-center text-muted-foreground">
          Si encuentras un error en una clasificación, simplemente toma otra
          foto. El sistema mejora con uso. ¿Sugerencias o reportes?{" "}
          <a
            href="https://github.com/oscolv/TillandsIA/issues"
            className="underline"
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
