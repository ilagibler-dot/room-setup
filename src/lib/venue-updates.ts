import type { Venue } from "@/lib/types";

export type VenueUpdate = Venue | ((venue: Venue) => Venue);
