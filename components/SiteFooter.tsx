import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t-4 border-[color:var(--mezquite-oscuro)] bg-[color:var(--papel-alt)] text-[color:var(--corteza)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-md items-start gap-3">
            <BrandLogo className="h-9 w-9 shrink-0" title="TillandsIA" />
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-[color:var(--tinta)]">
                <em>Tillands</em>
                <span className="not-italic">IA</span>
              </p>
              <p className="mt-1 font-serif text-[0.92rem] leading-relaxed text-[color:var(--corteza)]">
                Mapeo ciudadano del heno motita en el Valle del Mezquital.
                Sin registro, sin cookies, sin rostros.
              </p>
            </div>
          </div>

          <nav aria-label="Enlaces del proyecto" className="min-w-[180px]">
            <h5 className="mb-3 border-b border-[color:var(--caliza)] pb-1.5 font-mono text-[0.72rem] font-medium uppercase tracking-[0.1em] text-[color:var(--terracota)]">
              Proyecto
            </h5>
            <ul className="grid gap-2 text-[0.78rem]">
              <li>
                <Link
                  href="/mapa"
                  className="nav-link px-0"
                  style={{ minHeight: "auto", padding: "2px 0" }}
                >
                  Mapa público
                </Link>
              </li>
              <li>
                <Link
                  href="/sobre"
                  className="nav-link px-0"
                  style={{ minHeight: "auto", padding: "2px 0" }}
                >
                  Sobre TillandsIA
                </Link>
              </li>
              <li>
                <a
                  href="https://henomotita.mx"
                  className="nav-link px-0"
                  style={{ minHeight: "auto", padding: "2px 0" }}
                >
                  Sitio principal
                </a>
              </li>
              <li>
                <a
                  href="https://henomotita.mx/#unete"
                  className="nav-link px-0"
                  style={{ minHeight: "auto", padding: "2px 0" }}
                >
                  Únete a una brigada
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-[color:var(--caliza)] pt-5 font-mono text-[0.72rem] tracking-[0.02em] text-[color:var(--corteza)]">
          <p>
            Ciencia ciudadana del Valle del Mezquital ·{" "}
            <em className="text-[color:var(--tinta)]">Tillandsia recurvata</em>
          </p>
          <p>Datos públicos, abiertos y anónimos.</p>
        </div>
      </div>
    </footer>
  );
}
