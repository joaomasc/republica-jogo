import { Compass, Maximize2, Minus, Plus } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Vector3 } from 'three';
import type { AtlasPin, AtlasPulse, AtlasRegion } from '../atlas/Atlas';
import { NO_INSETS, type Bounds, type Insets } from '../atlas/camera';
import { CONTEXT_LAND } from '../atlas/contextGeometry.generated';
import type { RegionPaint } from '../atlas/scales';
import { Icon } from '../icons';
import { AtlasScene, BASE_HEIGHT } from './scene';
import { webglAvailable } from './webgl';

export interface Atlas3DProps {
  regions: AtlasRegion[];
  world: Bounds;
  paint: Record<string, RegionPaint>;
  /** Altura de cada região (0..1): o valor do modo ativo vira relevo. */
  heights: Record<string, number>;
  values?: Record<string, string> | null;
  pins?: AtlasPin[];
  pulses?: AtlasPulse[];
  selected?: string | null;
  marked?: readonly string[] | null;
  focus?: readonly string[] | null;
  flyTo?: string | null;
  insets?: Insets;
  context?: boolean;
  onSelect?: (id: string) => void;
  renderTooltip?: (id: string) => ReactNode;
  /** Sem WebGL (ou se a cena falhar): quem usa volta para o mapa 2D. */
  onUnavailable?: () => void;
  ariaLabel?: string;
}

const NO_PINS: AtlasPin[] = [];
const NO_PULSES: AtlasPulse[] = [];

/**
 * Mapa 3D (three.js): cada região é um prisma cuja altura é o valor do modo ativo. Arrastar move,
 * botão direito (ou Ctrl+arrastar) gira e inclina, roda aproxima. Rótulos em HTML acompanham a
 * câmera e são focáveis por teclado (Enter abre a região), como no mapa 2D.
 */
