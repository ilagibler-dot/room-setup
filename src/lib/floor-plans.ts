import type { FloorPlanElement, FloorPlanElementType, FloorPlanGuest, Venue } from "@/lib/types";

export const FLOOR_PLAN_ELEMENT_LABELS: Record<FloorPlanElementType, string> = {
  table_round: "Круглый стол",
  table_square: "Квадратный стол",
  table_rect: "Прямоугольный стол",
  bar: "Бар",
  stage: "Сцена",
  column: "Колонна",
  chair: "Стул",
};

export const FLOOR_PLAN_DEFAULT_SIZES: Record<
  FloorPlanElementType,
  { width_m: number; height_m: number }
> = {
  table_round: { width_m: 1.5, height_m: 1.5 },
  table_square: { width_m: 1.2, height_m: 1.2 },
  table_rect: { width_m: 2.0, height_m: 0.8 },
  bar: { width_m: 3.0, height_m: 0.6 },
  stage: { width_m: 4.0, height_m: 2.0 },
  column: { width_m: 0.4, height_m: 0.4 },
  chair: { width_m: 0.45, height_m: 0.45 },
};

export const PALETTE_ELEMENT_TYPES: FloorPlanElementType[] = [
  "table_round",
  "table_square",
  "table_rect",
  "bar",
  "stage",
  "column",
];

export type PaletteCategoryId = "tables" | "objects" | "stage";

export const PALETTE_CATEGORIES: {
  id: PaletteCategoryId;
  label: string;
  emoji: string;
  description: string;
  types: FloorPlanElementType[];
}[] = [
  {
    id: "tables",
    label: "Столы",
    emoji: "🪑",
    description: "Круглые, квадратные и прямоугольные",
    types: ["table_round", "table_square", "table_rect"],
  },
  {
    id: "objects",
    label: "Объекты",
    emoji: "📦",
    description: "Бар, колонны и прочее",
    types: ["bar", "column"],
  },
  {
    id: "stage",
    label: "Сцена",
    emoji: "🎭",
    description: "Подиум и зона выступления",
    types: ["stage"],
  },
];

export function isTableElement(type: FloorPlanElementType) {
  return type === "table_round" || type === "table_square" || type === "table_rect";
}

export function formatMeters(value: number) {
  if (value < 1) {
    return `${Math.round(value * 100)} см`;
  }
  return `${value.toFixed(2)} м`;
}

export function roundToCentimeter(value: number) {
  return Math.round(value * 100) / 100;
}

export function nextTableLabel(venue: Venue) {
  const used = new Set(
    venue.elements
      .filter((element) => isTableElement(element.element_type))
      .map((element) => Number.parseInt(normalizeTableLabel(element.label) ?? "", 10))
      .filter((value) => Number.isFinite(value) && value > 0),
  );
  let next = 1;
  while (used.has(next)) next += 1;
  return String(next);
}

