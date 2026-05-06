import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { MobileNavMenu } from "./MobileNavMenu";

interface SiteHeaderProps {
  /** Sub-banda opcional (ej. filtros del mapa) que se renderiza bajo el header. */
  children?: React.ReactNode;
}

export function SiteHeader({ children }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--caliza)] bg-[color:var(--papel)]">
      <div className="relative mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 text-[color:var(--tinta)] no-underline"
          aria-label="TillandsIA · Inicio"
        >
          <BrandLogo className="h-8 w-8 shrink-0" title="TillandsIA" />
          <span className="font-display text-[0.95rem] font-semibold leading-tight tracking-tight">
            <em>Tillands</em>
            <span className="not-italic">IA</span>
          </span>
          <span className="ml-2 hidden font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[color:var(--corteza)] sm:inline">
            · Valle del Mezquital
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="flex items-center">
          <ul className="hidden items-center gap-0 sm:flex">
            <li>
              <Link href="/mapa" className="nav-link">
                Mapa
              </Link>
            </li>
            <li>
              <Link href="/sobre" className="nav-link">
                Sobre
              </Link>
            </li>
            <li className="hidden md:block">
              <a href="https://henomotita.mx" className="nav-link">
                Sitio principal
              </a>
            </li>
            <li>
              <Link href="/" className="btn btn-primary ml-2">
                Subir foto
              </Link>
            </li>
          </ul>

          <Link
            href="/"
            className="btn btn-primary mr-2 px-3 py-2 text-[0.82rem] sm:hidden"
            aria-label="Subir foto"
          >
            Subir foto
          </Link>
          <MobileNavMenu />
        </nav>
      </div>

      {children ? (
        <div className="border-t border-[color:var(--caliza)] bg-[color:var(--papel-alt)]">
          {children}
        </div>
      ) : null}
    </header>
  );
}
