import { ISSUE_DEFINITIONS, RIVAL_STYLE_INFO } from '@republica/game-engine';
import { Badge, Icon, Panel } from '@republica/ui';
import { CandidateChip } from '../../components/CandidateChip';
import { useGameState } from '../../store/gameStore';

const TACTIC_LABEL = {
  attack: 'atacando',
  contest: 'disputando suas regiões',
  trend: 'surfando a pauta',
  base: 'reforçando a base',
} as const;

/** Resumo da semana em curso (campanha dinâmica): pauta, sua jogada e o que cada rival está fazendo. */
export function WeekPanel() {
  const game = useGameState();
  const week = game.campaign?.week;
  const election = game.election;
  if (!week || !election) return null;
  const issue = ISSUE_DEFINITIONS[week.trend];
  const myFocus = election.participants[game.playerId]?.issueFocus[week.trend] ?? 0;
  const chosen = week.outcome?.cardId
    ? week.cards.find((c) => c.id === week.outcome?.cardId)
    : null;
  const rivals = election.candidateIds.filter((id) => id !== game.playerId);

  return (
    <Panel title={`Semana ${week.index}`} icon="calendar-check">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          <div className="rounded-xl border-2 border-gold-500/40 bg-gold-500/10 p-2.5">
            <div className="label">Pauta da semana</div>
            <div className="flex items-center gap-2 font-display font-semibold">
              <Icon name={issue.icon} size={16} className="text-gold-400" />
              {issue.name}
            </div>
            <div className="text-xs text-muted">Sua ênfase: {Math.round(myFocus)}/100</div>
          </div>
          <div className="text-xs text-muted">
            {week.pending ? (
              <span className="text-warn">Reunião em aberto: escolha a jogada da semana.</span>
            ) : chosen ? (
              <>
                Jogada: <b className="text-paper">{chosen.title}</b>{' '}
                <Badge tone={week.outcome?.success ? 'good' : 'bad'}>
                  {week.outcome?.success ? 'deu certo' : 'deu errado'}
                </Badge>
              </>
            ) : (
              'Semana sem jogada especial.'
            )}
          </div>
        </div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {rivals.slice(0, 6).map((id) => {
            const st = election.participants[id];
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-2 rounded-lg bg-ink-900 px-2 py-1"
              >
                <CandidateChip state={game} candidateId={id} size={28} />
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {st?.style && <Badge tone="info">{RIVAL_STYLE_INFO[st.style].name}</Badge>}
                  {st?.tactic && (
                    <span
                      className={
                        st.tactic.targetId === game.playerId
                          ? 'text-[10px] font-bold text-bad'
                          : 'text-[10px] text-muted'
                      }
                    >
                      {st.tactic.kind === 'attack' && st.tactic.targetId === game.playerId
                        ? 'atacando você'
                        : TACTIC_LABEL[st.tactic.kind]}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
