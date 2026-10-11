import {
  applyBackground,
  ATTRIBUTE_IDS,
  ATTRIBUTE_POINT_BUY,
  ATTRIBUTES,
  AXIS_DEFINITIONS,
  BACKGROUNDS,
  cityOf,
  DIFFICULTIES,
  DIFFICULTY_IDS,
  IDEOLOGY_AXES,
  ISSUE_DEFINITIONS,
  ISSUES,
  neutralIdeology,
  OFFICE_LIST,
  OFFICES,
  officeSeats,
  PARTY_SYMBOLS,
  defaultPartyId,
  partyCompatibility,
  partyIdForWorld,
  partyPlatformView,
  partySeeds,
  partyPlatformMatch,
  PARODY_DISCLAIMER,
  PARODY_POLITICIANS,
  REAL_WORLD_DISCLAIMER,
  WORLD_IDS,
  WORLDS,
  pointsSpent,
  POP_TYPE_LIST,
  REGIONS,
  STATE_LIST,
  STATES,
  type IdeologyVector,
  type IssueId,
  type PartySymbol,
  type PopTypeId,
} from '@republica/game-engine';
import {
  Avatar,
  Badge,
  Bar,
  Button,
  cn,
  Icon,
  IdeologyBars,
  PartyEmblem,
  Slider,
  Tabs,
} from '@republica/ui';
import { Minus, Plus, Shuffle } from 'lucide-react';
import type { WizardState } from './wizardTypes';
import { PlatformChips, PlatformPicker } from '../platform/PlatformPicker';
import { CitySelect } from '../../components/CitySelect';
import { cityKindLabel, cityPopulationLabel } from '../../lib/cities';

export interface StepProps {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}

/* ───────────── Atributos ───────────── */

