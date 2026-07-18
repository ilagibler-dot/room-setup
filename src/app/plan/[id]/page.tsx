"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FloorPlanEditor } from "@/components/floor-plan/floor-plan-editor";
import { VenueInfoToggle } from "@/components/floor-plan/venue-info-toggle";
import { getVenue, upsertVenue } from "@/lib/storage";
import type { VenueUpdate } from "@/lib/venue-updates";
import type { Venue } from "@/lib/types";

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    setVenue(getVenue(params.id));
  }, [params.id]);

  const handleVenueChange = useCallback((update: VenueUpdate) => {
    setVenue((prev) => {
      if (!prev) return prev;
      const next = typeof update === "function" ? update(prev) : update;
      return upsertVenue(next);
    });
  }, []);

  if (!venue) {
    return (
      <main className="dashboard-bg flex min-h-[100dvh] items-center justify-center text-sm text-[var(--foreground-muted)]">
        {params.id ? "Помещение не найдено" : "Загрузка…"}
      </main>
    );
  }

  return (
    <main className="dashboard-bg flex h-[100dvh] flex-col overflow-hidden">
      <header className="soft-card mx-3 mt-3 flex shrink-0 items-center gap-3 rounded-[0.65rem] px-4 py-3 sm:mx-4">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-[0.35rem] border border-[var(--line)] bg-white/40 text-[var(--foreground-muted)] backdrop-blur-sm transition hover:bg-white/60"
        >
          ←
        </Link>
        <div className="relative min-w-0 flex-1">
          <p className="section-label">Live View</p>
          <h1 className="truncate text-base font-semibold tracking-[-0.01em] text-[var(--foreground)] sm:text-lg">
            {venue.name}
          </h1>
          <VenueInfoToggle venue={venue} onVenueChange={handleVenueChange} />
        </div>
      </header>

      <div className="min-h-0 flex-1 pb-3">
        <FloorPlanEditor venue={venue} onVenueChange={handleVenueChange} />
      </div>
    </main>
  );
}
