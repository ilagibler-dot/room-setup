"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  assignGuestSeat,
  buildGuestExportCsv,
  countUnassignedGuests,
  countUnassignedGuestsForTable,
  deleteVenueGuest,
  getActiveGuests,
  getGuestsForTable,
  getTableChairs,
  getTableDisplayLabel,
  isGuestSeatedAtTable,
  isTableElement,
  setGuestCheckedIn,
} from "@/lib/floor-plans";
import type { VenueUpdate } from "@/lib/venue-updates";
import type { Venue } from "@/lib/types";

type FloorPlanGuestsPanelProps = {
  venue: Venue;
  onVenueChange: (update: VenueUpdate) => void;
};

export function FloorPlanGuestsPanel({ venue, onVenueChange }: FloorPlanGuestsPanelProps) {
  const { elements } = venue;
  const activeGuests = useMemo(() => getActiveGuests(venue), [venue]);
  const totalGuests = activeGuests.length;

  const tableGroups = useMemo(() => {
    return elements
      .filter((element) => isTableElement(element.element_type))
      .map((table) => {
        const tableGuests = getGuestsForTable(activeGuests, table.id, elements);
        const chairs = getTableChairs(elements, table.id);
        return {
          table,
          label: getTableDisplayLabel(table),
          chairs,
          guests: tableGuests,
          unassignedCount: countUnassignedGuestsForTable(activeGuests, table.id, elements),
          seatedCount: tableGuests.filter((guest) =>
            isGuestSeatedAtTable(guest, table.id, elements),
          ).length,
        };
      })
      .filter((group) => group.chairs.length > 0 || group.guests.length > 0);
  }, [activeGuests, elements]);

  const totalUnassigned = useMemo(
    () => countUnassignedGuests(activeGuests, elements),
    [activeGuests, elements],
  );
  const totalCheckedIn = useMemo(
    () => activeGuests.filter((guest) => guest.checked_in).length,
    [activeGuests],
  );

  function commit(update: VenueUpdate) {
    onVenueChange(update);
  }

  function handleRemoveSeat(guestId: string) {
    commit((current) => assignGuestSeat(current, guestId, null));
  }

  function handleDelete(guestId: string) {
    commit((current) => deleteVenueGuest(current, guestId));
  }

  function handleToggleCheckedIn(guestId: string, checkedIn: boolean) {
    commit((current) => setGuestCheckedIn(current, guestId, checkedIn));
  }

  function handleExport() {
    const csv = buildGuestExportCsv(activeGuests, elements);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rassadka.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label mb-1">Обзор рассадки</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Гостей: {totalGuests} · без места: {totalUnassigned}
            {totalCheckedIn > 0 ? ` · пришло: ${totalCheckedIn}` : ""}
          </p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Добавляйте гостей на вкладке «План», выбрав стол на карте
          </p>
        </div>
        {totalGuests > 0 ? (
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={handleExport}>
            Экспорт CSV
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {totalGuests === 0 ? (
          <p className="rounded-[0.55rem] border border-dashed border-[var(--line)] px-3 py-8 text-center text-sm text-[var(--foreground-muted)]">
            Пока нет гостей. Выберите стол на вкладке «План» и добавьте список.
          </p>
        ) : tableGroups.length === 0 ? (
          <p className="rounded-[0.55rem] border border-dashed border-[var(--line)] px-3 py-8 text-center text-sm text-[var(--foreground-muted)]">
            Добавьте столы с количеством стульев на вкладке «План»
          </p>
        ) : (
          tableGroups.map((group) => (
            <div
              key={group.table.id}
              className="overflow-hidden rounded-[0.55rem] border border-[var(--line)] list-surface"
            >
              <div className="border-b border-[var(--line)] px-3 py-2.5">
                <p className="text-sm font-semibold text-[var(--foreground)]">Стол {group.label}</p>
                <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                  {group.seatedCount} из {group.chairs.length} мест · без места {group.unassignedCount}
                </p>
              </div>
              {group.guests.length === 0 ? (
                <p className="px-3 py-4 text-xs text-[var(--foreground-subtle)]">Гости не добавлены</p>
              ) : (
                <div className="divide-y divide-[var(--line)]">
                  {group.guests.map((guest) => {
                    const seated = isGuestSeatedAtTable(guest, group.table.id, elements);
                    const chair = seated
                      ? elements.find((element) => element.id === guest.seat_element_id)
                      : null;

                    return (
                      <div key={guest.id} className="px-3 py-2.5">
                        <div className="flex items-start gap-3">
                          {chair?.chair_index ? (
                            <div className="seat-badge flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[0.65rem]">
                              <span className="text-[0.5rem] font-medium tracking-[0.08em] text-[var(--foreground-subtle)] uppercase">
                                стул
                              </span>
                              <span className="text-xl leading-none font-bold text-[var(--foreground)]">
                                {chair.chair_index}
                              </span>
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
                            {!chair?.chair_index ? (
                              <p className="mt-1 text-[0.68rem] text-[var(--foreground-subtle)]">Без места</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <button
                              type="button"
                              className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-medium transition ${
                                guest.checked_in
                                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                                  : "border-[var(--line-strong)] text-[var(--foreground-muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                              }`}
                              onClick={() => handleToggleCheckedIn(guest.id, !guest.checked_in)}
                              aria-pressed={guest.checked_in}
                            >
                              {guest.checked_in ? "Пришёл" : "Пришёл?"}
                            </button>
                            {guest.seat_element_id && seated ? (
                              <Button
                                variant="ghost"
                                className="h-8 px-2 text-xs whitespace-nowrap"
                                onClick={() => handleRemoveSeat(guest.id)}
                              >
                                Удалить место
                              </Button>
                            ) : null}
                            <button
                              type="button"
                              className="px-1 py-0.5 text-xs text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
                              onClick={() => handleDelete(guest.id)}
                              aria-label={`Удалить ${guest.name}`}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
