"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMeters, resizeVenueRoom } from "@/lib/floor-plans";
import type { VenueUpdate } from "@/lib/venue-updates";
import type { Venue } from "@/lib/types";

type VenueInfoToggleProps = {
  venue: Venue;
  onVenueChange: (update: VenueUpdate) => void;
};

export function VenueInfoToggle({ venue, onVenueChange }: VenueInfoToggleProps) {
  const [open, setOpen] = useState(false);
  const [editingRoomSize, setEditingRoomSize] = useState(false);
  const [draftWidthM, setDraftWidthM] = useState(String(venue.room_width_m));
  const [draftHeightM, setDraftHeightM] = useState(String(venue.room_height_m));

  const objectCount = venue.elements.filter((element) => !element.parent_element_id).length;
  const normalizedRotation = Math.round((((venue.room_rotation_deg ?? 0) % 360) + 360) % 360);

  useEffect(() => {
    if (editingRoomSize) return;
    setDraftWidthM(String(venue.room_width_m));
    setDraftHeightM(String(venue.room_height_m));
  }, [editingRoomSize, venue.room_height_m, venue.room_width_m]);

  function commitRoomSize() {
    const widthM = Number(draftWidthM);
    const heightM = Number(draftHeightM);
    if (!Number.isFinite(widthM) || !Number.isFinite(heightM) || widthM < 1 || heightM < 1) {
      setDraftWidthM(String(venue.room_width_m));
      setDraftHeightM(String(venue.room_height_m));
      setEditingRoomSize(false);
      return;
    }
    onVenueChange((current) => resizeVenueRoom(current, widthM, heightM));
    setEditingRoomSize(false);
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Информация о помещении"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-5 w-5 items-center justify-center rounded-[0.3rem] border text-[0.65rem] font-medium transition ${
          open
            ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
            : "border-[var(--line)] bg-white/40 text-[var(--foreground-muted)] hover:bg-white/60"
        }`}
      >
        i
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-[0.65rem] border border-[var(--line)] bg-[rgba(242,244,248,0.95)] p-3 shadow-[var(--surface-shadow)] backdrop-blur-xl">
          {editingRoomSize ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Ширина, м</Label>
                <Input
                  type="number"
                  min={1}
                  step={0.01}
                  value={draftWidthM}
                  onChange={(event) => setDraftWidthM(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitRoomSize();
                    if (event.key === "Escape") {
                      setDraftWidthM(String(venue.room_width_m));
                      setDraftHeightM(String(venue.room_height_m));
                      setEditingRoomSize(false);
                    }
                  }}
                  autoFocus
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <Label>Длина, м</Label>
                <Input
                  type="number"
                  min={1}
                  step={0.01}
                  value={draftHeightM}
                  onChange={(event) => setDraftHeightM(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitRoomSize();
                    if (event.key === "Escape") {
                      setDraftWidthM(String(venue.room_width_m));
                      setDraftHeightM(String(venue.room_height_m));
                      setEditingRoomSize(false);
                    }
                  }}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <Button className="col-span-2 h-8 text-xs" onClick={commitRoomSize}>
                Сохранить размер
              </Button>
            </div>
          ) : (
            <p
              className="cursor-text text-xs text-[var(--foreground-muted)]"
              title="Дважды нажмите, чтобы изменить размер площадки"
              onDoubleClick={() => setEditingRoomSize(true)}
            >
              {formatMeters(venue.room_width_m)} × {formatMeters(venue.room_height_m)} · {objectCount}{" "}
              объектов · {normalizedRotation}°
            </p>
          )}

          <p className="mt-2 text-[0.65rem] leading-relaxed text-[var(--foreground-subtle)]">
            Размер площадки: синяя точка в углу или двойной клик по метражу · Shift+клик — несколько
            столов · масштаб: колёсико · поворот: стрелка в углу · при зуме — перетаскивание фона ·
            пробел — перемещение
          </p>
        </div>
      ) : null}
    </div>
  );
}
