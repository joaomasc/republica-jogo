import {
  allianceChance,
  formatDateShort,
  formatMoney,
  GameConstants,
  interludeView,
  nextMilestone,
  OCCUPATION_IDS,
  OCCUPATIONS,
  occupationMonthly,
  occupationNetFamePerYear,
  partyCompatibility,
  prepOptions,
  projectCandidacy,
  targetLabel,
  type GameState,
  type PrepId,
} from '@republica/game-engine';
import { Badge, Button, cn, Icon, Panel, StatTile } from '@republica/ui';
import { useMemo, useState } from 'react';
import { TutorialTip } from '../../components/TutorialTip';
import { num, pct } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';

const I = GameConstants.career.interlude;

function signedYear(v: number): string {
  return `${v >= 0 ? '+' : ''}${num(v)}/ano`;
}

/** "Se a eleição fosse hoje": a largada da campanha com os recursos atuais. */
function Projection({ game }: { game: GameState }) {
  const proj = useMemo(() => projectCandidacy(game), [game]);
  if (!proj) return null;
  return (
    <div className="rounded-[4px] bg-ink-950/45 p-2 text-xs" data-testid="interlude-projection">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Se a campanha começasse hoje (estimativa)
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 @lg:grid-cols-4">
        <span>
          Intenção: <b className="tabular-nums text-gold-300">{pct(proj.share)}</b> ({proj.rank}º de{' '}
          {proj.candidates})
        </span>
        <span>
          Líder: {proj.leaderName} <span className="tabular-nums">{pct(proj.leaderShare)}</span>
        </span>
        <span>
          Conhecido por <b className="tabular-nums">{Math.round(proj.knowledge)}%</b> · rejeição{' '}
          {pct(proj.rejection, 0)}
        </span>
        <span>
          Caixa inicial <b className="tabular-nums">{formatMoney(proj.money)}</b>
        </span>
      </div>
      <p className="mt-1 text-[10.5px] text-muted">
        Calculado montando a eleição do alvo com sua fama, credibilidade, base, caixa e aliados de
        agora. Adversários e economia ainda mudam até lá.
      </p>
    </div>
  );
}

function Resources({ game }: { game: GameState }) {
  const it = interludeView(game);
  const player = game.candidates[game.playerId]!;
  const K = GameConstants.career;
  const repFactor = K.reputationMoneyBase + game.career.reputation * K.reputationMoneyFactor;
  return (
    <div
      className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @3xl:grid-cols-6"
      data-testid="interlude-resources"
    >
      <StatTile
        label="Base eleitoral"
        icon="map-pin"
        value={Math.round(it.base)}
        sub={`+${Math.round(it.base * I.basePresenceFactor)} presença e +${Math.round(it.base * I.baseKnowledgeFactor)} conhecimento no 1º dia`}
      />
      <StatTile
        label="Caixa da pré-campanha"
        icon="piggy-bank"
        value={`+${Math.round(it.warChest * 100)}%`}
        sub="no caixa inicial"
      />
      <StatTile
        label="Aliados"
        icon="handshake"
        value={it.allies.length}
        sub={it.allies.map((p) => game.parties[p]?.acronym).join(', ') || 'nenhum ainda'}
      />
      <StatTile
        label="Fama"
        icon="globe"
        value={Math.round(player.fame)}
        sub="conhecimento inicial"
      />
      <StatTile
        label="Credibilidade"
        icon="badge-check"
        value={Math.round(player.attributes.credibility)}
        sub="menos rejeição"
      />
      <StatTile
        label="Reputação"
        icon="star"
        value={Math.round(game.career.reputation)}
        sub={`fundo do partido ×${num(repFactor, 2)}`}
      />
    </div>
  );
}

function PrepCards({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const player = game.candidates[game.playerId]!;
  const it = interludeView(game);
  const candidates = Object.values(game.parties)
    .filter((p) => p.id !== player.partyId && !it.allies.includes(p.id))
    .sort((a, b) => partyCompatibility(player.ideology, b) - partyCompatibility(player.ideology, a))
    .slice(0, 8);
  const [ally, setAlly] = useState<string>(candidates[0]?.id ?? '');
  const chance = ally ? allianceChance(game, ally) : 0;
  const options = prepOptions(game);
  return (
    <div className="grid gap-2 @2xl:grid-cols-2 @4xl:grid-cols-3" data-testid="interlude-prep">
      {options.map((o) => (
        <div
          key={o.id}
          className={cn(
            'flex flex-col gap-1.5 rounded-xl border-2 p-2.5 text-sm',
            o.available ? 'border-ink-600 bg-ink-900' : 'border-ink-700 bg-ink-900/50 opacity-60',
          )}
        >
          <div className="flex items-center gap-2 font-display font-semibold">
            <Icon name={o.icon} size={16} className="text-gold-400" />
            {o.name}
          </div>
          <div className="text-xs text-paper/80">{o.effect}</div>
          {o.id === 'alliance' && o.available && (
            <div className="flex items-center gap-1.5">
              <select
                className="game-select flex-1 py-1 text-xs"
                value={ally}
                onChange={(e) => setAlly(e.target.value)}
                aria-label="Partido"
              >
                {candidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.acronym} — afinidade {partyCompatibility(player.ideology, p)}%
                  </option>
                ))}
              </select>
              <Badge tone={chance >= 0.5 ? 'good' : chance > 0 ? 'warn' : 'bad'}>
                {chance > 0 ? `${Math.round(chance * 100)}% de chance` : 'sem conversa'}
              </Badge>
            </div>
          )}
          <Button
            size="sm"
            className="mt-auto"
            disabled={!o.available || (o.id === 'alliance' && chance <= 0)}
            onClick={() =>
              act({
                type: 'career/prep',
                prepId: o.id as PrepId,
                ...(o.id === 'alliance' ? { partyId: ally } : {}),
              })
            }
            data-testid={`prep-${o.id}`}
          >
            {o.available ? 'Fazer neste bloco' : (o.reason ?? 'Indisponível')}
          </Button>
        </div>
      ))}
    </div>
  );
}

