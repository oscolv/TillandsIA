"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: Event) {
      const target = e.target as Node | null;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div className="sm:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="inline-flex h-11 w-11 items-center justify-center border-2 border-[color:var(--tinta)] bg-[color:var(--papel)] text-[color:var(--tinta)] transition-colors hover:bg-[color:var(--tinta)] hover:text-[color:var(--papel)] focus-visible:outline-none"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id="mobile-nav-panel"
          className="absolute left-0 right-0 top-full z-50 border-b border-[color:var(--caliza)] bg-[color:var(--papel)] shadow-[0_8px_24px_rgba(26,22,17,0.08)]"
        >
          <ul className="mx-auto flex max-w-5xl flex-col divide-y divide-[color:var(--caliza)] px-4 sm:px-6">
            <li>
              <Link
                href="/mapa"
                onClick={close}
                className="flex min-h-[52px] items-center font-mono text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[color:var(--tinta)] no-underline"
              >
                Mapa público
              </Link>
            </li>
            <li>
              <Link
                href="/sobre"
                onClick={close}
                className="flex min-h-[52px] items-center font-mono text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[color:var(--tinta)] no-underline"
              >
                Sobre TillandsIA
              </Link>
            </li>
            <li>
              <a
                href="https://henomotita.mx"
                onClick={close}
                className="flex min-h-[52px] items-center font-mono text-[0.78rem] font-medium uppercase tracking-[0.08em] text-[color:var(--tinta)] no-underline"
              >
                Sitio principal · henomotita.mx
              </a>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
