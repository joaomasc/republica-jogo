import {
  AXIS_DEFINITIONS,
  describeIdeology,
  getLawCategory,
  getLawOption,
  ISSUE_DEFINITIONS,
  LAW_CATEGORIES,
  neutralIdeology,
  partyCompatibility,
  partyPlatformView,
  partyPreferredOption,
  POP_TYPES,
  REGIONS,
  shiftIdeology,
  STATE_IDS,
} from '@republica/game-engine';
import { Badge, Bar, IdeologyBars, Panel, PartyEmblem } from '@republica/ui';
import { HBar } from '../../components/charts';
import { useGameState } from '../../store/gameStore';
import { PlatformChips } from '../platform/PlatformPicker';

export function PartyView() {
  const game = useGameState();
  const player = game.candidates[game.playerId];
  const party = player ? game.parties[player.partyId] : undefined;
  if (!player || !party) return null;
  const compat = partyCompatibility(player.ideology, party);
  const others = Object.values(game.parties).sort((a, b) => b.popularity - a.popularity);
  const governors = STATE_IDS.reduce<Record<string, number>>((acc, id) => {
    const p = game.landscape.governors[id];
    if (p) acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});
  const president = game.parties[game.landscape.presidentPartyId];

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <Panel>
          <div className="flex flex-wrap items-center gap-4">
            <PartyEmblem party={party} size={72} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-3xl font-semibold">{party.acronym}</div>
              <div className="text-muted">{party.name}</div>
              <div className="mt-1 text-sm">{party.description}</div>
              <div className="mt-1 text-xs text-muted">Liderança: {party.leaderName}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl">{compat}%</div>
              <div className="label">compatibilidade com você</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {(
              [
                ['Popularidade', party.popularity],
                ['Influência', party.influence],
                ['Dinheiro', party.money],
                ['Militância', party.militancy],
                ['Unidade', party.unity],
              ] as const
            ).map(([l, v]) => (
              <div key={l}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">{l}</span>
                  <span className="font-bold">{Math.round(v)}</span>
                </div>
                <Bar
                  value={v / 100}
                  color={l === 'Unidade' && v < 45 ? 'var(--color-bad)' : party.color}
                />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Facções internas" icon="users">
          <div className="space-y-3">
            {party.factions.map((f) => (
              <div key={f.id} className="rounded-xl bg-ink-900 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{f.name}</span>
                  <Badge
                    tone={f.satisfaction >= 60 ? 'good' : f.satisfaction < 40 ? 'bad' : 'warn'}
                  >
                    satisfação {Math.round(f.satisfaction)}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {Math.round(f.size * 100)}% do partido ·{' '}
                  {Object.keys(f.ideologyShift).length
                    ? `puxa para: ${describeIdeology(shiftIdeology(neutralIdeology(), f.ideologyShift, 3), AXIS_DEFINITIONS)}`
                    : 'linha oficial'}
                </div>
                <Bar
                  value={f.satisfaction / 100}
                  height={6}
                  className="mt-1"
                  color={f.satisfaction >= 50 ? 'var(--color-good)' : 'var(--color-bad)'}
                />
              </div>
            ))}
            <p className="text-xs text-muted">
              Facções reagem às suas posições públicas. Unidade baixa reduz o entusiasmo da
              militância e gera crises.
            </p>
          </div>
        </Panel>
        <Panel title="Posições sobre leis" icon="scale">
          <div className="mb-2">
            <div className="label mb-1">Bandeiras {Object.keys(party.lawPositions ?? {}).length > 0 ? 'oficiais' : '(pela ideologia)'}</div>
            <PlatformChips platform={partyPlatformView(party)} color={party.color} />
          </div>
          <div className="grid gap-1.5 md:grid-cols-2">
            {LAW_CATEGORIES.map((c) => {
              const opt = getLawOption(c.id, partyPreferredOption(party, c.id) ?? '');
              return (
                <div key={c.id} className="rounded-lg bg-ink-900 px-2.5 py-1.5 text-sm">
                  <span className="text-muted">{getLawCategory(c.id)?.name}:</span>{' '}
                  <span className="font-bold">{opt?.name ?? '—'}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <div className="space-y-3">
        <Panel title="Ideologia" icon="compass">
          <IdeologyBars
            markers={[
              { vector: party.ideology, color: party.color, label: party.acronym },
              { vector: player.ideology, color: '#f2b51e', label: 'Você' },
            ]}
            compact
          />
          <div className="mt-3 flex flex-wrap gap-1">
            {party.priorities.map((i) => (
              <Badge key={i} tone="gold">
                {ISSUE_DEFINITIONS[i].name}
              </Badge>
            ))}
            {party.priorityPopTypes.map((t) => (
              <Badge key={t}>{POP_TYPES[t].plural}</Badge>
            ))}
            {party.strongRegions.map((r) => (
              <Badge key={r} tone="good">
                Forte no {REGIONS[r].name}
              </Badge>
            ))}
          </div>
        </Panel>
        <Panel title="Cenário partidário" icon="flag">
          <div className="mb-3 text-sm">
            Presidência:{' '}
            {president ? (
              <PartyEmblem party={president} size={22} showAcronym className="align-middle" />
            ) : (
              '—'
            )}
          </div>
          <div className="space-y-2">
            {others.map((p) => (
              <HBar
                key={p.id}
                label={
                  <span className="flex items-center gap-2">
                    <PartyEmblem party={p} size={20} /> {p.acronym}
                    {p.id === party.id && <Badge tone="gold">seu</Badge>}
                  </span>
                }
                value={p.popularity}
                max={100}
                color={p.color}
                right={`${Math.round(p.popularity)}`}
                sub={`${describeIdeology(p.ideology, AXIS_DEFINITIONS)} · ${governors[p.id] ?? 0} governador(es) · afinidade ${partyCompatibility(player.ideology, p)}%`}
              />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
