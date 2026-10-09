import { getBackground } from '../candidate/backgrounds';
import { GameConstants } from '../config/constants';
import { clamp, round } from '../core/math';
import { OFFICES, type OfficeId } from '../election/offices';
import { partyCompatibility } from '../parties/parties';
import { getDifficulty, getPlayer, getPlayerParty, requireCampaign } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { staffBonus, staffDailyCost } from './staff';
import type { CampaignState, LedgerCategory } from './types';

const C = GameConstants.campaign;

/** Escala monetária: campanhas maiores (eleitorado, cargo) movimentam mais dinheiro. */
export function computeMoneyScale(officeId: OfficeId, totalVoters: number): number {
  const millions = totalVoters / 1_000_000;
  return round(
    OFFICES[officeId].costFactor * Math.max(C.minMoneyScale, millions) ** C.moneyScaleExponent,
    3,
  );
}

export function computeStartingMoney(state: GameState, moneyScale: number): number {
  const party = getPlayerParty(state);
  const player = getPlayer(state);
  const bg = getBackground(player.backgroundId);
  const compat = partyCompatibility(player.ideology, party) / 100;
  const partyFactor = 0.55 + party.money / 100;
  const compatFactor = 1 - GameConstants.party.compatibilityMoneyFactor * (1 - compat) * 0.5;
  return Math.round(
    C.baseStartingMoney *
      moneyScale *
      partyFactor *
      compatFactor *
      bg.moneyMultiplier *
      getDifficulty(state).resources,
  );
}

export function createCampaignState(
  state: GameState,
  moneyScale: number,
  startingMoney?: number,
): CampaignState {
  const party = getPlayerParty(state);
  const money = startingMoney ?? computeStartingMoney(state, moneyScale);
  const militants = Math.round(
    party.militancy *
      C.militantsPerPartyMilitancy *
      Math.max(1, moneyScale) ** C.militantsScaleExponent *
      (0.5 + getPlayer(state).attributes.leadership / 100),
  );
  return {
    money,
    moneyScale,
    ledger: [
      {
        date: state.date,
        amount: money,
        category: 'party_fund',
        description: `Repasse inicial do ${party.acronym}`,
      },
    ],
    energy: C.energyMax,
    staff: [],
    militants,
    enthusiasm: C.baseEnthusiasm,
    ads: [],
    prepBonus: 0,
    totalRaised: money,
    totalSpent: 0,
    log: [],
    impact: [],
    lastDayIncome: 0,
    lastDayExpenses: 0,
    moneyHistory: [{ date: state.date, money }],
  };
}

function pushLedger(campaign: CampaignState, entry: CampaignState['ledger'][number]): void {
  const top = campaign.ledger[0];
  // Lançamentos recorrentes do mesmo dia são consolidados numa única linha.
  if (
    top &&
    top.date === entry.date &&
    top.category === entry.category &&
    top.description === entry.description &&
    Math.sign(top.amount) === Math.sign(entry.amount)
  ) {
    top.amount += entry.amount;
    return;
  }
  campaign.ledger.unshift(entry);
  if (campaign.ledger.length > C.ledgerLimit) campaign.ledger.length = C.ledgerLimit;
}

/** Debita do caixa. Retorna false se não houver saldo (dinheiro não é infinito). */
export function spend(
  state: GameState,
  amount: number,
  category: LedgerCategory,
  description: string,
): boolean {
  const campaign = requireCampaign(state);
  if (amount <= 0) return true;
  if (campaign.money < amount) return false;
  campaign.money -= amount;
  campaign.totalSpent += amount;
  campaign.lastDayExpenses += amount;
  pushLedger(campaign, { date: state.date, amount: -amount, category, description });
  return true;
}

export function earn(
  state: GameState,
  amount: number,
  category: LedgerCategory,
  description: string,
): void {
  const campaign = requireCampaign(state);
  if (amount <= 0) return;
  campaign.money += amount;
  campaign.totalRaised += amount;
  campaign.lastDayIncome += amount;
  pushLedger(campaign, { date: state.date, amount, category, description });
}

/** Arrecadação diária estimada (para o painel e para o tick diário). */
export function estimateDailyIncome(
  state: GameState,
  playerShare: number,
): { party: number; donors: number; militants: number } {
  const campaign = requireCampaign(state);
  const party = getPlayerParty(state);
  const player = getPlayer(state);
  const compat = partyCompatibility(player.ideology, party) / 100;
  const diff = getDifficulty(state).resources;
  const capacity = 0.5 + player.attributes.campaignCapacity / 100;
  const fundraisingBonus = 1 + staffBonus(campaign.staff, 'fundraising');
  const partyDaily =
    C.partyFundDaily * campaign.moneyScale * (party.money / 50) * (0.5 + 0.5 * compat) * diff;
  const donors =
    C.smallDonorDaily *
    campaign.moneyScale *
    (campaign.enthusiasm / 50) *
    clamp(playerShare * 8, 0.1, 3) *
    capacity *
    fundraisingBonus *
    diff;
  const militants =
    campaign.militants * C.militantDonation * (campaign.enthusiasm / 100) * fundraisingBonus * diff;
  return {
    party: Math.round(partyDaily),
    donors: Math.round(donors),
    militants: Math.round(militants),
  };
}

/** Tick financeiro diário: arrecadação e folha de pagamento. */
export function dailyFinance(state: GameState, playerShare: number): void {
  const campaign = requireCampaign(state);
  campaign.lastDayIncome = 0;
  campaign.lastDayExpenses = 0;
  const income = estimateDailyIncome(state, playerShare);
  earn(state, income.party, 'party_fund', 'Fundo partidário');
  earn(state, income.donors, 'donations', 'Doações de apoiadores');
  earn(state, income.militants, 'donations', 'Vaquinha da militância');
  const payroll = Math.round(staffDailyCost(campaign.staff, campaign.moneyScale));
  if (payroll > 0) {
    if (!spend(state, payroll, 'staff', 'Folha da equipe')) {
      // Sem dinheiro para a folha: a equipe vai embora (um por dia), a militância se desanima.
      const leaving = campaign.staff.pop();
      if (leaving) campaign.enthusiasm = clamp(campaign.enthusiasm - 3, 0, 100);
    }
  }
  if (campaign.moneyHistory.at(-1)?.date !== state.date)
    campaign.moneyHistory.push({ date: state.date, money: Math.round(campaign.money) });
  if (campaign.moneyHistory.length > 200) campaign.moneyHistory.shift();
}

export function spendingByCategory(
  campaign: CampaignState,
): Partial<Record<LedgerCategory, number>> {
  const out: Partial<Record<LedgerCategory, number>> = {};
  for (const entry of campaign.ledger)
    if (entry.amount < 0) out[entry.category] = (out[entry.category] ?? 0) - entry.amount;
  return out;
}

export function incomeByCategory(campaign: CampaignState): Partial<Record<LedgerCategory, number>> {
  const out: Partial<Record<LedgerCategory, number>> = {};
  for (const entry of campaign.ledger)
    if (entry.amount > 0) out[entry.category] = (out[entry.category] ?? 0) + entry.amount;
  return out;
}
