import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Admin · TillandsIA",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--papel)] px-4">
      <div className="field-card w-full max-w-sm">
        <span className="badge-science !mb-3 !pb-1">Acceso restringido</span>
        <h1 className="font-display text-[1.4rem] font-semibold leading-tight text-[color:var(--tinta)]">
          Acceso de revisión
        </h1>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[color:var(--corteza)]">
          Introduce el token de administración para revisar el dataset.
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
