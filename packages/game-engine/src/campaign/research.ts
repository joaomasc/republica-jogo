import { GameConstants } from '../config/constants';
import { formatMoney } from '../core/math';
import type { ActionResult } from '../core/types';
import { addPoll, createPoll } from '../election/polls';
import { getDifficulty } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { spend } from './finance';
import { staffBonus } from './staff';

export function internalPollCost(state: GameState): number {
  const campaign = state.campaign;
  if (!campaign) return 0;
  const discount = Math.min(0.7, staffBonus(campaign.staff, 'pollDiscount'));
  return Math.round(
    GameConstants.campaign.pollCost *
      campaign.moneyScale *
      (1 - discount) *
      getDifficulty(state).costs,
  );
}

/** Encomenda uma pesquisa interna detalhada (por região, grupo e segmento do eleitorado). */
export function runInternalPoll(state: GameState): ActionResult {
  if (state.phase !== 'campaign' || !state.election || !state.campaign)
    return { ok: false, message: 'Pesquisas só durante a campanha.' };
  if (state.election.polls.some((p) => p.kind === 'internal' && p.date === state.date))
    return { ok: false, message: 'Você já encomendou uma pesquisa hoje.' };
  const cost = internalPollCost(state);
  if (!spend(state, cost, 'polls', 'Pesquisa interna'))
    return { ok: false, message: `Dinheiro insuficiente (${formatMoney(cost)}).` };
  addPoll(state, createPoll(state, { kind: 'internal' }));
  return {
    ok: true,
    message: 'Pesquisa interna concluída.',
    details: [`Custo: ${formatMoney(cost)}`],
  };
}
