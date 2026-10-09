import { deepClone } from '../core/clone';
import type { AdCampaignInput } from '../campaign/ads';
import type { CampaignActionInput } from '../campaign/actions';
import type { EngineOutput } from '../core/types';
import { withRng } from '../core/rng';
import { updateEconomy as updateEconomyDraft } from '../economy/economy';
import {
  simulateElection as simulateElectionPure,
  type SimulateOptions,
} from '../election/simulate';
import type { ElectionResult } from '../election/types';
import { computeIntentions } from '../election/voterModel';
import { rollEvent } from '../events/events';
import { getLawOption } from '../laws/laws.data';
import { updatePopulationMonthly } from '../population/satisfaction';
import { dispatch } from './dispatch';
import type { GameState } from './state';
import { updatePopularity as updatePopularityDraft, type TimeStep } from './time';

/**
 * API funcional do motor. Todas as funções são puras do ponto de vista do chamador:
 * recebem um estado e devolvem um novo (o original não é alterado).
 */

export { startGame } from './startGame';
export { saveGame, loadGame, deleteSave } from '../save/save';

export function advanceTime(state: GameState, step: TimeStep): EngineOutput<GameState> {
  return dispatch(state, { type: 'time/advance', step });
}

export function campaignAction(
  state: GameState,
  input: CampaignActionInput,
): EngineOutput<GameState> {
  return dispatch(state, { type: 'campaign/action', input });
}

export function launchAd(state: GameState, input: AdCampaignInput): EngineOutput<GameState> {
  return dispatch(state, { type: 'campaign/ad', input });
}

/** Encomenda uma pesquisa interna (custa dinheiro). */
export function runPoll(state: GameState): EngineOutput<GameState> {
  return dispatch(state, { type: 'campaign/poll' });
}

/** Simulação pura da votação (não altera o estado). */
export function simulateElection(state: GameState, options?: SimulateOptions): ElectionResult {
  return simulateElectionPure(state, options);
}

/** Inicia a tramitação de um projeto de lei (gameplay: nunca aprova direto). */
export function proposeLaw(
  state: GameState,
  categoryId: string,
  optionId: string,
): EngineOutput<GameState> {
  return dispatch(state, { type: 'gov/propose', categoryId, optionId });
}

/**
 * Promulga uma lei imediatamente, ignorando o Congresso.
 * Uso exclusivo de ferramentas (sandbox de balanceamento, testes) — a interface do jogo não expõe isto.
 */
export function passLaw(
  state: GameState,
  categoryId: string,
  optionId: string,
): EngineOutput<GameState> {
  if (!getLawOption(categoryId, optionId))
    return { state, result: { ok: false, message: 'Lei inválida.' } };
  const draft = deepClone(state);
  draft.laws.enacted[categoryId] = optionId;
  draft.laws.strength[categoryId] = 1;
  return { state: draft, result: { ok: true, message: 'Lei promulgada (modo ferramenta).' } };
}

/** Força o sorteio de um evento elegível agora. */
export function generateEvent(state: GameState): EngineOutput<GameState> {
  const draft = deepClone(state);
  const pending = rollEvent(draft, 1);
  return {
    state: draft,
    result: {
      ok: true,
      message: pending ? pending.title : 'Nenhum evento elegível (ou evento informativo aplicado).',
    },
  };
}

export function resolveEvent(
  state: GameState,
  instanceId: string,
  optionId: string,
): EngineOutput<GameState> {
  return dispatch(state, { type: 'event/resolve', instanceId, optionId });
}

/** Um passo mensal da economia. */
export function updateEconomy(state: GameState): GameState {
  const draft = deepClone(state);
  withRng(draft, (rng) => updateEconomyDraft(draft, rng));
  return draft;
}

/** Um passo mensal da satisfação dos Pops. */
export function updatePopulation(state: GameState): GameState {
  const draft = deepClone(state);
  updatePopulationMonthly(draft);
  return draft;
}

/** Recalcula a popularidade do jogador a partir da intenção de voto atual (ou da aprovação). */
export function updatePopularity(state: GameState): GameState {
  const draft = deepClone(state);
  if (draft.election) {
    const snap = computeIntentions(draft, draft.election, { includeSegments: false });
    updatePopularityDraft(
      draft,
      snap.total.shares[draft.playerId] ?? 0,
      snap.rejection[draft.playerId] ?? 0,
    );
  } else if (draft.government) {
    const player = draft.candidates[draft.playerId];
    if (player) player.attributes.popularity = draft.government.approval;
  }
  return draft;
}

export type { TimeStep };
