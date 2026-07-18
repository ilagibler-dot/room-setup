"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVenue, deleteVenue, loadVenues } from "@/lib/storage";
import type { Venue } from "@/lib/types";
import {
  downloadVenueExport,
  exportAllVenuesFromStorage,
  importVenueExport,
} from "@/lib/venue-transfer";

export default function HomePage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [newName, setNewName] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVenues(loadVenues());
  }, []);

  function refreshVenues() {
    setVenues(loadVenues());
  }

  function handleCreate() {
    const venue = createVenue(newName);
    refreshVenues();
    setNewName("");
    window.location.href = `/plan/${venue.id}`;
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить помещение?")) return;
    deleteVenue(id);
    refreshVenues();
  }

  function handleExportVenue(venue: Venue) {
    downloadVenueExport([venue]);
  }

  async function handleImportFile(file: File) {
    setImportMessage(null);
    try {
      const text = await file.text();
      const result = importVenueExport(text);
      refreshVenues();
      setImportMessage(
        result.updated > 0
          ? `Импортировано: ${result.total}. Новых: ${result.added}, обновлено: ${result.updated}.`
          : `Импортировано помещений: ${result.added}.`,
      );
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Не удалось импортировать файл");
    }
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

      <div className="glass-card mb-4 flex gap-2 rounded-[0.65rem] p-3">
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

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="flex-1 text-sm"
          disabled={venues.length === 0}
          onClick={exportAllVenuesFromStorage}
        >
          Экспорт всего
        </Button>
        <Button
          variant="secondary"
          className="flex-1 text-sm"
          onClick={() => importInputRef.current?.click()}
        >
          Импорт
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleImportFile(file);
          }}
        />
      </div>

      {importMessage ? (
        <p className="mb-4 rounded-[0.55rem] border border-[var(--line)] bg-white/50 px-3 py-2 text-sm text-[var(--foreground-muted)]">
          {importMessage}
        </p>
      ) : null}

      <div className="space-y-2.5">
        {venues.length === 0 ? (
          <div className="soft-card rounded-[0.65rem] px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
            Пока нет помещений
            <p className="mt-2 text-xs text-[var(--foreground-subtle)]">
              Или импортируйте файл, экспортированный с другого устройства
            </p>
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
                  {venue.guests.length > 0 ? ` · гостей ${venue.guests.length}` : ""}
                </p>
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs whitespace-nowrap"
                  onClick={() => handleExportVenue(venue)}
                >
                  Экспорт
                </Button>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs text-[var(--accent)]"
                  onClick={() => handleDelete(venue.id)}
                >
                  Удалить
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
