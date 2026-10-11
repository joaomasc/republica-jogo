import { deepClone } from '../core/clone';
import { respondToStreet, type StreetResponse } from '../nation/revolt';
import { cancelPublicWork, startPublicWork } from '../economy/works/works';
import type { WorkSize } from '../economy/works/works.data';
import { cancelAdCampaign, createAdCampaign, type AdCampaignInput } from '../campaign/ads';
import { performCampaignAction, type CampaignActionInput } from '../campaign/actions';
import { summarizeAgenda, updateAgenda } from '../campaign/agenda';
import { chooseWeekCard } from '../campaign/weekly';
import { describeImpact, ImpactMeter } from '../campaign/impact';
import type { AgendaConfig, ImpactSource } from '../campaign/types';
import { getCampaignAction } from '../campaign/actions.data';
import { runInternalPoll } from '../campaign/research';
import { fireStaff, hireStaff } from '../campaign/team';
import type { StaffRoleId } from '../campaign/types';
import { foundParty, retire, runForOffice, switchParty, takeBreak } from '../career/career';
import { setPlayerPlatform } from '../laws/platform';
import { performManeuver, type ManeuverId } from '../legislature/maneuvers';
import type { ActionResult, EngineOutput, PartyId, StateId } from '../core/types';
import {
  cancelConstruction,
  orderConstruction,
  setInvestmentPlan,
  setProductionMethod,
} from '../economy/industry/actions';
import type { BuildingId, SectorId } from '../economy/industry/types';
import { issueDecree, revokeDecree } from '../executive/executive';
import type { DecreeKind } from '../executive/types';
import type { BillInstrument } from '../laws/types';
import {
  caucusAction,
  decideSanction,
  gatherSignatures,
  impeachmentAction,
  lobbyRelator,
  negotiateAgenda,
  proposeLegislation,
  requestUrgency,
  runForSpeaker,
  voteOnBill,
} from '../legislature/actions';
import type { CaucusId } from '../legislature/types';
import { setBudgetAllocation } from '../economy/budget';
import type { BudgetCategory } from '../economy/types';
import { continueAfterResults, holdElection } from '../election/flow';
import type { OfficeId } from '../election/offices';
import { resolveEvent } from '../events/events';
import { castPlayerVote, proposeBill, rushBill, withdrawBill } from '../laws/laws';
import { markAlertsRead } from '../media/alerts';
import { closeDebate, debateMove, declineDebate, startDebate } from '../media/debate';
import type { AnswerStyle, DebateStrategy, InterviewType } from '../media/interactions';
import {
  answerInterview,
  answerInterviewFree,
  closeInterview,
  INTERVIEW_TYPE_INFO,
  startInterview,
} from '../media/interview';
import type { CreatePartyInput } from '../parties/parties';
import {
  dismissMinister,
  makeConcession,
  meetParty,
  offerPortfolio,
  publicCampaignForBill,
  releaseAmendments,
} from '../politics/negotiation';
import type { GameState } from './state';
import { advanceDaysDraft, advanceTimeDraft, blockingReason, type TimeStep } from './time';

