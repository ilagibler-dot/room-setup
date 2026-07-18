import { importVenues, loadVenues } from "@/lib/storage";
import type { Venue } from "@/lib/types";

export const VENUE_EXPORT_FORMAT = "room-setup-venues-export";
export const VENUE_EXPORT_VERSION = 1;

export type VenueExportBundle = {
  format: typeof VENUE_EXPORT_FORMAT;
  version: number;
  exported_at: string;
  venues: Venue[];
};

export type VenueImportResult = {
  added: number;
  updated: number;
  total: number;
};

function isVenue(value: unknown): value is Venue {
  if (!value || typeof value !== "object") return false;
  const venue = value as Venue;
  return (
    typeof venue.id === "string" &&
    typeof venue.name === "string" &&
    typeof venue.room_width_m === "number" &&
    typeof venue.room_height_m === "number" &&
    Array.isArray(venue.elements) &&
    Array.isArray(venue.guests)
  );
}

function sanitizeVenue(venue: Venue): Venue {
  return {
    ...venue,
    room_rotation_deg: venue.room_rotation_deg ?? 0,
    room_configured: venue.room_configured ?? false,
    elements: venue.elements ?? [],
    guests: (venue.guests ?? []).map((guest) => ({
      ...guest,
      checked_in: guest.checked_in ?? false,
    })),
    updated_at: venue.updated_at ?? new Date().toISOString(),
  };
}

export function buildVenueExportBundle(venues: Venue[]): VenueExportBundle {
  return {
    format: VENUE_EXPORT_FORMAT,
    version: VENUE_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    venues: venues.map(sanitizeVenue),
  };
}

export function serializeVenueExport(venues: Venue[]): string {
  return JSON.stringify(buildVenueExportBundle(venues), null, 2);
}

export function parseVenueImport(text: string): Venue[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Файл не является корректным JSON");
  }

  if (Array.isArray(parsed)) {
    const venues = parsed.filter(isVenue).map(sanitizeVenue);
    if (venues.length === 0) throw new Error("В файле нет данных о помещениях");
    return venues;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Неверный формат файла");
  }

  const record = parsed as Record<string, unknown>;

  if (record.format === VENUE_EXPORT_FORMAT) {
    if (!Array.isArray(record.venues)) {
      throw new Error("В файле нет списка помещений");
    }
    const venues = record.venues.filter(isVenue).map(sanitizeVenue);
    if (venues.length === 0) throw new Error("В файле нет данных о помещениях");
    return venues;
  }

  if (isVenue(record.venue)) {
    return [sanitizeVenue(record.venue)];
  }

  if (isVenue(record)) {
    return [sanitizeVenue(record)];
  }

  throw new Error("Не удалось распознать формат файла");
}

export function downloadVenueExport(venues: Venue[], filename?: string) {
  const safeName =
    venues.length === 1
      ? venues[0].name.trim().replace(/[^\w\u0400-\u04FF-]+/g, "-").replace(/^-|-$/g, "") ||
        "pomeshchenie"
      : "vse-pomeshcheniya";

  const blob = new Blob([serializeVenueExport(venues)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `zala-${safeName}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importVenueExport(text: string): VenueImportResult {
  const venues = parseVenueImport(text);
  const { added, updated } = importVenues(venues);
  return { added, updated, total: venues.length };
}

export function exportAllVenuesFromStorage() {
  downloadVenueExport(loadVenues());
}
