"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FloorPlanCanvas } from "@/components/floor-plan/floor-plan-canvas";
import { FloorPlanCategoryMenu } from "@/components/floor-plan/floor-plan-category-menu";
import { FloorPlanGuestsPanel } from "@/components/floor-plan/floor-plan-guests-panel";
import { FloorPlanInspector } from "@/components/floor-plan/floor-plan-inspector";
import { FloorPlanRoomSetup } from "@/components/floor-plan/floor-plan-room-setup";
import { GuestSearch } from "@/components/floor-plan/guest-search";
import {
  addElementToVenue,
  deleteVenueElement,
  duplicateVenueElement,
  FLOOR_PLAN_DEFAULT_SIZES,
  isTableElement,
  moveTableWithChairs,
  pasteVenueElement,
  resizeVenueElement,
  resizeVenueRoom,
  saveVenueLayout,
  updateVenueElement,
  type PaletteCategoryId,
} from "@/lib/floor-plans";
import { snapRoomRotation } from "@/lib/canvas-coords";
import type { GuestSearchResult } from "@/lib/guest-search";
import type { VenueUpdate } from "@/lib/venue-updates";
import type { FloorPlanElement, FloorPlanElementType, Venue } from "@/lib/types";

type EditorPanel = "layout" | "guests";

type GuestFocusTarget = {
  guestId: string;
  tableId: string;
  seatElementId: string | null;
};

type FloorPlanEditorProps = {
  venue: Venue;
  onVenueChange: (update: VenueUpdate) => void;
};

function commitVenue(venue: Venue, onVenueChange: (update: VenueUpdate) => void) {
  onVenueChange(venue);
}