export function AttributesStep({ state, update }: StepProps) {
  const spent = pointsSpent(state.attributes);
  const remaining = ATTRIBUTE_POINT_BUY.freePoints - spent;
  const final = applyBackground(state.attributes, state.backgroundId, state.age);
  const change = (id: (typeof ATTRIBUTE_IDS)[number], delta: number) => {
    const next = state.attributes[id] + delta;
    if (next < ATTRIBUTE_POINT_BUY.min || next > ATTRIBUTE_POINT_BUY.max) return;
    if (delta > 0 && remaining < delta) return;
    update({ attributes: { ...state.attributes, [id]: next } });
  };
  const randomize = () => {
    const attrs = { ...state.attributes };
    for (const id of ATTRIBUTE_IDS) attrs[id] = ATTRIBUTE_POINT_BUY.base;
    let left: number = ATTRIBUTE_POINT_BUY.freePoints;
    while (left > 0) {
      const id = ATTRIBUTE_IDS[Math.floor(Math.random() * ATTRIBUTE_IDS.length)] ?? 'charisma';
      const step = Math.min(left, 5);
      if (attrs[id] + step <= ATTRIBUTE_POINT_BUY.max) {
        attrs[id] += step;
        left -= step;
      }
    }
    update({ attributes: attrs });
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
      <div>
        <h3 className="mb-2 font-display text-lg">Origem</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => update({ backgroundId: b.id })}
              className={cn(
                'rounded-xl border-2 p-2.5 text-left transition',
                state.backgroundId === b.id
                  ? 'border-gold-400 bg-gold-500/10'
                  : 'border-ink-600 bg-ink-900 hover:border-ink-400',
              )}
              data-testid={`bg-${b.id}`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Icon name={b.icon} size={15} className="text-gold-400" />
                <span className="truncate text-sm">{b.name}</span>
              </div>
              <div className="mt-1 text-[11px] leading-snug text-muted">{b.description}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(b.bonuses).map(([k, v]) => (
                  <span
                    key={k}
                    className={cn('text-[10px] font-bold', (v ?? 0) > 0 ? 'text-good' : 'text-bad')}
                  >
                    {ATTRIBUTES[k as keyof typeof ATTRIBUTES].name} {(v ?? 0) > 0 ? '+' : ''}
                    {v}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-lg">Atributos</h3>
          <div className="flex items-center gap-2">
            <Badge tone={remaining === 0 ? 'good' : remaining < 0 ? 'bad' : 'gold'}>
              {remaining} pontos livres
            </Badge>
            <Button size="sm" icon={<Shuffle size={14} />} onClick={randomize}>
              Aleatório
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {ATTRIBUTE_IDS.map((id) => {
            const def = ATTRIBUTES[id];
            const bonus = final[id] - state.attributes[id];
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-xl border-2 border-ink-700 bg-ink-900 px-2.5 py-1.5"
                title={def.description}
              >
                <Icon name={def.icon} size={16} className="shrink-0 text-gold-400" />
                <span className="w-40 shrink-0 text-sm font-bold">{def.name}</span>
                <button
                  type="button"
                  aria-label={`Diminuir ${def.name}`}
                  className="rounded-md border-2 border-ink-600 p-0.5 hover:bg-ink-700"
                  onClick={() => change(id, -5)}
                >
                  <Minus size={14} />
                </button>
                <div className="flex-1">
                  <Bar value={final[id] / 100} />
                </div>
                <button
                  type="button"
                  aria-label={`Aumentar ${def.name}`}
                  className="rounded-md border-2 border-ink-600 p-0.5 hover:bg-ink-700"
                  onClick={() => change(id, 5)}
                >
                  <Plus size={14} />
                </button>
                <span className="w-14 text-right font-display tabular-nums">
                  {final[id]}
                  {bonus !== 0 && (
                    <span
                      className={cn('ml-0.5 text-[10px]', bonus > 0 ? 'text-good' : 'text-bad')}
                    >
                      {bonus > 0 ? `+${bonus}` : bonus}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Ideologia ───────────── */

const PRESETS: { id: string; name: string; v: Partial<IdeologyVector> }[] = [
  { id: 'center', name: 'Centro', v: {} },
  {
    id: 'left',
    name: 'Esquerda',
    v: { economy: 25, social: 30, fiscal: 30, security: 30, trade: 35, environment: 35 },
  },
  {
    id: 'liberal',
    name: 'Liberal',
    v: { economy: 82, social: 40, fiscal: 80, trade: 82, institutions: 70 },
  },
  {
    id: 'conservative',
    name: 'Conservador',
    v: { economy: 62, social: 80, security: 85, foreign: 75, fiscal: 65 },
  },
  {
    id: 'green',
    name: 'Ambientalista',
    v: { environment: 12, social: 30, economy: 40, foreign: 30 },
  },
  {
    id: 'agro',
    name: 'Desenvolvimentista rural',
    v: { environment: 85, federalism: 75, trade: 70, economy: 62 },
  },
];

export function IdeologyStep({ state, update }: StepProps) {
  const closest = [...partySeeds(state.world)]
    .sort((a, b) => partyCompatibility(state.ideology, b) - partyCompatibility(state.ideology, a))
    .slice(0, 3);
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Posicione-se em cada eixo. Nenhuma posição é "certa": cada uma agrada a alguns grupos de
          eleitores e desagrada a outros.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              onClick={() => update({ ideology: { ...neutralIdeology(), ...p.v } })}
            >
              {p.name}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {IDEOLOGY_AXES.map((axis) => (
            <div
              key={axis}
              className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3"
              title={AXIS_DEFINITIONS[axis].description}
            >
              <Slider
                label={AXIS_DEFINITIONS[axis].name}
                value={state.ideology[axis]}
                onChange={(v) => update({ ideology: { ...state.ideology, [axis]: v } })}
                leftLabel={AXIS_DEFINITIONS[axis].low}
                rightLabel={AXIS_DEFINITIONS[axis].high}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="font-display text-lg">Partidos mais próximos</h3>
        {closest.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl border-2 border-ink-700 bg-ink-900 p-2.5"
          >
            <PartyEmblem party={p} size={34} />
            <div className="flex-1">
              <div className="font-bold">
                {p.acronym} <span className="text-sm font-normal text-muted">{p.name}</span>
              </div>
              <Bar value={partyCompatibility(state.ideology, p) / 100} color={p.color} />
            </div>
            <span className="font-display text-lg tabular-nums">
              {partyCompatibility(state.ideology, p)}%
            </span>
          </div>
        ))}
        {closest[0] && (
          <div className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
            <IdeologyBars
              markers={[
                { vector: state.ideology, color: '#f2b51e', label: 'Você' },
                { vector: closest[0].ideology, color: closest[0].color, label: closest[0].acronym },
              ]}
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────── Partido ───────────── */

const PARTY_COLORS = [
  '#d62839',
  '#f77f00',
  '#fcbf49',
  '#2a9d8f',
  '#06d6a0',
  '#118ab2',
  '#3a0ca3',
  '#7209b7',
  '#f72585',
  '#6d597a',
  '#8d6e3f',
  '#1d3557',
];

export function PartyStep({ state, update }: StepProps) {
  const tab = state.party.kind;
  const input =
    state.party.kind === 'new'
      ? state.party.input
      : {
          name: '',
          acronym: '',
          color: '#06d6a0',
          symbol: 'star' as PartySymbol,
          ideology: state.ideology,
          priorities: [] as IssueId[],
          priorityPopTypes: [] as PopTypeId[],
          leaderName: `${state.firstName} ${state.lastName}`,
        };
  const setInput = (patch: Partial<typeof input>) =>
    update({
      party: {
        kind: 'new',
        input: {
          ...input,
          ...patch,
          ideology: state.ideology,
          leaderName: `${state.firstName} ${state.lastName}`,
        },
      },
    });
  const toggle = <T,>(list: T[], item: T, max: number): T[] =>
    list.includes(item)
      ? list.filter((x) => x !== item)
      : list.length >= max
        ? list
        : [...list, item];

  const seeds = partySeeds(state.world);
  const cast = PARODY_POLITICIANS.filter((p) => seeds.some((s) => s.id === p.partyId));
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-ink-600 bg-ink-900 p-3">
        <div className="label mb-1.5">Mundo do jogo</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {WORLD_IDS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() =>
                update({
                  world: w,
                  ...(state.party.kind === 'existing'
                    ? { party: { kind: 'existing', partyId: partyIdForWorld(state.party.partyId, w) } }
                    : {}),
                })
              }
              className={cn(
                'rounded-xl border-2 p-2.5 text-left',
                state.world === w ? 'border-gold-400 bg-gold-500/10' : 'border-ink-600',
              )}
              data-testid={`world-${w}`}
            >
              <div className="font-display font-semibold">{WORLDS[w].name}</div>
              <div className="text-xs text-muted">{WORLDS[w].description}</div>
            </button>
          ))}
        </div>
        {state.world === 'real' && <p className="mt-3 text-xs text-muted">{REAL_WORLD_DISCLAIMER}</p>}
        {state.world === 'parody' && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-warn">{PARODY_DISCLAIMER}</p>
            <div className="label">Quem pode aparecer como adversário</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cast.map((p) => {
                const party = seeds.find((s) => s.id === p.partyId);
                return (
                  <div key={p.key} className="flex w-20 shrink-0 flex-col items-center text-center">
                    <Avatar config={p.appearance} size={64} age={p.age} partyColor={party?.color} />
                    <div className="mt-0.5 text-[11px] font-bold leading-tight">{p.ballotName}</div>
                    <div className="text-[10px] text-muted">{party?.acronym}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <Tabs
        tabs={[
          { id: 'existing', label: 'Escolher partido', icon: 'flag' },
          { id: 'new', label: 'Fundar partido', icon: 'sparkles' },
        ]}
        value={tab}
        onChange={(t) =>
          t === 'existing'
            ? update({ party: { kind: 'existing', partyId: defaultPartyId(state.world) } })
            : setInput({})
        }
      />
      {state.party.kind === 'existing' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {partySeeds(state.world).map((p) => {
            const compat = partyCompatibility(state.ideology, p);
            const selected = state.party.kind === 'existing' && state.party.partyId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => update({ party: { kind: 'existing', partyId: p.id } })}
                className={cn(
                  'flex flex-col gap-2 rounded-2xl border-[3px] bg-ink-900 p-3 text-left transition',
                  selected
                    ? 'border-gold-400 shadow-cartoon'
                    : 'border-ink-600 hover:border-ink-400',
                )}
                data-testid={`party-${p.id}`}
              >
                <div className="flex items-center gap-2.5">
                  <PartyEmblem party={p} size={40} />
                  <div className="min-w-0">
                    <div className="font-display text-lg font-semibold leading-tight">
                      {p.acronym}
                      {p.number !== undefined && (
                        <span className="ml-1.5 text-sm font-normal tabular-nums text-muted">{p.number}</span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted">{p.name}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div
                      className={cn(
                        'font-display text-xl tabular-nums',
                        compat >= 70 ? 'text-good' : compat >= 50 ? 'text-warn' : 'text-bad',
                      )}
                    >
                      {compat}%
                    </div>
                    <div className="text-[10px] uppercase text-muted">afinidade</div>
                  </div>
                </div>
                <p className="text-xs text-muted">{p.description}</p>
                {(() => {
                  const view = partyPlatformView({ ideology: p.ideology, lawPositions: {} }, 5);
                  const match = partyPlatformMatch({ ideology: p.ideology, lawPositions: {} }, state.platform);
                  const ratio = match.total > 0 ? match.same / match.total : 0;
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10.5px] uppercase tracking-wider text-muted">
                        <span>Bandeiras</span>
                        {match.total > 0 && (
                          <span className={ratio >= 0.6 ? 'text-good' : ratio >= 0.4 ? 'text-warn' : 'text-bad'}>
                            defende {match.same} de {match.total} suas
                          </span>
                        )}
                      </div>
                      <PlatformChips platform={view} limit={5} color={p.color} />
                    </div>
                  );
                })()}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  {(
                    [
                      ['Popularidade', p.popularity],
                      ['Influência', p.influence],
                      ['Dinheiro', p.money],
                      ['Militância', p.militancy],
                    ] as const
                  ).map(([label, v]) => (
                    <div key={label}>
                      <div className="flex justify-between text-muted">
                        <span>{label}</span>
                        <span>{v}</span>
                      </div>
                      <Bar value={v / 100} height={5} color={p.color} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.strongRegions.map((r) => (
                    <Badge key={r} tone="good">
                      Forte: {REGIONS[r].name}
                    </Badge>
                  ))}
                  {p.weakRegions.map((r) => (
                    <Badge key={r} tone="bad">
                      Fraco: {REGIONS[r].name}
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Um partido novo nasce pequeno: pouco dinheiro, pouca estrutura e tempo de TV — mas
              100% alinhado a você. As posições do partido serão as suas.
            </p>
            <div className="grid grid-cols-[1fr_8rem] gap-2">
              <input
                className="game-input"
                placeholder="Nome do partido"
                value={input.name}
                onChange={(e) => setInput({ name: e.target.value })}
                maxLength={48}
                data-testid="new-party-name"
              />
              <input
                className="game-input uppercase"
                placeholder="Sigla"
                value={input.acronym}
                onChange={(e) => setInput({ acronym: e.target.value.toUpperCase() })}
                maxLength={8}
                data-testid="new-party-acronym"
              />
            </div>
            <div>
              <div className="label mb-1">Cor</div>
              <div className="flex flex-wrap gap-1.5">
                {PARTY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setInput({ color: c })}
                    className={cn(
                      'h-8 w-8 rounded-lg border-[3px]',
                      input.color === c ? 'scale-110 border-gold-400' : 'border-ink-950',
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-1">Símbolo</div>
              <div className="flex flex-wrap gap-1.5">
                {PARTY_SYMBOLS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput({ symbol: s })}
                    className={cn(
                      'rounded-lg border-2 p-1.5',
                      input.symbol === s
                        ? 'border-gold-400 bg-gold-500/15'
                        : 'border-ink-600 bg-ink-900',
                    )}
                    aria-label={s}
                  >
                    <Icon name={s} size={20} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
              <PartyEmblem
                party={{
                  symbol: input.symbol,
                  color: input.color,
                  acronym: input.acronym || '???',
                }}
                size={48}
                showAcronym
              />
              <span className="text-sm text-muted">{input.name || 'Seu partido'}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="label mb-1">Prioridades (até 3)</div>
              <div className="flex flex-wrap gap-1.5">
                {ISSUES.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInput({ priorities: toggle(input.priorities, i, 3) })}
                    className={cn(
                      'rounded-lg border-2 px-2 py-1 text-xs font-bold',
                      input.priorities.includes(i)
                        ? 'border-gold-400 bg-gold-500 text-ink-950'
                        : 'border-ink-600 bg-ink-900 text-muted',
                    )}
                  >
                    {ISSUE_DEFINITIONS[i].name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-1">Grupos sociais prioritários (até 4)</div>
              <div className="flex flex-wrap gap-1.5">
                {POP_TYPE_LIST.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setInput({ priorityPopTypes: toggle(input.priorityPopTypes, p.id, 4) })
                    }
                    className={cn(
                      'flex items-center gap-1 rounded-lg border-2 px-2 py-1 text-xs font-bold',
                      input.priorityPopTypes.includes(p.id)
                        ? 'border-gold-400 bg-gold-500 text-ink-950'
                        : 'border-ink-600 bg-ink-900 text-muted',
                    )}
                  >
                    <Icon name={p.icon} size={12} />
                    {p.plural}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="label">Bandeiras do partido</div>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={!input.lawPositions}
                    onChange={(e) => setInput({ lawPositions: e.target.checked ? undefined : { ...state.platform } })}
                    data-testid="party-same-platform"
                  />
                  Mesmas que as minhas
                </label>
              </div>
              {!input.lawPositions ? (
                <PlatformChips platform={state.platform} color={input.color} />
              ) : (
                <p className="text-xs text-muted">Escolha abaixo as leis que o partido defende.</p>
              )}
            </div>
            <div className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
              <div className="label mb-2">Posições do partido (= as suas)</div>
              <IdeologyBars
                markers={[
                  { vector: state.ideology, color: input.color, label: input.acronym || 'Partido' },
                ]}
                compact
              />
            </div>
          </div>
          {input.lawPositions && (
            <div className="lg:col-span-2">
              <PlatformPicker
                title="Bandeiras do partido"
                value={input.lawPositions}
                onChange={(lawPositions) => setInput({ lawPositions })}
                ideology={state.ideology}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────── Cargo ───────────── */

export function OfficeStep({ state, update, locked }: StepProps & { locked?: boolean }) {
  const office = OFFICES[state.officeId];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {OFFICE_LIST.map((o) => {
          const tooYoung = state.age < o.minAge;
          return (
            <button
              key={o.id}
              type="button"
              disabled={locked}
              onClick={() => update({ officeId: o.id })}
              data-testid={`office-${o.id}`}
              className={cn(
                'flex flex-col gap-1.5 rounded-2xl border-[3px] bg-ink-900 p-3 text-left transition disabled:opacity-60',
                state.officeId === o.id
                  ? 'border-gold-400 shadow-cartoon'
                  : 'border-ink-600 hover:border-ink-400',
              )}
            >
              <div className="flex items-center gap-2">
                <Icon name={o.icon} size={20} className="text-gold-400" />
                <span className="font-display text-lg font-semibold">{o.name}</span>
              </div>
              <p className="text-xs text-muted">{o.description}</p>
              <ul className="space-y-0.5 text-[11px] text-paper/80">
                {o.rules.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-1 pt-1">
                <Badge tone={o.branch === 'executive' ? 'gold' : 'info'}>
                  {o.branch === 'executive' ? 'Executivo' : 'Legislativo'}
                </Badge>
                <Badge tone={tooYoung ? 'bad' : 'neutral'}>Idade mín. {o.minAge}</Badge>
              </div>
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {office.unitsKind !== 'states' && (
          <div className="space-y-2 rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
            <div>
              <div className="label mb-1">Estado</div>
              <select
                className="game-select w-full"
                value={state.stateId}
                disabled={locked}
                onChange={(e) =>
                  update({ stateId: e.target.value as typeof state.stateId, cityId: null })
                }
                data-testid="office-state"
              >
                {STATE_LIST.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {office.unitsKind === 'cityZones' &&
              (() => {
                const city = cityOf(state.stateId, state.cityId);
                return (
                  <div>
                    <div className="label mb-1">Cidade</div>
                    <CitySelect
                      stateId={state.stateId}
                      value={state.cityId}
                      onChange={(cityId) => update({ cityId })}
                      {...(locked ? { disabled: true } : {})}
                      className="w-full"
                    />
                    <p className="mt-1 text-xs text-muted">
                      {cityKindLabel(city)} · {cityPopulationLabel(city)}
                      {office.system === 'proportional' &&
                        ` · ${officeSeats(office.id, state.stateId, city.id)} vereadores`}
                    </p>
                  </div>
                );
              })()}
          </div>
        )}
        <div className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
          <div className="label mb-1">Dificuldade</div>
          <div className="flex flex-wrap gap-1.5">
            {DIFFICULTY_IDS.map((d) => (
              <Button
                key={d}
                size="sm"
                variant={state.difficulty === d ? 'primary' : 'secondary'}
                onClick={() => update({ difficulty: d })}
              >
                {DIFFICULTIES[d].name}
              </Button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{DIFFICULTIES[state.difficulty].description}</p>
          <label className="mt-3 flex items-start gap-2 rounded-xl border-2 border-ink-600 bg-ink-900 p-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={state.weekly}
              onChange={(e) => update({ weekly: e.target.checked })}
              data-testid="toggle-weekly"
            />
            <span>
              <b>Campanha dinâmica</b> <span className="text-xs text-gold-400">(recomendado)</span>
              <span className="block text-xs text-muted">
                Toda semana: pauta em alta, rivais que reagem às pesquisas e 3 cartas de jogada para
                escolher.
              </span>
            </span>
          </label>
        </div>
      </div>
      {state.age < office.minAge && (
        <p className="text-sm text-bad">
          Você precisa ter pelo menos {office.minAge} anos para este cargo (ajuste a idade na
          primeira etapa).
        </p>
      )}
    </div>
  );
}

/* ───────────── Revisão ───────────── */

export function ReviewStep({ state }: StepProps) {
  const choice = state.party;
  const party =
    choice.kind === 'existing'
      ? partySeeds(state.world).find((p) => p.id === choice.partyId)
      : null;
  const partyView =
    party ??
    (state.party.kind === 'new'
      ? { ...state.party.input, acronym: state.party.input.acronym || '???' }
      : null);
  const office = OFFICES[state.officeId];
  const bg = BACKGROUNDS.find((b) => b.id === state.backgroundId);
  return (
    <div className="grid items-start gap-6 md:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-2">
        <Avatar
          config={state.appearance}
          size={200}
          {...(partyView ? { background: partyView.color, partyColor: partyView.color } : {})}
          age={state.age}
        />
        <div className="font-display text-2xl">
          {state.ballotName || `${state.firstName} ${state.lastName}`}
        </div>
        <div className="text-sm text-muted">
          {bg?.name} · {state.age} anos · {STATES[state.homeStateId].name}
        </div>
      </div>
      <div className="space-y-3">
        {partyView && (
          <div className="flex items-center gap-3 rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
            <PartyEmblem party={partyView} size={44} />
            <div>
              <div className="font-display text-lg">{partyView.acronym}</div>
              <div className="text-sm text-muted">{partyView.name}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="font-display text-xl">
                {party ? partyCompatibility(state.ideology, party) : 100}%
              </div>
              <div className="text-[10px] uppercase text-muted">compatibilidade</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
          <Icon name={office.icon} size={28} className="text-gold-400" />
          <div>
            <div className="font-display text-lg">{office.name}</div>
            <div className="text-sm text-muted">
              {office.unitsKind === 'states'
                ? 'Brasil'
                : office.unitsKind === 'cityZones'
                  ? `${cityOf(state.stateId, state.cityId).name} (${state.stateId})`
                  : STATES[state.stateId].name}{' '}
              · {DIFFICULTIES[state.difficulty].name}
            </div>
          </div>
        </div>
        <div className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
          <IdeologyBars
            markers={[{ vector: state.ideology, color: '#f2b51e', label: 'Você' }]}
            compact
          />
        </div>
        <div className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
          <div className="label mb-1.5">Suas bandeiras</div>
          <PlatformChips platform={state.platform} />
        </div>
      </div>
    </div>
  );
}
