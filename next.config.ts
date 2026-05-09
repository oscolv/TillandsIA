import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * `'unsafe-inline'` en script-src es necesario para Next.js 16 App Router
 * (inyecta scripts inline para hidratación). Vercel está trabajando en
 * nonces nativos pero aún no está estable. `'unsafe-eval'` se evita.
 *
 * `img-src data:` necesario porque la preview de la cámara usa `blob:` y
 * porque el mapa Leaflet renderiza pins SVG embebidos como data URI.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
  "font-src 'self' data:",
  // El service worker (sw.js) hace fetch() a tile.openstreetmap.org y a Vercel
  // Blob para cachear tiles y fotos. Esos fetch() están sujetos a `connect-src`
  // del CSP servido junto con sw.js, así que ambos orígenes deben estar aquí.
  "connect-src 'self' https://api.openai.com https://tile.openstreetmap.org https://*.public.blob.vercel-storage.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HSTS: forzar HTTPS por 1 año, incluyendo subdominios
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permite cámara y geolocalización solo a este origen, nada más
  {
    key: "Permissions-Policy",
    value:
      "geolocation=(self), camera=(self), microphone=(), payment=(), usb=(), bluetooth=()",
  },
  // Cross-Origin policies — opt-in pero útiles
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Permite acceso desde la LAN al dev server (celular en la misma red Wi-Fi).
  // En producción esto se ignora — solo afecta `next dev`.
  allowedDevOrigins: ["10.1.113.1", "*.local"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.tile.openstreetmap.org",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
