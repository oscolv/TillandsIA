"use client";

import { useRef, useState } from "react";

interface PhotoCarouselProps {
  urls: string[];
  alt: string;
  /** Tamaño máximo del lado mayor (px). Útil en popups pequeños. */
  className?: string;
}

/**
 * Carrusel mínimo para 1–3 fotos de la misma observación.
 *
 * Decisión: sin librería externa.
 *  - Si urls.length === 1 → render directo del <img> (idéntico al legacy).
 *  - Si urls.length ≥ 2 → scroll horizontal con scroll-snap + dots + contador.
 *    El swipe táctil funciona nativamente; los dots permiten navegar con clic.
 */
export function PhotoCarousel({
  urls,
  alt,
  className = "w-full h-auto rounded",
}: PhotoCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  if (urls.length === 0) return null;

  if (urls.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={urls[0]} alt={alt} className={className} />;
  }

  function scrollTo(i: number) {
    const el = containerRef.current;
    if (!el) return;
    const slide = el.children[i] as HTMLElement | undefined;
    if (slide) {
      slide.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const slideWidth = el.clientWidth;
    if (slideWidth === 0) return;
    const idx = Math.round(el.scrollLeft / slideWidth);
    if (idx !== activeIdx && idx >= 0 && idx < urls.length) {
      setActiveIdx(idx);
    }
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory rounded"
        style={{ scrollbarWidth: "none" }}
      >
        {urls.map((url, i) => (
          <div
            key={url}
            className="shrink-0 w-full snap-start"
            aria-roledescription="slide"
            aria-label={`Foto ${i + 1} de ${urls.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${alt} (foto ${i + 1})`} className={className} />
          </div>
        ))}
      </div>
      <div
        className="pointer-events-none absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white"
        aria-hidden="true"
      >
        {activeIdx + 1} / {urls.length}
      </div>
      <div className="flex justify-center gap-1.5">
        {urls.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollTo(i)}
            aria-label={`Ir a foto ${i + 1}`}
            className={`h-1.5 w-1.5 rounded-full transition ${
              i === activeIdx ? "bg-[color:var(--tinta,#1a1a1a)]" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
