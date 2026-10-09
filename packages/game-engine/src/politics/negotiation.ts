import { randomName } from '../candidate/names';
import { GameConstants } from '../config/constants';
import { clamp, round } from '../core/math';
import { withRng } from '../core/rng';
import type { ActionResult, PartyId } from '../core/types';
import { OFFICES } from '../election/offices';
import { budgetTotals } from '../economy/budget';
import { addHistory } from '../history/history';
import { ideologyDistance } from '../ideology/ideology';
import { shiftUnity } from '../parties/parties';
import { getPlayer, getPlayerParty } from '../simulation/access';
import type { GameState } from '../simulation/state';

const L = GameConstants.laws;

export const PORTFOLIOS: Record<'federal' | 'estadual' | 'municipal', string[]> = {
  federal: [
    'Fazenda',
    'Saúde',
    'Educação',
    'Justiça e Segurança',
    'Infraestrutura',
    'Agricultura',
    'Trabalho',
    'Meio Ambiente',
    'Ciência e Tecnologia',
    'Cidades',
  ],
  estadual: [
    'Fazenda',
    'Saúde',
    'Educação',
    'Segurança Pública',
    'Infraestrutura',
    'Desenvolvimento',
    'Meio Ambiente',
  ],
  municipal: ['Fazenda', 'Saúde', 'Educação', 'Obras', 'Mobilidade'],
};

function govLevel(state: GameState): 'federal' | 'estadual' | 'municipal' {
  const gov = state.government;
  if (!gov) return 'federal';
  return OFFICES[gov.officeId].level === 'federal' ? 'federal' : gov.jurisdiction.level;
}

function logNegotiation(
  state: GameState,
  partyId: PartyId | null,
  kind: string,
  description: string,
): void {
  state.congress.log.unshift({ date: state.date, partyId, kind, description });
  if (state.congress.log.length > 60) state.congress.log.length = 60;
}

export function availablePortfolios(state: GameState): string[] {
  const used = new Set(state.government?.ministers.map((m) => m.portfolio) ?? []);
  return PORTFOLIOS[govLevel(state)].filter((p) => !used.has(p));
}

export function meetParty(state: GameState, partyId: PartyId): ActionResult {
  const gov = state.government;
  const party = state.parties[partyId];
  if (!gov || !party) return { ok: false, message: 'Negociação indisponível.' };
  if (gov.politicalCapital < L.meetingCapital)
    return { ok: false, message: 'Capital político insuficiente.' };
  gov.politicalCapital -= L.meetingCapital;
  const gain = L.meetingRelationGain * (0.6 + getPlayer(state).attributes.negotiation / 100);
  state.congress.relations[partyId] = clamp(
    (state.congress.relations[partyId] ?? 0) + gain,
    -100,
    100,
  );
  logNegotiation(state, partyId, 'meeting', `Reunião com a liderança do ${party.acronym}`);
  return { ok: true, message: `Reunião com o ${party.acronym}: relação +${round(gain, 0)}.` };
}

/** Oferece um ministério/secretaria: o partido entra na base do governo. */
export function offerPortfolio(
  state: GameState,
  partyId: PartyId,
  portfolio: string,
): ActionResult {
  const gov = state.government;
  const party = state.parties[partyId];
  if (!gov || gov.branch !== 'executive' || !party)
    return { ok: false, message: 'Só o Executivo nomeia ministros/secretários.' };
  if (!availablePortfolios(state).includes(portfolio))
    return { ok: false, message: 'Pasta indisponível.' };
  const slots = GameConstants.government.ministrySlots[govLevel(state)];
  if (gov.ministers.length >= slots)
    return { ok: false, message: 'Não há mais pastas disponíveis.' };
  const name = withRng(state, (rng) => {
    const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
    return { name: `${n.firstName} ${n.lastName}`, competence: Math.round(rng.range(35, 85)) };
  });
  gov.ministers.push({ portfolio, name: name.name, partyId, competence: name.competence });
  const joined = !state.congress.coalition.includes(partyId);
  if (joined) state.congress.coalition.push(partyId);
  state.congress.relations[partyId] = clamp(
    (state.congress.relations[partyId] ?? 0) + L.ministryRelationGain,
    -100,
    100,
  );
  const own = getPlayerParty(state);
  if (partyId !== own.id) {
    // Aliados ideologicamente distantes incomodam as facções do próprio partido.
    const dist = ideologyDistance(own.ideology, party.ideology);
    shiftUnity(own, -dist * 20);
  }
  logNegotiation(state, partyId, 'ministry', `${portfolio} para ${name.name} (${party.acronym})`);
  if (joined)
    addHistory(state, {
      kind: 'alliance',
      title: `${party.acronym} entra na base do governo`,
      importance: 2,
      sentiment: 1,
    });
  return {
    ok: true,
    message: `${name.name} (${party.acronym}) assume ${portfolio}.`,
    details: joined ? [`${party.acronym} agora integra sua base`] : [],
  };
}

