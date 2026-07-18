"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  assignGuestSeat,
  autoSeatGuestsForTable,
  deleteVenueGuest,
  getEmptyChairsForTable,
  getGuestsForTable,
  getTableChairs,
  getUnassignedGuestsForTable,
  importGuestsForTable,
  isGuestSeatedAtTable,
  setGuestCheckedIn,
} from "@/lib/floor-plans";
import type { VenueUpdate } from "@/lib/venue-updates";
import type { FloorPlanElement, FloorPlanGuest, Venue } from "@/lib/types";

type TableGuestsPanelProps = {
  venue: Venue;
  table: FloorPlanElement;
  highlightGuestId?: string | null;
  onVenueChange: (update: VenueUpdate) => void;
};

export function TableGuestsPanel({
  venue,
  table,
  highlightGuestId = null,
  onVenueChange,
}: TableGuestsPanelProps) {
  const [importText, setImportText] = useState("");

  const tableGuests = useMemo(
    () => getGuestsForTable(venue.guests, table.id, venue.elements),
    [table.id, venue.elements, venue.guests],
  );
  const unassignedGuests = useMemo(
    () => getUnassignedGuestsForTable(venue, table.id),
    [table.id, venue],
  );
  const emptyChairs = useMemo(
    () => getEmptyChairsForTable(venue, table.id),
    [table.id, venue],
  );
  const chairs = useMemo(
    () => getTableChairs(venue.elements, table.id),
    [table.id, venue.elements],
  );

  const unassignedCount = unassignedGuests.length;
  const seatedCount = tableGuests.length - unassignedCount;
  const emptyChairCount = emptyChairs.length;
  const seatedGuests = tableGuests.filter((guest) =>
    isGuestSeatedAtTable(guest, table.id, venue.elements),
  );
  const checkedInCount = tableGuests.filter((guest) => guest.checked_in).length;
  const guestCountLabel =
    tableGuests.length === 1
      ? "1 гость"
      : tableGuests.length >= 2 && tableGuests.length <= 4
        ? `${tableGuests.length} гостя`
        : `${tableGuests.length} гостей`;

  function commit(update: VenueUpdate) {
    onVenueChange(update);
  }

  function handleAddGuests() {
    if (!importText.trim()) return;
    const text = importText;
    commit((current) => importGuestsForTable(current, table.id, text));
    setImportText("");
  }

  function handleAutoSeat() {
    commit((current) => autoSeatGuestsForTable(current, table.id));
  }

  function handleRemoveSeat(guestId: string) {
    commit((current) => assignGuestSeat(current, guestId, null));
  }

  function handleDeleteGuest(guestId: string) {
    commit((current) => deleteVenueGuest(current, guestId));
  }

  function handleToggleCheckedIn(guestId: string, checkedIn: boolean) {
    commit((current) => setGuestCheckedIn(current, guestId, checkedIn));
  }

  function getSeatNumber(guest: FloorPlanGuest) {
    const chair = venue.elements.find((element) => element.id === guest.seat_element_id);
    return chair?.chair_index ?? null;
  }

  return (
    <div className="soft-card rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="section-label mb-1">Гости</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {tableGuests.length === 0
              ? "Гости без места · 0"
              : unassignedCount === 0
                ? `${guestCountLabel} · все на местах`
                : `${guestCountLabel} · без места ${unassignedCount}`}
          </p>
          {tableGuests.length > 0 ? (
            <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
              {seatedCount} из {chairs.length} мест занято
              {checkedInCount > 0 ? ` · пришло ${checkedInCount}` : ""}
            </p>
          ) : null}
        </div>
        <p className="text-right text-[0.68rem] text-[var(--foreground-subtle)]">
          {chairs.length} {chairs.length === 1 ? "стул" : "стульев"}
          <br />
          свободно {emptyChairCount}
        </p>
      </div>

      <Textarea
        value={importText}
        onChange={(event) => setImportText(event.target.value)}
        placeholder={"Иван Иванов\nМария Петрова, maria@mail.ru\n..."}
        rows={4}
        className="text-sm"
      />
      <Button
        variant="secondary"
        className="mt-2 w-full text-sm"
        disabled={!importText.trim()}
        onClick={handleAddGuests}
      >
        Добавить гостей
      </Button>

      <Button
        className="mt-2 w-full text-sm"
        disabled={unassignedCount === 0 || emptyChairCount === 0}
        onClick={handleAutoSeat}
      >
        Рассадить
      </Button>

      {tableGuests.length === 0 ? (
        <p className="mt-4 rounded-[0.55rem] border border-dashed border-[var(--line)] px-3 py-5 text-center text-xs text-[var(--foreground-muted)]">
          Добавьте список гостей для этого стола
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {unassignedGuests.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[0.65rem] font-medium tracking-[0.08em] text-[var(--foreground-subtle)] uppercase">
                Без места
              </p>
              {unassignedGuests.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  highlighted={guest.id === highlightGuestId}
                  onToggleCheckedIn={(checkedIn) => handleToggleCheckedIn(guest.id, checkedIn)}
                  onDelete={() => handleDeleteGuest(guest.id)}
                />
              ))}
            </div>
          ) : null}

          {seatedGuests.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[0.65rem] font-medium tracking-[0.08em] text-[var(--foreground-subtle)] uppercase">
                За столом
              </p>
              {seatedGuests.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  seatNumber={getSeatNumber(guest)}
                  highlighted={guest.id === highlightGuestId}
                  onToggleCheckedIn={(checkedIn) => handleToggleCheckedIn(guest.id, checkedIn)}
                  onRemoveSeat={() => handleRemoveSeat(guest.id)}
                  onDelete={() => handleDeleteGuest(guest.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function GuestRow({
  guest,
  seatNumber,
  highlighted = false,
  onToggleCheckedIn,
  onRemoveSeat,
  onDelete,
}: {
  guest: FloorPlanGuest;
  seatNumber?: number | null;
  highlighted?: boolean;
  onToggleCheckedIn: (checkedIn: boolean) => void;
  onRemoveSeat?: () => void;
  onDelete: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlighted || !rowRef.current) return;
    rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlighted]);

  return (
    <div
      ref={rowRef}
      className={`rounded-[0.65rem] border px-3 py-2.5 transition ${
        highlighted
          ? "guest-search-highlight border-[var(--foreground)]"
          : "list-surface border-[var(--line)]"
      }`}
    >
      <div className="flex items-start gap-3">
        {seatNumber != null ? (
          <div className="seat-badge flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[0.65rem]">
            <span className="text-[0.5rem] font-medium tracking-[0.08em] text-[var(--foreground-subtle)] uppercase">
              стул
            </span>
            <span className="text-xl leading-none font-bold text-[var(--foreground)]">{seatNumber}</span>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm leading-snug font-medium break-words text-[var(--foreground)] ${
              guest.checked_in ? "line-through opacity-70" : ""
            }`}
          >
            {guest.name}
          </p>
          {guest.email ? (
            <p className="mt-0.5 text-xs leading-snug break-all text-[var(--foreground-muted)]">
              {guest.email}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.68rem] font-medium transition ${
            guest.checked_in
              ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
              : "border-[var(--line-strong)] text-[var(--foreground-muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
          }`}
          onClick={() => onToggleCheckedIn(!guest.checked_in)}
          aria-pressed={guest.checked_in}
          aria-label={guest.checked_in ? `${guest.name} пришёл` : `Отметить приход ${guest.name}`}
        >
          {guest.checked_in ? "Пришёл" : "Пришёл?"}
        </button>
        <button
          type="button"
          className="shrink-0 px-1 py-0.5 text-xs text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
          onClick={onDelete}
          aria-label={`Удалить ${guest.name}`}
        >
          ✕
        </button>
      </div>
      {onRemoveSeat ? (
        <Button variant="ghost" className="mt-2 h-8 w-full px-2 text-xs" onClick={onRemoveSeat}>
          Удалить место
        </Button>
      ) : null}
    </div>
  );
}