/** Todas as ações que a interface (ou um cliente multiplayer/bot) pode enviar ao motor. */
export type GameAction =
  | { type: 'time/advance'; step: TimeStep }
  | { type: 'campaign/action'; input: CampaignActionInput }
  | { type: 'campaign/ad'; input: AdCampaignInput }
  | { type: 'campaign/cancelAd'; adId: string }
  | { type: 'campaign/hire'; roleId: StaffRoleId; level: 1 | 2 | 3 }
  | { type: 'campaign/fire'; staffId: string }
  | { type: 'campaign/poll' }
  | { type: 'agenda/update'; agenda: AgendaConfig }
  | { type: 'week/choose'; cardId: string | null }
  | { type: 'event/resolve'; instanceId: string; optionId: string }
  | { type: 'interview/start'; interviewType: InterviewType }
  | { type: 'interview/answer'; answerId: string }
  | { type: 'interview/freeAnswer'; style: AnswerStyle; summary: string }
  | { type: 'interview/close' }
  | { type: 'interview/rewrite'; questionId: string; text: string }
  | { type: 'debate/start'; debateId: string }
  | { type: 'debate/move'; strategy: DebateStrategy; targetId?: string }
  | { type: 'debate/decline'; debateId: string }
  | { type: 'debate/close' }
  | { type: 'election/hold' }
  | { type: 'election/continue' }
  | { type: 'gov/budget'; category: BudgetCategory; amount: number }
  | { type: 'gov/propose'; categoryId: string; optionId: string }
  | { type: 'gov/withdraw'; billId: string }
  | { type: 'gov/rush'; billId: string }
  | { type: 'gov/vote'; billId: string; vote: 'yes' | 'no' | 'abstain' }
  | { type: 'gov/meet'; partyId: PartyId }
  | { type: 'gov/portfolio'; partyId: PartyId; portfolio: string }
  | { type: 'gov/dismiss'; portfolio: string }
  | { type: 'gov/amendments'; partyId: PartyId; billId: string }
  | { type: 'gov/concession'; billId: string }
  | { type: 'gov/publicCampaign'; billId: string }
  | { type: 'career/run'; officeId: OfficeId; stateId: StateId; cityId?: string }
  | { type: 'career/switchParty'; partyId: PartyId }
  | { type: 'career/foundParty'; input: CreatePartyInput }
  | { type: 'career/platform'; platform: Record<string, string> }
  | { type: 'career/retire' }
  | { type: 'career/break' }
  // Economia industrial
  | { type: 'industry/build'; stateId: StateId; buildingId: BuildingId; levels: number }
  | { type: 'works/start'; typeId: string; size: WorkSize; stateId?: StateId }
  | { type: 'works/cancel'; workId: string }
  | { type: 'street/respond'; response: StreetResponse }
  | { type: 'industry/cancel'; projectId: string }
  | { type: 'industry/method'; stateId: StateId; buildingId: BuildingId; methodId: string }
  | { type: 'industry/plan'; weights: Partial<Record<SectorId, number>> | null }
  // Processo legislativo
  | { type: 'leg/propose'; categoryId: string; optionId: string; instrument: BillInstrument }
  | { type: 'leg/vote'; billId: string; vote: 'yes' | 'no' | 'abstain' }
  | { type: 'leg/sanction'; billId: string; decision: 'sanction' | 'veto' }
  | { type: 'leg/urgency'; billId: string }
  | { type: 'leg/agenda'; billId: string }
  | { type: 'leg/relator'; billId: string }
  | { type: 'leg/signatures'; billId: string }
  | { type: 'leg/caucus'; caucusId: CaucusId; op: 'join' | 'leave' | 'meet' }
  | { type: 'leg/speaker'; chamberId: string }
  | { type: 'leg/maneuver'; billId: string; maneuver: ManeuverId; partyId?: PartyId }
  | {
      type: 'leg/impeachment';
      op: 'vote' | 'defend' | 'file';
      vote?: 'yes' | 'no' | 'abstain';
      partyId?: PartyId;
    }
  // Executivo
  | { type: 'exec/decree'; kind: DecreeKind; target?: string | null; value?: number | null }
  | { type: 'exec/revoke'; decreeId: string }
  | { type: 'alerts/read' }
  | { type: 'news/rewrite'; newsId: string; headline: string; body: string };

