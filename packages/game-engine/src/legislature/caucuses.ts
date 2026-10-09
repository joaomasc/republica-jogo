import { clamp, round } from '../core/math';
import type { ActionResult, PartyId } from '../core/types';
import { IDEOLOGY_AXES, type IdeologyAxis, type IdeologyVector } from '../ideology/axes';
import { ideologyAffinity } from '../ideology/ideology';
import { getLawOption } from '../laws/laws.data';
import { isBillActive, type Bill } from '../laws/types';
import { INTEREST_GROUP_IDS } from '../politics/types';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { CAUCUSES } from './caucuses.data';
import { LegislatureConstants as LC } from './constants';
import { baselineOptionId, isPlayerBill, legLog, playerChamberId } from './context';
import { CAUCUS_IDS, type CaucusDefinition, type CaucusId } from './types';

/**
 * Bancadas temáticas (seção 5.4): composição por afinidade ideológica dos partidos nos eixos da
 * bancada, força ligada ao peso (clout) dos grupos de interesse, relação com o jogador e posição
 * sobre cada proposição.
 */

/** Vetor da bancada (eixos ausentes = 50) e pesos (só os eixos da bancada contam). */
function caucusVector(def: CaucusDefinition): {
  vec: IdeologyVector;
  weights: Partial<Record<IdeologyAxis, number>>;
} {
  const vec = {} as IdeologyVector;
  const weights: Partial<Record<IdeologyAxis, number>> = {};
  for (const axis of IDEOLOGY_AXES) {
    const v = def.ideology[axis];
    vec[axis] = v ?? 50;
    weights[axis] = v === undefined ? 0 : 1;
  }
  return { vec, weights };
}

/** Afinidade (0..1) de um vetor ideológico com a bancada, só nos eixos que a definem. */
export function caucusAffinity(ideology: IdeologyVector, id: CaucusId): number {
  const { vec, weights } = caucusVector(CAUCUSES[id]);
  return ideologyAffinity(ideology, vec, weights);
}

/** Peso dos grupos ligados à bancada em relação à média (1 = média); `null` se não há grupos. */
function linkedGroupWeight(state: GameState, def: CaucusDefinition): number | null {
  if (def.interestGroups.length === 0) return null;
  let totalInfluence = 0;
  for (const id of INTEREST_GROUP_IDS) totalInfluence += state.interestGroups[id]?.influence ?? 0;
  const share = (id: (typeof INTEREST_GROUP_IDS)[number]): number => {
    const g = state.interestGroups[id];
    if (!g) return 0;
    if (g.clout !== undefined && Number.isFinite(g.clout)) return g.clout;
    return totalInfluence > 0 ? g.influence / totalInfluence : 1 / INTEREST_GROUP_IDS.length;
  };
  let linked = 0;
  for (const g of def.interestGroups) linked += share(g);
  const expected = def.interestGroups.length / INTEREST_GROUP_IDS.length;
  return expected > 0 ? linked / expected : null;
}

/** Força da bancada (0.15..1; ~0.5 = normal), acompanhando o clout dos grupos ligados. */
export function caucusStrength(state: GameState, id: CaucusId): number {
  const ratio = linkedGroupWeight(state, CAUCUSES[id]);
  if (ratio === null) return 0.5;
  return round(clamp(0.5 * Math.max(0, ratio) ** 0.7, 0.15, 1), 3);
}

/** Peso efetivo da posição da bancada no voto dos membros. */
export function caucusCohesion(state: GameState, id: CaucusId): number {
  const strength = state.legislature.caucuses[id]?.strength ?? 0.5;
  return CAUCUSES[id].cohesion * (0.5 + strength);
}

/**
 * Recalcula os membros de cada bancada por casa e partido. Um parlamentar conta numa só bancada
 * (os segmentos partido × bancada formam uma partição da casa).
 */
