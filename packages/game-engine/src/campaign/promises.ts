import { GameConstants } from '../config/constants';
import { clamp, clamp100 } from '../core/math';
import { addHistory } from '../history/history';
import { shiftIdeology } from '../ideology/ideology';
import { ISSUE_DEFINITIONS } from '../ideology/issues';
import { factionReaction } from '../parties/parties';
import { getPlayer, getPlayerParty, getPlayerStatus, nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import type { ProposalDefinition } from './proposals';
import type { PlayerPromise } from './types';
import { OFFICES } from '../election/offices';

const C = GameConstants.campaign;

/**
 * Aplica uma proposta: muda a posição percebida, aumenta a ênfase no tema e registra a promessa.
 * Retorna mensagens para a interface.
 */
export function applyProposal(
  state: GameState,
  proposal: ProposalDefinition,
  intensity = 1,
): string[] {
  const status = getPlayerStatus(state);
  const details: string[] = [];
  if (status) {
    status.issueFocus[proposal.issue] = clamp(
      (status.issueFocus[proposal.issue] ?? 0) + C.proposalIssueFocus * intensity,
      0,
      C.maxIssueFocus,
    );
    status.perceivedIdeology = shiftIdeology(
      status.perceivedIdeology,
      proposal.ideologyShift,
      0.7 * intensity,
    );
    factionReaction(getPlayerParty(state), status.perceivedIdeology);
    details.push(`Ênfase em ${ISSUE_DEFINITIONS[proposal.issue].name} aumentou`);
  }
  if (!state.promises.some((p) => p.proposalId === proposal.id && p.status === 'pending')) {
    const officeId = state.election?.officeId;
    const legislative = officeId ? OFFICES[officeId].branch === 'legislative' : false;
    const target =
      legislative && proposal.legislativePromise ? proposal.legislativePromise : proposal.promise;
    const promise: PlayerPromise = {
      id: nextId(state, 'prom'),
      proposalId: proposal.id,
      issue: proposal.issue,
      title: proposal.title,
      madeOn: state.date,
      target,
      status: 'pending',
      baseline: null,
      evaluatedOn: null,
    };
    state.promises.push(promise);
    details.push(`Promessa registrada: "${proposal.title}"`);
    addHistory(state, {
      kind: 'promise',
      title: `Prometeu: ${proposal.title}`,
      description: proposal.description,
      importance: 1,
      tags: [proposal.issue],
    });
    const pending = state.promises.filter((p) => p.status === 'pending').length;
    if (pending > C.promiseInflationThreshold) {
      const player = getPlayer(state);
      player.attributes.credibility = clamp100(
        player.attributes.credibility + C.promiseInflationCredibility,
      );
      details.push('Promessas demais: sua credibilidade caiu');
    }
  }
  return details;
}