export function normalizeTableLabel(label: string | null | undefined) {
  if (!label?.trim()) return null;
  const trimmed = label.trim();
  const prefixed = trimmed.match(/^стол\s*#?\s*(\d+)\s*$/i);
  if (prefixed) return prefixed[1];
  return trimmed;
}

export function getTableDisplayLabel(
  element: Pick<FloorPlanElement, "label" | "element_type"> | null | undefined,
  fallback = "?",
) {
  if (!element || !isTableElement(element.element_type)) return fallback;
  return normalizeTableLabel(element.label) ?? fallback;
}

function createChairElement(
  tableId: string,
  chairIndex: number,
  centerX: number,
  centerY: number,
  existingId?: string,
): FloorPlanElement {
  const chairSize = FLOOR_PLAN_DEFAULT_SIZES.chair;
  return {
    id: existingId ?? crypto.randomUUID(),
    element_type: "chair",
    label: null,
    parent_element_id: tableId,
    chair_index: chairIndex,
    chair_count: 0,
    rotation_deg: 0,
    width_m: chairSize.width_m,
    height_m: chairSize.height_m,
    x_m: roundToCentimeter(centerX - chairSize.width_m / 2),
    y_m: roundToCentimeter(centerY - chairSize.height_m / 2),
  };
}

function splitChairsOnSides(chairCount: number, width: number, height: number) {
  let bestTop = 0;
  let bestSide = 0;
  let bestScore = Infinity;

  for (let top = 0; 2 * top <= chairCount; top += 1) {
    const remaining = chairCount - 2 * top;
    if (remaining % 2 !== 0) continue;

    const side = remaining / 2;
    const idealTop = (chairCount * width) / (2 * (width + height));
    const score = Math.abs(top - idealTop);
    if (score < bestScore) {
      bestScore = score;
      bestTop = top;
      bestSide = side;
    }
  }

  if (bestScore === Infinity) return null;

  return {
    top: bestTop,
    right: bestSide,
    bottom: bestTop,
    left: bestSide,
  };
}

function chairsAlongEdge(
  count: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  normalX: number,
  normalY: number,
  offset: number,
) {
  if (count <= 0) return [] as { x: number; y: number }[];

  return Array.from({ length: count }, (_, index) => {
    const t = (index + 1) / (count + 1);
    const px = startX + (endX - startX) * t;
    const py = startY + (endY - startY) * t;
    return {
      x: px + normalX * offset,
      y: py + normalY * offset,
    };
  });
}

function computeEllipticalChairCenters(
  table: Pick<FloorPlanElement, "x_m" | "y_m" | "width_m" | "height_m">,
  chairCount: number,
  offset: number,
) {
  const cx = table.x_m + table.width_m / 2;
  const cy = table.y_m + table.height_m / 2;
  const rx = table.width_m / 2 + offset;
  const ry = table.height_m / 2 + offset;

  return Array.from({ length: chairCount }, (_, index) => {
    const angle = (2 * Math.PI * index) / chairCount - Math.PI / 2;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  });
}

function computeRectChairCenters(
  table: Pick<FloorPlanElement, "x_m" | "y_m" | "width_m" | "height_m">,
  chairCount: number,
  offset: number,
) {
  const split = splitChairsOnSides(chairCount, table.width_m, table.height_m);
  if (!split) {
    return computeEllipticalChairCenters(table, chairCount, offset);
  }

  const x0 = table.x_m;
  const y0 = table.y_m;
  const w = table.width_m;
  const h = table.height_m;

  return [
    ...chairsAlongEdge(split.top, x0, y0, x0 + w, y0, 0, -1, offset),
    ...chairsAlongEdge(split.right, x0 + w, y0, x0 + w, y0 + h, 1, 0, offset),
    ...chairsAlongEdge(split.bottom, x0 + w, y0 + h, x0, y0 + h, 0, 1, offset),
    ...chairsAlongEdge(split.left, x0, y0 + h, x0, y0, -1, 0, offset),
  ];
}

export function computeChairPositions(
  table: Pick<FloorPlanElement, "element_type" | "x_m" | "y_m" | "width_m" | "height_m">,
  chairCount: number,
  tableId: string,
  existingChairs: FloorPlanElement[] = [],
): FloorPlanElement[] {
  if (chairCount <= 0) return [];

  const chairSize = FLOOR_PLAN_DEFAULT_SIZES.chair;
  const gap = 0.1;
  const half = Math.max(chairSize.width_m, chairSize.height_m) / 2;
  const offset = gap + half;

  const centers =
    table.element_type === "table_round"
      ? computeEllipticalChairCenters(table, chairCount, offset)
      : computeRectChairCenters(table, chairCount, offset);

  return centers.map((center, index) => {
    const existing = existingChairs.find((chair) => chair.chair_index === index + 1);
    return createChairElement(
      tableId,
      index + 1,
      center.x,
      center.y,
      existing?.id,
    );
  });
}

export function applyShapeConstraints(
  elementType: FloorPlanElementType,
  widthM: number,
  heightM: number,
) {
  const width = roundToCentimeter(Math.max(0.01, widthM));
  const height = roundToCentimeter(Math.max(0.01, heightM));

  if (elementType === "table_round" || elementType === "column") {
    const diameter = Math.max(width, height);
    return { width_m: diameter, height_m: diameter };
  }

  if (elementType === "table_square") {
    const side = Math.max(width, height);
    return { width_m: side, height_m: side };
  }

  return { width_m: width, height_m: height };
}

export function formatElementSize(
  element: Pick<FloorPlanElement, "element_type" | "width_m" | "height_m">,
) {
  if (element.element_type === "table_round") {
    return `Ø ${formatMeters(element.width_m)}`;
  }
  return `${formatMeters(element.width_m)} × ${formatMeters(element.height_m)}`;
}

export function clampElementPosition(
  element: Pick<FloorPlanElement, "width_m" | "height_m" | "x_m" | "y_m">,
  roomWidth: number,
  roomHeight: number,
) {
  const maxX = Math.max(0, roomWidth - element.width_m);
  const maxY = Math.max(0, roomHeight - element.height_m);
  return {
    x_m: Math.min(Math.max(0, element.x_m), maxX),
    y_m: Math.min(Math.max(0, element.y_m), maxY),
  };
}

export function resizeVenueRoom(venue: Venue, widthM: number, heightM: number): Venue {
  return {
    ...venue,
    room_width_m: roundToCentimeter(Math.max(1, widthM)),
    room_height_m: roundToCentimeter(Math.max(1, heightM)),
    updated_at: new Date().toISOString(),
  };
}

export function parseGuestImportText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, emailPart] = line.split(/[,;\t]/).map((part) => part.trim());
      const email = emailPart?.includes("@") ? emailPart : null;
      return { name: namePart || line, email };
    });
}

