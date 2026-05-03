"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "./ReviewCard";
import type { HumanReviewStatus, ReviewItem } from "@/lib/types";

interface Props {
  initialItems: ReviewItem[];
  initialCursor: string | null;
  status: HumanReviewStatus | "all";
}

export function ReviewQueue({ initialItems, initialCursor, status }: Props) {
  const [items, setItems] = useState<ReviewItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/queue", window.location.origin);
      url.searchParams.set("status", status);
      url.searchParams.set("cursor", cursor);
      url.searchParams.set("limit", "20");
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = (await res.json()) as {
        items: ReviewItem[];
        next_cursor: string | null;
      };
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.next_cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, status]);

  // Cuando se revisa un item, actualizamos su estado in-place. Si la pestaña
  // actual es de un status específico (no 'all') y el nuevo status ya no
  // coincide, lo removemos de la vista para que la cola avance visualmente.
  const onReviewed = useCallback(
    (id: string, patch: Partial<ReviewItem>) => {
      setItems((prev) => {
        const updated = prev.map((it) =>
          it.id === id ? { ...it, ...patch } : it,
        );
        if (status !== "all" && patch.human_review_status) {
          return updated.filter(
            (it) => it.id !== id || it.human_review_status === status,
          );
        }
        return updated;
      });
    },
    [status],
  );

  if (items.length === 0) {
    return (
      <p className="border border-dashed border-[color:var(--caliza)] bg-[color:var(--papel-alt)] p-6 text-center font-mono text-[0.78rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
        No hay observaciones en este estado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((it) => (
        <ReviewCard key={it.id} item={it} onReviewed={onReviewed} />
      ))}

      {error && (
        <p
          className="font-mono text-[0.78rem] text-[color:var(--rojo-alerta)]"
          role="alert"
        >
          {error}
        </p>
      )}

      {cursor ? (
        <Button
          variant="outline"
          onClick={loadMore}
          disabled={loading}
          className="self-center"
        >
          {loading ? "Cargando…" : "Cargar más"}
        </Button>
      ) : items.length >= 20 ? (
        <p className="text-center font-mono text-[0.7rem] uppercase tracking-[0.06em] text-[color:var(--corteza)]">
          Fin de la cola.
        </p>
      ) : null}
    </div>
  );
}
