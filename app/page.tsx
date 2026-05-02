import Link from "next/link";
import { UploadFlow } from "@/components/UploadFlow";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, Leaf } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="flex items-center gap-2 font-semibold">
            <Leaf className="h-5 w-5 text-emerald-600" />
            <span>TillandsIA</span>
          </h1>
          <Link href="/mapa">
            <Button variant="ghost" size="sm" className="gap-2">
              <MapIcon className="h-4 w-4" />
              Mapa
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:py-10">
        <UploadFlow />
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>
          TillandsIA — ciencia ciudadana del Valle del Mezquital. Sin registro,
          sin cookies.
        </p>
      </footer>
    </div>
  );
}
