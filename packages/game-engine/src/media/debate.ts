import { staffBonus } from '../campaign/staff';
import { addKnowledgeEverywhere, addPopMomentum } from '../campaign/statusOps';
import { attributeFactor, type AttributeId } from '../candidate/attributes';
import type { Candidate } from '../candidate/types';
import { GameConstants } from '../config/constants';
import { clamp, clamp01, clamp100, round } from '../core/math';
import { withRng, type Rng } from '../core/rng';
import type { ActionResult, CandidateId } from '../core/types';
import { latestPoll, rankByPoll } from '../election/polls';
import { addHistory, worstMemory } from '../history/history';
import { ISSUE_DEFINITIONS, ISSUES, type IssueId } from '../ideology/issues';
import { POP_TYPE_IDS, type PopTypeId } from '../population/popTypes';
import { getCandidate, getPlayer, nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { DEBATE_STRATEGIES, type DebateSession, type DebateStrategy } from './interactions';
import { fillTemplate, publishNews } from './news';
import { DEBATE_ATTACKS, DEBATE_MODERATOR, STRATEGY_TEXT } from './textBank';

const D = GameConstants.debate;

interface StrategyProfile {
  base: number;
  sd: number;
  attrs: Partial<Record<AttributeId, number>>;
  audience: Partial<Record<PopTypeId, number>>;
  rejection: number;
  credibility: number;
  enthusiasm: number;
  /** Dano causado ao alvo quando usada em ataque. */
  damage: number;
}

export const STRATEGY_PROFILES: Record<DebateStrategy, StrategyProfile> = {
  technical: {
    base: 0.52,
    sd: 0.1,
    attrs: { experience: 2, management: 1, oratory: 1 },
    audience: {
      middle_class: 1,
      tech_workers: 1,
      business: 1,
      civil_servants: 1,
      health_workers: 0.8,
    },
    rejection: -0.2,
    credibility: 0.5,
    enthusiasm: 0,
    damage: 0.6,
  },
  popular: {
    base: 0.55,
    sd: 0.12,
    attrs: { charisma: 2, communication: 2 },
    audience: { workers: 1, unemployed: 1, industrial_workers: 1, retirees: 0.8, merchants: 0.6 },
    rejection: 0,
    credibility: 0,
    enthusiasm: 1,
    damage: 0.7,
  },
  aggressive: {
    base: 0.55,
    sd: 0.22,
    attrs: { oratory: 2, leadership: 1 },
    audience: { merchants: 0.6, workers: 0.5, farmers: 0.5 },
    rejection: 1.5,
    credibility: 0,
    enthusiasm: 3,
    damage: 1.4,
  },
  conciliatory: {
    base: 0.48,
    sd: 0.08,
    attrs: { negotiation: 2, credibility: 1 },
    audience: { retirees: 0.8, middle_class: 0.6, civil_servants: 0.6 },
    rejection: -1,
    credibility: 0.5,
    enthusiasm: -1,
    damage: 0.3,
  },
  emotional: {
    base: 0.55,
    sd: 0.18,
    attrs: { charisma: 2, communication: 1 },
    audience: { retirees: 1, workers: 0.8, unemployed: 0.8, students: 0.6 },
    rejection: 0,
    credibility: 0,
    enthusiasm: 2,
    damage: 0.8,
  },
  evasive: {
    base: 0.4,
    sd: 0.05,
    attrs: { communication: 1 },
    audience: {},
    rejection: 0.2,
    credibility: -1,
    enthusiasm: -1,
    damage: 0.1,
  },
};

function npcStrategy(rng: Rng, cand: Candidate): DebateStrategy {
  const weights: Record<DebateStrategy, number> = {
    technical: cand.attributes.experience,
    popular: cand.attributes.charisma,
    aggressive: cand.attributes.oratory * 0.8,
    conciliatory: cand.attributes.negotiation * 0.6,
    emotional: cand.attributes.communication * 0.6,
    evasive: 10,
  };
  return rng.weightedPick(DEBATE_STRATEGIES, (s) => weights[s]) ?? 'popular';
}

function strategyScore(rng: Rng, cand: Candidate, strategy: DebateStrategy, bonus: number): number {
  const p = STRATEGY_PROFILES[strategy];
  let s =
    p.base * attributeFactor(cand.attributes, p.attrs, 0.6, 0.8) +
    rng.normal(0, p.sd + D.noiseSd * 0.3) +
    bonus;
  if (strategy === 'emotional' && cand.attributes.credibility < 40) s -= 0.12;
  return clamp01(s);
}

function placeName(state: GameState): string {
  return state.election?.jurisdiction.label ?? 'Brasil';
}

function debateTopics(state: GameState, rng: Rng, rounds: number): (IssueId | 'record')[] {
  const totals: Record<string, number> = {};
  for (const pop of Object.values(state.population.pops))
    for (const issue of ISSUES)
      totals[issue] = (totals[issue] ?? 0) + pop.priorities[issue] * pop.size;
  const top = (Object.entries(totals) as [IssueId, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k);
  const picked = rng.shuffle(top).slice(0, rounds) as (IssueId | 'record')[];
  if (worstMemory(state) && rounds > 2) picked[rounds - 1] = 'record';
  return picked;
}

function attackLine(state: GameState, rng: Rng, attacker: Candidate, target: Candidate): string {
  const memory = target.isPlayer ? worstMemory(state) : null;
  const broken = target.isPlayer ? state.promises.find((p) => p.status === 'broken') : undefined;
  const vars = {
    player: target.ballotName,
    place: placeName(state),
    memory: memory?.title ?? broken?.title ?? '',
  };
  const options: string[] = [DEBATE_ATTACKS.ideology];
  if (memory) options.push(DEBATE_ATTACKS.record);
  if (broken) options.push(DEBATE_ATTACKS.promise);
  if (target.attributes.experience < 45) options.push(DEBATE_ATTACKS.experience);
  if ((state.parties[target.partyId]?.unity ?? 70) < 50) options.push(DEBATE_ATTACKS.party);
  return `${attacker.ballotName}: ${fillTemplate(rng.pick(options), vars)}`;
}

function promptFor(state: GameState, session: DebateSession, rng: Rng): string {
  const topic = session.topics[session.currentRound] ?? 'jobs';
  const topicName =
    topic === 'record' ? 'o seu histórico' : ISSUE_DEFINITIONS[topic].name.toLowerCase();
  if (session.stage === 'answer')
    return `Moderador(a): ${fillTemplate(rng.pick(DEBATE_MODERATOR), { topic: topicName })}`;
  if (session.stage === 'attack')
    return 'Sua vez de perguntar a um adversário. Escolha o alvo e o tom do ataque.';
  if (session.stage === 'counter') return 'Tréplica: feche o confronto.';
  if (session.stage === 'reply' && session.attackerId) {
    return attackLine(state, rng, getCandidate(state, session.attackerId), getPlayer(state));
  }
  return '';
}

export function canStartDebate(state: GameState, debateId: string): string | null {
  if (state.phase !== 'campaign' || !state.election) return 'Debates acontecem durante a campanha.';
  if (state.interactions.debate || state.interactions.interview)
    return 'Já há uma interação em andamento.';
  const debate = state.election.debates.find((d) => d.id === debateId);
  if (!debate || debate.status !== 'scheduled') return 'Debate indisponível.';
  if (debate.date !== state.date) return 'O debate ainda não chegou.';
  return null;
}

export function startDebate(state: GameState, debateId: string): ActionResult {
  const error = canStartDebate(state, debateId);
  const election = state.election;
  if (error || !election) return { ok: false, message: error ?? 'Sem eleição.' };
  const debate = election.debates.find((d) => d.id === debateId);
  if (!debate) return { ok: false, message: 'Debate indisponível.' };
  const poll = latestPoll(state);
  const ranked = (poll ? rankByPoll(poll) : election.candidateIds).filter(
    (id) => election.candidateIds.includes(id) && id !== state.playerId,
  );
  const participants = [
    state.playerId,
    ...ranked.slice(0, GameConstants.election.debateMaxParticipants - 1),
  ];
  debate.participantIds = participants;
  const session = withRng(state, (rng) => {
    const s: DebateSession = {
      id: nextId(state, 'dsess'),
      debateId,
      host: debate.host,
      participants,
      topics: debateTopics(state, rng, D.rounds),
      currentRound: 0,
      totalRounds: D.rounds,
      stage: 'answer',
      attackerId: null,
      defenderId: null,
      prompt: '',
      scores: Object.fromEntries(participants.map((id) => [id, 0])),
      log: [],
      popImpact: {},
      rejectionImpact: 0,
      credibilityImpact: 0,
      enthusiasmImpact: 0,
    };
    s.prompt = promptFor(state, s, rng);
    return s;
  });
  state.interactions.debate = session;
  return { ok: true, message: `Debate na ${debate.host} começou!` };
}

function playerBonus(state: GameState, topic: IssueId | 'record'): number {
  const status = state.election?.participants[state.playerId];
  const focus = topic !== 'record' ? (status?.issueFocus[topic] ?? 0) / 100 : 0;
  const campaign = state.campaign;
  return (
    focus * 0.08 +
    (campaign?.prepBonus ?? 0) * D.prepBonus * 4 +
    (campaign ? staffBonus(campaign.staff, 'debateBonus') : 0)
  );
}

function registerPlayerScore(
  session: DebateSession,
  strategy: DebateStrategy,
  score: number,
): void {
  const p = STRATEGY_PROFILES[strategy];
  session.scores[session.participants[0] ?? ''] =
    (session.scores[session.participants[0] ?? ''] ?? 0) + score;
  for (const [t, w] of Object.entries(p.audience) as [PopTypeId, number][])
    session.popImpact[t] = (session.popImpact[t] ?? 0) + (score - 0.45) * w;
  for (const t of POP_TYPE_IDS)
    session.popImpact[t] = (session.popImpact[t] ?? 0) + (score - 0.5) * 0.4;
  session.rejectionImpact += p.rejection;
  session.credibilityImpact += p.credibility;
  session.enthusiasmImpact += p.enthusiasm;
}

/** Jogada do jogador na etapa atual do debate. */
export function debateMove(
  state: GameState,
  strategy: DebateStrategy,
  targetId?: CandidateId,
): ActionResult {
  const session = state.interactions.debate;
  if (!session || session.stage === 'finished')
    return { ok: false, message: 'Não há debate em andamento.' };
  if (!DEBATE_STRATEGIES.includes(strategy)) return { ok: false, message: 'Estratégia inválida.' };
  const player = getPlayer(state);
  const topic = session.topics[session.currentRound] ?? 'jobs';
  let message = '';

  withRng(state, (rng) => {
    const score = strategyScore(rng, player, strategy, playerBonus(state, topic));
    const verdict = score >= 0.6 ? 'Mandou bem!' : score >= 0.42 ? 'Resposta mediana.' : 'Foi mal.';
    switch (session.stage) {
      case 'answer': {
        registerPlayerScore(session, strategy, score);
        session.log.push({
          round: session.currentRound,
          stage: 'answer',
          speakerId: player.id,
          text: `${player.ballotName} ${STRATEGY_TEXT[strategy].line}`,
          strategy,
          score,
        });
        // Adversários também respondem ao tema.
        for (const id of session.participants.slice(1)) {
          const npc = getCandidate(state, id);
          const s = npcStrategy(rng, npc);
          const sc = strategyScore(rng, npc, s, 0);
          session.scores[id] = (session.scores[id] ?? 0) + sc;
          session.log.push({
            round: session.currentRound,
            stage: 'answer',
            speakerId: id,
            text: `${npc.ballotName} ${STRATEGY_TEXT[s].line}`,
            strategy: s,
            score: sc,
          });
        }
        const playerAttacks = session.currentRound % 2 === 0;
        if (playerAttacks) {
          session.stage = 'attack';
        } else {
          const attackers = session.participants.slice(1);
          session.attackerId = attackers.length ? rng.pick(attackers) : null;
          session.defenderId = player.id;
          session.stage = session.attackerId ? 'reply' : 'answer';
          if (session.attackerId) {
            const attacker = getCandidate(state, session.attackerId);
            session.log.push({
              round: session.currentRound,
              stage: 'attack',
              speakerId: attacker.id,
              targetId: player.id,
              text: attackLine(state, rng, attacker, player),
            });
          } else advanceRound(session);
        }
        message = verdict;
        break;
      }
      case 'attack': {
        const target =
          targetId && session.participants.includes(targetId) && targetId !== player.id
            ? targetId
            : session.participants[1];
        if (!target) {
          advanceRound(session);
          break;
        }
        session.attackerId = player.id;
        session.defenderId = target;
        registerPlayerScore(session, strategy, score);
        const victim = getCandidate(state, target);
        const damage = (score - 0.4) * STRATEGY_PROFILES[strategy].damage;
        session.scores[target] = (session.scores[target] ?? 0) - damage * 0.5;
        const status = state.election?.participants[target];
        if (status) {
          for (const t of POP_TYPE_IDS) addPopMomentum(status, t, -damage * D.momentumScale * 0.5);
          status.rejectionMod += Math.max(0, damage) * D.rejectionScale;
        }
        session.log.push({
          round: session.currentRound,
          stage: 'attack',
          speakerId: player.id,
          targetId: target,
          text: `${player.ballotName} questiona ${victim.ballotName} e ${STRATEGY_TEXT[strategy].line}`,
          strategy,
          score,
        });
        const npcReply = npcStrategy(rng, victim);
        const replyScore = strategyScore(rng, victim, npcReply, 0);
        session.scores[target] = (session.scores[target] ?? 0) + replyScore;
        session.log.push({
          round: session.currentRound,
          stage: 'reply',
          speakerId: target,
          text: `Réplica: ${victim.ballotName} ${STRATEGY_TEXT[npcReply].line}`,
          strategy: npcReply,
          score: replyScore,
        });
        session.stage = 'counter';
        message = verdict;
        break;
      }
      case 'counter': {
        registerPlayerScore(session, strategy, score * 0.8);
        session.log.push({
          round: session.currentRound,
          stage: 'counter',
          speakerId: player.id,
          text: `Tréplica: ${player.ballotName} ${STRATEGY_TEXT[strategy].line}`,
          strategy,
          score,
        });
        advanceRound(session);
        message = verdict;
        break;
      }
      case 'reply': {
        const attackerId = session.attackerId;
        registerPlayerScore(session, strategy, score);
        // A réplica do jogador determina quanto do ataque "colou".
        const absorbed = strategy === 'conciliatory' ? 0.6 : strategy === 'evasive' ? 0.4 : 1;
        if (score < 0.4) session.rejectionImpact += 0.8 * absorbed;
        session.log.push({
          round: session.currentRound,
          stage: 'reply',
          speakerId: player.id,
          text: `Réplica: ${player.ballotName} ${STRATEGY_TEXT[strategy].line}`,
          strategy,
          score,
        });
        if (attackerId) {
          const attacker = getCandidate(state, attackerId);
          const s = npcStrategy(rng, attacker);
          const sc = strategyScore(rng, attacker, s, 0);
          session.scores[attackerId] = (session.scores[attackerId] ?? 0) + sc * 0.8;
          session.log.push({
            round: session.currentRound,
            stage: 'counter',
            speakerId: attackerId,
            text: `Tréplica: ${attacker.ballotName} ${STRATEGY_TEXT[s].line}`,
            strategy: s,
            score: sc,
          });
        }
        advanceRound(session);
        message = verdict;
        break;
      }
      default:
        break;
    }
    if (session.currentRound >= session.totalRounds) finishDebate(state, session);
    else session.prompt = promptFor(state, session, rng);
  });
  return { ok: true, message };
}

function advanceRound(session: DebateSession): void {
  session.currentRound += 1;
  session.stage = 'answer';
  session.attackerId = null;
  session.defenderId = null;
}

function finishDebate(state: GameState, session: DebateSession): void {
  session.stage = 'finished';
  session.prompt = 'Fim do debate.';
  const election = state.election;
  const player = getPlayer(state);
  const ranking = Object.entries(session.scores).sort((a, b) => b[1] - a[1]);
  const winnerId = ranking[0]?.[0] ?? player.id;
  const playerRank = ranking.findIndex(([id]) => id === player.id) + 1;
  const playerAvg = (session.scores[player.id] ?? 0) / Math.max(1, session.totalRounds * 1.8);

  if (election) {
    for (const id of session.participants) {
      const status = election.participants[id];
      if (!status) continue;
      const rel = (session.scores[id] ?? 0) / Math.max(1, session.totalRounds * 1.8);
      addKnowledgeEverywhere(status, election, D.knowledgeGainBase * (0.5 + rel));
      status.debateScore += rel;
      if (id !== player.id) {
        const swing = (rel - 0.45) * D.momentumScale;
        for (const t of POP_TYPE_IDS) addPopMomentum(status, t, swing * 0.6);
      }
    }
    const mine = election.participants[player.id];
    if (mine) {
      for (const [t, v] of Object.entries(session.popImpact) as [PopTypeId, number][])
        addPopMomentum(mine, t, v * D.momentumScale * 0.5);
      mine.rejectionMod += session.rejectionImpact * D.rejectionScale * 0.5;
    }
    const debate = election.debates.find((d) => d.id === session.debateId);
    if (debate) {
      debate.status = 'done';
      debate.winnerId = winnerId;
      debate.playerScore = round(playerAvg, 3);
    }
  }
  player.attributes.credibility = clamp100(
    player.attributes.credibility + clamp(session.credibilityImpact, -4, 3),
  );
  if (state.campaign) {
    state.campaign.enthusiasm = clamp100(
      state.campaign.enthusiasm + session.enthusiasmImpact + (playerRank === 1 ? 6 : 0),
    );
    state.campaign.prepBonus = 0;
  }
  const winner = state.candidates[winnerId];
  publishNews(state, {
    headline:
      winnerId === player.id
        ? `${player.ballotName} vence o debate da ${session.host}, aponta enquete`
        : `${winner?.ballotName ?? 'Adversário'} se destaca no debate; ${player.ballotName} fica em ${playerRank}º`,
    body: 'O debate provocou repercussão nas redes e deve mexer nas próximas pesquisas.',
    category: 'debate',
    sentiment: winnerId === player.id ? 1 : playerRank <= 2 ? 0 : -1,
    importance: 2,
  });
  if (winnerId === player.id || playerRank === session.participants.length) {
    addHistory(state, {
      kind: 'debate',
      title:
        winnerId === player.id
          ? `Venceu o debate da ${session.host}`
          : `Foi mal no debate da ${session.host}`,
      importance: 2,
      sentiment: winnerId === player.id ? 1 : -1,
    });
  }
}

export function closeDebate(state: GameState): void {
  state.interactions.debate = null;
}

/** Recusar um debate ("cadeira vazia") custa caro. */
export function declineDebate(state: GameState, debateId: string): ActionResult {
  const election = state.election;
  const debate = election?.debates.find((d) => d.id === debateId);
  if (!election || !debate || debate.status !== 'scheduled')
    return { ok: false, message: 'Debate indisponível.' };
  debate.status = 'declined';
  const status = election.participants[state.playerId];
  if (status) {
    status.rejectionMod += D.declinePenaltyRejection;
    for (const t of POP_TYPE_IDS) addPopMomentum(status, t, D.declineMomentum);
  }
  const player = getPlayer(state);
  publishNews(state, {
    headline: `Cadeira vazia: ${player.ballotName} falta ao debate da ${debate.host}`,
    category: 'debate',
    sentiment: -1,
    importance: 2,
  });
  return { ok: true, message: 'Você faltou ao debate. Os adversários exploraram sua ausência.' };
}
