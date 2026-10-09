import { getBackground } from '../candidate/backgrounds';
import { OFFICES } from '../election/offices';
import { AXIS_DEFINITIONS } from '../ideology/axes';
import { describeIdeology } from '../ideology/ideology';
import type { InterviewQuestion, InterviewSession } from '../media/interactions';
import type { GameState } from '../simulation/state';
import type { CandidateBrief, InterviewQuestionContext } from './provider';

/** Monta um resumo pequeno e sem dados sensíveis do candidato para enviar a um provedor de IA. */
export function candidateBrief(state: GameState, candidateId = state.playerId): CandidateBrief {
  const c = state.candidates[candidateId];
  if (!c) throw new Error('Candidato inexistente');
  const party = state.parties[c.partyId];
  const officeId = state.election?.officeId ?? state.government?.officeId;
  const ideology = state.election?.participants[candidateId]?.perceivedIdeology ?? c.ideology;
  return {
    name: c.ballotName,
    party: party ? `${party.name} (${party.acronym})` : '',
    office: officeId ? OFFICES[officeId].name : 'pré-candidato(a)',
    ideologySummary: describeIdeology(ideology, AXIS_DEFINITIONS),
    ideology,
    background: getBackground(c.backgroundId).name,
  };
}

export function interviewQuestionContext(
  state: GameState,
  session: InterviewSession,
  question: InterviewQuestion,
): InterviewQuestionContext {
  return {
    outlet: session.outlet,
    interviewType: session.type,
    topic: question.topic,
    hostile: question.hostile,
    place: state.election?.jurisdiction.label ?? 'Brasil',
    candidate: candidateBrief(state),
    memories: state.history
      .filter((h) => h.importance >= 2)
      .slice(0, 3)
      .map((h) => h.title),
    baseQuestion: question.text,
  };
}
