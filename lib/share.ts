/**
 * Helper para compartir observaciones con la API nativa del browser.
 * Fallback en orden: Web Share → WhatsApp deep link → copy URL al clipboard.
 *
 * En México el canal #1 es WhatsApp; por eso el deep link explícito en lugar
 * de solo Web Share genérico.
 */
export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export type ShareMethod = "native" | "whatsapp" | "clipboard" | "none";

export async function share(data: ShareData): Promise<ShareMethod> {
  if (typeof navigator === "undefined") return "none";

  // Web Share API: existe en Chrome Android, Safari iOS, Edge mobile
  const shareApi = (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share;
  if (typeof shareApi === "function") {
    try {
      await shareApi.call(navigator, data);
      return "native";
    } catch (err) {
      // AbortError = usuario canceló — no es realmente un error
      if (err instanceof Error && err.name === "AbortError") return "none";
      // si falla por otra razón, caemos a WhatsApp
    }
  }

  // Fallback WhatsApp: deep link wa.me con texto codificado
  const text = `${data.text} ${data.url}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (typeof window !== "undefined") {
    window.open(waUrl, "_blank", "noopener,noreferrer");
    return "whatsapp";
  }

  // Último recurso: clipboard
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(`${data.text} ${data.url}`);
      return "clipboard";
    } catch {
      return "none";
    }
  }
  return "none";
}
