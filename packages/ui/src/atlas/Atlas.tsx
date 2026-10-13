import { Maximize2, Minus, Plus } from 'lucide-react';
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { Icon } from '../icons';
import { MAP_PROJECTION, projectLonLat } from '../map/brazilGeometry.generated';
import {
  clampCamera,
  easeInOutCubic,
  fitBounds,
  flightDuration,
  frameBounds,
  interpolateCamera,
  NO_INSETS,
  safeArea,
  sameCamera,
  zoomAround,
  type Bounds,
  type Camera,
  type Insets,
  type Size,
  type ZoomLimits,
} from './camera';
import { BRAZIL_OUTLINE, CONTEXT_LAND, LAKES, RIVERS } from './contextGeometry.generated';
import type { RegionPaint } from './scales';

export interface AtlasRegion {
  id: string;
  /** Nome por extenso (aparece com o mapa aproximado). */
  name: string;
  /** Sigla (aparece sempre). */
  short: string;
  d: string;
  centroid: readonly [number, number];
  bbox: Bounds;
  /** Deslocamento do rótulo (estados pequenos têm o nome escrito no mar). */
  labelOffset?: readonly [number, number];
}

export type AtlasTone = 'gold' | 'good' | 'bad' | 'warn' | 'info' | 'neutral';

/** Marcador preso a um ponto do mundo, desenhado em tamanho fixo de tela. */
export interface AtlasPin {
  id: string;
  /** Coordenadas do mundo. */
  x: number;
  y: number;
  kind: 'capital' | 'federal-capital' | 'badge';
  label?: string;
  icon?: string;
  tone?: AtlasTone;
  count?: number;
  /** Texto da dica. */
  title?: string;
  /** Região a abrir ao clicar (marcadores de dados). */
  regionId?: string;
  /** Deslocamento em pixels de tela (não muda com o zoom). */
  offset?: readonly [number, number];
  /** Só aparece a partir deste nível de aproximação (1 ou 2). */
  minLod?: 1 | 2;
}

/** Pulso de mudança numa região (o valor do modo ativo mudou de forma relevante). */
export interface AtlasPulse {
  id: string;
  tone: 'good' | 'bad';
  /** Chave única do pulso (muda a cada mês para reanimar). */
  key: string;
}

export interface AtlasProps {
  regions: AtlasRegion[];
  /** Retângulo de interesse (enquadrado no "Enquadrar"). */
  world: Bounds;
  paint: Record<string, RegionPaint>;
  /** Valores escritos sobre o mapa (`null` = desligado). */
  values?: Record<string, string> | null;
  pins?: AtlasPin[];
  pulses?: AtlasPulse[];
  selected?: string | null;
  /** Regiões marcadas por um painel que usa o mapa como seletor (onde construir, onde anunciar). */
  marked?: readonly string[] | null;
  /** Regiões em destaque; as demais ficam esmaecidas. */
  focus?: readonly string[] | null;
  /** Região para onde a câmera voa (muda → voo). */
  flyTo?: string | null;
  /** Pixels cobertos pela interface; a câmera enquadra o resto. */
  insets?: Insets;
  /** Desenha países vizinhos, rios e graticulado. */
  context?: boolean;
  onSelect?: (id: string) => void;
  renderTooltip?: (id: string) => ReactNode;
  ariaLabel?: string;
}

/** km por unidade do mundo (1° de latitude = 111,2 km). */
const KM_PER_UNIT = 111.2 / MAP_PROJECTION.scale;
const SCALE_STEPS = [50, 100, 200, 250, 500, 1000, 2000];

