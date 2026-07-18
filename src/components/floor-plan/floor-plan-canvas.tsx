"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  clientToContentSvg,
  clientToMeter,
  clientToSvg,
  DEFAULT_VIEWPORT,
  easeOutCubic,
  fitViewportToRoom,
  focusViewportOnBounds,
  getElementBoundsSvg,
  getRoomCenterSvg,
  getRoomTransform,
  isViewportDeviatedFrom,
  lerpViewport,
  mergeBounds,
  meterSizeToSvg,
  meterToSvg,
  viewportTransformAttr,
  zoomViewportAtPoint,
  type ViewportTransform,
} from "@/lib/canvas-coords";
import {
  FLOOR_PLAN_DEFAULT_SIZES,
  formatElementSize,
  isTableElement,
} from "@/lib/floor-plans";
import type { FloorPlanElement, FloorPlanElementType, FloorPlanGuest } from "@/lib/types";

const CANVAS = {
  roomFill: "#eef2fa",
  roomStroke: "#c8ced8",
  gridMajor: "rgba(0, 0, 0, 0.07)",
  gridMinor: "rgba(0, 0, 0, 0.03)",
  tableFill: "rgba(255, 255, 255, 0.88)",
  tableFillSelected: "#ffffff",
  tableStroke: "#b0b0b0",
  tableStrokeSelected: "#000000",
  chairFill: "#ffffff",
  chairFillOccupied: "rgba(0, 0, 0, 0.07)",
  chairStroke: "#c8ced8",
  chairStrokeOccupied: "#666666",
  stageFill: "rgba(255, 255, 255, 0.72)",
  stageFillSelected: "rgba(255, 255, 255, 0.92)",
  barFill: "rgba(255, 255, 255, 0.72)",
  barFillSelected: "rgba(255, 255, 255, 0.92)",
  columnFill: "rgba(255, 255, 255, 0.78)",
  columnFillSelected: "rgba(255, 255, 255, 0.94)",
  accent: "#000000",
  ink: "#000000",
  muted: "#8a8a8a",
  handleRing: "#ffffff",
  previewFill: "rgba(0, 0, 0, 0.04)",
  previewStroke: "#000000",
};

type GuestFocusTarget = {
  guestId: string;
  tableId: string;
  seatElementId: string | null;
};

type FloorPlanCanvasProps = {
  roomWidthM: number;
  roomHeightM: number;
  viewportFitRoomWidthM: number;
  viewportFitRoomHeightM: number;
  viewportFitRotationDeg: number;
  elements: FloorPlanElement[];
  guests: FloorPlanGuest[];
  selectedElementIds: string[];
  focusTarget?: GuestFocusTarget | null;
  focusToken?: number;
  placingType: FloorPlanElementType | null;
  dragPreview: { x_m: number; y_m: number; type: FloorPlanElementType } | null;
  onSelectElement: (elementId: string | null, options?: { additive?: boolean }) => void;
  onCanvasPointerDown: (xM: number, yM: number) => void;
  onCanvasDrop: (xM: number, yM: number, type: FloorPlanElementType) => void;
  onElementDrag: (elementId: string, xM: number, yM: number) => void;
  onElementResize: (elementId: string, widthM: number, heightM: number) => void;
  onDragEnd?: () => void;
  onCanvasPointerMove?: (xM: number, yM: number, type: FloorPlanElementType | null) => void;
  roomRotationDeg?: number;
  onRoomRotate?: (deg: number) => void;
  onRoomRotateEnd?: () => void;
  onRoomResize?: (widthM: number, heightM: number) => void;
  onRoomResizeEnd?: () => void;
};

function angleFromCenter(svgX: number, svgY: number, centerX: number, centerY: number) {
  return (Math.atan2(svgY - centerY, svgX - centerX) * 180) / Math.PI;
}