function apply(state: GameState, action: GameAction): ActionResult {
  switch (action.type) {
    case 'time/advance': {
      const blocked = blockingReason(state);
      if (blocked) return { ok: false, message: blocked };
      const r = advanceTimeDraft(state, action.step);
      const suffix =
        r.interrupt === 'event'
          ? ' Um evento exige sua atenção.'
          : r.interrupt === 'debate'
            ? ' Hoje tem debate!'
            : r.interrupt === 'election_day'
              ? ' Chegou o dia da eleição!'
              : r.interrupt === 'term_end'
                ? ' Seu mandato terminou.'
                : r.interrupt === 'decision'
                  ? ' Uma decisão legislativa aguarda você.'
                  : '';
      const agenda = summarizeAgenda(r.agenda ?? []);
      return {
        ok: true,
        message: `${r.days} dia(s) se passaram.${suffix}`,
        ...(agenda.length ? { details: agenda } : {}),
      };
    }
    case 'campaign/action': {
      const def = getCampaignAction(action.input.actionId);
      if (def && def.days > 0) {
        const blocked = blockingReason(state);
        if (blocked) return { ok: false, message: blocked };
      }
      const outcome = performCampaignAction(state, action.input);
      if (outcome.result.ok && outcome.days > 0) {
        const r = advanceDaysDraft(state, outcome.days);
        if (r.interrupt === 'election_day')
          outcome.result.details = [...(outcome.result.details ?? []), 'Chegou o dia da eleição!'];
      }
      return outcome.result;
    }
    case 'campaign/ad':
      return createAdCampaign(state, action.input);
    case 'campaign/cancelAd':
      return cancelAdCampaign(state, action.adId);
    case 'campaign/hire':
      return hireStaff(state, action.roleId, action.level);
    case 'campaign/fire':
      return fireStaff(state, action.staffId);
    case 'campaign/poll':
      return runInternalPoll(state);
    case 'agenda/update':
      return updateAgenda(state, action.agenda);
    case 'week/choose':
      return chooseWeekCard(state, action.cardId);
    case 'event/resolve':
      return resolveEvent(state, action.instanceId, action.optionId);
    case 'interview/start':
      return startInterview(state, action.interviewType);
    case 'interview/answer':
      return answerInterview(state, action.answerId);
    case 'interview/freeAnswer':
      return answerInterviewFree(state, action.style, action.summary);
    case 'interview/close': {
      const session = state.interactions.interview;
      closeInterview(state);
      // Uma entrevista ocupa o dia (exceto rua/jornal, que são rápidas).
      if (session?.finished && INTERVIEW_TYPE_INFO[session.type].energy >= 8)
        advanceDaysDraft(state, 1);
      return { ok: true, message: 'Entrevista encerrada.' };
    }
    case 'interview/rewrite': {
      const q = state.interactions.interview?.questions.find((x) => x.id === action.questionId);
      if (!q) return { ok: false, message: 'Pergunta não encontrada.' };
      q.text = action.text.slice(0, 600);
      return { ok: true, message: 'Pergunta atualizada.' };
    }
    case 'debate/start':
      return startDebate(state, action.debateId);
    case 'debate/move':
      return debateMove(state, action.strategy, action.targetId);
    case 'debate/decline':
      return declineDebate(state, action.debateId);
    case 'debate/close':
      closeDebate(state);
      return { ok: true, message: 'Debate encerrado.' };
    case 'election/hold':
      return holdElection(state);
    case 'election/continue':
      return continueAfterResults(state);
    case 'gov/budget':
      return setBudgetAllocation(state, action.category, action.amount);
    case 'gov/propose':
      return proposeBill(state, action.categoryId, action.optionId);
    case 'gov/withdraw':
      return withdrawBill(state, action.billId);
    case 'gov/rush':
      return rushBill(state, action.billId);
    case 'gov/vote':
      return castPlayerVote(state, action.billId, action.vote);
    case 'gov/meet':
      return meetParty(state, action.partyId);
    case 'gov/portfolio':
      return offerPortfolio(state, action.partyId, action.portfolio);
    case 'gov/dismiss':
      return dismissMinister(state, action.portfolio);
    case 'gov/amendments':
      return releaseAmendments(state, action.partyId, action.billId);
    case 'gov/concession':
      return makeConcession(state, action.billId);
    case 'gov/publicCampaign':
      return publicCampaignForBill(state, action.billId);
    case 'career/run':
      return runForOffice(state, action.officeId, action.stateId, action.cityId);
    case 'career/switchParty':
      return switchParty(state, action.partyId);
    case 'career/foundParty':
      return foundParty(state, action.input);
    case 'career/platform':
      return setPlayerPlatform(state, action.platform);
    case 'career/retire':
      return retire(state);
    case 'career/break':
      return takeBreak(state);
    case 'works/start':
      return startPublicWork(state, action.typeId, action.size, action.stateId);
    case 'works/cancel':
      return cancelPublicWork(state, action.workId);
    case 'street/respond':
      return respondToStreet(state, action.response);
    case 'industry/build':
      return orderConstruction(state, action.stateId, action.buildingId, action.levels);
    case 'industry/cancel':
      return cancelConstruction(state, action.projectId);
    case 'industry/method':
      return setProductionMethod(state, action.stateId, action.buildingId, action.methodId);
    case 'industry/plan':
      return setInvestmentPlan(state, action.weights);
    case 'leg/propose':
      return proposeLegislation(state, action.categoryId, action.optionId, action.instrument);
    case 'leg/vote':
      return voteOnBill(state, action.billId, action.vote);
    case 'leg/sanction':
      return decideSanction(state, action.billId, action.decision);
    case 'leg/urgency':
      return requestUrgency(state, action.billId);
    case 'leg/agenda':
      return negotiateAgenda(state, action.billId);
    case 'leg/relator':
      return lobbyRelator(state, action.billId);
    case 'leg/signatures':
      return gatherSignatures(state, action.billId);
    case 'leg/caucus':
      return caucusAction(state, action.caucusId, action.op);
    case 'leg/speaker':
      return runForSpeaker(state, action.chamberId);
    case 'leg/maneuver':
      return performManeuver(state, action.billId, action.maneuver, action.partyId);
    case 'leg/impeachment':
      return impeachmentAction(state, action.op, action.vote, action.partyId);
    case 'exec/decree':
      return issueDecree(state, action.kind, action.target ?? null, action.value ?? null);
    case 'exec/revoke':
      return revokeDecree(state, action.decreeId);
    case 'alerts/read':
      markAlertsRead(state);
      return { ok: true, message: 'Alertas lidos.' };
    case 'news/rewrite': {
      const item = state.media.news.find((n) => n.id === action.newsId);
      if (!item) return { ok: false, message: 'Notícia não encontrada.' };
      item.headline = action.headline.slice(0, 200);
      item.body = action.body.slice(0, 1200);
      return { ok: true, message: 'Notícia atualizada.' };
    }
  }
}