/** Linhas do graticulado (a cada 5°) e marcos (Equador, Trópico de Capricórnio). */
const GRATICULE = (() => {
  const lons: number[] = [];
  const lats: number[] = [];
  for (let lon = -85; lon <= -25; lon += 5) lons.push(lon);
  for (let lat = -40; lat <= 15; lat += 5) lats.push(lat);
  const [x0, y0] = projectLonLat(-86, 14);
  const [x1, y1] = projectLonLat(-24, -42);
  let d = '';
  for (const lon of lons) {
    const [x] = projectLonLat(lon, 0);
    d += `M${x.toFixed(1)} ${y0.toFixed(1)}V${y1.toFixed(1)}`;
  }
  for (const lat of lats) {
    if (lat === 0) continue;
    const [, y] = projectLonLat(0, lat);
    d += `M${x0.toFixed(1)} ${y.toFixed(1)}H${x1.toFixed(1)}`;
  }
  const [, eq] = projectLonLat(0, 0);
  const [, tropic] = projectLonLat(0, -23.44);
  const labels: { id: string; x: number; y: number; text: string }[] = [];
  for (const lat of lats) {
    if (lat < -35 || lat > 10) continue;
    const [x, y] = projectLonLat(-29.2, lat);
    labels.push({
      id: `lat${lat}`,
      x,
      y,
      text: lat === 0 ? '0°' : `${Math.abs(lat)}° ${lat > 0 ? 'N' : 'S'}`,
    });
  }
  for (const lon of lons) {
    if (lon < -75 || lon > -35) continue;
    const [x, y] = projectLonLat(lon, -35.6);
    labels.push({ id: `lon${lon}`, x, y, text: `${Math.abs(lon)}° O` });
  }
  return {
    d,
    eq: `M${x0} ${eq}H${x1}`,
    tropic: `M${x0} ${tropic}H${x1}`,
    labels,
    extent: [x0, y0, x1, y1] as Bounds,
  };
})();

const SEA_LABELS = [
  { id: 'atl', at: projectLonLat(-29.5, -14), text: 'Oceano Atlântico' },
  { id: 'pac', at: projectLonLat(-81, -16), text: 'Oceano Pacífico' },
  { id: 'eq', at: projectLonLat(-34, 0.6), text: 'Equador' },
  { id: 'trop', at: projectLonLat(-35.5, -22.8), text: 'Trópico de Capricórnio' },
];

/** Países pequenos demais para o nome caber na visão geral. */
const SMALL_COUNTRIES = new Set(['GUF']);

function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return true;
  return (
    document.documentElement.classList.contains('reduce-motion') ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}

/** Posição do balão que segue o mouse, invertendo perto das bordas. */
function placeTooltip(el: HTMLElement, x: number, y: number, size: Size) {
  const flipX = x > size.width - 300;
  const flipY = y > size.height - 170;
  el.style.left = `${flipX ? x - 16 : x + 16}px`;
  el.style.top = `${flipY ? y - 16 : y + 16}px`;
  el.style.transform = `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`;
}

function regionFromEvent(e: SyntheticEvent): string | null {
  return (e.target as Element).closest<SVGElement>('[data-uf]')?.dataset.uf ?? null;
}

interface OverlayItem {
  el: SVGGElement;
  wx: number;
  wy: number;
  /** Deslocamento do rótulo em unidades do mundo NA VISÃO GERAL (vira pixels fixos com o zoom). */
  ox: number;
  oy: number;
  /** Largura do estado no mundo (rótulos somem quando o estado fica pequeno demais na tela). */
  minPx: number;
  span: number;
  shown: boolean;
}

/**
 * Mapa do Atlas: carta do Brasil em camadas (contexto sul-americano, preenchimento por dado, rios,
 * fronteiras, marcadores, rótulos), com câmera própria que respeita a área livre da interface.
 *
 * A câmera NÃO passa pelo React: gestos e voos escrevem o `transform` direto no SVG a cada quadro.
 * O React só renderiza quando os dados mudam.
 */
