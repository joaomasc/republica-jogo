import {
  AXIS_DEFINITIONS,
  IDEOLOGY_AXES,
  mapUnits,
  STATES,
  type IdeologyAxis,
  type StateId,
} from '@republica/game-engine';
import { cn, Icon, Tooltip } from '@republica/ui';
import { useMemo } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { useGameState } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { useActiveLayer, type ActiveLayer } from './useActiveLayer';

function regionName(id: string, names: Record<string, string>): string {
  return names[id] ?? STATES[id as StateId]?.name ?? id;
}

/** Botão de opção da legenda (liga/desliga). */
function Toggle({
  icon,
  label,
  on,
  onClick,
  testId,
}: {
  icon: string;
  label: string;
  on: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        aria-label={label}
        data-testid={testId}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-[3px] border transition',
          on
            ? 'border-gold-400/70 bg-ink-700 text-gold-300'
            : 'border-transparent text-muted hover:border-gold-500/35 hover:text-paper',
        )}
      >
        <Icon name={icon} size={13} />
      </button>
    </Tooltip>
  );
}

/** Ranking: todas as regiões, da maior para a menor leitura no modo ativo. */
function Ranking({
  active,
  names,
  selected,
  onSelect,
}: {
  active: ActiveLayer;
  names: Record<string, string>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const rows = Object.entries(active.layer.cells)
    .filter(([, c]) => Number.isFinite(c.value))
    .map(([id, c]) => ({
      id,
      cell: c,
      sort: active.layer.scale === 'categorical' ? (c.strength ?? c.value) : c.value,
    }))
    .sort((a, b) => b.sort - a.sort);
  return (
    <ol className="mt-2 max-h-48 space-y-px overflow-y-auto pr-1" data-testid="map-ranking">
      {rows.map((r, i) => {
        const paint = active.scale.paint[r.id];
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-[3px] px-1.5 py-[3px] text-left text-[11.5px] transition hover:bg-ink-700/80',
                selected === r.id && 'bg-ink-700 ring-1 ring-gold-500/50',
              )}
            >
              <span className="w-5 shrink-0 text-right tabular-nums text-muted">{i + 1}</span>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[2px] ring-1 ring-black/50"
                style={{ background: paint?.fill, opacity: paint?.opacity ?? 1 }}
              />
              <span className="min-w-0 flex-1 truncate text-paper/90">
                {regionName(r.id, names)}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-paper">
                {r.cell.short ?? ''}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Faixa contínua com um traço por região na posição dela, e os extremos reais nas pontas. */
function ContinuousScale({
  active,
  names,
  selected,
}: {
  active: ActiveLayer;
  names: Record<string, string>;
  selected: string | null;
}) {
  const { scale, layer } = active;
  const domain = scale.domain;
  const minCell = domain ? layer.cells[domain.minId] : undefined;
  const maxCell = domain ? layer.cells[domain.maxId] : undefined;
  const real = domain && domain.stretched && minCell?.short && maxCell?.short;
  return (
    <div className="mt-2">
      <div className="relative h-3.5">
        {Object.entries(scale.position).map(([id, t]) => (
          <span
            key={id}
            className="absolute bottom-0 flex"
            style={{ left: `calc(${(t * 100).toFixed(2)}% - 1px)` }}
          >
            <Tooltip
              content={`${regionName(id, names)}: ${layer.cells[id]?.short ?? layer.cells[id]?.label ?? ''}`}
            >
              <span
                className={cn(
                  'block w-[2px] rounded-t-[1px]',
                  id === selected ? 'h-3.5 bg-gold-300' : 'h-2 bg-paper/55',
                )}
              />
            </Tooltip>
          </span>
        ))}
      </div>
      <div
        className="h-2 rounded-[2px] ring-1 ring-black/50"
        style={{ background: scale.gradient }}
      />
      <div className="mt-1 flex items-baseline justify-between gap-2 text-[10.5px] text-muted">
        {real ? (
          <>
            <span className="truncate">
              <b className="tabular-nums text-paper">{minCell.short}</b> {domain.minId}
            </span>
            <span className="shrink-0 italic">escala relativa</span>
            <span className="truncate text-right">
              {domain.maxId} <b className="tabular-nums text-paper">{maxCell.short}</b>
            </span>
          </>
        ) : (
          <>
            <span className="truncate">{layer.legend.low}</span>
            <span className="truncate text-right">{layer.legend.high}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Categorias (partido que lidera/governa): cor, sigla e quantas regiões. */
function CategoricalScale({ active }: { active: ActiveLayer }) {
  const groups = new Map<string, { color: string; label: string; n: number }>();
  for (const cell of Object.values(active.layer.cells)) {
    if (!cell.color) continue;
    const label = cell.leaderName || cell.short || '—';
    const g = groups.get(label) ?? { color: cell.color, label, n: 0 };
    g.n += 1;
    groups.set(label, g);
  }
  const list = [...groups.values()].sort((a, b) => b.n - a.n);
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1">
        {list.slice(0, 8).map((g) => (
          <span
            key={g.label}
            className="flex items-center gap-1 rounded-[3px] bg-ink-950/60 px-1.5 py-0.5 text-[10.5px] text-paper/90 ring-1 ring-white/5"
          >
            <span
              className="h-2 w-2 rounded-full ring-1 ring-black/60"
              style={{ background: g.color }}
            />
            <span className="max-w-24 truncate">{g.label}</span>
            <span className="tabular-nums text-muted">{g.n}</span>
          </span>
        ))}
        {list.length > 8 && (
          <span className="px-1 text-[10.5px] text-muted">+{list.length - 8}</span>
        )}
      </div>
      <div className="mt-1 text-[10.5px] text-muted">
        {active.layer.legend.low} · {active.layer.legend.high}
      </div>
    </div>
  );
}

/**
 * Legenda do mapa no bloco da direita (acima do tempo): sempre visível, abra o painel que for.
 * Mostra o que o mapa pinta, a escala com os valores reais, as opções de leitura e o ranking.
 * O cabeçalho recolhe/expande os detalhes.
 */
export function MapLegendHud({ dense = false }: { dense?: boolean }) {
  const game = useGameState();
  const active = useActiveLayer();
  const navigate = useNavigate();
  const match = useMatch('/jogo/regiao/:unitId');
  const selected = match?.params.unitId ?? null;
  const setMapPartyId = useUi((s) => s.setMapPartyId);
  const setMapAxis = useUi((s) => s.setMapAxis);
  const setMapFocus = useUi((s) => s.setMapFocus);
  const selectUnit = useUi((s) => s.selectUnit);
  const toggle = useUi((s) => s.toggleMapOption);
  const numbers = useUi((s) => s.mapNumbers);
  const markers = useUi((s) => s.mapMarkers);
  const auto = useUi((s) => s.mapAuto);
  const ranking = useUi((s) => s.mapRanking);
  const open = useUi((s) => s.mapLegendOpen);
  const names = useMemo(
    () => Object.fromEntries(mapUnits(game).map((u) => [u.id, u.name])),
    [game],
  );
  const { layer, focus } = active;
  const onSelect = (id: string) => {
    selectUnit(id);
    navigate(`/jogo/regiao/${id}`);
  };

  return (
    <div
      className="hud-surface pointer-events-auto rounded-[6px] px-3 py-2"
      data-testid="map-legend"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggle('mapLegendOpen')}
          aria-expanded={open}
          aria-label={`Legenda do mapa: ${focus ? layer.title : active.label}`}
          className="group flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Icon name={active.icon} size={15} className="shrink-0 text-gold-400" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[13px] font-semibold tracking-[0.04em] text-paper group-hover:text-gold-300">
              {focus ? layer.title : active.label}
            </span>
            {!dense && (
              <span className="block truncate text-[11px] text-muted">
                {focus ? 'Pedido pelo painel aberto' : layer.title}
              </span>
            )}
          </span>
          {!open && layer.scale !== 'categorical' && (
            <span
              className="h-1.5 w-12 shrink-0 rounded-[2px] ring-1 ring-black/50"
              style={{ background: active.scale.gradient }}
            />
          )}
          <Icon
            name={open ? 'chevron-down' : 'chevron-up'}
            size={13}
            className="shrink-0 text-muted"
          />
        </button>
        {focus && (
          <Tooltip content="Voltar ao modo do mapa">
            <button
              type="button"
              onClick={() => setMapFocus(null)}
              aria-label="Voltar ao modo do mapa"
              data-testid="map-focus-clear"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-muted transition hover:bg-ink-700 hover:text-paper"
            >
              <Icon name="x" size={14} />
            </button>
          </Tooltip>
        )}
        {!focus && active.mode === 'party' && (
          <select
            className="game-select shrink-0 px-1.5 py-0.5 text-xs"
            value={active.partyId}
            onChange={(e) => setMapPartyId(e.target.value)}
            aria-label="Partido exibido no mapa"
          >
            {Object.values(game.parties).map((p) => (
              <option key={p.id} value={p.id}>
                {p.acronym}
              </option>
            ))}
          </select>
        )}
        {!focus && active.mode === 'ideology' && (
          <select
            className="game-select shrink-0 px-1.5 py-0.5 text-xs"
            value={active.axis}
            onChange={(e) => setMapAxis(e.target.value as IdeologyAxis)}
            aria-label="Eixo ideológico exibido no mapa"
            data-testid="map-axis"
          >
            {IDEOLOGY_AXES.map((a) => (
              <option key={a} value={a}>
                {AXIS_DEFINITIONS[a].name}
              </option>
            ))}
          </select>
        )}
      </div>

      {open && (
        <>
          {layer.scale === 'categorical' ? (
            <CategoricalScale active={active} />
          ) : (
            <ContinuousScale active={active} names={names} selected={selected} />
          )}
          <div className="mt-2 flex items-center gap-1 border-t border-gold-500/20 pt-1.5">
            <Toggle
              icon="hash"
              label="Números no mapa"
              on={numbers}
              onClick={() => toggle('mapNumbers')}
              testId="map-opt-numbers"
            />
            <Toggle
              icon="map-pin"
              label="Marcadores (obras e canteiros)"
              on={markers}
              onClick={() => toggle('mapMarkers')}
              testId="map-opt-markers"
            />
            <Toggle
              icon="link"
              label="O mapa acompanha o painel aberto"
              on={auto}
              onClick={() => toggle('mapAuto')}
              testId="map-opt-auto"
            />
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => toggle('mapRanking')}
              aria-expanded={ranking}
              data-testid="map-opt-ranking"
              className={cn(
                'flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[11px] transition',
                ranking ? 'text-gold-300' : 'text-muted hover:text-paper',
              )}
            >
              <Icon name="list-ordered" size={13} />
              Ranking
              <Icon name={ranking ? 'chevron-down' : 'chevron-up'} size={12} />
            </button>
          </div>
          {ranking && (
            <Ranking active={active} names={names} selected={selected} onSelect={onSelect} />
          )}
        </>
      )}
    </div>
  );
}
