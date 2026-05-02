import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  themeColor: "#2d5a27",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ServiceWorkerRegister />
        {children}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