export function buildGuestExportCsv(
  guests: FloorPlanGuest[],
  elements: FloorPlanElement[],
) {
  const header = "Имя,Email,Стол,Стул,Пришёл,Заметки";
  const rows = guests
    .filter((guest) => getGuestTableId(guest, elements) !== null)
    .map((guest) => {
      const chair = elements.find((element) => element.id === guest.seat_element_id);
      const tableLabel = getTableLabelForChair(guest.seat_element_id, elements);
      const chairLabel = chair?.chair_index ? String(chair.chair_index) : "";
      const cells = [
        guest.name,
        guest.email ?? "",
        tableLabel,
        chairLabel,
        guest.checked_in ? "Да" : "Нет",
        guest.notes ?? "",
      ];
      return cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
    });
  return [header, ...rows].join("\n");
}

export function getTableLabelForChair(chairId: string | null, elements: FloorPlanElement[]) {
  if (!chairId) return "";
  const chair = elements.find((element) => element.id === chairId);
  if (!chair?.parent_element_id) return "";
  const table = elements.find((element) => element.id === chair.parent_element_id);
  if (!table) return "";
  return getTableDisplayLabel(table, FLOOR_PLAN_ELEMENT_LABELS[table.element_type]);
}

export function syncTableChairs(venue: Venue, tableId: string): Venue {
  const table = venue.elements.find((element) => element.id === tableId);
  if (!table || !isTableElement(table.element_type)) return venue;

  const existingChairs = venue.elements.filter((element) => element.parent_element_id === tableId);
  const withoutChairs = venue.elements.filter((element) => element.parent_element_id !== tableId);
  const chairs = computeChairPositions(table, table.chair_count, tableId, existingChairs);

  return clearInvalidGuestSeats({
    ...venue,
    elements: [...withoutChairs, ...chairs],
    updated_at: new Date().toISOString(),
  });
}

export function addElementToVenue(
  venue: Venue,
  type: FloorPlanElementType,
  xM: number,
  yM: number,
): Venue {
  const defaults = FLOOR_PLAN_DEFAULT_SIZES[type];
  const shaped = applyShapeConstraints(type, defaults.width_m, defaults.height_m);
  const element: FloorPlanElement = {
    id: crypto.randomUUID(),
    element_type: type,
    label: null,
    x_m: xM,
    y_m: yM,
    width_m: shaped.width_m,
    height_m: shaped.height_m,
    rotation_deg: 0,
    parent_element_id: null,
    chair_index: null,
    chair_count: isTableElement(type) ? 4 : 0,
  };

  const clamped = clampElementPosition(element, venue.room_width_m, venue.room_height_m);
  const placed = { ...element, ...clamped };
  let next: Venue = {
    ...venue,
    elements: [...venue.elements, placed],
    updated_at: new Date().toISOString(),
  };

  if (isTableElement(type)) {
    next = syncTableChairs(next, placed.id);
  }

  return next;
}

