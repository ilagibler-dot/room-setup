"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FloorPlanRoomSetupProps = {
  roomWidthM: number;
  roomHeightM: number;
  saving: boolean;
  onChangeWidth: (value: number) => void;
  onChangeHeight: (value: number) => void;
  onSubmit: () => void;
};

export function FloorPlanRoomSetup({
  roomWidthM,
  roomHeightM,
  saving,
  onChangeWidth,
  onChangeHeight,
  onSubmit,
}: FloorPlanRoomSetupProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8">
      <div className="glass-card w-full max-w-sm space-y-5 rounded-2xl p-6">
        <div className="space-y-1 text-center">
          <p className="section-label">Настройка</p>
          <h3 className="text-xl font-bold text-[var(--foreground)]">Размеры помещения</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Укажите ширину и длину зала в метрах
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="room-width">Ширина, м</Label>
            <Input
              id="room-width"
              type="number"
              min={1}
              step={0.1}
              inputMode="decimal"
              value={roomWidthM}
              onChange={(event) => onChangeWidth(Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room-height">Длина, м</Label>
            <Input
              id="room-height"
              type="number"
              min={1}
              step={0.1}
              inputMode="decimal"
              value={roomHeightM}
              onChange={(event) => onChangeHeight(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="accent-panel rounded-2xl px-4 py-6 text-center">
          <p className="section-label">Предпросмотр</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
            {roomWidthM.toFixed(1)} × {roomHeightM.toFixed(1)} м
          </p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Площадь {(roomWidthM * roomHeightM).toFixed(1)} м²
          </p>
        </div>

        <Button className="w-full" disabled={saving} onClick={onSubmit}>
          {saving ? "Сохранение…" : "Начать расстановку"}
        </Button>
      </div>
    </div>
  );
}