export function computeCaucusMembers(state: GameState): void {
  const leg = state.legislature;
  for (const id of CAUCUS_IDS) leg.caucuses[id].members = {};
  for (const chamber of state.congress.chambers) {
    const perParty: Record<PartyId, Partial<Record<CaucusId, number>>> = {};
    for (const id of CAUCUS_IDS) {
      const def = CAUCUSES[id];
      const strength = leg.caucuses[id].strength;
      const target = def.baseSize * chamber.totalSeats * (0.75 + 0.5 * strength);
      const weights: [PartyId, number][] = [];
      let wsum = 0;
      for (const [pid, seats] of Object.entries(chamber.seats)) {
        const party = state.parties[pid];
        if (!party || seats <= 0) continue;
        const w = seats * Math.exp(LC.caucusAffinityExp * (caucusAffinity(party.ideology, id) - 0.5));
        weights.push([pid, w]);
        wsum += w;
      }
      if (wsum <= 0) continue;
      for (const [pid, w] of weights) {
        const seats = chamber.seats[pid] ?? 0;
        const n = Math.min(Math.round((target * w) / wsum), Math.round(seats * LC.caucusMaxPartyShare));
        if (n > 0) (perParty[pid] ??= {})[id] = n;
      }
    }
    // Ninguém em duas bancadas: limita o total de membros por partido.
    for (const [pid, byCaucus] of Object.entries(perParty)) {
      const seats = chamber.seats[pid] ?? 0;
      const cap = Math.round(seats * LC.caucusMaxTotalShare);
      const total = Object.values(byCaucus).reduce((a, b) => a + (b ?? 0), 0);
      const scale = total > cap && total > 0 ? cap / total : 1;
      for (const [id, n] of Object.entries(byCaucus) as [CaucusId, number][]) {
        const m = Math.floor(n * scale);
        if (m <= 0) continue;
        const members = leg.caucuses[id].members;
        (members[chamber.id] ??= {})[pid] = m;
      }
    }
  }
}

/** Relação "natural" da bancada com o jogador (afinidade ideológica e filiação). */
export function initialCaucusRelation(state: GameState, id: CaucusId): number {
  const player = state.candidates[state.playerId];
  if (!player) return 0;
  const base = clamp((caucusAffinity(player.ideology, id) - 0.6) * 150, -40, 40);
  return base + (state.legislature.playerCaucuses.includes(id) ? 20 : 0);
}

/** Força e composição das bancadas (mensal e na posse). `resetRelations` recalcula a relação. */
export function updateCaucuses(state: GameState, resetRelations = false): void {
  const leg = state.legislature;
  for (const id of CAUCUS_IDS) {
    const c = leg.caucuses[id];
    c.strength = caucusStrength(state, id);
    if (resetRelations) c.relation = round(initialCaucusRelation(state, id), 1);
  }
  computeCaucusMembers(state);
}

/** Relações das bancadas voltam devagar ao "natural". */
export function driftCaucusRelations(state: GameState): void {
  for (const id of CAUCUS_IDS) {
    const c = state.legislature.caucuses[id];
    const target = initialCaucusRelation(state, id);
    c.relation = round(c.relation + (target - c.relation) * LC.caucusRelationDrift, 2);
  }
}

/** Total de membros da bancada (numa casa ou em todas). */
export function caucusMembersTotal(state: GameState, id: CaucusId, chamberId?: string): number {
  const members = state.legislature.caucuses[id]?.members ?? {};
  let total = 0;
  for (const [cid, byParty] of Object.entries(members)) {
    if (chamberId && cid !== chamberId) continue;
    for (const n of Object.values(byParty)) total += n;
  }
  return total;
}

/** Posição da bancada sobre a proposição (logit antes da coesão; + = a favor). */
export function caucusPosition(
  state: GameState,
  bill: Bill,
  id: CaucusId,
  playerRelated: boolean,
): number {
  const def = CAUCUSES[id];
  const option = getLawOption(bill.categoryId, bill.optionId);
  const currentId = baselineOptionId(state, bill);
  const current = currentId ? getLawOption(bill.categoryId, currentId) : undefined;
  if (!option) return 0;
  let pos = ((option.caucuses?.[id] ?? 0) - (current?.caucuses?.[id] ?? 0)) * LC.caucusPointLogit;
  const preferred = def.preferredLaws[bill.categoryId];
  if (preferred === bill.optionId) pos += LC.caucusPreferredLogit;
  else if (preferred && preferred === currentId) pos -= LC.caucusPreferredLogit * 0.6;
  const opposed = def.opposedLaws[bill.categoryId] ?? [];
  if (opposed.includes(bill.optionId)) pos -= LC.caucusOpposedLogit;
  else if (currentId && opposed.includes(currentId)) pos += LC.caucusOpposedLogit * 0.6;
  if (playerRelated) pos += (state.legislature.caucuses[id]?.relation ?? 0) * LC.caucusRelationLogit;
  pos += clamp(bill.caucusBonus[id] ?? 0, -LC.caucusBonusMax, LC.caucusBonusMax);
  if (bill.caucusId === id) pos += LC.authorPartyLogit;
  return pos;
}

