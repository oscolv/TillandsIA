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
        {/* Hero editorial — eyebrow + headline + lead, igual que henomotita.mx */}
        <section className="border-b border-[color:var(--rule)] bg-[color:var(--linen)]">
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10 sm:px-6 sm:py-14">
            <span className="eyebrow">Ciencia ciudadana · Valle del Mezquital</span>
            <h1 className="font-display text-3xl font-black leading-[1.1] tracking-tight text-[color:var(--green)] sm:text-4xl">
              Mapea un árbol con <em className="not-italic text-[color:var(--ochre)]">heno motita</em>{" "}
              en menos de un minuto.
            </h1>
            <p className="max-w-xl text-[1.02rem] leading-relaxed text-[color:var(--ink-m)]">
              Toma una foto, comparte tu ubicación y la inteligencia
              artificial estima el nivel de infestación. Tu observación
              aparece al instante en el mapa público para apoyar el control
              y la prevención de <em>Tillandsia recurvata</em>.
            </p>
            <div className="rule-gold mt-1" aria-hidden="true" />
          </div>
        </section>

        {/* Flujo principal */}
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
