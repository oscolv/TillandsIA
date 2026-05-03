import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

/**
 * Footer oscuro coherente con henomotita.mx. Liga al sitio principal, al
 * mapa y al "sobre" del proyecto.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 bg-[color:var(--forest)] text-white/70">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-md items-start gap-3">
            <BrandLogo className="h-9 w-9 shrink-0" title="TillandsIA" />
            <div>
              <p className="font-display text-base font-extrabold uppercase tracking-[0.1em] text-white">
                TillandsIA
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                Mapeo ciudadano del heno motita en el Valle del Mezquital.
                Sin registro, sin cookies, sin rostros.
              </p>
            </div>
          </div>

          <nav aria-label="Enlaces del proyecto">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-white/65">
              <li>
                <Link href="/mapa" className="hover:text-white">
                  Mapa
                </Link>
              </li>
              <li>
                <Link href="/sobre" className="hover:text-white">
                  Sobre
                </Link>
              </li>
              <li>
                <a
                  href="https://henomotita.mx"
                  className="hover:text-white"
                >
                  Sitio principal
                </a>
              </li>
              <li>
                <a
                  href="https://henomotita.mx/#unete"
                  className="hover:text-white"
                >
                  Únete
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-white/10 pt-5 text-xs text-white/50">
          <p>
            Ciencia ciudadana del Valle del Mezquital ·{" "}
            <em className="not-italic text-white/65">Tillandsia recurvata</em>{" "}
            · Datos públicos, abiertos y anónimos.
          </p>
        </div>
      </div>
    </footer>
  );
}
