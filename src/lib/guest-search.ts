import {
  getActiveGuests,
  getGuestTableId,
  getTableDisplayLabel,
  isGuestSeated,
} from "@/lib/floor-plans";
import type { FloorPlanGuest, Venue } from "@/lib/types";

export type GuestSearchResult = {
  guestId: string;
  guestName: string;
  guestEmail: string | null;
  tableId: string;
  tableLabel: string;
  seatElementId: string | null;
  seatNumber: number | null;
  seated: boolean;
};

function scoreGuestMatch(guest: FloorPlanGuest, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return -1;

  const name = guest.name.toLowerCase();
  const email = guest.email?.toLowerCase() ?? "";
  const haystack = `${name} ${email}`.trim();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  if (!tokens.every((token) => haystack.includes(token))) return -1;

  let score = tokens.length * 10;

  if (name === normalizedQuery) score += 120;
  else if (name.startsWith(normalizedQuery)) score += 90;
  else if (name.includes(normalizedQuery)) score += 60;

  if (email && email.includes(normalizedQuery)) score += 40;

  for (const token of tokens) {
    if (name.startsWith(token)) score += 25;
    else if (name.split(/\s+/).some((part) => part.startsWith(token))) score += 15;
  }

  return score;
}

export function searchVenueGuests(venue: Venue, query: string, limit = 8): GuestSearchResult[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  return getActiveGuests(venue)
    .map((guest) => {
      const score = scoreGuestMatch(guest, normalizedQuery);
      if (score < 0) return null;

      const tableId = getGuestTableId(guest, venue.elements);
      if (!tableId) return null;

      const table = venue.elements.find((element) => element.id === tableId);
      if (!table) return null;

      const chair = guest.seat_element_id
        ? venue.elements.find((element) => element.id === guest.seat_element_id)
        : null;
      const seated = isGuestSeated(guest, venue.elements);

      return {
        guestId: guest.id,
        guestName: guest.name,
        guestEmail: guest.email,
        tableId,
        tableLabel: getTableDisplayLabel(table),
        seatElementId: seated ? guest.seat_element_id : null,
        seatNumber: chair?.chair_index ?? null,
        seated,
        score,
      };
    })
    .filter((result): result is GuestSearchResult & { score: number } => result !== null)
    .sort((a, b) => b.score - a.score || a.guestName.localeCompare(b.guestName, "ru"))
    .slice(0, limit)
    .map(({ score: _score, ...result }) => result);
}
