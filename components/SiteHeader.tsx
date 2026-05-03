import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

interface SiteHeaderProps {
  /** Si la página tiene su propia banda de filtros u otros controles, se renderizan aquí. */
  children?: React.ReactNode;
}

/**
 * Navbar oscuro alineado con henomotita.mx — fondo forest con backdrop-blur,
 * logo + nombre, links a las secciones del sitio principal y a las dos vistas
 * propias de la app (mapa, sobre).
 */
export function SiteHeader({ children }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[color:var(--forest)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--forest)]/85">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-white"
          aria-label="TillandsIA · Inicio"
        >
          <BrandLogo className="h-8 w-8 shrink-0" title="TillandsIA" />
          <span className="font-display text-[0.95rem] font-extrabold leading-tight tracking-tight">
            <em className="font-extrabold">Tillands</em>
            <span className="not-italic">IA</span>
            <span className="ml-2 hidden text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/55 sm:inline">
              · Valle del Mezquital
            </span>
          </span>
        </Link>

        <nav aria-label="Navegación principal">
          <ul className="flex items-center gap-0.5 text-white/75">
            <li className="hidden sm:block">
              <Link
                href="/mapa"
                className="rounded px-3 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.06em] transition hover:bg-white/10 hover:text-white"
              >
                Mapa
              </Link>
            </li>
            <li className="hidden sm:block">
              <Link
                href="/sobre"
                className="rounded px-3 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.06em] transition hover:bg-white/10 hover:text-white"
              >
                Sobre
              </Link>
            </li>
            <li className="hidden md:block">
              <a
                href="https://henomotita.mx"
                className="rounded px-3 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.06em] transition hover:bg-white/10 hover:text-white"
              >
                Home
              </a>
            </li>
            <li>
              <Link
                href="/"
                className="ml-1 rounded bg-[color:var(--ochre)] px-4 py-2 text-[0.78rem] font-bold uppercase tracking-[0.06em] text-white shadow-[0_4px_16px_rgba(184,116,26,0.35)] transition hover:bg-[color:var(--gold)]"
              >
                Subir foto
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      {/* Sub-banda opcional (filtros del mapa, etc.) */}
      {children ? (
        <div className="border-t border-white/10 bg-[color:var(--forest)]/95 backdrop-blur">
          {children}
        </div>
      ) : null}
    </header>
  );
}