/** Proposições do jogador ainda em disputa (para bônus de negociação). */
function negotiableBills(state: GameState): Bill[] {
  return state.laws.bills.filter(
    (b) =>
      isBillActive(b) &&
      isPlayerBill(state, b) &&
      (b.status === 'committee' || b.status === 'floor' || b.status === 'veto'),
  );
}

/** Reunião do Executivo com a bancada: capital → relação e apoio aos projetos do governo. */
export function meetCaucus(state: GameState, id: CaucusId): ActionResult {
  const gov = state.government;
  if (!gov || gov.branch !== 'executive')
    return { ok: false, message: 'Só o chefe do Executivo se reúne com as bancadas.' };
  if (gov.politicalCapital < LC.caucusMeetCapital)
    return { ok: false, message: 'Capital político insuficiente.' };
  gov.politicalCapital -= LC.caucusMeetCapital;
  const c = state.legislature.caucuses[id];
  const gain = LC.caucusMeetRelation * (0.6 + getPlayer(state).attributes.negotiation / 100);
  c.relation = round(clamp(c.relation + gain, -100, 100), 1);
  const bills = negotiableBills(state);
  for (const b of bills)
    b.caucusBonus[id] = Math.min(LC.caucusBonusMax, (b.caucusBonus[id] ?? 0) + LC.caucusMeetBonus);
  const name = CAUCUSES[id].name;
  legLog(state, `Reunião do governo com a ${name}.`, 'info');
  state.congress.log.unshift({
    date: state.date,
    partyId: null,
    kind: 'caucus',
    description: `Reunião com a ${name}`,
  });
  if (state.congress.log.length > 60) state.congress.log.length = 60;
  return {
    ok: true,
    message: `Reunião com a ${CAUCUSES[id].shortName}: relação +${Math.round(gain)}.`,
    ...(bills.length ? { details: [`Apoio maior em ${bills.length} projeto(s) do governo`] } : {}),
  };
}

function shiftLinkedGroups(state: GameState, def: CaucusDefinition, delta: number): void {
  for (const gid of def.interestGroups) {
    const g = state.interestGroups[gid];
    if (g) g.approval = clamp(g.approval + delta, 0, 100);
  }
}

/** Jogador parlamentar entra numa bancada (precisa de afinidade com a pauta dela). */
export function joinCaucus(state: GameState, id: CaucusId): ActionResult {
  const leg = state.legislature;
  if (!playerChamberId(state))
    return { ok: false, message: 'Só parlamentares participam de bancadas.' };
  if (leg.playerCaucuses.includes(id)) return { ok: false, message: 'Você já integra a bancada.' };
  const def = CAUCUSES[id];
  const affinity = caucusAffinity(getPlayer(state).ideology, id);
  if (affinity < LC.caucusJoinMinAffinity)
    return {
      ok: false,
      message: `A ${def.shortName} não aceita você: suas posições estão longe da pauta da bancada.`,
    };
  leg.playerCaucuses.push(id);
  const c = leg.caucuses[id];
  c.relation = round(clamp(c.relation + LC.caucusJoinRelation, -100, 100), 1);
  shiftLinkedGroups(state, def, LC.caucusGroupApproval);
  legLog(state, `Você passa a integrar a ${def.name}.`, 'good');
  return { ok: true, message: `Você entrou na ${def.name}.` };
}

/** Jogador parlamentar deixa a bancada. */
export function leaveCaucus(state: GameState, id: CaucusId): ActionResult {
  const leg = state.legislature;
  if (!leg.playerCaucuses.includes(id)) return { ok: false, message: 'Você não integra a bancada.' };
  const def = CAUCUSES[id];
  leg.playerCaucuses = leg.playerCaucuses.filter((c) => c !== id);
  const c = leg.caucuses[id];
  c.relation = round(clamp(c.relation + LC.caucusLeaveRelation, -100, 100), 1);
  shiftLinkedGroups(state, def, -LC.caucusGroupApproval);
  legLog(state, `Você deixa a ${def.name}.`, 'bad');
  return { ok: true, message: `Você saiu da ${def.name}.` };
}
