import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TillandsIA — Mapeo ciudadano del heno motita",
  description:
    "Fotografía árboles infestados de heno motita (Tillandsia recurvata) en el Valle del Mezquital y ayuda a generar un mapa público para investigación y control.",
  applicationName: "TillandsIA",
  authors: [{ name: "Proyecto TillandsIA" }],
  keywords: [
    "heno motita",
    "Tillandsia recurvata",
    "Valle del Mezquital",
    "ciencia ciudadana",
    "mezquite",
    "huizache",
  ],
  openGraph: {
    title: "TillandsIA — Mapeo ciudadano del heno motita",
    description:
      "Fotografía un árbol con heno motita y aparecerá en el mapa público al instante. Anónimo, sin registro.",
    locale: "es_MX",
    type: "website",
  },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F5F1E8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-MX"
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-icon-180.png" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ServiceWorkerRegister />
        {children}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
