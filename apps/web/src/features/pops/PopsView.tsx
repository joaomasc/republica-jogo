import {
  formatMoney,
  formatNumber,
  ISSUE_DEFINITIONS,
  popTypeSummaries,
  POP_TYPES,
  STATES,
  type PopTypeId,
} from '@republica/game-engine';
import { Badge, Bar, Icon, IdeologyBars, Modal, Panel, PartyEmblem } from '@republica/ui';
import { useMemo, useState } from 'react';
import { pct } from '../../lib/format';
import { useGameState } from '../../store/gameStore';

export function PopsView() {
  const game = useGameState();
  const summaries = useMemo(() => popTypeSummaries(game), [game]);
  const [open, setOpen] = useState<PopTypeId | null>(null);
  const selected = summaries.find((s) => s.typeId === open);
  const status = game.election?.participants[game.playerId];
  const pops = open
    ? Object.values(game.population.pops)
        .filter((p) => p.typeId === open)
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        O eleitorado é dividido em grupos (Pops) por profissão e estado:{' '}
        {Object.keys(game.population.pops).length} grupos,{' '}
        {formatNumber(game.population.totalVoters)} eleitores. Cada grupo tem ideologia,
        prioridades, renda e identidade partidária próprias. O apoio por grupo vem das pesquisas.
      </p>
      <div
        className="grid gap-3 @sm:grid-cols-2 @3xl:grid-cols-3 @4xl:grid-cols-4"
        data-testid="pops-grid"
      >
        {summaries.map((s) => (
          <button
            key={s.typeId}
            type="button"
            onClick={() => setOpen(s.typeId)}
            className="card-hover flex flex-col gap-2 rounded-2xl border-[3px] border-ink-600 bg-ink-800 p-3 text-left shadow-cartoon"
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink-950"
                style={{ background: s.color }}
              >
                <Icon name={s.icon} size={20} className="text-ink-950" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-display text-base font-semibold">{s.name}</div>
                <div className="text-xs text-muted">
                  {formatNumber(s.voters)} eleitores · {pct(s.share, 0)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="label">Seu apoio</div>
                <div className="font-display text-lg text-gold-400">
                  {s.playerSupport === null ? '—' : pct(s.playerSupport)}
                </div>
              </div>
              <div>
                <div className="label">Satisfação</div>
                <Bar
                  value={s.satisfaction / 100}
                  color={s.satisfaction >= 50 ? 'var(--color-good)' : 'var(--color-bad)'}
                  height={6}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {s.topPriorities.slice(0, 3).map((i) => (
                <Badge key={i}>
                  <Icon name={ISSUE_DEFINITIONS[i].icon} size={10} /> {ISSUE_DEFINITIONS[i].name}
                </Badge>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Renda {formatMoney(s.income)}</span>
              {status && (
                <span className={s.momentum >= 0 ? 'text-good' : 'text-bad'}>
                  Momentum {s.momentum > 0 ? '+' : ''}
                  {s.momentum}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && open && (
        <Modal
          open
          title={selected.name}
          icon={selected.icon}
          size="lg"
          onClose={() => setOpen(null)}
        >
          <div className="grid gap-4 @lg:grid-cols-2">
            <div className="space-y-3">
              <Panel title="Posições médias" icon="compass">
                <IdeologyBars
                  markers={[
                    {
                      vector: selected.ideology,
                      color: POP_TYPES[open].color,
                      label: selected.name,
                    },
                    ...(status
                      ? [
                          {
                            vector: status.perceivedIdeology,
                            color: '#f2b51e',
                            label: 'Você (percebido)',
                          },
                        ]
                      : []),
                  ]}
                  compact
                />
              </Panel>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-ink-900 p-2">
                  <div className="label">Comparecimento</div>
                  <div className="font-display">{pct(selected.turnout, 0)}</div>
                </div>
                <div className="rounded-lg bg-ink-900 p-2">
                  <div className="label">Indecisos</div>
                  <div className="font-display">
                    {selected.undecided === null ? '—' : pct(selected.undecided, 0)}
                  </div>
                </div>
              </div>
              {selected.topParty && (
                <div className="flex items-center gap-2 rounded-lg bg-ink-900 p-2 text-sm">
                  <span className="text-muted">Partido com mais identificação:</span>
                  <PartyEmblem
                    party={{
                      ...selected.topParty,
                      symbol:
                        game.parties[
                          Object.values(game.parties).find(
                            (p) => p.acronym === selected.topParty?.acronym,
                          )?.id ?? ''
                        ]?.symbol ?? 'flag',
                    }}
                    size={22}
                    showAcronym
                  />
                </div>
              )}
              <div>
                <div className="label mb-1">Prioridades</div>
                <div className="flex flex-wrap gap-1">
                  {selected.topPriorities.map((i) => (
                    <Badge key={i} tone="gold">
                      {ISSUE_DEFINITIONS[i].name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="label mb-1">Maiores contingentes (por estado)</div>
                <div className="space-y-1 text-xs">
                  {pops.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="w-28 truncate">{STATES[p.stateId].name}</span>
                      <Bar
                        value={p.satisfaction / 100}
                        height={5}
                        color={p.satisfaction >= 50 ? 'var(--color-good)' : 'var(--color-bad)'}
                      />
                      <span className="w-16 text-right tabular-nums text-muted">
                        {formatNumber(p.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
