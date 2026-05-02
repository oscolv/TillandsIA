import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Leaf,
  Info,
  Shield,
  BookOpen,
  Microscope,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre TillandsIA — Mapeo ciudadano del heno motita",
  description:
    "Información sobre el proyecto TillandsIA: especie objetivo, propósito científico, privacidad, y créditos.",
};

export default function SobrePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="flex items-center gap-2 font-semibold">
            <Leaf className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <span>Sobre el proyecto</span>
          </h1>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Inicio
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-6 sm:py-10 flex flex-col gap-6">
        <Card>
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

        <Card>
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

        <Card>
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
            Los datos del mapa son indicativos, no definitivos.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              Marco normativo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <ul className="list-disc list-inside flex flex-col gap-1">
              <li>
                <strong>NOM-011-SEMARNAT-1996</strong>: Norma Oficial Mexicana
                que regula el aprovechamiento, transporte y disposición de
                materia vegetal forestal —{" "}
                <em>aplica al material removido</em> tras el control mecánico
                del heno motita.
              </li>
              <li>
                <strong>Decreto ZRE Presa Endhó</strong> (DOF 26/09/2024):
                Declara 36,637 ha del Valle del Mezquital como Zona de
                Restauración Ecológica e identifica al heno motita como
                especie invasora objetivo de control obligatorio.
              </li>
              <li>
                <strong>CONAFOR</strong>: Programa de Sanidad Forestal, con
                financiamiento PF.1 ($1,400/ha) y PF.2 (brigadas).
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
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

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>
          TillandsIA — ciencia ciudadana del Valle del Mezquital. Sin
          registro, sin cookies.
        </p>
      </footer>
    </div>
  );
}