export function Atlas({
  regions,
  world,
  paint,
  values = null,
  pins = [],
  pulses = [],
  selected = null,
  marked = null,
  focus = null,
  flyTo = null,
  insets = NO_INSETS,
  context = true,
  onSelect,
  renderTooltip,
  ariaLabel = 'Mapa',
}: AtlasProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const overlayRef = useRef<SVGGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const scaleBarRef = useRef<HTMLDivElement>(null);
  const scaleLabelRef = useRef<HTMLSpanElement>(null);

  const cam = useRef<Camera>({ x: 0, y: 0, k: 1 });
  const size = useRef<Size>({ width: 0, height: 0 });
  const fitK = useRef(1);
  const userMoved = useRef(false);
  const lod = useRef(-1);
  const anim = useRef<number | null>(null);
  const items = useRef<OverlayItem[]>([]);
  const frame = useRef<number | null>(null);
  const movingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ x: number; y: number; cam: Camera; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cam: Camera } | null>(null);
  const suppressClick = useRef(false);
  const insetsRef = useRef(insets);
  const onSelectRef = useRef(onSelect);
  useLayoutEffect(() => {
    insetsRef.current = insets;
    onSelectRef.current = onSelect;
  });
  /** Seleção estável (o callback do pai muda a cada renderização dele). */
  const select = useCallback((id: string) => onSelectRef.current?.(id), []);

  const [hover, setHover] = useState<{ kind: 'region' | 'pin'; id: string } | null>(null);
  const mouse = useRef<[number, number]>([0, 0]);
  const [keyboardFocus, setKeyboardFocus] = useState<string | null>(null);

  const regionById = useMemo(() => new Map(regions.map((r) => [r.id, r])), [regions]);
  const pinById = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins]);
  /** Limites de pan: o Brasil com folga para ver os vizinhos. */
  const panBounds = useMemo<Bounds>(() => {
    const w = world[2] - world[0];
    const h = world[3] - world[1];
    return [world[0] - w * 0.35, world[1] - h * 0.25, world[2] + w * 0.35, world[3] + h * 0.25];
  }, [world]);

  const limits = useCallback(
    (): ZoomLimits => ({ minK: fitK.current * 0.55, maxK: fitK.current * 9 }),
    [],
  );

  // --- Aplicar a câmera (sem React) -----------------------------------------------------------
  const apply = useCallback((c: Camera) => {
    cam.current = c;
    worldRef.current?.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${c.k})`);
    const rel = c.k / fitK.current;
    const level = rel < 1.7 ? 0 : rel < 3.2 ? 1 : 2;
    if (level !== lod.current) {
      lod.current = level;
      rootRef.current?.setAttribute('data-lod', String(level));
    }
    for (const it of items.current) {
      const sx = it.wx * c.k + c.x + it.ox * fitK.current;
      const sy = it.wy * c.k + c.y + it.oy * fitK.current;
      it.el.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
      if (it.minPx > 0) {
        const show = it.span * c.k >= it.minPx;
        if (show !== it.shown) {
          it.shown = show;
          it.el.style.display = show ? '' : 'none';
        }
      }
    }
    // Barra de escala: a maior distância "redonda" que cabe em ~120 px.
    const pxPerKm = c.k / KM_PER_UNIT;
    const km = [...SCALE_STEPS].reverse().find((s) => s * pxPerKm <= 130) ?? SCALE_STEPS[0]!;
    if (scaleBarRef.current) scaleBarRef.current.style.width = `${Math.round(km * pxPerKm)}px`;
    if (scaleLabelRef.current)
      scaleLabelRef.current.textContent = `${km.toLocaleString('pt-BR')} km`;
  }, []);

  const scheduleApply = useCallback(
    (c: Camera) => {
      cam.current = c;
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        apply(cam.current);
      });
    },
    [apply],
  );

  /** Marca "em movimento" (desliga filtros e transições) até o gesto parar. */
  const markMoving = useCallback((ms = 160) => {
    rootRef.current?.classList.add('atlas-moving');
    if (movingTimer.current) clearTimeout(movingTimer.current);
    movingTimer.current = setTimeout(() => rootRef.current?.classList.remove('atlas-moving'), ms);
  }, []);

  const stopFlight = useCallback(() => {
    if (anim.current !== null) cancelAnimationFrame(anim.current);
    anim.current = null;
  }, []);

  const flyToCamera = useCallback(
    (target: Camera) => {
      stopFlight();
      const from = cam.current;
      const s = size.current;
      if (sameCamera(from, target)) return;
      if (prefersReducedMotion() || s.width === 0) {
        apply(target);
        return;
      }
      const duration = flightDuration(from, target, s);
      // O relógio começa no primeiro quadro desenhado: se um painel pesado montar junto,
      // o voo não "pula" o começo.
      let start = -1;
      rootRef.current?.classList.add('atlas-moving');
      const step = (now: number) => {
        if (start < 0) start = now;
        const t = Math.min(1, (now - start) / duration);
        apply(interpolateCamera(from, target, easeInOutCubic(t), s));
        if (t < 1) anim.current = requestAnimationFrame(step);
        else {
          anim.current = null;
          apply(target);
          markMoving(60);
        }
      };
      anim.current = requestAnimationFrame(step);
    },
    [apply, markMoving, stopFlight],
  );

  const worldCamera = useCallback(
    () => frameBounds(world, size.current, insetsRef.current),
    [world],
  );

  const regionCamera = useCallback(
    (id: string): Camera | null => {
      const r = regionById.get(id);
      if (!r) return null;
      // Nunca afasta além da visão geral; aproxima até ~3,4× para estados pequenos.
      return frameBounds(r.bbox, size.current, insetsRef.current, {
        padding: 70,
        minK: fitK.current,
        maxK: fitK.current * 3.4,
      });
    },
    [regionById],
  );

  // --- Itens do overlay (rótulos e marcadores): recoleta a cada renderização --------------------
  useLayoutEffect(() => {
    const root = overlayRef.current;
    if (!root) return;
    items.current = [...root.querySelectorAll<SVGGElement>('[data-wx]')].map((el) => ({
      el,
      wx: Number(el.dataset.wx),
      wy: Number(el.dataset.wy),
      ox: Number(el.dataset.ox ?? 0),
      oy: Number(el.dataset.oy ?? 0),
      minPx: Number(el.dataset.minpx ?? 0),
      span: Number(el.dataset.span ?? 0),
      shown: true,
    }));
    apply(cam.current);
  });

  // A dica nasce onde o mouse está (não no canto, esperando o próximo movimento).
  const hoverKey = hover ? `${hover.kind}:${hover.id}` : '';
  useLayoutEffect(() => {
    if (hoverKey && tooltipRef.current)
      placeTooltip(tooltipRef.current, mouse.current[0], mouse.current[1], size.current);
  }, [hoverKey]);

  // --- Tamanho do contêiner -------------------------------------------------------------------
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const first = size.current.width === 0;
      size.current = { width: rect.width, height: rect.height };
      fitK.current = fitBounds(world, size.current, NO_INSETS, 28).k;
      if (first || !userMoved.current) {
        const target = flyTo ? (regionCamera(flyTo) ?? worldCamera()) : worldCamera();
        stopFlight();
        apply(target);
      } else apply(clampCamera(cam.current, panBounds, size.current, limits()));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // Reenquadrar só por tamanho; voos por mudança de painel/região têm efeitos próprios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  // --- Painel abriu/fechou (área livre mudou): reenquadra se o jogador não mexeu na câmera ------
  const insetsKey = `${insets.top},${insets.right},${insets.bottom},${insets.left}`;
  const lastInsets = useRef(insetsKey);
  useEffect(() => {
    if (lastInsets.current === insetsKey) return;
    lastInsets.current = insetsKey;
    if (size.current.width === 0 || userMoved.current) return;
    flyToCamera(flyTo ? (regionCamera(flyTo) ?? worldCamera()) : worldCamera());
  }, [insetsKey, flyTo, flyToCamera, regionCamera, worldCamera]);

  // --- Voo até a região pedida -------------------------------------------------------------------
  const lastFly = useRef<string | null>(flyTo);
  useEffect(() => {
    if (lastFly.current === flyTo) return;
    lastFly.current = flyTo;
    if (!flyTo || size.current.width === 0) return;
    const target = regionCamera(flyTo);
    if (!target) return;
    userMoved.current = false;
    flyToCamera(target);
  }, [flyTo, flyToCamera, regionCamera]);

  // --- Gestos --------------------------------------------------------------------------------
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const local = (e: { clientX: number; clientY: number }): [number, number] => {
      const rect = svg.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopFlight();
      const [sx, sy] = local(e);
      const unit = e.deltaMode === 1 ? 0.05 : 0.0018;
      const factor = Math.exp(-e.deltaY * unit);
      userMoved.current = true;
      markMoving();
      scheduleApply(
        clampCamera(
          zoomAround(cam.current, factor, sx, sy, limits()),
          panBounds,
          size.current,
          limits(),
        ),
      );
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2 && pinch.current) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        const [mx, my] = local({ clientX: (a!.x + b!.x) / 2, clientY: (a!.y + b!.y) / 2 });
        markMoving();
        scheduleApply(
          clampCamera(
            zoomAround(pinch.current.cam, dist / Math.max(1, pinch.current.dist), mx, my, limits()),
            panBounds,
            size.current,
            limits(),
          ),
        );
        return;
      }
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) {
        d.moved = true;
        userMoved.current = true;
        rootRef.current?.classList.add('atlas-dragging');
      }
      if (d.moved) {
        markMoving();
        scheduleApply(
          clampCamera(
            { ...d.cam, x: d.cam.x + dx, y: d.cam.y + dy },
            panBounds,
            size.current,
            limits(),
          ),
        );
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      if (pointers.current.size === 0) {
        if (drag.current?.moved) {
          suppressClick.current = true;
          setTimeout(() => (suppressClick.current = false), 0);
        }
        drag.current = null;
        rootRef.current?.classList.remove('atlas-dragging');
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      stopFlight();
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinch.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), cam: cam.current };
        drag.current = null;
        userMoved.current = true;
        return;
      }
      drag.current = { x: e.clientX, y: e.clientY, cam: cam.current, moved: false };
    };
    const onDouble = (e: MouseEvent) => {
      const [sx, sy] = local(e);
      userMoved.current = true;
      flyToCamera(
        clampCamera(
          zoomAround(cam.current, 1.9, sx, sy, limits()),
          panBounds,
          size.current,
          limits(),
        ),
      );
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('dblclick', onDouble);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('dblclick', onDouble);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [flyToCamera, limits, markMoving, panBounds, scheduleApply, stopFlight]);

  useEffect(
    () => () => {
      stopFlight();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (movingTimer.current) clearTimeout(movingTimer.current);
    },
    [stopFlight],
  );

  const zoomBy = (factor: number) => {
    const s = size.current;
    const area = safeArea(s, insetsRef.current);
    userMoved.current = true;
    flyToCamera(
      clampCamera(
        zoomAround(
          cam.current,
          factor,
          area.x + area.width / 2,
          area.y + area.height / 2,
          limits(),
        ),
        panBounds,
        s,
        limits(),
      ),
    );
  };
  const recenter = () => {
    userMoved.current = false;
    flyToCamera(worldCamera());
  };

  // --- Dica que segue o mouse (posição sem React) ----------------------------------------------
  const onPointerMoveTooltip = (e: ReactPointerEvent) => {
    const el = tooltipRef.current;
    const svg = svgRef.current;
    if (!svg) return;
    if (!el) {
      const rect = svg.getBoundingClientRect();
      mouse.current = [e.clientX - rect.left, e.clientY - rect.top];
      return;
    }
    const rect = svg.getBoundingClientRect();
    mouse.current = [e.clientX - rect.left, e.clientY - rect.top];
    placeTooltip(el, mouse.current[0], mouse.current[1], size.current);
  };

  const tooltipContent =
    hover?.kind === 'region'
      ? renderTooltip?.(hover.id)
      : hover?.kind === 'pin'
        ? pinById.get(hover.id)?.title
        : null;

  const hatch = `${uid}-hatch`;
  const glow = `${uid}-glow`;
  const blur = `${uid}-blur`;
  // Camadas pesadas memoizadas: passar o mouse (hover) re-renderiza só os realces, não o mapa.
  const focusKey = focus ? focus.join(',') : '';
  const defsLayer = useMemo(
    () => (
      <defs>
        <pattern
          id={hatch}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="7" height="7" fill="#22323a" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="7"
            stroke="#5b7076"
            strokeWidth="2.2"
            strokeOpacity="0.55"
          />
        </pattern>
        <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={blur} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {/* Geometria única das regiões, reaproveitada por <use>. O vector-effect fica aqui: no <use> ele não chega ao clone. */}
        {regions.map((r) => (
          <path key={r.id} id={`${uid}-r-${r.id}`} d={r.d} vectorEffect="non-scaling-stroke" />
        ))}
      </defs>
    ),
    [uid, regions, hatch, glow, blur],
  );
  const worldLayers = useMemo(
    () => (
      <>
        {context && (
          <g className="atlas-context" pointerEvents="none">
            <path className="atlas-graticule" d={GRATICULE.d} vectorEffect="non-scaling-stroke" />
            <path
              className="atlas-graticule-mark"
              d={GRATICULE.eq}
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="atlas-graticule-mark atlas-dashed"
              d={GRATICULE.tropic}
              vectorEffect="non-scaling-stroke"
            />
            {CONTEXT_LAND.map((c) => (
              <path
                key={c.id}
                className="atlas-neighbor"
                d={c.d}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path className="atlas-neighbor-base" d={BRAZIL_OUTLINE} />
          </g>
        )}

        {/* Sombra da costa e contorno nacional (traço por baixo do preenchimento: só a metade de fora aparece). */}
        <g pointerEvents="none">
          <g className="atlas-shadow" filter={`url(#${blur})`} transform="translate(0 6)">
            {regions.map((r) => (
              <use key={r.id} href={`#${uid}-r-${r.id}`} />
            ))}
          </g>
          <g className="atlas-nation-outer">
            {regions.map((r) => (
              <use key={r.id} href={`#${uid}-r-${r.id}`} />
            ))}
          </g>
          <g className="atlas-nation-inner">
            {regions.map((r) => (
              <use key={r.id} href={`#${uid}-r-${r.id}`} />
            ))}
          </g>
          <g className="atlas-land-base">
            {regions.map((r) => (
              <use key={r.id} href={`#${uid}-r-${r.id}`} />
            ))}
          </g>
        </g>

        {/* Regiões interativas */}
        <g
          className="atlas-regions"
          onPointerOver={(e) => {
            const id = regionFromEvent(e);
            if (id) setHover({ kind: 'region', id });
          }}
          onPointerOut={(e) => {
            if (!(e.relatedTarget as Element | null)?.closest?.('[data-uf]')) setHover(null);
          }}
          onClick={(e) => {
            if (suppressClick.current) return;
            const id = regionFromEvent(e);
            if (id) select(id);
          }}
        >
          {regions.map((r) => {
            const p = paint[r.id];
            return (
              <path
                key={r.id}
                d={r.d}
                data-uf={r.id}
                className="atlas-region"
                fill={p?.fill ?? '#2a3a40'}
                fillOpacity={p?.opacity ?? 1}
                tabIndex={0}
                role="button"
                aria-label={r.name}
                aria-pressed={selected === r.id}
                onFocus={(e) =>
                  setKeyboardFocus(e.currentTarget.matches(':focus-visible') ? r.id : null)
                }
                onBlur={() => setKeyboardFocus(null)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  // Não deixa o Espaço chegar ao atalho global de pausa.
                  e.preventDefault();
                  e.stopPropagation();
                  select(r.id);
                }}
              />
            );
          })}
        </g>

        <g pointerEvents="none">
          {regions
            .filter((r) => paint[r.id]?.noData)
            .map((r) => (
              <use key={r.id} href={`#${uid}-r-${r.id}`} fill={`url(#${hatch})`} />
            ))}
        </g>

        {context && (
          <g className="atlas-water" pointerEvents="none">
            {RIVERS.map((r, i) => (
              <path
                key={`${r.name}-${i}`}
                d={r.d}
                className={`atlas-river atlas-river-${Math.min(6, Math.max(1, r.rank))}`}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {LAKES.map((l, i) => (
              <path
                key={`${l.name}-${i}`}
                d={l.d}
                className="atlas-lake"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        )}

        <g className="atlas-borders" pointerEvents="none">
          {regions.map((r) => (
            <use key={r.id} href={`#${uid}-r-${r.id}`} />
          ))}
        </g>

        {focusKey && (
          <g className="atlas-dim" pointerEvents="none">
            {regions
              .filter((r) => !focusKey.split(',').includes(r.id))
              .map((r) => (
                <use key={r.id} href={`#${uid}-r-${r.id}`} />
              ))}
          </g>
        )}
      </>
    ),
    [uid, regions, paint, selected, context, focusKey, hatch, blur, select],
  );
  const overlayLayers = useMemo(
    () => (
      <>
        {context && (
          <g pointerEvents="none">
            {GRATICULE.labels.map((l) => (
              <g key={l.id} data-wx={l.x} data-wy={l.y} className="atlas-lod-0-only">
                <text className="atlas-grid-label" textAnchor="middle" dominantBaseline="middle">
                  {l.text}
                </text>
              </g>
            ))}
            {SEA_LABELS.map((s) => (
              <g key={s.id} data-wx={s.at[0]} data-wy={s.at[1]}>
                <text
                  className={
                    s.id === 'atl' || s.id === 'pac' ? 'atlas-sea-label' : 'atlas-line-label'
                  }
                  textAnchor="middle"
                >
                  {s.text}
                </text>
              </g>
            ))}
            {CONTEXT_LAND.filter((c) => c.label).map((c) => (
              <g
                key={c.id}
                data-wx={c.label![0]}
                data-wy={c.label![1]}
                className={SMALL_COUNTRIES.has(c.id) ? 'atlas-lod-1' : undefined}
              >
                <text className="atlas-country-label" textAnchor="middle" dominantBaseline="middle">
                  {c.name}
                </text>
              </g>
            ))}
          </g>
        )}

        {pins
          .filter((p) => p.kind !== 'badge')
          .map((p) => (
            <g
              key={p.id}
              data-wx={p.x}
              data-wy={p.y}
              className={p.kind === 'capital' ? 'atlas-lod-1' : undefined}
              pointerEvents="none"
            >
              {p.kind === 'federal-capital' ? (
                <path
                  className="atlas-capital-star"
                  d="M0 -7.5L2.2 -2.3L7.6 -2.3L3.3 1L4.9 6.5L0 3.3L-4.9 6.5L-3.3 1L-7.6 -2.3L-2.2 -2.3Z"
                />
              ) : (
                <circle r={2.6} className="atlas-capital-dot" />
              )}
              {p.label && (
                <text
                  className={`atlas-capital-label ${p.kind === 'federal-capital' ? 'atlas-lod-1' : 'atlas-lod-2'}`}
                  x={p.kind === 'federal-capital' ? 0 : 6}
                  y={p.kind === 'federal-capital' ? 18 : 3.5}
                  textAnchor={p.kind === 'federal-capital' ? 'middle' : 'start'}
                >
                  {p.label}
                </text>
              )}
            </g>
          ))}

        <g pointerEvents="none">
          {regions.map((r) => {
            const [ox, oy] = r.labelOffset ?? [0, 0];
            const value = values?.[r.id];
            const span = Math.min(r.bbox[2] - r.bbox[0], r.bbox[3] - r.bbox[1]);
            return (
              <Fragment key={r.id}>
                <g
                  data-wx={r.centroid[0]}
                  data-wy={r.centroid[1]}
                  data-ox={ox}
                  data-oy={oy}
                  className="atlas-region-label atlas-hide-lod-2"
                >
                  <text className="atlas-state-short" textAnchor="middle" dominantBaseline="middle">
                    {r.short}
                  </text>
                </g>
                <g
                  data-wx={r.centroid[0]}
                  data-wy={r.centroid[1]}
                  data-ox={ox}
                  data-oy={oy}
                  data-minpx={110}
                  data-span={r.bbox[2] - r.bbox[0]}
                  className="atlas-region-label atlas-lod-2"
                >
                  <text className="atlas-state-name" textAnchor="middle" dominantBaseline="middle">
                    {r.name}
                  </text>
                </g>
                {value && (
                  <g
                    data-wx={r.centroid[0]}
                    data-wy={r.centroid[1]}
                    data-ox={ox}
                    data-oy={oy}
                    data-minpx={34}
                    data-span={span}
                    className="atlas-value"
                  >
                    <text textAnchor="middle" y={15}>
                      {value}
                    </text>
                  </g>
                )}
              </Fragment>
            );
          })}
        </g>

        {pins
          .filter((p) => p.kind === 'badge')
          .map((p) => (
            <g
              key={p.id}
              data-wx={p.x}
              data-wy={p.y}
              className={`atlas-badge atlas-tone-${p.tone ?? 'gold'}${p.minLod ? ` atlas-lod-${p.minLod}` : ''}`}
              role={p.regionId ? 'button' : undefined}
              aria-label={p.title}
              onPointerEnter={() => setHover({ kind: 'pin', id: p.id })}
              onPointerLeave={() => setHover(null)}
              onClick={() => {
                if (!suppressClick.current && p.regionId) select(p.regionId);
              }}
            >
              <g transform={`translate(${p.offset?.[0] ?? 0} ${p.offset?.[1] ?? 0})`}>
                <circle r={10.5} className="atlas-badge-disc" />
                {p.icon && (
                  <g transform="translate(-6.5 -6.5)">
                    <Icon name={p.icon} size={13} strokeWidth={2.3} />
                  </g>
                )}
                {p.count !== undefined && p.count > 1 && (
                  <g transform="translate(9 -8)">
                    <circle r={6.5} className="atlas-badge-count" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="atlas-badge-count-text"
                    >
                      {p.count > 9 ? '9+' : p.count}
                    </text>
                  </g>
                )}
              </g>
            </g>
          ))}
      </>
    ),
    [context, pins, regions, values, select],
  );

  return (
    <div ref={rootRef} className="atlas" data-lod="0" onPointerLeave={() => setHover(null)}>
      <svg
        ref={svgRef}
        className="atlas-svg"
        role="group"
        aria-label={ariaLabel}
        onPointerMove={onPointerMoveTooltip}
      >
        {defsLayer}

        <g ref={worldRef}>
          {worldLayers}

          <g pointerEvents="none">
            {pulses.map((p) =>
              regionById.has(p.id) ? (
                <use
                  key={p.key}
                  href={`#${uid}-r-${p.id}`}
                  className={`atlas-pulse atlas-pulse-${p.tone}`}
                />
              ) : null,
            )}
            {[hover?.kind === 'region' ? hover.id : null, keyboardFocus].map(
              (id, i) =>
                id &&
                id !== selected &&
                regionById.has(id) && (
                  <use key={i} href={`#${uid}-r-${id}`} className="atlas-hover" />
                ),
            )}
            {marked?.map((id) =>
              regionById.has(id) ? (
                <use key={`m-${id}`} href={`#${uid}-r-${id}`} className="atlas-marked" />
              ) : null,
            )}
            {selected && regionById.has(selected) && (
              <use
                href={`#${uid}-r-${selected}`}
                className="atlas-selected"
                filter={`url(#${glow})`}
              />
            )}
          </g>
        </g>

        {/* Overlay em pixels de tela: rótulos e marcadores (posicionados pela câmera). */}
        <g ref={overlayRef} className="atlas-overlay">
          {overlayLayers}
        </g>
      </svg>

      {/* Moldura: rosa dos ventos, escala e controles, dentro da área livre. */}
      <div
        className="atlas-frame pointer-events-none absolute flex flex-col items-start gap-2"
        style={{ left: insets.left + 14, top: insets.top + 12 }}
      >
        <CompassRose />
        <div className="atlas-scale cartouche rounded-[4px] px-2 py-1">
          <div ref={scaleBarRef} className="atlas-scale-bar" />
          <span ref={scaleLabelRef} className="atlas-scale-label" />
        </div>
        <div className="cartouche pointer-events-auto flex flex-col divide-y divide-gold-500/25 overflow-hidden rounded-[5px]">
          <button
            type="button"
            className="atlas-ctl"
            onClick={() => zoomBy(1.6)}
            aria-label="Aproximar"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            className="atlas-ctl"
            onClick={() => zoomBy(1 / 1.6)}
            aria-label="Afastar"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            className="atlas-ctl"
            onClick={recenter}
            aria-label="Enquadrar o mapa"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {hover && tooltipContent && (
        <div
          ref={tooltipRef}
          className="tooltip-bubble pointer-events-none absolute z-20 w-max max-w-72 px-3 py-2 text-xs text-paper"
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
}

/** Rosa dos ventos da moldura. */
function CompassRose() {
  return (
    <svg viewBox="-50 -50 100 100" width={64} height={64} aria-hidden className="opacity-70">
      <circle r="44" fill="none" stroke="#c7a047" strokeOpacity="0.45" strokeWidth="1" />
      <circle r="38" fill="none" stroke="#c7a047" strokeOpacity="0.25" strokeWidth="0.8" />
      {Array.from({ length: 32 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2;
        const r0 = i % 4 === 0 ? 34 : 39;
        return (
          <line
            key={i}
            x1={Math.cos(a) * r0}
            y1={Math.sin(a) * r0}
            x2={Math.cos(a) * 44}
            y2={Math.sin(a) * 44}
            stroke="#c7a047"
            strokeOpacity="0.4"
            strokeWidth="0.8"
          />
        );
      })}
      {[0, 90, 180, 270].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M0 -40 L6 -6 L0 0 Z" fill="#e3c372" />
          <path d="M0 -40 L-6 -6 L0 0 Z" fill="#8f6f2b" />
        </g>
      ))}
      {[45, 135, 225, 315].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M0 -24 L4 -4 L0 0 Z" fill="#c9d8d4" fillOpacity="0.7" />
          <path d="M0 -24 L-4 -4 L0 0 Z" fill="#5b7c80" fillOpacity="0.7" />
        </g>
      ))}
      <circle r="3" fill="#0b1a22" stroke="#e3c372" strokeWidth="1" />
      <text
        y="-46"
        textAnchor="middle"
        fontSize="9"
        fill="#e3c372"
        fontWeight="700"
        className="font-display"
      >
        N
      </text>
    </svg>
  );
}
