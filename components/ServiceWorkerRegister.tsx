"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de Serwist al cargar el layout.
 * En dev no hace nada (Serwist está disabled, no hay /sw.js compilado).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        console.warn("[sw] registro falló:", err);
      });
  }, []);

  return null;
}
