import {
  dispatch,
  startGame,
  type GameAction,
  type GameState,
  type OfficeId,
  type StateId,
} from '../src/index';
import { defaultConfig } from '../scripts/bot';

export { defaultConfig, playCampaign } from '../scripts/bot';

export function newGame(
  officeId: OfficeId = 'presidente',
  stateId: StateId = 'SP',
  seed = 42,
  partyId = 'udc',
): GameState {
  return startGame(defaultConfig(seed, officeId, stateId, partyId));
}

/** Executa uma ação e falha o teste se o motor recusar. */
export function must(state: GameState, action: GameAction): GameState {
  const out = dispatch(state, action);
  if (!out.result.ok) throw new Error(`${action.type}: ${out.result.message}`);
  return out.state;
}

export function clearBlockers(state: GameState): GameState {
  let s = state;
  for (const ev of s.events.pending)
    s = must(s, {
      type: 'event/resolve',
      instanceId: ev.instanceId,
      optionId: ev.options.find((o) => o.available)?.id ?? '',
    });
  const debate = s.election?.debates.find((d) => d.status === 'scheduled' && d.date === s.date);
  if (debate) s = must(s, { type: 'debate/decline', debateId: debate.id });
  return s;
}
