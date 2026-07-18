export type RoomTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
  roomPixelW: number;
  roomPixelH: number;
  roomWidthM: number;
  roomHeightM: number;
};

const VIEW_INSET = 6;
const VIEW_SIZE = 100;
const HANDLE_PADDING = 1.8;

export function getRoomTransform(
  roomWidthM: number,
  roomHeightM: number,
  rotationDeg = 0,
): RoomTransform {
  const inner = VIEW_SIZE - VIEW_INSET * 2;
  const usable = inner - HANDLE_PADDING * 2;
  const normalized = ((rotationDeg % 360) + 360) % 360;
  const rad = (normalized * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bboxW = roomWidthM * cos + roomHeightM * sin;
  const bboxH = roomWidthM * sin + roomHeightM * cos;
  const scale = usable / Math.max(bboxW, bboxH);
  const roomPixelW = roomWidthM * scale;
  const roomPixelH = roomHeightM * scale;

  return {
    scale,
    offsetX: VIEW_INSET + HANDLE_PADDING + (usable - roomPixelW) / 2,
    offsetY: VIEW_INSET + HANDLE_PADDING + (usable - roomPixelH) / 2,
    roomPixelW,
    roomPixelH,
    roomWidthM,
    roomHeightM,
  };
}

export function meterToSvg(transform: RoomTransform, xM: number, yM: number) {
  return {
    x: transform.offsetX + xM * transform.scale,
    y: transform.offsetY + yM * transform.scale,
  };
}

export function meterSizeToSvg(transform: RoomTransform, sizeM: number) {
  return sizeM * transform.scale;
}

export function svgToMeter(transform: RoomTransform, svgX: number, svgY: number) {
  return {
    xM: (svgX - transform.offsetX) / transform.scale,
    yM: (svgY - transform.offsetY) / transform.scale,
  };
}

export function getRoomCenterSvg(transform: RoomTransform) {
  return meterToSvg(transform, transform.roomWidthM / 2, transform.roomHeightM / 2);
}

export function rotateSvgPoint(x: number, y: number, cx: number, cy: number, deg: number) {
  if (deg === 0) return { x, y };
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export type ViewportTransform = {
  scale: number;
  panX: number;
  panY: number;
};

export const DEFAULT_VIEWPORT: ViewportTransform = {
  scale: 1,
  panX: 0,
  panY: 0,
};

const MIN_VIEWPORT_SCALE = 0.35;
const MAX_VIEWPORT_SCALE = 3.5;
const FOCUS_MAX_VIEWPORT_SCALE = 1.45;

export function fitViewportToBounds(bounds: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}): ViewportTransform {
  const contentW = Math.max(0.01, bounds.maxX - bounds.minX);
  const contentH = Math.max(0.01, bounds.maxY - bounds.minY);
  const padding = 1;
  const viewW = VIEW_SIZE - padding * 2;
  const viewH = VIEW_SIZE - padding * 2;
  const fitScale = Math.min(viewW / contentW, viewH / contentH, MAX_VIEWPORT_SCALE);
  const clampedScale = Math.max(MIN_VIEWPORT_SCALE, Math.min(1, fitScale));

  if (clampedScale >= 0.999) {
    return DEFAULT_VIEWPORT;
  }

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const viewCenter = VIEW_SIZE / 2;

  return {
    scale: clampedScale,
    panX: viewCenter - centerX * clampedScale,
    panY: viewCenter - centerY * clampedScale,
  };
}

export function mergeBounds(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
) {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function getElementBoundsSvg(
  transform: RoomTransform,
  element: { x_m: number; y_m: number; width_m: number; height_m: number; element_type: string },
  roomRotationDeg: number,
  padding = 1.2,
) {
  const pos = meterToSvg(transform, element.x_m, element.y_m);
  const w = meterSizeToSvg(transform, element.width_m);
  const h = meterSizeToSvg(transform, element.height_m);
  const center = getRoomCenterSvg(transform);
  const corners = [
    { x: pos.x, y: pos.y },
    { x: pos.x + w, y: pos.y },
    { x: pos.x + w, y: pos.y + h },
    { x: pos.x, y: pos.y + h },
  ].map((point) => rotateSvgPoint(point.x, point.y, center.x, center.y, roomRotationDeg));

  return {
    minX: Math.min(...corners.map((point) => point.x)) - padding,
    minY: Math.min(...corners.map((point) => point.y)) - padding,
    maxX: Math.max(...corners.map((point) => point.x)) + padding,
    maxY: Math.max(...corners.map((point) => point.y)) + padding,
  };
}

export function focusViewportOnBounds(bounds: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}): ViewportTransform {
  const contentW = Math.max(0.01, bounds.maxX - bounds.minX);
  const contentH = Math.max(0.01, bounds.maxY - bounds.minY);
  const padding = 10;
  const viewW = VIEW_SIZE - padding * 2;
  const viewH = VIEW_SIZE - padding * 2;
  const fitScale = Math.min(viewW / contentW, viewH / contentH);
  const targetScale = Math.min(
    FOCUS_MAX_VIEWPORT_SCALE,
    Math.max(MIN_VIEWPORT_SCALE, fitScale * 0.52),
  );
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const viewCenter = VIEW_SIZE / 2;

  return {
    scale: targetScale,
    panX: viewCenter - centerX * targetScale,
    panY: viewCenter - centerY * targetScale,
  };
}

export function lerpViewport(
  from: ViewportTransform,
  to: ViewportTransform,
  progress: number,
): ViewportTransform {
  const t = Math.min(1, Math.max(0, progress));
  return {
    scale: from.scale + (to.scale - from.scale) * t,
    panX: from.panX + (to.panX - from.panX) * t,
    panY: from.panY + (to.panY - from.panY) * t,
  };
}

export function easeOutCubic(progress: number) {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - (1 - t) ** 3;
}

export function getRotatedRoomBounds(
  transform: RoomTransform,
  rotationDeg: number,
  padding = HANDLE_PADDING + 1.2,
) {
  const corners = [
    { x: transform.offsetX, y: transform.offsetY },
    { x: transform.offsetX + transform.roomPixelW, y: transform.offsetY },
    { x: transform.offsetX + transform.roomPixelW, y: transform.offsetY + transform.roomPixelH },
    { x: transform.offsetX, y: transform.offsetY + transform.roomPixelH },
  ];
  const center = getRoomCenterSvg(transform);
  const rotated = corners.map((point) =>
    rotateSvgPoint(point.x, point.y, center.x, center.y, rotationDeg),
  );
  const xs = rotated.map((point) => point.x);
  const ys = rotated.map((point) => point.y);

  return {
    minX: Math.min(...xs) - padding,
    minY: Math.min(...ys) - padding,
    maxX: Math.max(...xs) + padding,
    maxY: Math.max(...ys) + padding,
  };
}

export function fitViewportToRoom(
  roomWidthM: number,
  roomHeightM: number,
  rotationDeg = 0,
): ViewportTransform {
  const transform = getRoomTransform(roomWidthM, roomHeightM, rotationDeg);
  return fitViewportToBounds(getRotatedRoomBounds(transform, rotationDeg));
}

export function isViewportDeviatedFrom(
  current: ViewportTransform,
  baseline: ViewportTransform,
) {
  return (
    Math.abs(current.scale - baseline.scale) > 0.015 ||
    Math.abs(current.panX - baseline.panX) > 0.25 ||
    Math.abs(current.panY - baseline.panY) > 0.25
  );
}

export function clientToContentSvg(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport: ViewportTransform,
) {
  const screen = clientToSvg(clientX, clientY, rect);
  return {
    x: (screen.x - viewport.panX) / viewport.scale,
    y: (screen.y - viewport.panY) / viewport.scale,
  };
}

export function zoomViewportToScale(
  viewport: ViewportTransform,
  screenX: number,
  screenY: number,
  nextScale: number,
) {
  const contentX = (screenX - viewport.panX) / viewport.scale;
  const contentY = (screenY - viewport.panY) / viewport.scale;
  const scale = Math.min(MAX_VIEWPORT_SCALE, Math.max(MIN_VIEWPORT_SCALE, nextScale));

  return {
    scale,
    panX: screenX - contentX * scale,
    panY: screenY - contentY * scale,
  };
}

export function zoomViewportAtPoint(
  viewport: ViewportTransform,
  screenX: number,
  screenY: number,
  factor: number,
) {
  return zoomViewportToScale(viewport, screenX, screenY, viewport.scale * factor);
}

export function viewportTransformAttr(viewport: ViewportTransform) {
  if (viewport.scale === 1 && viewport.panX === 0 && viewport.panY === 0) return undefined;
  return `translate(${viewport.panX} ${viewport.panY}) scale(${viewport.scale})`;
}

export function clientToSvg(clientX: number, clientY: number, rect: DOMRect) {
  return {
    x: ((clientX - rect.left) / rect.width) * VIEW_SIZE,
    y: ((clientY - rect.top) / rect.height) * VIEW_SIZE,
  };
}

export function clientToMeter(
  transform: RoomTransform,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  rotationDeg = 0,
  viewport: ViewportTransform = DEFAULT_VIEWPORT,
) {
  const svg = clientToContentSvg(clientX, clientY, rect, viewport);
  const center = getRoomCenterSvg(transform);
  const local = rotateSvgPoint(svg.x, svg.y, center.x, center.y, -rotationDeg);
  return svgToMeter(transform, local.x, local.y);
}

const CARDINAL_ROTATION_SNAPS = [0, 90, 180, 270];

export function snapRoomRotation(deg: number, thresholdDeg = 7) {
  const normalized = ((deg % 360) + 360) % 360;

  for (const snap of CARDINAL_ROTATION_SNAPS) {
    let diff = Math.abs(normalized - snap);
    if (diff > 180) diff = 360 - diff;
    if (diff <= thresholdDeg) return snap;
  }

  return deg;
}