/** Entressafra: preparar a próxima eleição, bloco a bloco, até o início da campanha. */
export function OccupationPanel() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const it = interludeView(game);
  const current = game.career.occupation ?? null;
  const pending = game.events.pending.length > 0;
  const milestone = nextMilestone(game);
  const last = it.summaries[0];

  return (
    <Panel title="Pré-campanha" icon="briefcase">
      <TutorialTip id="interlude" title="Entre uma eleição e outra">
        Escolha a próxima eleição e avance de marco em marco (meio e fim de ano, janela partidária,
        convenções, início da campanha). Em cada bloco, faça uma preparação. Base eleitoral, caixa,
        aliados, fama e credibilidade entram na campanha seguinte.
      </TutorialTip>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Preparando:</span>
          {it.target ? (
            <span data-testid="interlude-target">
              <Badge tone="gold">{targetLabel(it.target)}</Badge>
            </span>
          ) : (
            <span className="text-bad">escolha a próxima eleição abaixo</span>
          )}
        </div>
        <Resources game={game} />
        <Projection game={game} />

        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Preparação deste bloco (uma por bloco)
            </span>
          </div>
          <PrepCards game={game} />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-gold-500/25 p-2">
          {milestone ? (
            <>
              <Button
                variant="primary"
                onClick={() => act({ type: 'career/advance' })}
                disabled={pending}
                data-testid="career-advance"
              >
                Avançar até: {milestone.label} ({formatDateShort(milestone.date)})
              </Button>
              {!it.prepDone && (
                <span className="text-xs text-warn">
                  Você ainda não fez a preparação deste bloco.
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-gold-300">
              A campanha começa agora: lance a candidatura abaixo.
            </span>
          )}
          {pending && <span className="text-xs text-warn">Decida o acontecimento pendente.</span>}
        </div>

        {last && (
          <div className="rounded-[4px] bg-ink-950/45 p-2 text-xs" data-testid="interlude-summary">
            <div className="mb-1 font-semibold text-gold-300">
              Resumo: {formatDateShort(last.from)} → {formatDateShort(last.to)} ({last.milestone})
            </div>
            {last.changes.length === 0 ? (
              <div className="text-muted">Nada mudou de forma relevante.</div>
            ) : (
              <ul className="grid gap-x-4 gap-y-0.5 @lg:grid-cols-2">
                {last.changes.map((c) => (
                  <li key={c.label} className="flex justify-between gap-3">
                    <span>{c.label}</span>
                    <span
                      className={cn(
                        'tabular-nums',
                        (c.label === 'Escândalo' ? c.after < c.before : c.after > c.before)
                          ? 'text-good'
                          : 'text-bad',
                      )}
                    >
                      {num(c.before, 0)}
                      {c.unit} → {num(c.after, 0)}
                      {c.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {last.notes.length > 0 && (
              <div className="mt-1 text-muted">Aconteceu: {last.notes.join(' · ')}</div>
            )}
          </div>
        )}

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Ocupação (efeito por ano, já descontada a perda de fama de quem está fora do cargo)
          </div>
          <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2" data-testid="occupations">
            {OCCUPATION_IDS.map((id) => {
              const o = OCCUPATIONS[id];
              const m = occupationMonthly(game, id);
              const selected = current === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => act({ type: 'career/occupation', occupationId: id })}
                  className={cn(
                    'flex items-start gap-2 rounded-xl border-2 bg-ink-900 p-2 text-left text-sm transition',
                    selected ? 'border-gold-400' : 'border-ink-600 hover:border-ink-400',
                  )}
                  data-testid={`occupation-${id}`}
                >
                  <Icon name={o.icon} size={18} className="mt-0.5 shrink-0 text-gold-400" />
                  <span className="min-w-0">
                    <span className="block font-bold">{o.name}</span>
                    <span className="block text-xs text-muted">{o.tradeoff}</span>
                    <span className="block text-[11px] text-paper/80">
                      Fama {signedYear(occupationNetFamePerYear(game, id))} · Credibilidade{' '}
                      {signedYear(m.credibility * 12)} · Reputação {signedYear(m.reputation * 12)}
                      {m.base ? ` · Base ${signedYear(m.base * 12)}` : ''}
                      {m.warChest ? ` · Caixa +${Math.round(m.warChest * 1200)}%/ano` : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Sem trabalho de base, a base eleitoral cai {num(I.baseDecayPerMonth * 12, 0)} pontos por
            ano.
          </p>
        </div>
      </div>
    </Panel>
  );
}
