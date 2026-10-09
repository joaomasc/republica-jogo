import { applyProposal } from '../campaign/promises';
import { getProposal, PROPOSALS } from '../campaign/proposals';
import { staffBonus } from '../campaign/staff';
import { addKnowledgeEverywhere, addPopMomentum } from '../campaign/statusOps';
import { attributeFactor, type AttributeId } from '../candidate/attributes';
import { GameConstants } from '../config/constants';
import { clamp, clamp01, clamp100, formatPct, round } from '../core/math';
import { withRng, type Rng } from '../core/rng';
import type { ActionResult } from '../core/types';
import { OFFICES } from '../election/offices';
import { latestPoll } from '../election/polls';
import { worstMemory } from '../history/history';
import { shiftIdeology } from '../ideology/ideology';
import { ISSUE_DEFINITIONS, ISSUES, type IssueId } from '../ideology/issues';
import { POP_TYPE_IDS, POP_TYPES } from '../population/popTypes';
import { getPlayer, getPlayerParty, getPlayerStatus, nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import type { MediaChannel } from './channels';
import type {
  AnswerStyle,
  InterviewAnswer,
  InterviewQuestion,
  InterviewSession,
  InterviewType,
} from './interactions';
import { fillTemplate, publishNews } from './news';
import { INTERVIEW_HOSTS } from './outlets';
import {
  EMPATHETIC_ANSWERS,
  EVASIVE_ANSWERS,
  HOSTILE_ANSWERS,
  HOSTILE_QUESTIONS,
  ISSUE_QUESTIONS,
  TECHNICAL_ANSWERS,
} from './textBank';

const I = GameConstants.interview;

export const INTERVIEW_TYPE_INFO: Record<
  InterviewType,
  { name: string; channel: MediaChannel; reach: number; energy: number; icon: string }
> = {
  tv: { name: 'Televisão', channel: 'tv', reach: 1.5, energy: 12, icon: 'tv' },
  radio: { name: 'Rádio', channel: 'radio', reach: 1, energy: 8, icon: 'radio' },
  newspaper: { name: 'Jornal', channel: 'newspaper', reach: 0.6, energy: 6, icon: 'newspaper' },
  podcast: { name: 'Podcast', channel: 'podcast', reach: 0.8, energy: 8, icon: 'mic' },
  street: {
    name: 'Entrevista de rua',
    channel: 'events',
    reach: 0.5,
    energy: 6,
    icon: 'footprints',
  },
  press_conference: {
    name: 'Coletiva de imprensa',
    channel: 'newspaper',
    reach: 1,
    energy: 10,
    icon: 'users',
  },
};

const STYLE_PROFILE: Record<
  AnswerStyle,
  { base: number; sd: number; attrs: Partial<Record<AttributeId, number>> }
> = {
  firm: { base: 0.55, sd: 0.14, attrs: { oratory: 2, credibility: 1 } },
  technical: { base: 0.5, sd: 0.1, attrs: { experience: 2, management: 1 } },
  evasive: { base: 0.38, sd: 0.06, attrs: { communication: 1 } },
  attack: { base: 0.5, sd: 0.22, attrs: { oratory: 1, charisma: 1 } },
  empathetic: { base: 0.55, sd: 0.14, attrs: { charisma: 2, communication: 1 } },
  promise: { base: 0.58, sd: 0.15, attrs: { charisma: 1, credibility: 2 } },
};

function placeName(state: GameState): string {
  const j = state.election?.jurisdiction ?? state.government?.jurisdiction;
  return j?.label ?? 'Brasil';
}

function regionUnemployment(state: GameState): number {
  const stateId = state.election?.jurisdiction.stateId;
  return round(
    stateId
      ? (state.regions[stateId]?.unemployment ?? state.economy.unemployment)
      : state.economy.unemployment,
    1,
  );
}

function topElectorateIssues(state: GameState, count: number): IssueId[] {
  const totals: Record<string, number> = {};
  const units = state.election?.units ?? [];
  for (const unit of units) {
    for (const up of unit.pops) {
      const pop = state.population.pops[up.popId];
      if (!pop) continue;
      for (const issue of ISSUES)
        totals[issue] = (totals[issue] ?? 0) + pop.priorities[issue] * up.voters;
    }
  }
  return (Object.entries(totals) as [IssueId, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([k]) => k);
}

function issueQuestion(state: GameState, rng: Rng, issue: IssueId, qid: string): InterviewQuestion {
  const level = state.election ? OFFICES[state.election.officeId].level : 'federal';
  const vars = {
    place: placeName(state),
    unemployment: regionUnemployment(state),
    inflation: round(state.economy.inflation, 1),
  };
  const text = fillTemplate(rng.pick(ISSUE_QUESTIONS[issue]), vars);
  const proposals = PROPOSALS.filter((p) => p.issue === issue && p.levels.includes(level));
  const answers: InterviewAnswer[] = [];
  const shuffled = rng.shuffle(proposals).slice(0, 2);
  shuffled.forEach((p, i) => {
    answers.push({
      id: `${qid}_p${i}`,
      text: `Defender: ${p.title.toLowerCase()} — ${p.description}`,
      style: 'promise',
      ideologyShift: p.ideologyShift,
      issue,
      proposalId: p.id,
    });
  });
  answers.push({ id: `${qid}_t`, text: rng.pick(TECHNICAL_ANSWERS), style: 'technical', issue });
  if (answers.length < 4)
    answers.push({
      id: `${qid}_e`,
      text: rng.pick(EMPATHETIC_ANSWERS),
      style: 'empathetic',
      issue,
    });
  answers.push({ id: `${qid}_v`, text: rng.pick(EVASIVE_ANSWERS), style: 'evasive' });
  return { id: qid, topic: ISSUE_DEFINITIONS[issue].name, issue, text, hostile: false, answers };
}

function hostileQuestion(state: GameState, rng: Rng, qid: string): InterviewQuestion | null {
  const memory = worstMemory(state);
  const broken = state.promises.find((p) => p.status === 'broken');
  const party = getPlayerParty(state);
  const poll = latestPoll(state);
  const share = poll?.total.shares[state.playerId] ?? null;
  const player = getPlayer(state);
  const options: { key: keyof typeof HOSTILE_QUESTIONS; vars: Record<string, string> }[] = [];
  if (memory) options.push({ key: 'scandal', vars: { memory: memory.title } });
  if (broken) options.push({ key: 'promise', vars: { memory: broken.title } });
  if (party.unity < 55) options.push({ key: 'party', vars: { party: party.acronym } });
  if (share !== null && share < 0.1)
    options.push({ key: 'polls', vars: { share: formatPct(share) } });
  if (player.attributes.experience < 40) options.push({ key: 'experience', vars: {} });
  if (options.length === 0) return null;
  const pick = rng.pick(options);
  return {
    id: qid,
    topic: 'Pergunta difícil',
    text: fillTemplate(HOSTILE_QUESTIONS[pick.key], pick.vars),
    hostile: true,
    answers: [
      { id: `${qid}_em`, text: HOSTILE_ANSWERS.empathetic, style: 'empathetic' },
      { id: `${qid}_te`, text: HOSTILE_ANSWERS.technical, style: 'technical' },
      { id: `${qid}_at`, text: HOSTILE_ANSWERS.attack, style: 'attack' },
      { id: `${qid}_ev`, text: HOSTILE_ANSWERS.evasive, style: 'evasive' },
    ],
  };
}

export function canStartInterview(state: GameState, type: InterviewType): string | null {
  if (state.phase !== 'campaign' || !state.election || !state.campaign)
    return 'Entrevistas acontecem durante a campanha.';
  if (state.interactions.interview || state.interactions.debate)
    return 'Já há uma entrevista ou debate em andamento.';
  if (state.events.pending.length > 0) return 'Resolva o evento pendente primeiro.';
  if (state.campaign.energy < INTERVIEW_TYPE_INFO[type].energy) return 'Energia insuficiente.';
  return null;
}

export function startInterview(state: GameState, type: InterviewType): ActionResult {
  const error = canStartInterview(state, type);
  if (error) return { ok: false, message: error };
  const info = INTERVIEW_TYPE_INFO[type];
  if (state.campaign) state.campaign.energy = clamp(state.campaign.energy - info.energy, 0, 100);
  const session = withRng(state, (rng) => {
    const hosts = INTERVIEW_HOSTS[type] ?? { outlets: ['Imprensa'], hosts: ['Jornalista'] };
    const issues = rng.shuffle(topElectorateIssues(state, 5));
    const questions: InterviewQuestion[] = [];
    const id = nextId(state, 'int');
    const hostileChance = type === 'press_conference' || type === 'newspaper' ? 0.8 : 0.5;
    for (let i = 0; i < I.questions; i++) {
      const qid = `${id}_q${i}`;
      const hostile =
        i === I.questions - 1 && rng.chance(hostileChance)
          ? hostileQuestion(state, rng, qid)
          : null;
      questions.push(
        hostile ?? issueQuestion(state, rng, issues[i % issues.length] ?? 'jobs', qid),
      );
    }
    const s: InterviewSession = {
      id,
      type,
      outlet: rng.pick(hosts.outlets),
      host: rng.pick(hosts.hosts),
      questions,
      index: 0,
      results: [],
      finished: false,
    };
    return s;
  });
  state.interactions.interview = session;
  return { ok: true, message: `Entrevista com ${session.outlet} começou.` };
}

/** Responde à pergunta atual da entrevista. O motor decide a repercussão — a IA (se houver) só redige textos. */
export function answerInterview(state: GameState, answerId: string): ActionResult {
  const session = state.interactions.interview;
  if (!session || session.finished)
    return { ok: false, message: 'Não há entrevista em andamento.' };
  const question = session.questions[session.index];
  const answer = question?.answers.find((a) => a.id === answerId);
  if (!question || !answer) return { ok: false, message: 'Resposta inválida.' };
  return resolveAnswer(state, session, question, answer);
}

/**
 * Resposta livre: o texto foi CLASSIFICADO (pela IA ou heurística local) num estilo conhecido.
 * A repercussão continua sendo calculada pelo motor.
 */
export function answerInterviewFree(
  state: GameState,
  style: AnswerStyle,
  summary: string,
): ActionResult {
  const session = state.interactions.interview;
  if (!session || session.finished)
    return { ok: false, message: 'Não há entrevista em andamento.' };
  const question = session.questions[session.index];
  if (!question) return { ok: false, message: 'Pergunta inválida.' };
  return resolveAnswer(state, session, question, {
    id: `${question.id}_free`,
    text: summary.slice(0, 300),
    style,
  });
}

function resolveAnswer(
  state: GameState,
  session: InterviewSession,
  question: InterviewQuestion,
  answer: InterviewAnswer,
): ActionResult {
  const player = getPlayer(state);
  const status = getPlayerStatus(state);
  const info = INTERVIEW_TYPE_INFO[session.type];
  const profile = STYLE_PROFILE[answer.style];
  const details: string[] = [];

  const score = withRng(state, (rng) => {
    const attr = attributeFactor(player.attributes, profile.attrs, 0.6, 0.8);
    let s = profile.base * attr + rng.normal(0, profile.sd);
    if (question.hostile && (answer.style === 'empathetic' || answer.style === 'technical'))
      s += 0.06;
    if (question.hostile && answer.style === 'evasive') s -= 0.05;
    if (session.type === 'newspaper' || session.type === 'podcast')
      s += answer.style === 'technical' ? 0.06 : 0;
    if (session.type === 'street' || session.type === 'tv')
      s += answer.style === 'empathetic' ? 0.05 : 0;
    s +=
      (state.campaign?.prepBonus ?? 0) * 0.5 +
      (state.campaign ? staffBonus(state.campaign.staff, 'interviewBonus') : 0);
    return clamp01(s);
  });

  if (status && state.election) {
    addKnowledgeEverywhere(status, state.election, I.knowledgeGain * info.reach * (0.5 + score));
    const swing = (score - 0.45) * I.momentumScale * info.reach;
    for (const t of POP_TYPE_IDS)
      addPopMomentum(status, t, swing * POP_TYPES[t].media[info.channel]);
    if (answer.ideologyShift && !answer.proposalId)
      status.perceivedIdeology = shiftIdeology(status.perceivedIdeology, answer.ideologyShift, 0.6);
    if (answer.style === 'attack') {
      status.rejectionMod += 1;
      if (state.campaign) state.campaign.enthusiasm = clamp100(state.campaign.enthusiasm + 2);
    }
    if (answer.style === 'empathetic' && score > 0.55) status.rejectionMod -= 0.5;
    if (score < 0.3) {
      status.rejectionMod += 1.5;
      details.push('Resposta mal recebida: rejeição subiu');
    }
  }
  if (answer.style === 'evasive') {
    player.attributes.credibility = clamp100(player.attributes.credibility - 1);
    details.push('Credibilidade -1');
  }
  if (answer.proposalId) {
    const proposal = getProposal(answer.proposalId);
    if (proposal) details.push(...applyProposal(state, proposal, 0.8));
  }

  const verdict =
    score >= 0.6 ? 'Ótima resposta' : score >= 0.42 ? 'Resposta razoável' : 'Resposta ruim';
  session.results.push({
    questionId: question.id,
    answerId: answer.id,
    score: round(score, 3),
    summary: verdict,
  });
  session.index += 1;
  if (session.index >= session.questions.length) finishInterview(state, session);
  return { ok: true, message: verdict, details };
}

function finishInterview(state: GameState, session: InterviewSession): void {
  session.finished = true;
  const avg =
    session.results.reduce((a, r) => a + r.score, 0) / Math.max(1, session.results.length);
  const player = getPlayer(state);
  const good = avg >= 0.52;
  publishNews(state, {
    headline: good
      ? `Entrevista de ${player.ballotName} ao ${session.outlet} repercute bem`
      : `${player.ballotName} se enrola em entrevista ao ${session.outlet}`,
    category: 'interview',
    sentiment: good ? 1 : -1,
    outlet: session.outlet,
  });
}

/**
 * Resposta que a assessoria escolhe quando a entrevista é automática (agenda):
 * maior nota esperada para os atributos do candidato, sem prometer, atacar ou mudar de posição.
 */
export function pickAutoAnswer(state: GameState): InterviewAnswer | null {
  const session = state.interactions.interview;
  const question = session?.questions[session.index];
  if (!session || !question) return null;
  const player = getPlayer(state);
  const safe = question.answers.filter(
    (a) => a.style !== 'promise' && a.style !== 'attack' && !a.proposalId,
  );
  const pool = safe.length > 0 ? safe : question.answers;
  let best: InterviewAnswer | null = null;
  let bestScore = -Infinity;
  for (const a of pool) {
    const p = STYLE_PROFILE[a.style];
    let s = p.base * attributeFactor(player.attributes, p.attrs, 0.6, 0.8) - 0.5 * p.sd;
    if (question.hostile && (a.style === 'empathetic' || a.style === 'technical')) s += 0.06;
    if (question.hostile && a.style === 'evasive') s -= 0.05;
    if ((session.type === 'newspaper' || session.type === 'podcast') && a.style === 'technical')
      s += 0.06;
    if ((session.type === 'street' || session.type === 'tv') && a.style === 'empathetic') s += 0.05;
    if (a.style === 'evasive') s -= 0.03; // custa credibilidade
    if (a.ideologyShift) s -= 0.02;
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return best;
}

/** Fecha a janela da entrevista concluída. */
export function closeInterview(state: GameState): void {
  state.interactions.interview = null;
}

export function interviewAverage(session: InterviewSession): number {
  return session.results.reduce((a, r) => a + r.score, 0) / Math.max(1, session.results.length);
}
