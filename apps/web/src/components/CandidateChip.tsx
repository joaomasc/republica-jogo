import type { GameState } from '@republica/game-engine';
import { Avatar, cn } from '@republica/ui';

export function CandidateChip({
  state,
  candidateId,
  size = 36,
  subtitle,
  className,
}: {
  state: GameState;
  candidateId: string;
  size?: number;
  subtitle?: string;
  className?: string;
}) {
  const c = state.candidates[candidateId];
  if (!c) return null;
  const party = state.parties[c.partyId];
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <Avatar
        config={c.appearance}
        size={size}
        background={party?.color ?? '#2c3d63'}
        {...(party ? { partyColor: party.color } : {})}
        age={c.age}
      />
      <div className="min-w-0">
        <div className="truncate font-bold leading-tight">
          {c.ballotName}
          {c.isPlayer && (
            <span className="ml-1 text-[10px] font-bold uppercase text-gold-400">você</span>
          )}
        </div>
        <div className="truncate text-xs text-muted">{subtitle ?? party?.acronym}</div>
      </div>
    </div>
  );
}
