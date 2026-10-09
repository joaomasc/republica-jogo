import { clamp, clamp100 } from '../core/math';
import type { Rng } from '../core/rng';
import { SECTOR_LABELS } from '../executive/labels';
import { addHistory } from '../history/history';
import { pushAlert } from '../media/alerts';
import { publishNews } from '../media/news';
import type { InterestGroupId } from '../politics/types';
import { nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { NationConstants as NC } from './constants';
import { groupRadicalism, recordMilestone, shiftGroupRadicalism } from './groups';
import type { Strike } from './types';

/** Radicalismo: aprovação baixa sobe, alta cai; a inquietação social acima de 50 empurra para cima. */
export function updateRadicalism(state: GameState): void {
  const unrestPush = Math.max(0, state.nation.unrest - 50) * NC.radicalismUnrestFactor;
  for (const group of Object.values(state.interestGroups)) {
    const pressure = clamp((NC.radicalismNeutralApproval - group.approval) / 50, -1, 1);
    const delta = (pressure > 0 ? NC.radicalismRise : NC.radicalismFall) * pressure + unrestPush;
    group.radicalism = clamp100(groupRadicalism(state, group.id) + delta);
  }
}

function groupName(state: GameState, id: InterestGroupId): string {
  return state.interestGroups[id]?.name ?? id;
}

function hasStrike(state: GameState, id: InterestGroupId): boolean {
  return state.nation.strikes.some((s) => s.groupId === id);
}

/** Probabilidade mensal de o grupo parar, conforme o excesso de radicalismo sobre o limiar. */
export function strikeChance(radicalism: number): number {
  if (radicalism < NC.strikeThreshold) return 0;
  const excess = (radicalism - NC.strikeThreshold) / 30;
  return Math.min(NC.strikeMaxChance, NC.strikeBaseChance + NC.strikeChanceSlope * excess);
}

function startStrike(
  state: GameState,
  rng: Rng,
  groupId: InterestGroupId,
  sector: Strike['sector'],
  intensity: number,
  label: string,
  headline: string,
): void {
  const strike: Strike = {
    id: nextId(state, 'strike'),
    groupId,
    sector,
    intensity: Math.round(intensity * 1000) / 1000,
    monthsLeft: rng.int(NC.strikeMonths[0], NC.strikeMonths[1]),
    label,
  };
  state.nation.strikes.push(strike);
  state.nation.unrest = clamp100(state.nation.unrest + NC.strikeUnrestBump);
  if (state.government)
    state.government.approval = clamp100(state.government.approval - NC.strikeApprovalHit);
  const where = sector === null ? 'em todo o país' : `no setor: ${SECTOR_LABELS[sector].toLowerCase()}`;
  publishNews(state, {
    headline,
    body: `${label} ${where}; a produção cai cerca de ${Math.round(strike.intensity * 100)}% enquanto durar.`,
    category: 'economy',
    sentiment: -1,
    importance: sector === null ? 3 : 2,
  });
  pushAlert(state, {
    kind: 'strike',
    severity: sector === null ? 'danger' : 'warning',
    title: label,
    message: `${groupName(state, groupId)} param por cerca de ${strike.monthsLeft} meses.`,
    link: 'nation',
  });
  if (sector === null) {
    recordMilestone(state, 'Greve geral', 'Os sindicatos paralisam o país.');
    addHistory(state, { kind: 'crisis', title: 'Greve geral paralisa o país', importance: 3, sentiment: -1 });
  }
}

/** Fuga de capitais: os empresários tiram dinheiro do país. */
function capitalFlight(state: GameState): void {
  const ind = state.industry;
  ind.investmentPool *= 1 - NC.capitalFlightPrivateLoss;
  ind.foreignPool *= 1 - NC.capitalFlightForeignLoss;
  state.market.exchangeRate *= 1 + NC.capitalFlightExchange;
  state.economy.confidence = clamp100(state.economy.confidence - NC.capitalFlightConfidence);
  shiftGroupRadicalism(state, 'business', -NC.capitalFlightRelief);
  state.nation.unrest = clamp100(state.nation.unrest + NC.strikeUnrestBump);
  publishNews(state, {
    headline: 'Empresários tiram dinheiro do país e o real se desvaloriza',
    body: 'Os fundos de investimento encolhem e o câmbio sobe.',
    category: 'economy',
    sentiment: -1,
    importance: 3,
  });
  pushAlert(state, {
    kind: 'capital_flight',
    severity: 'danger',
    title: 'Fuga de capitais',
    message: 'O setor empresarial, radicalizado, retira investimentos; o câmbio sobe.',
    link: 'nation',
  });
  recordMilestone(state, 'Fuga de capitais', 'Investidores deixam o país em protesto.');
}

function launchFor(state: GameState, rng: Rng, groupId: InterestGroupId): void {
  const radicalism = groupRadicalism(state, groupId);
  switch (groupId) {
    case 'unions': {
      if (radicalism >= NC.generalStrikeThreshold && rng.chance(NC.generalStrikeShare)) {
        const [lo, hi] = NC.generalStrikeIntensity;
        startStrike(
          state,
          rng,
          groupId,
          null,
          rng.range(lo, hi),
          'Greve geral',
          'Centrais sindicais convocam greve geral',
        );
        return;
      }
      const sector = rng.pick(NC.unionStrikeSectors);
      const [lo, hi] = NC.sectorStrikeIntensity;
      startStrike(
        state,
        rng,
        groupId,
        sector,
        rng.range(lo, hi),
        `Greve na ${SECTOR_LABELS[sector].toLowerCase()}`,
        `Sindicatos param a ${SECTOR_LABELS[sector].toLowerCase()}`,
      );
      return;
    }
    case 'workers':
      startStrike(
        state,
        rng,
        groupId,
        'services',
        NC.truckersIntensity,
        'Greve dos caminhoneiros',
        'Caminhoneiros bloqueiam estradas e a logística trava',
      );
      return;
    case 'agribusiness':
      startStrike(
        state,
        rng,
        groupId,
        'agro',
        NC.lockoutIntensity,
        'Locaute do agronegócio',
        'Produtores rurais suspendem entregas em protesto',
      );
      return;
    case 'civil_servants':
      startStrike(
        state,
        rng,
        groupId,
        'public',
        NC.publicStrikeIntensity,
        'Greve do funcionalismo',
        'Servidores públicos cruzam os braços',
      );
      return;
    case 'business':
      capitalFlight(state);
      return;
    default:
      return;
  }
}

/** Greves em andamento (contagem regressiva) e novas paralisações dos grupos radicalizados. */
export function processStrikes(state: GameState, rng: Rng): void {
  const remaining: Strike[] = [];
  for (const strike of state.nation.strikes) {
    strike.monthsLeft -= 1;
    if (strike.monthsLeft > 0) {
      remaining.push(strike);
      continue;
    }
    shiftGroupRadicalism(state, strike.groupId, -NC.strikeRelief);
    publishNews(state, {
      headline: `${strike.label} chega ao fim`,
      category: 'economy',
      sentiment: 0,
      importance: 1,
    });
  }
  state.nation.strikes = remaining;

  for (const groupId of NC.strikeGroups) {
    if (!state.interestGroups[groupId] || hasStrike(state, groupId)) continue;
    const radicalism = groupRadicalism(state, groupId);
    if (radicalism < NC.strikeThreshold) continue;
    const chance = groupId === 'business' ? NC.capitalFlightChance : strikeChance(radicalism);
    if (rng.chance(chance)) launchFor(state, rng, groupId);
  }
}

/** Fração de produção perdida num setor por greves em andamento (0..0,9). */
export function strikeLossForSector(state: GameState, sector: Strike['sector']): number {
  let kept = 1;
  for (const s of state.nation.strikes)
    if (s.sector === null || s.sector === sector) kept *= 1 - s.intensity;
  return 1 - kept;
}