export default function Atlas3D({
  regions,
  world,
  paint,
  heights,
  values = null,
  pins = NO_PINS,
  pulses = NO_PULSES,
  selected = null,
  marked = null,
  focus = null,
  flyTo = null,
  insets = NO_INSETS,
  context = true,
  onSelect,
  renderTooltip,
  onUnavailable,
  ariaLabel = 'Mapa 3D',
}: Atlas3DProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AtlasScene | null>(null);
  const onSelectRef = useRef(onSelect);
  const mouse = useRef<[number, number]>([0, 0]);
  const [hover, setHover] = useState<string | null>(null);
  const insetsRef = useRef(insets);
  const flyRef = useRef(flyTo);
  useLayoutEffect(() => {
    onSelectRef.current = onSelect;
    insetsRef.current = insets;
    flyRef.current = flyTo;
  });

  // --- Cena (uma por montagem) ----------------------------------------------------------------
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!webglAvailable()) {
      onUnavailable?.();
      return;
    }
    let scene: AtlasScene | null = null;
    const v = new Vector3();
    // Rótulos e marcadores seguem a câmera (só quando um quadro novo é desenhado).
    const placeOverlay = () => {
      const layer = labelsRef.current;
      if (!layer || !scene) return;
      for (const el of layer.querySelectorAll<HTMLElement>('[data-anchor]')) {
        const kind = el.dataset.anchor;
        const ok =
          kind === 'region'
            ? scene.project(el.dataset.id!, v)
            : scene.projectPoint(
                Number(el.dataset.wx),
                Number(el.dataset.wy),
                el.dataset.region
                  ? scene.regionHeight(el.dataset.region)
                  : Number(el.dataset.z ?? 3),
                v,
              );
        if (!ok) {
          el.style.visibility = 'hidden';
          continue;
        }
        el.style.visibility = '';
        el.style.transform = `translate(${v.x.toFixed(1)}px, ${v.y.toFixed(1)}px)`;
      }
      if (compassRef.current)
        compassRef.current.style.transform = `rotate(${((scene.azimuth() * 180) / Math.PI).toFixed(1)}deg)`;
    };
    try {
      scene = new AtlasScene(
        root,
        world,
        { onHover: setHover, onClick: (id) => onSelectRef.current?.(id), onFrame: placeOverlay },
        context,
      );
    } catch {
      onUnavailable?.();
      return;
    }
    const s3 = scene;
    sceneRef.current = s3;
    const measure = () => {
      const r = root.getBoundingClientRect();
      if (r.width && r.height) s3.resize(r.width, r.height);
    };
    measure();
    s3.setInsets(insetsRef.current);
    s3.home(false);
    const ro = new ResizeObserver(() => {
      measure();
      if (!s3.userMoved) s3.home(false);
    });
    ro.observe(root);
    return () => {
      ro.disconnect();
      s3.dispose();
      sceneRef.current = null;
    };
    // Uma cena por mapa: troca de geometria/dados entra pelos efeitos abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, context]);

  // A cena nasce no efeito de layout acima, que roda antes destes: na montagem ela já existe.
  // (Quem usa remonta o componente — `key` — se o mundo mudar.)
  // --- Geometria, dados e realces ---------------------------------------------------------------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setRegions(regions, context);
    for (const r of regions) scene.setAnchor(r.id, r.centroid[0], r.centroid[1]);
  }, [regions, context]);

  useEffect(() => {
    sceneRef.current?.setData(paint, heights);
  }, [regions, paint, heights]);

  const markedKey = marked?.join(',') ?? '';
  const focusKey = focus?.join(',') ?? '';
  useEffect(() => {
    sceneRef.current?.setHighlight({
      hover,
      selected,
      marked: markedKey ? markedKey.split(',') : [],
      focus: focusKey ? focusKey.split(',') : null,
    });
  }, [regions, hover, selected, markedKey, focusKey]);

  const pulseKey = pulses.map((p) => p.key).join('|');
  useEffect(() => {
    if (pulses.length) sceneRef.current?.pulse(pulses);
    // Só quando chegam pulsos novos (a chave muda a cada mês).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseKey]);

  // --- Câmera: painel abriu/fechou, região escolhida ---------------------------------------------
  const insetsKey = `${insets.top},${insets.right},${insets.bottom},${insets.left}`;
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setInsets(insetsRef.current);
    if (scene.userMoved) return;
    if (flyRef.current) scene.focusRegion(flyRef.current);
    else scene.home();
  }, [insetsKey]);

  useEffect(() => {
    if (flyTo) sceneRef.current?.focusRegion(flyTo);
  }, [flyTo]);

  // --- Dica que segue o mouse ----------------------------------------------------------------
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    const [x, y] = mouse.current;
    const r = root.getBoundingClientRect();
    const flipX = x > r.width - 300;
    const flipY = y > r.height - 170;
    el.style.left = `${flipX ? x - 16 : x + 16}px`;
    el.style.top = `${flipY ? y - 16 : y + 16}px`;
    el.style.transform = `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`;
  });

  const labelled = useMemo(() => regions, [regions]);
  const badges = useMemo(() => pins.filter((p) => p.kind === 'badge'), [pins]);
  const tooltip = hover ? renderTooltip?.(hover) : null;

  return (
    <div
      ref={rootRef}
      className="atlas3d"
      role="group"
      aria-label={ariaLabel}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mouse.current = [e.clientX - r.left, e.clientY - r.top];
        const el = tooltipRef.current;
        if (el) {
          const [x, y] = mouse.current;
          const flipX = x > r.width - 300;
          const flipY = y > r.height - 170;
          el.style.left = `${flipX ? x - 16 : x + 16}px`;
          el.style.top = `${flipY ? y - 16 : y + 16}px`;
          el.style.transform = `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`;
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={labelsRef} className="atlas3d-overlay" aria-hidden={false}>
        {context &&
          CONTEXT_LAND.filter((c) => c.label && c.id !== 'GUF').map((c) => (
            <div
              key={c.id}
              data-anchor="point"
              data-wx={c.label![0]}
              data-wy={c.label![1]}
              data-z={3}
              className="atlas3d-anchor"
            >
              <span className="atlas3d-country">{c.name}</span>
            </div>
          ))}
        {labelled.map((r) => (
          <div key={r.id} data-anchor="region" data-id={r.id} className="atlas3d-anchor">
            <button
              type="button"
              className="atlas3d-label"
              aria-label={r.name}
              data-region={r.id}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                e.stopPropagation();
                onSelectRef.current?.(r.id);
              }}
            >
              <span className="atlas3d-short">{r.short}</span>
              {values?.[r.id] && <span className="atlas3d-value">{values[r.id]}</span>}
            </button>
          </div>
        ))}
        {badges.map((p) => (
          <div
            key={p.id}
            data-anchor="point"
            data-wx={p.x}
            data-wy={p.y}
            {...(p.regionId ? { 'data-region': p.regionId } : { 'data-z': BASE_HEIGHT })}
            className="atlas3d-anchor"
          >
            <span
              className={`atlas3d-badge atlas-tone-${p.tone ?? 'gold'}`}
              title={p.title}
              style={{ translate: `${p.offset?.[0] ?? 0}px ${(p.offset?.[1] ?? 0) - 6}px` }}
            >
              {p.icon && <Icon name={p.icon} size={12} strokeWidth={2.3} />}
              {p.count !== undefined && p.count > 1 && <b>{p.count > 9 ? '9+' : p.count}</b>}
            </span>
          </div>
        ))}
      </div>

      <div
        className="pointer-events-none absolute z-[2] flex flex-col items-start gap-2"
        style={{ left: insets.left + 14, top: insets.top + 12 }}
      >
        <div className="cartouche flex h-12 w-12 items-center justify-center rounded-full">
          <div ref={compassRef} className="text-gold-400">
            <Compass size={26} strokeWidth={1.6} />
          </div>
        </div>
        <div className="cartouche pointer-events-auto flex flex-col divide-y divide-gold-500/25 overflow-hidden rounded-[5px]">
          <button
            type="button"
            className="atlas-ctl"
            onClick={() => sceneRef.current?.zoom(1.6)}
            aria-label="Aproximar"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            className="atlas-ctl"
            onClick={() => sceneRef.current?.zoom(1 / 1.6)}
            aria-label="Afastar"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            className="atlas-ctl"
            onClick={() => sceneRef.current?.home()}
            aria-label="Enquadrar o mapa"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {tooltip && (
        <div
          ref={tooltipRef}
          className="tooltip-bubble pointer-events-none absolute z-20 w-max max-w-72 px-3 py-2 text-xs text-paper"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
