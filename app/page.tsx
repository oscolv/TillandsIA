import { UploadFlow } from "@/components/UploadFlow";
import { ImpactStats } from "@/components/ImpactStats";
import { SeasonalBanner } from "@/components/SeasonalBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-[color:var(--caliza)] bg-[color:var(--papel)]">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-10 sm:px-6 sm:py-14">
            <span className="etiqueta-especimen">Ciencia ciudadana · Valle del Mezquital</span>
            <p className="nombre-cientifico">
              <em>Tillandsia recurvata</em> (L.) L.
            </p>
            <h1 className="font-display text-[2.2rem] font-semibold leading-[1.05] tracking-tight text-[color:var(--tinta)] sm:text-[2.8rem]">
              Mapea un árbol con{" "}
              <em className="text-[color:var(--terracota)]">heno motita</em>{" "}
              en menos de un minuto.
            </h1>
            <p className="font-mono text-[0.78rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
              Valle del Mezquital, Hidalgo
            </p>
            <p className="sh-lead mt-1">
              Toma una foto, comparte tu ubicación y la inteligencia artificial
              estima el nivel de infestación. Tu observación aparece al instante
              en el mapa público para apoyar el control y la prevención de{" "}
              <em>Tillandsia recurvata</em>.
            </p>
            <hr className="divider" aria-hidden="true" />
            <span className="rule-gold mt-2" aria-hidden="true" />
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:py-10">
          <SeasonalBanner />
          <ImpactStats />
          <UploadFlow />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
