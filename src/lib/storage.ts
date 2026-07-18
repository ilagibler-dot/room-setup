import type { Venue } from "@/lib/types";
import {
  clearInvalidGuestSeats,
  getGuestTableId,
  isTableElement,
  normalizeTableLabel,
  syncTableChairs,
} from "@/lib/floor-plans";

const STORAGE_KEY = "room-setup-venues";

function normalizeVenue(venue: Venue): Venue {
  let next: Venue = {
    ...venue,
    room_rotation_deg: venue.room_rotation_deg ?? 0,
    elements: venue.elements.map((element) => {
      if (!isTableElement(element.element_type) || !element.label) return element;
      const label = normalizeTableLabel(element.label);
      return label === element.label ? element : { ...element, label };
    }),
  };

  for (const table of next.elements.filter((element) => isTableElement(element.element_type))) {
    const chairs = next.elements.filter((element) => element.parent_element_id === table.id);
    if (table.chair_count > 0 && chairs.length !== table.chair_count) {
      next = syncTableChairs(next, table.id);
    }
  }

  next = clearInvalidGuestSeats(next);

  return {
    ...next,
    guests: next.guests
      .map((guest) => {
        const tableId = getGuestTableId(guest, next.elements);
        if (!tableId) return null;
        const normalizedGuest = {
          ...guest,
          checked_in: guest.checked_in ?? false,
        };
        return tableId === normalizedGuest.table_element_id
          ? normalizedGuest
          : { ...normalizedGuest, table_element_id: tableId };
      })
      .filter((guest): guest is NonNullable<typeof guest> => guest !== null),
  };
}

function readAll(): Venue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Venue[];
    return Array.isArray(parsed) ? parsed.map(normalizeVenue) : [];
  } catch {
    return [];
  }
}

function writeAll(venues: Venue[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(venues));
}

export function loadVenues(): Venue[] {
  return readAll().sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export function getVenue(id: string): Venue | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Venue[];
    if (!Array.isArray(parsed)) return null;

    const index = parsed.findIndex((item) => item.id === id);
    if (index < 0) return null;

    const normalized = normalizeVenue(parsed[index]);
    if (normalized.guests.length !== parsed[index].guests.length) {
      parsed[index] = { ...normalized, updated_at: new Date().toISOString() };
      writeAll(parsed.map(normalizeVenue));
    }

    return normalized;
  } catch {
    return null;
  }
}

export function upsertVenue(venue: Venue): Venue {
  const venues = readAll();
  const index = venues.findIndex((item) => item.id === venue.id);
  const next = normalizeVenue({ ...venue, updated_at: new Date().toISOString() });

  if (index >= 0) venues[index] = next;
  else venues.unshift(next);

  writeAll(venues);
  return next;
}

export function createVenue(name: string): Venue {
  const venue: Venue = {
    id: crypto.randomUUID(),
    name: name.trim() || "Новое помещение",
    room_width_m: 12,
    room_height_m: 8,
    room_rotation_deg: 0,
    room_configured: false,
    elements: [],
    guests: [],
    updated_at: new Date().toISOString(),
  };

  upsertVenue(venue);
  return venue;
}

export function deleteVenue(id: string) {
  writeAll(readAll().filter((venue) => venue.id !== id));
}
