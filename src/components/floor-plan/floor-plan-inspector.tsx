"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableGuestsPanel } from "@/components/floor-plan/table-guests-panel";
import {
  FLOOR_PLAN_ELEMENT_LABELS,
  formatElementSize,
  getTableDisplayLabel,
  isTableElement,
  normalizeTableLabel,
} from "@/lib/floor-plans";
import type { VenueUpdate } from "@/lib/venue-updates";
import type { FloorPlanElement, Venue } from "@/lib/types";

type FloorPlanInspectorProps = {
  venue: Venue;
  selectedElement: FloorPlanElement | null;
  selectedCount: number;
  selectedTableCount: number;
  highlightGuestId?: string | null;
  onVenueChange: (update: VenueUpdate) => void;
  onUpdate: (patch: Partial<FloorPlanElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdateChairCount: (count: number) => void;
};

export function FloorPlanInspector({
  venue,
  selectedElement,
  selectedCount,
  selectedTableCount,
  highlightGuestId = null,
  onVenueChange,
  onUpdate,
  onDelete,
  onDuplicate,
  onUpdateChairCount,
}: FloorPlanInspectorProps) {
  const selectedTable =
    selectedElement && isTableElement(selectedElement.element_type) ? selectedElement : null;

  return (
    <div className="flex h-full flex-col gap-4">
      {selectedCount > 1 ? (
        <div className="soft-card rounded-[0.65rem] p-4">
          <p className="section-label mb-3">Выделение</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {selectedTableCount > 0
              ? `Выбрано столов: ${selectedTableCount}`
              : `Выбрано объектов: ${selectedCount}`}
          </p>
          <p className="mt-2 text-xs text-[var(--foreground-subtle)]">
            Shift+клик по столу добавляет или убирает его из выделения
          </p>
          {selectedTableCount > 0 ? (
            <>
              <Button variant="secondary" className="mt-4 w-full text-sm" onClick={onDuplicate}>
                Копировать столы
              </Button>
              <p className="mt-2 text-center text-[0.65rem] text-[var(--foreground-subtle)]">
                ⌘C / Ctrl+C — копировать · ⌘V / Ctrl+V — вставить · ⌘D / Ctrl+D — дублировать
              </p>
            </>
          ) : null}
          <Button variant="danger" className="mt-3 w-full text-sm" onClick={onDelete}>
            Удалить выбранное
          </Button>
        </div>
      ) : selectedElement ? (
        <>
          <div className="soft-card rounded-[0.65rem] p-4">
            <p className="section-label mb-3">
              {selectedTable ? "Свойства стола" : "Свойства"}
            </p>
            <div className="space-y-3">
              <div>
                <Label>{selectedTable ? "Номер стола" : "Название"}</Label>
                <Input
                  value={
                    selectedTable
                      ? getTableDisplayLabel(selectedElement, "")
                      : (selectedElement.label ?? "")
                  }
                  placeholder={
                    selectedTable ? "1" : FLOOR_PLAN_ELEMENT_LABELS[selectedElement.element_type]
                  }
                  onChange={(event) =>
                    onUpdate({
                      label: selectedTable
                        ? normalizeTableLabel(event.target.value) || null
                        : event.target.value || null,
                    })
                  }
                  className="mt-1 h-9 text-sm"
                />
              </div>

              <div className="accent-panel rounded-[0.55rem] px-3 py-2 text-center">
                <p className="text-[0.65rem] uppercase tracking-wide text-[var(--foreground-muted)]">Размер</p>
                <p className="text-sm font-bold text-[var(--foreground)]">
                  {formatElementSize(selectedElement)}
                </p>
                <p className="mt-1 text-[0.65rem] text-[var(--foreground-muted)]">
                  Потяните синюю точку справа снизу от объекта
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Ширина, м</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={selectedElement.width_m}
                    onChange={(event) =>
                      onUpdate({ width_m: Number(event.target.value) || selectedElement.width_m })
                    }
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                {selectedElement.element_type !== "table_round" &&
                selectedElement.element_type !== "column" ? (
                  <div>
                    <Label>Длина, м</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={selectedElement.height_m}
                      onChange={(event) =>
                        onUpdate({ height_m: Number(event.target.value) || selectedElement.height_m })
                      }
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Диаметр, м</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={selectedElement.width_m}
                      onChange={(event) => {
                        const value = Number(event.target.value) || selectedElement.width_m;
                        onUpdate({ width_m: value, height_m: value });
                      }}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                )}
              </div>

              {selectedTable ? (
                <div>
                  <Label>Стулья</Label>
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    value={selectedElement.chair_count}
                    onChange={(event) => onUpdateChairCount(Number(event.target.value) || 0)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              ) : null}

              <Button variant="danger" className="w-full text-sm" onClick={onDelete}>
                Удалить объект
              </Button>
            </div>
          </div>

          {selectedTable ? (
            <TableGuestsPanel
              venue={venue}
              table={selectedTable}
              highlightGuestId={highlightGuestId}
              onVenueChange={onVenueChange}
            />
          ) : null}
        </>
      ) : (
        <div className="soft-card flex flex-1 flex-col items-center justify-center rounded-2xl p-6 text-center">
          <p className="text-sm font-medium text-[var(--foreground-muted)]">Объект не выбран</p>
          <p className="mt-2 text-xs text-[var(--foreground-subtle)]">
            Выберите стол на карте, чтобы изменить свойства и добавить гостей
          </p>
        </div>
      )}
    </div>
  );
}