export function dismissMinister(state: GameState, portfolio: string): ActionResult {
  const gov = state.government;
  const idx = gov?.ministers.findIndex((m) => m.portfolio === portfolio) ?? -1;
  if (!gov || idx < 0) return { ok: false, message: 'Ministro não encontrado.' };
  const [minister] = gov.ministers.splice(idx, 1);
  if (!minister) return { ok: false, message: 'Ministro não encontrado.' };
  state.congress.relations[minister.partyId] = clamp(
    (state.congress.relations[minister.partyId] ?? 0) - L.dismissRelationLoss,
    -100,
    100,
  );
  const stillHas = gov.ministers.some((m) => m.partyId === minister.partyId);
  const own = getPlayer(state).partyId;
  if (!stillHas && minister.partyId !== own) {
    state.congress.coalition = state.congress.coalition.filter((p) => p !== minister.partyId);
    const party = state.parties[minister.partyId];
    addHistory(state, {
      kind: 'rupture',
      title: `${party?.acronym ?? 'Partido'} deixa a base do governo`,
      importance: 2,
      sentiment: -1,
    });
  }
  logNegotiation(state, minister.partyId, 'dismiss', `Demissão de ${minister.name} (${portfolio})`);
  return { ok: true, message: `${minister.name} foi exonerado(a).` };
}

/** Libera emendas para um partido apoiar um projeto. Custa orçamento e pode virar escândalo. */
export function releaseAmendments(
  state: GameState,
  partyId: PartyId,
  billId: string,
): ActionResult {
  const gov = state.government;
  const party = state.parties[partyId];
  const bill = state.laws.bills.find((b) => b.id === billId && b.status === 'committee');
  if (!gov || !party || !bill) return { ok: false, message: 'Negociação indisponível.' };
  const seats = state.congress.chambers.reduce((a, c) => a + (c.seats[partyId] ?? 0), 0);
  if (seats === 0) return { ok: false, message: 'Esse partido não tem cadeiras.' };
  const budget = gov.budget;
  if (budget) {
    const cost = budgetTotals(budget).spending * L.amendmentCostScale * Math.sqrt(seats);
    budget.balance -= cost;
    budget.amendmentsSpent += cost;
  } else {
    if (gov.politicalCapital < 8) return { ok: false, message: 'Capital político insuficiente.' };
    gov.politicalCapital -= 8;
  }
  bill.partyBonus[partyId] = (bill.partyBonus[partyId] ?? 0) + L.amendmentFactor;
  state.congress.relations[partyId] = clamp(
    (state.congress.relations[partyId] ?? 0) + 5,
    -100,
    100,
  );
  const player = getPlayer(state);
  player.scandal = clamp(player.scandal + 1, 0, 100);
  logNegotiation(state, partyId, 'amendments', `Emendas liberadas ao ${party.acronym}`);
  return { ok: true, message: `Emendas liberadas: o ${party.acronym} tende a apoiar o projeto.` };
}

export function makeConcession(state: GameState, billId: string): ActionResult {
  const bill = state.laws.bills.find((b) => b.id === billId && b.status === 'committee');
  if (!bill) return { ok: false, message: 'Projeto não encontrado.' };
  if (bill.concessions >= L.maxConcessions)
    return { ok: false, message: 'Não dá para desidratar mais o projeto.' };
  bill.concessions += 1;
  logNegotiation(state, null, 'concession', 'Concessão no texto do projeto');
  return {
    ok: true,
    message: `Projeto desidratado (efeito ${Math.round((1 - bill.concessions * L.concessionEffectCut) * 100)}% do original).`,
  };
}

export function publicCampaignForBill(state: GameState, billId: string): ActionResult {
  const gov = state.government;
  const bill = state.laws.bills.find((b) => b.id === billId && b.status === 'committee');
  if (!gov || !bill) return { ok: false, message: 'Projeto não encontrado.' };
  if (bill.publicCampaign) return { ok: false, message: 'A mobilização já está em curso.' };
  if (gov.politicalCapital < L.publicCampaignCapital)
    return { ok: false, message: 'Capital político insuficiente.' };
  gov.politicalCapital -= L.publicCampaignCapital;
  bill.publicCampaign = true;
  logNegotiation(state, null, 'public', 'Mobilização pública pelo projeto');
  return {
    ok: true,
    message:
      gov.approval >= 50
        ? 'A pressão popular ajuda o projeto!'
        : 'Com aprovação baixa, a mobilização terá pouco efeito.',
  };
}
