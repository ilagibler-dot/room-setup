"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVenue, deleteVenue, loadVenues } from "@/lib/storage";
import type { Venue } from "@/lib/types";

export default function HomePage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setVenues(loadVenues());
  }, []);

  function handleCreate() {
    const venue = createVenue(newName);
    setVenues(loadVenues());
    setNewName("");
    window.location.href = `/plan/${venue.id}`;
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить помещение?")) return;
    deleteVenue(id);
    setVenues(loadVenues());
  }

  return (
    <main className="dashboard-bg mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 py-6 sm:py-10">
      <header className="mb-8 space-y-2 text-center">
        <p className="section-label">Room Setup</p>
        <h1 className="text-2xl font-medium tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl">
          Планировка залов
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">Столы, объекты, рассадка гостей</p>
      </header>

      <div className="glass-card mb-6 flex gap-2 rounded-[0.65rem] p-3">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Название помещения"
          onKeyDown={(event) => {
            if (event.key === "Enter") handleCreate();
          }}
        />
        <Button onClick={handleCreate} className="shrink-0">
          Создать
        </Button>
      </div>

      <div className="space-y-2.5">
        {venues.length === 0 ? (
          <div className="soft-card rounded-[0.65rem] px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
            Пока нет помещений
          </div>
        ) : (
          venues.map((venue) => (
            <div
              key={venue.id}
              className="soft-card flex items-center gap-3 rounded-[0.65rem] border border-[var(--line)] p-4"
            >
              <Link href={`/plan/${venue.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold tracking-[0.01em] text-[var(--foreground)]">
                  {venue.name}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                  {venue.room_configured
                    ? `${venue.room_width_m.toFixed(1)} × ${venue.room_height_m.toFixed(1)} м`
                    : "Размеры не заданы"}
                </p>
              </Link>
              <Button
                variant="ghost"
                className="shrink-0 px-2 text-xs text-[var(--accent)]"
                onClick={() => handleDelete(venue.id)}
              >
                Удалить
              </Button>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