/** Ações cujo efeito imediato na intenção de voto é medido e registrado. */
function impactTarget(
  state: GameState,
  action: GameAction,
): { source: ImpactSource; label: string; key: string } | null {
  switch (action.type) {
    case 'interview/answer':
    case 'interview/freeAnswer': {
      const s = state.interactions.interview;
      if (!s) return null;
      return {
        source: 'interview',
        label: `Entrevista: ${INTERVIEW_TYPE_INFO[s.type].name} (${s.outlet})`,
        key: `interview:${s.id}`,
      };
    }
    case 'debate/move':
    case 'debate/close': {
      const s = state.interactions.debate;
      if (!s) return null;
      return { source: 'debate', label: `Debate: ${s.host}`, key: `debate:${s.debateId}` };
    }
    case 'debate/decline': {
      const d = state.election?.debates.find((x) => x.id === action.debateId);
      return {
        source: 'debate',
        label: `Recusou o debate${d ? `: ${d.host}` : ''} (cadeira vazia)`,
        key: `debate:${action.debateId}`,
      };
    }
    case 'event/resolve': {
      const p = state.events.pending.find((x) => x.instanceId === action.instanceId);
      const option = p?.options.find((o) => o.id === action.optionId);
      if (!p) return null;
      return {
        source: 'event',
        label: `${p.title}${option ? ` → ${option.label}` : ''}`,
        key: `event:${p.instanceId}`,
      };
    }
    default:
      return null;
  }
}

/**
 * Ponto único de entrada do motor. Função pura: recebe um estado e uma ação,
 * devolve um NOVO estado (o original nunca é alterado) e o resultado da ação.
 * Se a ação falhar, o estado original é devolvido intacto.
 */
export function dispatch(state: GameState, action: GameAction): EngineOutput<GameState> {
  const draft = deepClone(state);
  const target = impactTarget(draft, action);
  const meter = target ? new ImpactMeter(draft) : null;
  const result = apply(draft, action);
  if (!result.ok) return { state, result };
  if (target && meter?.active) {
    const delta = meter.settle(target.source, target.label, target.key);
    if (delta && (Math.abs(delta.share) >= 1e-4 || Math.abs(delta.rejection) >= 1e-4))
      result.details = [...(result.details ?? []), describeImpact(delta)];
  }
  draft.meta.turn += 1;
  return { state: draft, result };
}
