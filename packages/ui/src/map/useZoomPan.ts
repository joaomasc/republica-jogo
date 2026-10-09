import { useCallback, useRef, useState, type PointerEvent, type WheelEvent } from 'react';

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Zoom (roda do mouse / botões) e arrasto para um SVG controlado por viewBox. */
export function useZoomPan(base: ViewBox, minScale = 1, maxScale = 6) {
  const [view, setView] = useState<ViewBox>(base);
  const drag = useRef<{ x: number; y: number; view: ViewBox; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const clampView = useCallback(
    (v: ViewBox): ViewBox => {
      const w = Math.min(base.w / minScale, Math.max(base.w / maxScale, v.w));
      const h = (w / base.w) * base.h;
      const x = Math.min(base.x + base.w - w * 0.3, Math.max(base.x - w * 0.7, v.x));
      const y = Math.min(base.y + base.h - h * 0.3, Math.max(base.y - h * 0.7, v.y));
      return { x, y, w, h };
    },
    [base, minScale, maxScale],
  );

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setView((v) => {
        const px = cx ?? v.x + v.w / 2;
        const py = cy ?? v.y + v.h / 2;
        const w = v.w / factor;
        const h = v.h / factor;
        return clampView({ x: px - ((px - v.x) / v.w) * w, y: py - ((py - v.y) / v.h) * h, w, h });
      });
    },
    [clampView],
  );

  const toSvg = (clientX: number, clientY: number, v: ViewBox): [number, number] => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return [v.x + v.w / 2, v.y + v.h / 2];
    return [
      v.x + ((clientX - rect.left) / rect.width) * v.w,
      v.y + ((clientY - rect.top) / rect.height) * v.h,
    ];
  };

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    const [x, y] = toSvg(e.clientX, e.clientY, view);
    zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, x, y);
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = ((e.clientX - d.x) / rect.width) * d.view.w;
    const dy = ((e.clientY - d.y) / rect.height) * d.view.h;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
    if (d.moved) setView(clampView({ ...d.view, x: d.view.x - dx, y: d.view.y - dy }));
  };

  const onPointerUp = () => {
    setTimeout(() => {
      drag.current = null;
    }, 0);
  };

  /** True se o último gesto foi um arrasto (para não disparar clique). */
  const wasDrag = () => drag.current?.moved ?? false;

  return {
    view,
    svgRef,
    reset: () => setView(base),
    zoomIn: () => zoomAt(1.35),
    zoomOut: () => zoomAt(1 / 1.35),
    handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp },
    wasDrag,
    viewBoxAttr: `${view.x} ${view.y} ${view.w} ${view.h}`,
  };
}