export function updateVenueElement(
  venue: Venue,
  elementId: string,
  patch: Partial<FloorPlanElement>,
): Venue {
  let next: Venue = {
    ...venue,
    elements: venue.elements.map((element) => {
      if (element.id !== elementId) return element;
      const updated = { ...element, ...patch };
      const shaped =
        "width_m" in patch || "height_m" in patch
          ? applyShapeConstraints(updated.element_type, updated.width_m, updated.height_m)
          : { width_m: updated.width_m, height_m: updated.height_m };
      const merged = { ...updated, ...shaped };
      return {
        ...merged,
        ...clampElementPosition(merged, venue.room_width_m, venue.room_height_m),
      };
    }),
    updated_at: new Date().toISOString(),
  };

  const updated = next.elements.find((element) => element.id === elementId);
  if (
    updated &&
    isTableElement(updated.element_type) &&
    ("chair_count" in patch ||
      "width_m" in patch ||
      "height_m" in patch ||
      "x_m" in patch ||
      "y_m" in patch)
  ) {
    next = syncTableChairs(next, elementId);
  }

  return next;
}

export function resizeVenueElement(
  venue: Venue,
  elementId: string,
  widthM: number,
  heightM: number,
): Venue {
  const element = venue.elements.find((item) => item.id === elementId);
  if (!element || element.element_type === "chair") return venue;

  const shaped = applyShapeConstraints(element.element_type, widthM, heightM);
  return updateVenueElement(venue, elementId, shaped);
}

export function deleteVenueElement(venue: Venue, elementId: string): Venue {
  return {
    ...venue,
    elements: venue.elements.filter(
      (element) => element.id !== elementId && element.parent_element_id !== elementId,
    ),
    guests: venue.guests
      .filter((guest) => guest.table_element_id !== elementId)
      .map((guest) =>
        guest.seat_element_id &&
        venue.elements.some(
          (element) =>
            element.id === guest.seat_element_id &&
            (element.id === elementId || element.parent_element_id === elementId),
        )
          ? { ...guest, seat_element_id: null }
          : guest,
      ),
    updated_at: new Date().toISOString(),
  };
}

export function getTableChairs(elements: FloorPlanElement[], tableId: string) {
  return elements
    .filter((element) => element.parent_element_id === tableId)
    .sort((a, b) => (a.chair_index ?? 0) - (b.chair_index ?? 0));
}

export function getExistingTableIds(elements: FloorPlanElement[]): Set<string> {
  return new Set(
    elements
      .filter((element) => isTableElement(element.element_type))
      .map((element) => element.id),
  );
}

export function getGuestTableId(
  guest: FloorPlanGuest,
  elements: FloorPlanElement[],
): string | null {
  const tableIds = getExistingTableIds(elements);

  if (guest.seat_element_id) {
    const chair = elements.find((element) => element.id === guest.seat_element_id);
    const tableFromSeat = chair?.parent_element_id;
    if (tableFromSeat && tableIds.has(tableFromSeat)) {
      return tableFromSeat;
    }
  }

  if (guest.table_element_id && tableIds.has(guest.table_element_id)) {
    return guest.table_element_id;
  }

  return null;
}

export function getActiveGuests(venue: Venue): FloorPlanGuest[] {
  return venue.guests.filter((guest) => getGuestTableId(guest, venue.elements) !== null);
}

export function countActiveGuests(venue: Venue): number {
  return getActiveGuests(venue).length;
}

export function getGuestsForTable(
  guests: FloorPlanGuest[],
  tableId: string,
  elements: FloorPlanElement[] = [],
) {
  return guests
    .filter((guest) => getGuestTableId(guest, elements) === tableId)
    .sort((a, b) => a.position - b.position);
}

export function isGuestSeated(guest: FloorPlanGuest, elements: FloorPlanElement[]) {
  if (!guest.seat_element_id) return false;
  const chair = elements.find((element) => element.id === guest.seat_element_id);
  return chair?.element_type === "chair";
}

export function isGuestSeatedAtTable(
  guest: FloorPlanGuest,
  tableId: string,
  elements: FloorPlanElement[],
) {
  if (!isGuestSeated(guest, elements)) return false;
  const chair = elements.find((element) => element.id === guest.seat_element_id);
  return chair?.parent_element_id === tableId;
}

export function countUnassignedGuests(guests: FloorPlanGuest[], elements: FloorPlanElement[]) {
  return guests
    .filter((guest) => getGuestTableId(guest, elements) !== null)
    .filter((guest) => !isGuestSeated(guest, elements))
    .length;
}

export function getUnassignedGuestsForTable(venue: Venue, tableId: string) {
  return getGuestsForTable(venue.guests, tableId, venue.elements).filter(
    (guest) => !isGuestSeatedAtTable(guest, tableId, venue.elements),
  );
}