export function FloorPlanEditor({ venue, onVenueChange }: FloorPlanEditorProps) {
  const [roomWidthM, setRoomWidthM] = useState(venue.room_width_m);
  const [roomHeightM, setRoomHeightM] = useState(venue.room_height_m);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<PaletteCategoryId | null>("tables");
  const [placingType, setPlacingType] = useState<FloorPlanElementType | null>(null);
  const [panel, setPanel] = useState<EditorPanel>("layout");
  const [guestFocusTarget, setGuestFocusTarget] = useState<GuestFocusTarget | null>(null);
  const [guestFocusToken, setGuestFocusToken] = useState(0);
  const [dragPreview, setDragPreview] = useState<{
    x_m: number;
    y_m: number;
    type: FloorPlanElementType;
  } | null>(null);
  const [draftElements, setDraftElements] = useState<FloorPlanElement[] | null>(null);
  const [draftRotationDeg, setDraftRotationDeg] = useState<number | null>(null);
  const [draftRoomSize, setDraftRoomSize] = useState<{ widthM: number; heightM: number } | null>(
    null,
  );
  const draftRotationRef = useRef<number | null>(null);
  const draftRoomSizeRef = useRef<{ widthM: number; heightM: number } | null>(null);
  const copiedElementsRef = useRef<FloorPlanElement[]>([]);
  const pasteCountRef = useRef(0);

  const elements = draftElements ?? venue.elements;
  const roomRotationDeg = draftRotationDeg ?? venue.room_rotation_deg ?? 0;
  const displayRoomWidthM = draftRoomSize?.widthM ?? venue.room_width_m;
  const displayRoomHeightM = draftRoomSize?.heightM ?? venue.room_height_m;
  const roomConfigured = venue.room_configured;
  const primarySelectedId = selectedElementIds[selectedElementIds.length - 1] ?? null;

  const selectedElement = useMemo(
    () =>
      elements.find(
        (element) => element.id === primarySelectedId && element.element_type !== "chair",
      ) ?? null,
    [elements, primarySelectedId],
  );

  const selectedTableCount = useMemo(
    () =>
      selectedElementIds.filter((elementId) => {
        const element = elements.find((item) => item.id === elementId);
        return element ? isTableElement(element.element_type) : false;
      }).length,
    [elements, selectedElementIds],
  );

  useEffect(() => {
    setRoomWidthM(venue.room_width_m);
    setRoomHeightM(venue.room_height_m);
  }, [venue.room_width_m, venue.room_height_m]);

  useEffect(() => {
    setDraftElements(null);
    setDraftRotationDeg(null);
    setDraftRoomSize(null);
    draftRotationRef.current = null;
    draftRoomSizeRef.current = null;
  }, [venue.elements, venue.room_rotation_deg, venue.room_width_m, venue.room_height_m]);

  useEffect(() => {
    setSelectedElementIds((current) =>
      current.filter((elementId) => elements.some((element) => element.id === elementId)),
    );
  }, [elements]);

  const handleGuestLocate = useCallback((result: GuestSearchResult) => {
    setPanel("layout");
    setSelectedElementIds([result.tableId]);
    setGuestFocusTarget({
      guestId: result.guestId,
      tableId: result.tableId,
      seatElementId: result.seatElementId,
    });
    setGuestFocusToken((token) => token + 1);
  }, []);

  const clearGuestFocus = useCallback(() => {
    setGuestFocusTarget(null);
    setGuestFocusToken(0);
  }, []);

  useEffect(() => {
    if (!guestFocusTarget) return;
    if (!selectedElementIds.includes(guestFocusTarget.tableId)) {
      clearGuestFocus();
    }
  }, [clearGuestFocus, guestFocusTarget, selectedElementIds]);

  const activeGuestFocus =
    guestFocusTarget && selectedElementIds.includes(guestFocusTarget.tableId)
      ? guestFocusTarget
      : null;

  const handleSelectElement = useCallback(
    (elementId: string | null, options?: { additive?: boolean }) => {
      if (!elementId) {
        setSelectedElementIds([]);
        return;
      }

      const element = elements.find((item) => item.id === elementId);
      if (!element || element.element_type === "chair") return;

      if (options?.additive && isTableElement(element.element_type)) {
        setSelectedElementIds((current) =>
          current.includes(elementId)
            ? current.filter((id) => id !== elementId)
            : [...current, elementId],
        );
        return;
      }

      setSelectedElementIds([elementId]);
    },
    [elements],
  );

  const getSelectedTables = useCallback(() => {
    return selectedElementIds
      .map((elementId) => elements.find((element) => element.id === elementId))
      .filter(
        (element): element is FloorPlanElement =>
          Boolean(element && isTableElement(element.element_type)),
      );
  }, [elements, selectedElementIds]);

  const handleSaveRoom = useCallback(() => {
    commitVenue(
      { ...venue, room_width_m: roomWidthM, room_height_m: roomHeightM, room_configured: true },
      onVenueChange,
    );
  }, [onVenueChange, roomHeightM, roomWidthM, venue]);

  const placeElement = useCallback(
    (type: FloorPlanElementType, xM: number, yM: number) => {
      const defaults = FLOOR_PLAN_DEFAULT_SIZES[type];
      const next = addElementToVenue(
        venue,
        type,
        xM - defaults.width_m / 2,
        yM - defaults.height_m / 2,
      );
      onVenueChange(next);
      const newElement = next.elements.find(
        (element) => !venue.elements.some((existing) => existing.id === element.id),
      );
      setSelectedElementIds(newElement?.id ? [newElement.id] : []);
      setPlacingType(null);
      setDragPreview(null);
    },
    [onVenueChange, venue],
  );

  const persistDraft = useCallback(
    (nextElements: FloorPlanElement[]) => {
      commitVenue(saveVenueLayout(venue, nextElements), onVenueChange);
      setDraftElements(null);
    },
    [onVenueChange, venue],
  );

  const handleElementDrag = useCallback(
    (elementId: string, xM: number, yM: number) => {
      setDraftElements(moveTableWithChairs(elements, elementId, xM, yM));
    },
    [elements],
  );

  const handleElementResize = useCallback(
    (elementId: string, widthM: number, heightM: number) => {
      setDraftElements((current) => {
        const base = current ?? elements;
        const target = base.find((element) => element.id === elementId);
        if (!target) return current;
        const resized = resizeVenueElement(
          { ...venue, elements: base },
          elementId,
          widthM,
          heightM,
        );
        return resized.elements;
      });
    },
    [elements, venue],
  );

  const handleDragEnd = useCallback(() => {
    if (draftElements) persistDraft(draftElements);
  }, [draftElements, persistDraft]);

  const updateSelected = useCallback(
    (patch: Partial<FloorPlanElement>) => {
      if (!selectedElement) return;
      commitVenue(updateVenueElement(venue, selectedElement.id, patch), onVenueChange);
    },
    [onVenueChange, selectedElement, venue],
  );

  const deleteSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    let next = venue;
    for (const elementId of selectedElementIds) {
      next = deleteVenueElement(next, elementId);
    }

    commitVenue(next, onVenueChange);
    setSelectedElementIds([]);
    setDraftElements(null);
  }, [onVenueChange, selectedElementIds, venue]);

  const copySelected = useCallback(() => {
    const tables = getSelectedTables();
    if (tables.length === 0) return;
    copiedElementsRef.current = tables.map((table) => ({ ...table }));
    pasteCountRef.current = 0;
  }, [getSelectedTables]);

  const pasteCopied = useCallback(() => {
    const sources = copiedElementsRef.current;
    if (sources.length === 0) return;

    pasteCountRef.current += 1;
    const gap = 0.3;
    let next = venue;
    const newIds: string[] = [];

    for (const source of sources) {
      const xM = source.x_m + (source.width_m + gap) * pasteCountRef.current;
      const yM = source.y_m + gap * pasteCountRef.current;
      const result = pasteVenueElement(next, source, xM, yM);
      next = result.venue;
      if (result.newElementId) newIds.push(result.newElementId);
    }

    if (newIds.length === 0) return;

    commitVenue(next, onVenueChange);
    setSelectedElementIds(newIds);
    setDraftElements(null);
  }, [onVenueChange, venue]);

  const duplicateSelected = useCallback(() => {
    const tables = getSelectedTables();
    if (tables.length === 0) return;

    let next = venue;
    const newIds: string[] = [];

    for (const table of tables) {
      const result = duplicateVenueElement(next, table.id);
      next = result.venue;
      if (result.newElementId) newIds.push(result.newElementId);
    }

    if (newIds.length === 0) return;

    commitVenue(next, onVenueChange);
    setSelectedElementIds(newIds);
    setDraftElements(null);
    copiedElementsRef.current = tables.map((table) => ({ ...table }));
    pasteCountRef.current = 1;
  }, [getSelectedTables, onVenueChange, venue]);

  useEffect(() => {
    if (!roomConfigured || panel !== "layout") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedElementIds([]);
        setPlacingType(null);
        setDragPreview(null);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedElementIds.length === 0) return;
        event.preventDefault();
        deleteSelected();
        return;
      }

      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      const key = event.key.toLowerCase();
      if (key === "c") {
        if (getSelectedTables().length === 0) return;
        event.preventDefault();
        copySelected();
        return;
      }

      if (key === "v") {
        if (copiedElementsRef.current.length === 0) return;
        event.preventDefault();
        pasteCopied();
        return;
      }

      if (key === "d") {
        if (getSelectedTables().length === 0) return;
        event.preventDefault();
        duplicateSelected();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    copySelected,
    deleteSelected,
    duplicateSelected,
    getSelectedTables,
    panel,
    pasteCopied,
    roomConfigured,
    selectedElementIds.length,
  ]);

  if (!roomConfigured) {
    return (
      <FloorPlanRoomSetup
        roomWidthM={roomWidthM}
        roomHeightM={roomHeightM}
        saving={false}
        onChangeWidth={setRoomWidthM}
        onChangeHeight={setRoomHeightM}
        onSubmit={handleSaveRoom}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="soft-card mx-3 mt-3 flex shrink-0 items-center gap-3 rounded-[0.65rem] px-4 py-2.5 sm:mx-4">
        <div className="pill-tabs shrink-0">
          {(["layout", "guests"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPanel(tab)}
              className={`pill-tab ${panel === tab ? "pill-tab-active" : ""}`}
            >
              {tab === "layout" ? "План" : "Гости"}
            </button>
          ))}
        </div>
        <GuestSearch venue={venue} onSelect={handleGuestLocate} />
      </div>

      {panel === "guests" ? (
        <div className="soft-card m-3 min-h-0 flex-1 overflow-hidden rounded-[0.65rem] p-4 sm:m-4">
          <FloorPlanGuestsPanel venue={venue} onVenueChange={onVenueChange} />
        </div>
      ) : null}

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-[16rem_minmax(0,1fr)_22rem] ${
          panel === "layout" ? "" : "hidden"
        }`}
      >
          <aside className="soft-card hidden min-h-0 overflow-y-auto rounded-[0.65rem] p-2.5 lg:block">
            <FloorPlanCategoryMenu
              activeCategory={activeCategory}
              placingType={placingType}
              onCategoryChange={setActiveCategory}
              onSelectType={setPlacingType}
            />
          </aside>

          <section className="canvas-stage flex min-h-[min(58vh,32rem)] flex-col overflow-hidden rounded-[0.65rem] lg:min-h-0">
            <div className="border-b border-[var(--line)] px-4 py-3 lg:hidden">
              <FloorPlanCategoryMenu
                activeCategory={activeCategory}
                placingType={placingType}
                onCategoryChange={setActiveCategory}
                onSelectType={setPlacingType}
              />
            </div>
            <div className="min-h-0 flex-1 p-3">
              <div className="canvas-frame h-full min-h-[18rem] p-2 sm:p-3">
                <FloorPlanCanvas
                roomWidthM={displayRoomWidthM}
                roomHeightM={displayRoomHeightM}
                viewportFitRoomWidthM={venue.room_width_m}
                viewportFitRoomHeightM={venue.room_height_m}
                viewportFitRotationDeg={venue.room_rotation_deg ?? 0}
                roomRotationDeg={roomRotationDeg}
                elements={elements}
                guests={venue.guests}
                selectedElementIds={selectedElementIds}
                focusTarget={activeGuestFocus}
                focusToken={guestFocusToken}
                placingType={placingType}
                dragPreview={dragPreview}
                onSelectElement={handleSelectElement}
                onCanvasPointerDown={(xM, yM) => {
                  if (placingType) {
                    placeElement(placingType, xM, yM);
                    return;
                  }
                  handleSelectElement(null);
                }}
                onCanvasDrop={(xM, yM, type) => placeElement(type, xM, yM)}
                onElementDrag={handleElementDrag}
                onElementResize={handleElementResize}
                onDragEnd={handleDragEnd}
                onRoomRotate={(deg) => {
                  draftRotationRef.current = deg;
                  setDraftRotationDeg(deg);
                }}
                onRoomRotateEnd={() => {
                  if (draftRotationRef.current === null) return;
                  const snapped = snapRoomRotation(draftRotationRef.current);
                  commitVenue({ ...venue, room_rotation_deg: snapped }, onVenueChange);
                  draftRotationRef.current = null;
                  setDraftRotationDeg(null);
                }}
                onRoomResize={(widthM, heightM) => {
                  const next = { widthM, heightM };
                  draftRoomSizeRef.current = next;
                  setDraftRoomSize(next);
                }}
                onRoomResizeEnd={() => {
                  if (!draftRoomSizeRef.current) return;
                  const { widthM, heightM } = draftRoomSizeRef.current;
                  commitVenue(resizeVenueRoom(venue, widthM, heightM), onVenueChange);
                  draftRoomSizeRef.current = null;
                  setDraftRoomSize(null);
                }}
                onCanvasPointerMove={(xM, yM, type) => {
                  if (!type) {
                    setDragPreview(null);
                    return;
                  }
                  const defaults = FLOOR_PLAN_DEFAULT_SIZES[type];
                  setDragPreview({
                    x_m: xM - defaults.width_m / 2,
                    y_m: yM - defaults.height_m / 2,
                    type,
                  });
                }}
              />
              </div>
            </div>
          </section>

          <aside className="soft-card min-h-0 overflow-y-auto rounded-[0.65rem] p-2.5">
            <FloorPlanInspector
              venue={venue}
              selectedElement={selectedElement}
              selectedCount={selectedElementIds.length}
              selectedTableCount={selectedTableCount}
              highlightGuestId={activeGuestFocus?.guestId ?? null}
              onVenueChange={onVenueChange}
              onUpdate={updateSelected}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
              onUpdateChairCount={(count) => {
                if (!selectedElement || !isTableElement(selectedElement.element_type)) return;
                commitVenue(
                  updateVenueElement(venue, selectedElement.id, { chair_count: Math.max(0, count) }),
                  onVenueChange,
                );
              }}
            />
          </aside>
        </div>
    </div>
  );
}
