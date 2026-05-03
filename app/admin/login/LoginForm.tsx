"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin/revision";

  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
      <input
        type="password"
        autoFocus
        required
        autoComplete="current-password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="ADMIN_TOKEN"
        className="w-full rounded-md border border-[color:var(--rule)] bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--green)]"
      />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting || !token}>
        {submitting ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