export function getEmptyChairsForTable(venue: Venue, tableId: string) {
  const chairs = getTableChairs(venue.elements, tableId);
  const occupied = new Set(
    venue.guests
      .filter((guest) => isGuestSeatedAtTable(guest, tableId, venue.elements))
      .map((guest) => guest.seat_element_id as string),
  );
  return chairs.filter((chair) => !occupied.has(chair.id));
}

export function countUnassignedGuestsForTable(
  guests: FloorPlanGuest[],
  tableId: string,
  elements: FloorPlanElement[] = [],
) {
  return getGuestsForTable(guests, tableId, elements).filter(
    (guest) => !isGuestSeatedAtTable(guest, tableId, elements),
  ).length;
}

export function ensureTableChairs(venue: Venue, tableId: string): Venue {
  const table = venue.elements.find((element) => element.id === tableId);
  if (!table || !isTableElement(table.element_type)) return venue;

  const chairs = getTableChairs(venue.elements, tableId);
  if (table.chair_count <= 0) {
    return chairs.length > 0 ? syncTableChairs(venue, tableId) : venue;
  }

  if (chairs.length !== table.chair_count) {
    return syncTableChairs(venue, tableId);
  }

  return venue;
}

export function ensureAllTableChairs(venue: Venue): Venue {
  let next = venue;

  for (const table of venue.elements.filter((element) => isTableElement(element.element_type))) {
    const synced = ensureTableChairs(next, table.id);
    if (synced !== next) next = synced;
  }

  return clearInvalidGuestSeats(next);
}

export function clearInvalidGuestSeats(venue: Venue): Venue {
  const elementIds = new Set(venue.elements.map((element) => element.id));

  return {
    ...venue,
    guests: venue.guests.map((guest) => {
      if (!guest.seat_element_id) return guest;
      if (!elementIds.has(guest.seat_element_id)) {
        return { ...guest, seat_element_id: null };
      }
      const seat = venue.elements.find((element) => element.id === guest.seat_element_id);
      if (seat?.element_type !== "chair") {
        return { ...guest, seat_element_id: null };
      }
      return guest;
    }),
  };
}

export function getChairSeatLabel(chair: FloorPlanElement, elements: FloorPlanElement[]) {
  const table = elements.find((element) => element.id === chair.parent_element_id);
  const tableLabel = getTableDisplayLabel(
    table,
    table ? FLOOR_PLAN_ELEMENT_LABELS[table.element_type] : "?",
  );
  return `${tableLabel} · стул ${chair.chair_index ?? "?"}`;
}

export function importGuestsForTable(venue: Venue, tableId: string, text: string): Venue {
  const parsed = parseGuestImportText(text);
  if (parsed.length === 0) return venue;

  const startPosition =
    venue.guests.reduce((max, guest) => Math.max(max, guest.position), -1) + 1;

  return {
    ...venue,
    guests: [
      ...venue.guests,
      ...parsed.map((guest, index) => ({
        id: crypto.randomUUID(),
        name: guest.name,
        email: guest.email,
        table_element_id: tableId,
        seat_element_id: null,
        notes: null,
        position: startPosition + index,
        checked_in: false,
      })),
    ],
    updated_at: new Date().toISOString(),
  };
}

export function autoSeatGuestsForTable(venue: Venue, tableId: string): Venue {
  let next = ensureTableChairs(venue, tableId);
  next = clearInvalidGuestSeats(next);

  while (true) {
    const unassigned = getUnassignedGuestsForTable(next, tableId);
    const emptyChairs = getEmptyChairsForTable(next, tableId);
    if (unassigned.length === 0 || emptyChairs.length === 0) break;

    next = assignGuestSeat(next, unassigned[0].id, emptyChairs[0].id);
  }

  return next;
}

export function importGuestsToVenue(venue: Venue, text: string): Venue {
  const parsed = parseGuestImportText(text);
  const startPosition =
    venue.guests.reduce((max, guest) => Math.max(max, guest.position), -1) + 1;

  return {
    ...venue,
    guests: [
      ...venue.guests,
      ...parsed.map((guest, index) => ({
        id: crypto.randomUUID(),
        name: guest.name,
        email: guest.email,
        table_element_id: null,
        seat_element_id: null,
        notes: null,
        position: startPosition + index,
        checked_in: false,
      })),
    ],
    updated_at: new Date().toISOString(),
  };
}