function RoomRotateHandle({
  cx,
  cy,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  cx: number;
  cy: number;
  onPointerDown: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerUp: (event: ReactPointerEvent<SVGElement>) => void;
}) {
  const r = 1.15;

  return (
    <g data-room-rotate-handle style={{ cursor: "grab", touchAction: "none" }}>
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill="transparent"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <circle
        cx={cx}
        cy={cy}
        r={2.2}
        fill={CANVAS.handleRing}
        stroke="#d8d2c8"
        strokeWidth={0.22}
        pointerEvents="none"
      />
      <path
        d={`M ${cx - r * 0.72} ${cy + r * 0.42} A ${r} ${r} 0 1 1 ${cx + r * 0.95} ${cy - r * 0.15}`}
        fill="none"
        stroke={CANVAS.ink}
        strokeWidth={0.38}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <path
        d={`M ${cx + r * 1.05} ${cy - r * 0.05} L ${cx + r * 0.95} ${cy - r * 0.15} L ${cx + r * 0.82} ${cy + r * 0.18}`}
        fill={CANVAS.ink}
        stroke="none"
        pointerEvents="none"
      />
      <path
        d={`M ${cx + r * 0.72} ${cy - r * 0.42} A ${r} ${r} 0 1 1 ${cx - r * 0.95} ${cy + r * 0.15}`}
        fill="none"
        stroke={CANVAS.ink}
        strokeWidth={0.38}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <path
        d={`M ${cx - r * 1.05} ${cy + r * 0.05} L ${cx - r * 0.95} ${cy + r * 0.15} L ${cx - r * 0.82} ${cy - r * 0.18}`}
        fill={CANVAS.ink}
        stroke="none"
        pointerEvents="none"
      />
    </g>
  );
}

function RoomResizeHandle({
  cx,
  cy,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  cx: number;
  cy: number;
  onPointerDown: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerUp: (event: ReactPointerEvent<SVGElement>) => void;
}) {
  return (
    <g data-room-resize-handle style={{ cursor: "nwse-resize", touchAction: "none" }}>
      <circle
        cx={cx}
        cy={cy}
        r={2.4}
        fill="transparent"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <circle
        cx={cx}
        cy={cy}
        r={1.05}
        fill={CANVAS.accent}
        stroke={CANVAS.handleRing}
        strokeWidth={0.22}
        pointerEvents="none"
      />
    </g>
  );
}

function ResizeHandle({
  cx,
  cy,
  elementId,
  onSelect,
  onResize,
  onDragEnd,
  pointerToMeter,
  element,
}: {
  cx: number;
  cy: number;
  elementId: string;
  onSelect: () => void;
  onResize: (widthM: number, heightM: number) => void;
  onDragEnd?: () => void;
  pointerToMeter: (clientX: number, clientY: number) => { xM: number; yM: number };
  element: FloorPlanElement;
}) {
  return (
    <g data-resize-handle={elementId} style={{ cursor: "nwse-resize", touchAction: "none" }}>
      <circle
        cx={cx}
        cy={cy}
        r={2.2}
        fill="transparent"
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
          (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!(event.currentTarget as Element).hasPointerCapture(event.pointerId)) return;
          const { xM, yM } = pointerToMeter(event.clientX, event.clientY);
          onResize(Math.max(0.01, xM - element.x_m), Math.max(0.01, yM - element.y_m));
        }}
        onPointerUp={(event) => {
          if ((event.currentTarget as Element).hasPointerCapture(event.pointerId)) {
            (event.currentTarget as Element).releasePointerCapture(event.pointerId);
            onDragEnd?.();
          }
        }}
      />
      <circle
        cx={cx}
        cy={cy}
        r={1.05}
        fill={CANVAS.ink}
        stroke={CANVAS.handleRing}
        strokeWidth={0.22}
        pointerEvents="none"
      />
    </g>
  );
}

function SelectionOverlay({
  element,
  pos,
  w,
  h,
  showResizeHandle,
  onSelect,
  onResize,
  onDragEnd,
  pointerToMeter,
}: {
  element: FloorPlanElement;
  pos: { x: number; y: number };
  w: number;
  h: number;
  showResizeHandle: boolean;
  onSelect: () => void;
  onResize: (widthM: number, heightM: number) => void;
  onDragEnd?: () => void;
  pointerToMeter: (clientX: number, clientY: number) => { xM: number; yM: number };
}) {
  if (!showResizeHandle) return null;

  const handleOffset = 2.4;
  const handleX = pos.x + w + handleOffset;
  const handleY = pos.y + h + handleOffset;

  return (
    <ResizeHandle
      cx={handleX}
      cy={handleY}
      elementId={element.id}
      element={element}
      onSelect={onSelect}
      onResize={onResize}
      onDragEnd={onDragEnd}
      pointerToMeter={pointerToMeter}
    />
  );
}

