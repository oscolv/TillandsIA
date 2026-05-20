"use client";

import { toast } from "sonner";
import { share } from "@/lib/share";

interface ShareWhatsAppButtonProps {
  /**
   * `primary` = bloque grande (post-publicación, página de éxito).
   * `chip` = chip pequeño en footer / barras secundarias.
   */
  variant?: "primary" | "chip";
  /** Mensaje a compartir. Default: invitación general a TillandsIA. */
  message?: string;
  /** URL a compartir. Default: `window.location.href` al hacer clic. */
  url?: string;
  /** Etiqueta visible y aria-label. */
  label?: string;
  className?: string;
}

const DEFAULT_MESSAGE =
  "Mapea árboles con heno motita en el Valle del Mezquital con TillandsIA — ciencia ciudadana, sin registro ni rostros.";

const WA_GREEN = "#25D366";
const WA_GREEN_HOVER = "#1ebe57";

export function ShareWhatsAppButton({
  variant = "primary",
  message = DEFAULT_MESSAGE,
  url,
  label = "Compartir por WhatsApp",
  className = "",
}: ShareWhatsAppButtonProps) {
  async function handleClick() {
    const finalUrl =
      url ?? (typeof window !== "undefined" ? window.location.href : "");
    const method = await share({
      title: "TillandsIA",
      text: message,
      url: finalUrl,
    });
    if (method === "clipboard") {
      toast.success("Enlace copiado al portapapeles");
    }
  }

  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className={`inline-flex items-center gap-1.5 border border-[color:var(--caliza)] bg-[color:var(--papel)] px-2.5 py-1.5 font-mono text-[0.72rem] font-medium uppercase tracking-[0.06em] text-[color:var(--tinta)] transition-colors hover:border-[#25D366] hover:text-[#25D366] ${className}`}
        style={{ minHeight: 32 }}
      >
        <WhatsAppIcon className="h-3.5 w-3.5" style={{ color: WA_GREEN }} />
        Compartir
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`inline-flex h-14 w-full items-center justify-center gap-2 rounded-md px-5 text-base font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto ${className}`}
      style={{
        backgroundColor: WA_GREEN,
        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = WA_GREEN_HOVER;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = WA_GREEN;
      }}
    >
      <WhatsAppIcon className="h-5 w-5" />
      {label}
    </button>
  );
}

function WhatsAppIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.15-.174.2-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.04 2C6.5 2 2 6.5 2 12.05c0 1.97.575 3.81 1.563 5.36L2 22l4.747-1.555A9.95 9.95 0 0 0 12.04 22c5.54 0 10.04-4.5 10.04-10.05S17.58 2 12.04 2zm0 18.31a8.27 8.27 0 0 1-4.21-1.146l-.302-.18-3.106 1.017 1.034-3.025-.197-.31a8.245 8.245 0 0 1-1.262-4.366c0-4.561 3.713-8.27 8.275-8.27a8.25 8.25 0 0 1 5.84 2.42 8.215 8.215 0 0 1 2.42 5.85c-.002 4.56-3.715 8.27-8.276 8.27z" />
    </svg>
  );
}