function resolveTableIdForSeat(
  elements: FloorPlanElement[],
  seatElementId: string | null,
): string | null {
  if (!seatElementId) return null;
  const chair = elements.find((element) => element.id === seatElementId);
  return chair?.parent_element_id ?? null;
}

export function assignGuestSeat(
  venue: Venue,
  guestId: string,
  seatElementId: string | null,
): Venue {
  const tableElementId = resolveTableIdForSeat(venue.elements, seatElementId);

  return {
    ...venue,
    guests: venue.guests.map((guest) => {
      if (guest.id === guestId) {
        return {
          ...guest,
          seat_element_id: seatElementId,
          table_element_id: seatElementId
            ? (tableElementId ?? guest.table_element_id)
            : guest.table_element_id,
        };
      }
      if (seatElementId && guest.seat_element_id === seatElementId) {
        return { ...guest, seat_element_id: null };
      }
      return guest;
    }),
    updated_at: new Date().toISOString(),
  };
}

export function setGuestCheckedIn(venue: Venue, guestId: string, checkedIn: boolean): Venue {
  return {
    ...venue,
    guests: venue.guests.map((guest) =>
      guest.id === guestId ? { ...guest, checked_in: checkedIn } : guest,
    ),
    updated_at: new Date().toISOString(),
  };
}

export function deleteVenueGuest(venue: Venue, guestId: string): Venue {
  return {
    ...venue,
    guests: venue.guests.filter((guest) => guest.id !== guestId),
    updated_at: new Date().toISOString(),
  };
}

export function moveTableWithChairs(
  elements: FloorPlanElement[],
  tableId: string,
  xM: number,
  yM: number,
): FloorPlanElement[] {
  const table = elements.find((element) => element.id === tableId);
  if (!table) return elements;

  const dx = xM - table.x_m;
  const dy = yM - table.y_m;

  return elements.map((element) => {
    if (element.id === tableId) {
      return { ...element, x_m: xM, y_m: yM };
    }
    if (element.parent_element_id === tableId) {
      return {
        ...element,
        x_m: roundToCentimeter(element.x_m + dx),
        y_m: roundToCentimeter(element.y_m + dy),
      };
    }
    return element;
  });
}

export function saveVenueLayout(venue: Venue, elements: FloorPlanElement[]): Venue {
  const furniture = elements.filter((element) => !element.parent_element_id);
  let next: Venue = {
    ...venue,
    elements,
    updated_at: new Date().toISOString(),
  };

  for (const table of furniture.filter((element) => isTableElement(element.element_type))) {
    next = syncTableChairs(next, table.id);
  }

  return next;
}

function insertElementCopy(
  venue: Venue,
  source: FloorPlanElement,
  xM: number,
  yM: number,
): { venue: Venue; newElementId: string } {
  const clamped = clampElementPosition(
    { ...source, x_m: xM, y_m: yM },
    venue.room_width_m,
    venue.room_height_m,
  );
  const placed: FloorPlanElement = {
    ...source,
    id: crypto.randomUUID(),
    label: isTableElement(source.element_type) ? null : source.label,
    parent_element_id: null,
    chair_index: null,
    ...clamped,
  };

  let next: Venue = {
    ...venue,
    elements: [...venue.elements, placed],
    updated_at: new Date().toISOString(),
  };

  if (isTableElement(placed.element_type)) {
    next = syncTableChairs(next, placed.id);
  }

  return { venue: next, newElementId: placed.id };
}

export function duplicateVenueElement(
  venue: Venue,
  elementId: string,
): { venue: Venue; newElementId: string | null } {
  const source = venue.elements.find((element) => element.id === elementId);
  if (!source || source.element_type === "chair") {
    return { venue, newElementId: null };
  }

  const gap = 0.3;
  return insertElementCopy(venue, source, source.x_m + source.width_m + gap, source.y_m + gap);
}

export function pasteVenueElement(
  venue: Venue,
  source: FloorPlanElement,
  xM: number,
  yM: number,
): { venue: Venue; newElementId: string | null } {
  if (source.element_type === "chair") {
    return { venue, newElementId: null };
  }

  return insertElementCopy(venue, source, xM, yM);
}