function FocusArrow({
  targetX,
  targetY,
  roomRotationDeg,
}: {
  targetX: number;
  targetY: number;
  roomRotationDeg: number;
}) {
  return (
    <g transform={`translate(${targetX} ${targetY})`} pointerEvents="none">
      <g className="floor-plan-focus-arrow" transform={`rotate(${-roomRotationDeg})`}>
        <line
          x1={0}
          y1={-7.2}
          x2={0}
          y2={-1.4}
          stroke={CANVAS.ink}
          strokeWidth={0.38}
          strokeLinecap="round"
        />
        <polygon points="0,0 -1,-1.35 1,-1.35" fill={CANVAS.ink} />
      </g>
    </g>
  );
}

function elementFill(type: FloorPlanElementType, selected: boolean) {
  if (type === "chair") return selected ? "rgba(0,0,0,0.05)" : CANVAS.chairFill;
  if (type === "stage") return selected ? CANVAS.stageFillSelected : CANVAS.stageFill;
  if (type === "bar") return selected ? CANVAS.barFillSelected : CANVAS.barFill;
  if (type === "column") return selected ? CANVAS.columnFillSelected : CANVAS.columnFill;
  if (isTableElement(type)) return selected ? CANVAS.tableFillSelected : CANVAS.tableFill;
  return selected ? CANVAS.columnFillSelected : CANVAS.columnFill;
}

function HorizontalText({
  x,
  y,
  text,
  roomRotationDeg,
  className,
}: {
  x: number;
  y: number;
  text: string;
  roomRotationDeg: number;
  className?: string;
}) {
  const transform =
    roomRotationDeg === 0 ? undefined : `rotate(${-roomRotationDeg} ${x} ${y})`;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      transform={transform}
      className={className}
    >
      {text}
    </text>
  );
}

function SizeBadge({
  x,
  y,
  text,
  roomRotationDeg,
}: {
  x: number;
  y: number;
  text: string;
  roomRotationDeg: number;
}) {
  const pad = 1.8;
  const w = text.length * 1.35 + pad * 2;
  const centerX = x + w / 2;
  const centerY = y - 2.4;
  const transform =
    roomRotationDeg === 0 ? undefined : `rotate(${-roomRotationDeg} ${centerX} ${centerY})`;

  return (
    <g pointerEvents="none" transform={transform}>
      <rect
        x={x}
        y={y - 4.5}
        width={w}
        height={4.2}
        rx={2.1}
        fill={CANVAS.accent}
        stroke={CANVAS.handleRing}
        strokeWidth={0.18}
      />
      <text x={x + pad} y={y - 1.6} className="fill-white text-[2.2px] font-semibold">
        {text}
      </text>
    </g>
  );
}

function chairLabelFontSize(width: number, height: number, text: string) {
  const box = Math.min(width, height);
  if (text.length <= 1) return box * 0.58;
  if (text.length === 2) return box * 0.44;
  return box * 0.34;
}

function ChairLabel({
  id,
  x,
  y,
  width,
  height,
  text,
  roomRotationDeg,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  roomRotationDeg: number;
}) {
  const clipId = `chair-label-clip-${id}`;
  const inset = Math.min(width, height) * 0.12;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const fontSize = chairLabelFontSize(width, height, text);
  const transform =
    roomRotationDeg === 0 ? undefined : `rotate(${-roomRotationDeg} ${centerX} ${centerY})`;

  return (
    <>
      <clipPath id={clipId}>
        <rect
          x={x + inset}
          y={y + inset}
          width={Math.max(width - inset * 2, 0.1)}
          height={Math.max(height - inset * 2, 0.1)}
          rx={0.5}
        />
      </clipPath>
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="central"
        clipPath={`url(#${clipId})`}
        transform={transform}
        fill={CANVAS.ink}
        fontSize={fontSize}
        fontWeight={500}
      >
        {text}
      </text>
    </>
  );
}

