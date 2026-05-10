"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { BYPASS_TOKEN_STORAGE_KEY } from "@/lib/bypass-token-client";
import { CheckCircle2, ShieldCheck, Trash2 } from "lucide-react";

type Status =
  | { kind: "loading" }
  | { kind: "saved" }
  | { kind: "cleared" }
  | { kind: "active"; tokenPreview: string }
  | { kind: "none" };

export default function SetupTokenPage() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let next: Status;
    try {
      const params = new URLSearchParams(window.location.search);
      const newToken = params.get("token");
      const clear = params.get("clear");

      if (clear === "1") {
        window.localStorage.removeItem(BYPASS_TOKEN_STORAGE_KEY);
        // Limpia la URL para no dejar `?clear=1` en el historial.
        window.history.replaceState({}, "", "/setup-token");
        next = { kind: "cleared" };
      } else if (newToken) {
        window.localStorage.setItem(BYPASS_TOKEN_STORAGE_KEY, newToken);
        // Limpia el token de la URL inmediatamente para que no quede en
        // historial, screenshots ni en el header `Referer` de futuras navs.
        window.history.replaceState({}, "", "/setup-token");
        next = { kind: "saved" };
      } else {
        const existing = window.localStorage.getItem(BYPASS_TOKEN_STORAGE_KEY);
        if (existing) {
          const preview =
            existing.length > 8
              ? `${existing.slice(0, 4)}…${existing.slice(-4)}`
              : "•".repeat(existing.length);
          next = { kind: "active", tokenPreview: preview };
        } else {
          next = { kind: "none" };
        }
      }
    } catch {
      next = { kind: "none" };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(next);
  }, []);

  function clearToken() {
    try {
      window.localStorage.removeItem(BYPASS_TOKEN_STORAGE_KEY);
    } catch {}
    setStatus({ kind: "cleared" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <span className="badge-science">Brigada</span>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-[color:var(--tinta)]">
            Configurar token de brigadista
          </h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-[color:var(--corteza)]">
            Los brigadistas con token suben hasta 200 fotos por hora desde
            la misma red, en lugar del límite normal de 30. El token se
            guarda solo en este navegador.
          </p>
        </div>

        {status.kind === "loading" && (
          <p className="font-mono text-[0.78rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
            Cargando…
          </p>
        )}

        {status.kind === "saved" && (
          <Card>
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--mezquite-oscuro)]"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-2">
                <p className="font-medium text-[color:var(--tinta)]">
                  Token guardado en este navegador.
                </p>
                <p className="text-[0.9rem] leading-relaxed text-[color:var(--corteza)]">
                  De ahora en adelante tus fotos cuentan contra el límite
                  de brigadista. Puedes empezar a mapear.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/">
                <Button>Empezar a mapear</Button>
              </Link>
              <Button variant="outline" onClick={clearToken} className="gap-2">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Borrar token
              </Button>
            </div>
          </Card>
        )}

        {status.kind === "active" && (
          <Card>
            <div className="flex items-start gap-3">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--mezquite-oscuro)]"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-2">
                <p className="font-medium text-[color:var(--tinta)]">
                  Tienes un token activo en este navegador.
                </p>
                <p className="font-mono text-[0.82rem] text-[color:var(--corteza)]">
                  Token: <span className="text-[color:var(--tinta)]">{status.tokenPreview}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/">
                <Button>Ir a mapear</Button>
              </Link>
              <Button variant="outline" onClick={clearToken} className="gap-2">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Borrar token
              </Button>
            </div>
          </Card>
        )}

        {status.kind === "cleared" && (
          <Card>
            <p className="font-medium text-[color:var(--tinta)]">
              Token borrado de este navegador.
            </p>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-[color:var(--corteza)]">
              A partir de ahora tus fotos cuentan contra el límite normal
              (30/hora).
            </p>
            <div className="mt-4">
              <Link href="/">
                <Button variant="outline">Volver al inicio</Button>
              </Link>
            </div>
          </Card>
        )}

        {status.kind === "none" && (
          <Card>
            <p className="text-[color:var(--tinta)]">
              No hay ningún token guardado en este navegador.
            </p>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-[color:var(--corteza)]">
              Para configurar uno, abre el enlace que te compartió el
              coordinador de la brigada. Tendrá la forma{" "}
              <code className="font-mono text-[0.85rem]">
                /setup-token?token=…
              </code>
              .
            </p>
            <div className="mt-4">
              <Link href="/">
                <Button variant="outline">Volver al inicio</Button>
              </Link>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[color:var(--caliza)] bg-[color:var(--papel)] p-5">
      {children}
    </div>
  );
}
