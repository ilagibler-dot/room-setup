"use client";

import type { FloorPlanElementType } from "@/lib/types";
import {
  FLOOR_PLAN_DEFAULT_SIZES,
  FLOOR_PLAN_ELEMENT_LABELS,
  formatElementSize,
  PALETTE_CATEGORIES,
  type PaletteCategoryId,
} from "@/lib/floor-plans";

type FloorPlanCategoryMenuProps = {
  activeCategory: PaletteCategoryId | null;
  placingType: FloorPlanElementType | null;
  onCategoryChange: (category: PaletteCategoryId | null) => void;
  onSelectType: (type: FloorPlanElementType | null) => void;
};

const itemIcons: Record<FloorPlanElementType, string> = {
  table_round: "○",
  table_square: "□",
  table_rect: "▭",
  bar: "▬",
  stage: "◧",
  column: "◉",
  chair: "◦",
};

export function FloorPlanCategoryMenu({
  activeCategory,
  placingType,
  onCategoryChange,
  onSelectType,
}: FloorPlanCategoryMenuProps) {
  const activeMeta = PALETTE_CATEGORIES.find((category) => category.id === activeCategory);

  return (
    <div className="flex h-full flex-col gap-2.5">
      {PALETTE_CATEGORIES.map((category) => {
        const active = activeCategory === category.id;
        return (
          <div key={category.id} className="overflow-hidden rounded-[0.75rem] border border-[var(--line)] list-surface">
            <button
              type="button"
              onClick={() => {
                if (active) {
                  onCategoryChange(null);
                  onSelectType(null);
                  return;
                }
                onCategoryChange(category.id);
                onSelectType(null);
              }}
              className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition ${
                active ? "bg-white/28" : "hover:bg-white/18"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[0.35rem] border border-[var(--line)] bg-white/24 text-lg">
                {category.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold tracking-[0.01em] text-[var(--foreground)]">
                  {category.label}
                </span>
                <span className="block text-[0.68rem] text-[var(--foreground-muted)]">
                  {category.description}
                </span>
              </span>
              <span className={`text-[var(--foreground-subtle)] transition ${active ? "rotate-90" : ""}`}>
                ›
              </span>
            </button>

            {active ? (
              <div className="space-y-1.5 border-t border-[var(--line)] px-2.5 py-2.5">
                {category.types.map((type) => {
                  const selected = placingType === type;
                  const defaults = FLOOR_PLAN_DEFAULT_SIZES[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("floor-plan-element", type);
                        onSelectType(type);
                      }}
                      onClick={() => onSelectType(selected ? null : type)}
                      className={`flex w-full items-center gap-3 rounded-[0.45rem] px-3 py-2 text-left transition ${
                        selected ? "menu-item-selected" : "menu-item"
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-[0.35rem] border border-[var(--line)] bg-white/20 text-sm">
                        {itemIcons[type]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{FLOOR_PLAN_ELEMENT_LABELS[type]}</span>
                        <span
                          className={`block text-[0.68rem] ${selected ? "text-white/72" : "text-[var(--foreground-subtle)]"}`}
                        >
                          {formatElementSize({ element_type: type, ...defaults })}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}

      {placingType && activeMeta ? (
        <div className="accent-badge rounded-[0.45rem] px-3 py-2 text-center text-[0.68rem] font-medium tracking-[0.04em] uppercase">
          Нажмите на карту — {FLOOR_PLAN_ELEMENT_LABELS[placingType]}
        </div>
      ) : null}
    </div>
  );
}