function renderElementShape(
  element: FloorPlanElement,
  x: number,
  y: number,
  w: number,
  h: number,
  selected: boolean,
  label: string,
  showSizeBadge: boolean,
  roomRotationDeg: number,
  occupied?: boolean,
  checkedIn?: boolean,
) {
  const fill =
    element.element_type === "chair" && occupied && !selected
      ? CANVAS.chairFillOccupied
      : elementFill(element.element_type, selected);
  const stroke = selected
    ? element.element_type === "chair"
      ? CANVAS.accent
      : CANVAS.tableStrokeSelected
    : element.element_type === "chair"
      ? occupied
        ? CANVAS.chairStrokeOccupied
        : CANVAS.chairStroke
      : CANVAS.tableStroke;
  const strokeWidth =
    element.element_type === "chair" ? (selected ? 0.34 : 0.2) : selected ? 0.32 : 0.22;

  const sizeText = formatElementSize(element);

  if (element.element_type === "table_round" || element.element_type === "column") {
    const r = Math.min(w, h) / 2;
    return (
      <>
        <circle cx={x + w / 2} cy={y + h / 2} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        {label ? (
          <HorizontalText
            x={x + w / 2}
            y={y + h / 2}
            text={label}
            roomRotationDeg={roomRotationDeg}
            className="fill-[var(--foreground)] text-[2.8px] font-medium"
          />
        ) : null}
        {showSizeBadge ? (
          <SizeBadge x={x + w + 0.5} y={y} text={sizeText} roomRotationDeg={roomRotationDeg} />
        ) : null}
      </>
    );
  }

  if (element.element_type === "chair") {
    const inset = Math.min(w, h) * 0.18;
    return (
      <>
        <rect x={x} y={y} width={w} height={h} rx={0.8} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <ChairLabel
          id={element.id}
          x={x}
          y={y}
          width={w}
          height={h}
          text={label}
          roomRotationDeg={roomRotationDeg}
        />
        {checkedIn ? (
          <>
            <line
              x1={x + inset}
              y1={y + inset}
              x2={x + w - inset}
              y2={y + h - inset}
              stroke={CANVAS.accent}
              strokeWidth={0.28}
              strokeLinecap="round"
              pointerEvents="none"
            />
            <line
              x1={x + w - inset}
              y1={y + inset}
              x2={x + inset}
              y2={y + h - inset}
              stroke={CANVAS.accent}
              strokeWidth={0.28}
              strokeLinecap="round"
              pointerEvents="none"
            />
          </>
        ) : null}
      </>
    );
  }

  const rx = element.element_type === "table_square" ? 0.6 : 1.2;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      {label ? (
        <HorizontalText
          x={x + w / 2}
          y={y + h / 2}
          text={label}
          roomRotationDeg={roomRotationDeg}
          className="fill-[var(--foreground-muted)] text-[2.8px] font-medium"
        />
      ) : null}
      {showSizeBadge ? (
        <SizeBadge x={x + w + 0.5} y={y} text={sizeText} roomRotationDeg={roomRotationDeg} />
      ) : null}
    </>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function FloorPlanCanvas({
  roomWidthM,
  roomHeightM,
  viewportFitRoomWidthM,
  viewportFitRoomHeightM,
  viewportFitRotationDeg,
  elements,
  guests,
  selectedElementIds,
  focusTarget = null,
  focusToken = 0,
  placingType,
  dragPreview,
  onSelectElement,
  onCanvasPointerDown,
  onCanvasDrop,
  onElementDrag,
  onElementResize,
  onDragEnd,
  onCanvasPointerMove,
  roomRotationDeg = 0,
  onRoomRotate,
  onRoomRotateEnd,
  onRoomResize,
  onRoomResizeEnd,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<ViewportTransform>(DEFAULT_VIEWPORT);
  const fittedViewportRef = useRef<ViewportTransform>(DEFAULT_VIEWPORT);
  const rotateDragRef = useRef<{ startAngle: number; startRotation: number } | null>(null);
  const roomResizeDragRef = useRef<{
    startWidthM: number;
    startHeightM: number;
    startXM: number;
    startYM: number;
    transform: ReturnType<typeof getRoomTransform>;
  } | null>(null);
  const panDragRef = useRef<{
    startScreenX: number;
    startScreenY: number;
    startPanX: number;
    startPanY: number;
    moved: boolean;
  } | null>(null);
  const elementDragRef = useRef<{
    elementId: string;
    offsetXM: number;
    offsetYM: number;
    startClientX: number;
    startClientY: number;
    moved: boolean;
  } | null>(null);
  const [viewport, setViewport] = useState<ViewportTransform>(DEFAULT_VIEWPORT);
  const [spacePressed, setSpacePressed] = useState(false);
  const animatedFocusTokenRef = useRef(0);
  const transform = useMemo(
    () => getRoomTransform(roomWidthM, roomHeightM, roomRotationDeg),
    [roomHeightM, roomRotationDeg, roomWidthM],
  );

  useEffect(() => {
    const fitted = fitViewportToRoom(
      viewportFitRoomWidthM,
      viewportFitRoomHeightM,
      viewportFitRotationDeg,
    );
    fittedViewportRef.current = fitted;
    viewportRef.current = fitted;
    setViewport(fitted);
  }, [viewportFitRoomHeightM, viewportFitRoomWidthM, viewportFitRotationDeg]);

  useEffect(() => {
    if (!focusTarget || focusToken === 0) return;
    if (animatedFocusTokenRef.current === focusToken) return;
    animatedFocusTokenRef.current = focusToken;

    const table = elements.find((element) => element.id === focusTarget.tableId);
    if (!table) return;

    let bounds = getElementBoundsSvg(transform, table, roomRotationDeg, 3.6);

    if (focusTarget.seatElementId) {
      const chair = elements.find((element) => element.id === focusTarget.seatElementId);
      if (chair) {
        bounds = mergeBounds(bounds, getElementBoundsSvg(transform, chair, roomRotationDeg, 2.8));
      }
    } else {
      for (const chair of elements.filter((element) => element.parent_element_id === table.id)) {
        bounds = mergeBounds(bounds, getElementBoundsSvg(transform, chair, roomRotationDeg, 1.8));
      }
    }

    const targetViewport = focusViewportOnBounds(bounds);
    const startViewport = viewportRef.current;
    const durationMs = 720;
    const startTime = performance.now();
    let frameId = 0;

    function tick(now: number) {
      const progress = easeOutCubic((now - startTime) / durationMs);
      const nextViewport = lerpViewport(startViewport, targetViewport, progress);
      viewportRef.current = nextViewport;
      setViewport(nextViewport);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [elements, focusTarget, focusToken, roomRotationDeg, transform]);

  useEffect(() => {
    if (!focusTarget) {
      animatedFocusTokenRef.current = 0;
    }
  }, [focusTarget]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isEditableTarget(event.target)) return;
      event.preventDefault();
      setSpacePressed(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePressed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
  const roomCenter = useMemo(() => getRoomCenterSvg(transform), [transform]);

  const guestBySeat = useMemo(() => {
    const map = new Map<string, FloorPlanGuest>();
    for (const guest of guests) {
      if (guest.seat_element_id) map.set(guest.seat_element_id, guest);
    }
    return map;
  }, [guests]);

  const focusArrowTarget = useMemo(() => {
    if (!focusTarget) return null;

    const targetElement = focusTarget.seatElementId
      ? elements.find((element) => element.id === focusTarget.seatElementId)
      : elements.find((element) => element.id === focusTarget.tableId);

    if (!targetElement) return null;

    const pos = meterToSvg(transform, targetElement.x_m, targetElement.y_m);
    const w = meterSizeToSvg(transform, targetElement.width_m);
    const h = meterSizeToSvg(transform, targetElement.height_m);

    return {
      x: pos.x + w / 2,
      y: pos.y + h / 2,
    };
  }, [elements, focusTarget, transform]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const screen = clientToSvg(event.clientX, event.clientY, rect);
      const current = viewportRef.current;
      const zoomed = isViewportDeviatedFrom(current, fittedViewportRef.current);

      if (zoomed && !event.ctrlKey && !event.metaKey) {
        setViewport((value) => ({
          ...value,
          panX: value.panX - event.deltaX * 0.06,
          panY: value.panY - event.deltaY * 0.06,
        }));
        return;
      }

      const factor = Math.exp(-event.deltaY * 0.002);
      setViewport((value) => zoomViewportAtPoint(value, screen.x, screen.y, factor));
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  function getContainerRect() {
    return containerRef.current?.getBoundingClientRect() ?? null;
  }

  function pointerToContentSvg(clientX: number, clientY: number) {
    const rect = getContainerRect();
    if (!rect) return { x: 0, y: 0 };
    return clientToContentSvg(clientX, clientY, rect, viewport);
  }

  function pointerToScreenSvg(clientX: number, clientY: number) {
    const rect = getContainerRect();
    if (!rect) return { x: 0, y: 0 };
    return clientToSvg(clientX, clientY, rect);
  }

  function pointerToMeter(clientX: number, clientY: number) {
    const rect = getContainerRect();
    if (!rect) return { xM: 0, yM: 0 };
    return clientToMeter(transform, clientX, clientY, rect, roomRotationDeg, viewport);
  }

  const furnitureElements = elements.filter((element) => element.element_type !== "chair");
  const chairElements = elements.filter((element) => element.element_type === "chair");
  const primarySelectedId = selectedElementIds[selectedElementIds.length - 1] ?? null;
  const selectedElements = selectedElementIds
    .map((elementId) => elements.find((element) => element.id === elementId))
    .filter((element): element is FloorPlanElement => Boolean(element && element.element_type !== "chair"));

  function isViewportZoomed(current = viewport) {
    return isViewportDeviatedFrom(current, fittedViewportRef.current);
  }

  const rotationTransform =
    roomRotationDeg === 0
      ? undefined
      : `rotate(${roomRotationDeg} ${roomCenter.x} ${roomCenter.y})`;

  const viewportTransform = viewportTransformAttr(viewport);
  const handleOffset = 2.4;
  const roomResizeHandle = {
    x: transform.offsetX + transform.roomPixelW + handleOffset,
    y: transform.offsetY + transform.roomPixelH + handleOffset,
  };
  const roomRotateHandle = {
    x: transform.offsetX + transform.roomPixelW + handleOffset,
    y: transform.offsetY - handleOffset,
  };
  const canPan = isViewportZoomed() || spacePressed;

  function handleRoomRotatePointerDown(event: ReactPointerEvent<SVGElement>) {
    event.stopPropagation();
    const svg = pointerToContentSvg(event.clientX, event.clientY);
    rotateDragRef.current = {
      startAngle: angleFromCenter(svg.x, svg.y, roomCenter.x, roomCenter.y),
      startRotation: roomRotationDeg,
    };
    (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
  }

  function handleRoomRotatePointerMove(event: ReactPointerEvent<SVGElement>) {
    if (!rotateDragRef.current || !(event.currentTarget as Element).hasPointerCapture(event.pointerId)) {
      return;
    }
    const svg = pointerToContentSvg(event.clientX, event.clientY);
    const angle = angleFromCenter(svg.x, svg.y, roomCenter.x, roomCenter.y);
    const delta = angle - rotateDragRef.current.startAngle;
    onRoomRotate?.(rotateDragRef.current.startRotation + delta);
  }

  function handleRoomRotatePointerUp(event: ReactPointerEvent<SVGElement>) {
    if (!(event.currentTarget as Element).hasPointerCapture(event.pointerId)) return;
    (event.currentTarget as Element).releasePointerCapture(event.pointerId);
    rotateDragRef.current = null;
    onRoomRotateEnd?.();
  }

  function handleRoomResizePointerDown(event: ReactPointerEvent<SVGElement>) {
    event.stopPropagation();
    const { xM, yM } = pointerToMeter(event.clientX, event.clientY);
    roomResizeDragRef.current = {
      startWidthM: roomWidthM,
      startHeightM: roomHeightM,
      startXM: xM,
      startYM: yM,
      transform,
    };
    (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
  }

  function handleRoomResizePointerMove(event: ReactPointerEvent<SVGElement>) {
    const drag = roomResizeDragRef.current;
    if (!drag || !(event.currentTarget as Element).hasPointerCapture(event.pointerId)) return;

    const rect = getContainerRect();
    if (!rect) return;

    const { xM, yM } = clientToMeter(
      drag.transform,
      event.clientX,
      event.clientY,
      rect,
      roomRotationDeg,
      viewport,
    );

    onRoomResize?.(
      Math.max(1, drag.startWidthM + (xM - drag.startXM)),
      Math.max(1, drag.startHeightM + (yM - drag.startYM)),
    );
  }

  function handleRoomResizePointerUp(event: ReactPointerEvent<SVGElement>) {
    if (!(event.currentTarget as Element).hasPointerCapture(event.pointerId)) return;
    (event.currentTarget as Element).releasePointerCapture(event.pointerId);
    roomResizeDragRef.current = null;
    onRoomResizeEnd?.();
  }

  function renderElement(element: FloorPlanElement) {
    const pos = meterToSvg(transform, element.x_m, element.y_m);
    const w = meterSizeToSvg(transform, element.width_m);
    const h = meterSizeToSvg(transform, element.height_m);
    const selected =
      element.element_type === "chair"
        ? Boolean(
            element.parent_element_id && selectedElementIds.includes(element.parent_element_id),
          )
        : selectedElementIds.includes(element.id);
    const guest = element.element_type === "chair" ? guestBySeat.get(element.id) : null;
    const canvasLabel =
      element.element_type === "chair"
        ? element.chair_index
          ? String(element.chair_index)
          : ""
        : (element.label?.trim() ?? "");
    const showSizeBadge = selected && element.id === primarySelectedId && isTableElement(element.element_type);

    return (
      <g key={element.id} data-floor-element={element.id}>
        <g
          onPointerDown={(event) => {
            event.stopPropagation();
            if (element.element_type === "chair") {
              if (element.parent_element_id) {
                onSelectElement(element.parent_element_id);
              }
              return;
            }

            const { xM, yM } = pointerToMeter(event.clientX, event.clientY);
            onSelectElement(element.id, { additive: event.shiftKey });
            elementDragRef.current = {
              elementId: element.id,
              offsetXM: xM - element.x_m,
              offsetYM: yM - element.y_m,
              startClientX: event.clientX,
              startClientY: event.clientY,
              moved: false,
            };
            (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (element.element_type === "chair") return;
            const drag = elementDragRef.current;
            if (!drag || drag.elementId !== element.id) return;
            if (!(event.currentTarget as Element).hasPointerCapture(event.pointerId)) return;

            const dx = event.clientX - drag.startClientX;
            const dy = event.clientY - drag.startClientY;
            if (!drag.moved) {
              if (Math.hypot(dx, dy) < 4) return;
              drag.moved = true;
            }

            const { xM, yM } = pointerToMeter(event.clientX, event.clientY);
            onElementDrag(element.id, xM - drag.offsetXM, yM - drag.offsetYM);
          }}
          onPointerUp={(event) => {
            if ((event.currentTarget as Element).hasPointerCapture(event.pointerId)) {
              (event.currentTarget as Element).releasePointerCapture(event.pointerId);
              if (elementDragRef.current?.elementId === element.id && elementDragRef.current.moved) {
                onDragEnd?.();
              }
            }
            if (elementDragRef.current?.elementId === element.id) {
              elementDragRef.current = null;
            }
          }}
          style={{ touchAction: "none", cursor: element.element_type === "chair" ? "default" : "grab" }}
        >
          {renderElementShape(
            element,
            pos.x,
            pos.y,
            w,
            h,
            selected,
            canvasLabel,
            showSizeBadge,
            roomRotationDeg,
            Boolean(guest),
            Boolean(guest?.checked_in),
          )}
        </g>
      </g>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full min-h-[20rem] touch-none ${
        placingType ? "cursor-crosshair" : canPan ? "cursor-grab" : "cursor-default"
      } ${spacePressed ? "cursor-grab" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData("floor-plan-element") as FloorPlanElementType;
        if (!type) return;
        const { xM, yM } = pointerToMeter(event.clientX, event.clientY);
        onCanvasDrop(xM, yM, type);
      }}
      onPointerDown={(event) => {
        if (
          (event.target as Element).closest(
            "[data-floor-element], [data-resize-handle], [data-room-rotate-handle], [data-room-resize-handle]",
          )
        ) {
          return;
        }

        if ((canPan || spacePressed) && !placingType) {
          const screen = pointerToScreenSvg(event.clientX, event.clientY);
          panDragRef.current = {
            startScreenX: screen.x,
            startScreenY: screen.y,
            startPanX: viewport.panX,
            startPanY: viewport.panY,
            moved: false,
          };
          (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
          return;
        }

        const { xM, yM } = pointerToMeter(event.clientX, event.clientY);
        onCanvasPointerDown(xM, yM);
      }}
      onPointerMove={(event) => {
        if (panDragRef.current && (event.currentTarget as Element).hasPointerCapture(event.pointerId)) {
          const screen = pointerToScreenSvg(event.clientX, event.clientY);
          const dx = screen.x - panDragRef.current.startScreenX;
          const dy = screen.y - panDragRef.current.startScreenY;
          if (Math.hypot(dx, dy) > 0.4) panDragRef.current.moved = true;
          setViewport((current) => ({
            ...current,
            panX: panDragRef.current!.startPanX + dx,
            panY: panDragRef.current!.startPanY + dy,
          }));
          return;
        }

        if (!placingType || !onCanvasPointerMove) return;
        const { xM, yM } = pointerToMeter(event.clientX, event.clientY);
        onCanvasPointerMove(xM, yM, placingType);
      }}
      onPointerUp={(event) => {
        if ((event.currentTarget as Element).hasPointerCapture(event.pointerId)) {
          (event.currentTarget as Element).releasePointerCapture(event.pointerId);
          if (panDragRef.current) {
            if (!panDragRef.current.moved) {
              const { xM, yM } = pointerToMeter(event.clientX, event.clientY);
              onCanvasPointerDown(xM, yM);
            }
            panDragRef.current = null;
            return;
          }
        }
      }}
      onPointerLeave={() => onCanvasPointerMove?.(0, 0, null)}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        <g transform={viewportTransform}>
          <g transform={rotationTransform}>
          <rect
            x={transform.offsetX - 1}
            y={transform.offsetY - 1}
            width={transform.roomPixelW + 2}
            height={transform.roomPixelH + 2}
            rx={2}
            fill={CANVAS.roomFill}
            stroke={CANVAS.roomStroke}
            strokeWidth={0.28}
          />

          {Array.from({ length: Math.ceil(roomWidthM) + 1 }).map((_, index) => {
          const x = transform.offsetX + (index / roomWidthM) * transform.roomPixelW;
          return (
            <line
              key={`v-${index}`}
              x1={x}
              y1={transform.offsetY}
              x2={x}
              y2={transform.offsetY + transform.roomPixelH}
              stroke={index % 5 === 0 ? CANVAS.gridMajor : CANVAS.gridMinor}
              strokeWidth={index % 5 === 0 ? 0.14 : 0.06}
            />
          );
        })}

        {Array.from({ length: Math.ceil(roomHeightM) + 1 }).map((_, index) => {
          const y = transform.offsetY + (index / roomHeightM) * transform.roomPixelH;
          return (
            <line
              key={`h-${index}`}
              x1={transform.offsetX}
              y1={y}
              x2={transform.offsetX + transform.roomPixelW}
              y2={y}
              stroke={index % 5 === 0 ? CANVAS.gridMajor : CANVAS.gridMinor}
              strokeWidth={index % 5 === 0 ? 0.14 : 0.06}
            />
          );
          })}

          {furnitureElements.map(renderElement)}
          {chairElements.map(renderElement)}

          {focusArrowTarget ? (
            <FocusArrow
              targetX={focusArrowTarget.x}
              targetY={focusArrowTarget.y}
              roomRotationDeg={roomRotationDeg}
            />
          ) : null}

          {selectedElements.map((element) => {
            const pos = meterToSvg(transform, element.x_m, element.y_m);
            const w = meterSizeToSvg(transform, element.width_m);
            const h = meterSizeToSvg(transform, element.height_m);
            return (
              <SelectionOverlay
                key={`selection-${element.id}`}
                element={element}
                pos={pos}
                w={w}
                h={h}
                showResizeHandle={element.id === primarySelectedId}
                onSelect={() => onSelectElement(element.id)}
                onResize={(widthM, heightM) => onElementResize(element.id, widthM, heightM)}
                onDragEnd={onDragEnd}
                pointerToMeter={pointerToMeter}
              />
            );
          })}

          {dragPreview
            ? (() => {
                const defaults = FLOOR_PLAN_DEFAULT_SIZES[dragPreview.type];
                const pos = meterToSvg(transform, dragPreview.x_m, dragPreview.y_m);
                const w = meterSizeToSvg(transform, defaults.width_m);
                const h = meterSizeToSvg(transform, defaults.height_m);

                if (dragPreview.type === "table_round" || dragPreview.type === "column") {
                  return (
                    <circle
                      cx={pos.x + w / 2}
                      cy={pos.y + h / 2}
                      r={Math.min(w, h) / 2}
                      fill={CANVAS.previewFill}
                      stroke={CANVAS.previewStroke}
                      strokeDasharray="1.5 0.8"
                      strokeWidth={0.28}
                    />
                  );
                }

                return (
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={w}
                    height={h}
                    fill={CANVAS.previewFill}
                    stroke={CANVAS.previewStroke}
                    strokeDasharray="1.5 0.8"
                    strokeWidth={0.28}
                    rx={dragPreview.type === "table_square" ? 0.6 : 1.2}
                  />
                );
              })()
            : null}

          <RoomRotateHandle
            cx={roomRotateHandle.x}
            cy={roomRotateHandle.y}
            onPointerDown={handleRoomRotatePointerDown}
            onPointerMove={handleRoomRotatePointerMove}
            onPointerUp={handleRoomRotatePointerUp}
          />
          <RoomResizeHandle
            cx={roomResizeHandle.x}
            cy={roomResizeHandle.y}
            onPointerDown={handleRoomResizePointerDown}
            onPointerMove={handleRoomResizePointerMove}
            onPointerUp={handleRoomResizePointerUp}
          />
          </g>
        </g>
      </svg>
    </div>
  );
}
