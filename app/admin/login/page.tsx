import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Admin · TillandsIA",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--linen)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[color:var(--rule)] bg-background p-6 shadow-sm">
        <h1 className="font-display text-xl font-bold text-[color:var(--green)]">
          Acceso de revisión
        </h1>
        <p className="mt-1 text-sm text-[color:var(--ink-m)]">
          Introduce el token de administración para revisar el dataset.
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
