import {
  formatNumber,
  latestPoll,
  OFFICES,
  OTHERS_KEY,
  rankByPoll,
} from '@republica/game-engine';
import { Badge, Bar } from '@republica/ui';
import { CandidateChip } from '../../components/CandidateChip';
import { candidateColor } from '../../lib/candidates';
import { pct } from '../../lib/format';
import { useGameState } from '../../store/gameStore';

/** Resumo da disputa (pesquisa mais recente, votos válidos) — usado no outliner. */
export function RaceOverview({ limit = 6 }: { limit?: number }) {
  const game = useGameState();
  const election = game.election;
  if (!election) return null;
  const office = OFFICES[election.officeId];
  const poll = latestPoll(game);
  const ranked = poll ? rankByPoll(poll) : election.candidateIds;
  const decided = poll
    ? Object.entries(poll.total.shares)
        .filter(([id]) => id !== OTHERS_KEY)
        .reduce((a, [, v]) => a + v, 0) || 1
    : 1;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <Badge tone="gold">{election.round === 2 ? '2º turno' : '1º turno'}</Badge>
        <Badge>
          {office.system === 'proportional'
            ? `${election.seats} cadeiras`
            : office.runoff
              ? 'Maioria absoluta'
              : 'Turno único'}
        </Badge>
        <Badge>{formatNumber(election.totalVoters)} eleitores</Badge>
      </div>
      <ul className="space-y-1.5">
        {ranked.slice(0, limit).map((id) => {
          const share = poll ? (poll.total.shares[id] ?? 0) / decided : null;
          return (
            <li key={id} className="rounded-[4px] bg-ink-950/45 px-2 py-1.5">
              <CandidateChip state={game} candidateId={id} size={26} className="text-[13px]" />
              {share !== null && (
                <div className="mt-1 flex items-center gap-2">
                  <Bar value={share * 1.6} color={candidateColor(game, id)} height={5} />
                  <span className="w-11 text-right text-[11px] font-semibold tabular-nums">
                    {pct(share)}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {poll ? (
        <p className="text-[10.5px] leading-snug text-muted">
          {poll.pollster} · {poll.date.split('-').reverse().join('/')} · votos válidos · margem ±
          {(poll.marginOfError * 100).toFixed(1)} p.p.
        </p>
      ) : (
        <p className="text-[10.5px] text-muted">Ainda não há pesquisa publicada.</p>
      )}
    </div>
  );
}
