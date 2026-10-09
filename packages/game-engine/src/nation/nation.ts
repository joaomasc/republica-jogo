import { addMonths, diffMonths } from '../core/date';
import { approach, clamp100 } from '../core/math';
import type { Rng } from '../core/rng';
import { isFederalExecutive } from '../executive/executive';
import { addHistory } from '../history/history';
import { getLawCategory, getLawOption } from '../laws/laws.data';
import type { LawSpecial } from '../laws/types';
import { pushAlert } from '../media/alerts';
import { publishNews } from '../media/news';
import type { GameState } from '../simulation/state';
import { computeClout } from './clout';
import { NationConstants as NC } from './constants';
import { recordMilestone } from './groups';
import { computeIdentity } from './identity';
import { updateUnrestAndLegitimacy } from './legitimacy';
import {
  playerIsOpposition,
  revokePlayerMandate,
  transferSeatsToExecutive,
} from './regime';
import { processStrikes, updateRadicalism } from './strikes';
import type { CountryIdentity, NationState, RegimeId } from './types';

/**
 * Nação: peso dos grupos, radicalismo, greves, legitimidade, regime e identidade do país.
 * Contrato usado pelo tick mensal, pelo processo legislativo (lei entrou em vigor) e pela interface.
 */

export const DEFAULT_IDENTITY: CountryIdentity = {
  officialName: 'República Federativa do Brasil',
  systemLabel: 'Presidencialismo de coalizão · Economia mista',
  description: 'Democracia presidencialista com economia de mercado regulada.',
  color: '#2a9d8f',
};

export function createNationState(): NationState {
  return {
    legitimacy: NC.startingLegitimacy,
    regime: 'presidential',
    federalLaws: null,
    unrest: NC.startingUnrest,
    strikes: [],
    identity: { ...DEFAULT_IDENTITY },
    objectives: [],
    milestones: [],
  };
}

/** Atualiza `clout` (normalizado) e, suavemente, `influence` (0..100 em torno da base). */
function updateClout(state: GameState): void {
  const { clout, influenceTarget } = computeClout(state);
  for (const group of Object.values(state.interestGroups)) {
    group.clout = clout[group.id];
    group.influence = clamp100(
      approach(group.influence, influenceTarget[group.id] ?? group.influence, NC.influenceRate),
    );
  }
}

/** Já houve alerta deste tipo nos últimos meses? (evita repetir o aviso todo mês) */
function recentlyAlerted(state: GameState, kind: string): boolean {
  return state.alerts.some(
    (a) => a.kind === kind && diffMonths(a.date, state.date) < NC.alertCooldownMonths,
  );
}

/**
 * Alertas e marcos de crise de legitimidade e de inquietação. Avisam ao cruzar o limite e, se a
 * queda veio de um choque fora do tick (lei, evento), também no mês seguinte, respeitando o intervalo.
 */
function legitimacyWatch(state: GameState, before: { legitimacy: number; unrest: number }): void {
  const nation = state.nation;
  if (
    nation.legitimacy < NC.legitimacyAlert &&
    (before.legitimacy >= NC.legitimacyAlert || !recentlyAlerted(state, 'legitimacy_low'))
  ) {
    pushAlert(state, {
      kind: 'legitimacy_low',
      severity: 'danger',
      title: 'Crise de legitimidade',
      message: 'As instituições perdem credibilidade: greves, protestos e pedidos de impeachment ganham força.',
      link: 'nation',
    });
  }
  if (nation.legitimacy < NC.legitimacyCrisis) {
    const recent = nation.milestones.some(
      (m) => m.title === 'Crise de legitimidade' && diffMonths(m.date, state.date) < NC.milestoneCrisisCooldownMonths,
    );
    if (!recent) {
      recordMilestone(state, 'Crise de legitimidade', 'A confiança nas instituições desaba.');
      addHistory(state, {
        kind: 'crisis',
        title: 'O país mergulha numa crise de legitimidade',
        importance: 3,
        sentiment: -1,
      });
    }
  }
  if (
    nation.unrest >= NC.unrestAlert &&
    (before.unrest < NC.unrestAlert || !recentlyAlerted(state, 'unrest_high'))
  ) {
    pushAlert(state, {
      kind: 'unrest_high',
      severity: 'warning',
      title: 'Inquietação social elevada',
      message: 'A população está nas ruas; greves e protestos podem se multiplicar.',
      link: 'nation',
    });
  }
}

/** Tick mensal: peso político dos grupos, radicalismo, greves, legitimidade, regime, identidade. */
export function processNationMonth(state: GameState, rng: Rng): void {
  const nation = state.nation;
  updateClout(state);
  updateRadicalism(state);
  processStrikes(state, rng);
  const before = { legitimacy: nation.legitimacy, unrest: nation.unrest };
  updateUnrestAndLegitimacy(state);
  legitimacyWatch(state, before);
  nation.identity = computeIdentity(state);
}

/**
 * Chamado quando o mandato do jogador chega ao fim. Devolve `true` se a Nação tratou o caso
 * (ex.: regime de partido único prorroga o mandato sem eleição) e o fim normal não deve ocorrer.
 */
export function handleTermEnd(state: GameState): boolean {
  const gov = state.government;
  if (!gov || state.nation.regime !== 'one_party' || !isFederalExecutive(state)) return false;
  gov.endDate = addMonths(gov.endDate, NC.oneParty.termExtensionMonths);
  const nation = state.nation;
  nation.legitimacy = clamp100(nation.legitimacy - NC.oneParty.termExtensionLegitimacyHit);
  const years = NC.oneParty.termExtensionMonths / 12;
  publishNews(state, {
    headline: `Mandato é prorrogado por ${years} anos sem eleição`,
    body: 'O regime de partido único dispensa o voto para a chefia do Executivo.',
    category: 'government',
    sentiment: -1,
    importance: 3,
  });
  addHistory(state, {
    kind: 'reform',
    title: `Mandato prorrogado por ${years} anos pelo regime de partido único`,
    importance: 3,
    sentiment: -1,
  });
  recordMilestone(state, 'Mandato prorrogado', 'O fim do mandato passa sem eleições.');
  return true;
}

const REGIME_OF: Record<LawSpecial, RegimeId> = {
  presidential: 'presidential',
  semi_presidential: 'semi_presidential',
  parliamentary: 'parliamentary',
  one_party: 'one_party',
};

const REGIME_HEADLINE: Record<RegimeId, string> = {
  presidential: 'País adota o presidencialismo',
  semi_presidential: 'País adota o semipresidencialismo',
  parliamentary: 'País adota o parlamentarismo',
  one_party: 'Partido único é instituído e a oposição é extinta',
};

function applyRegimeChange(state: GameState, special: LawSpecial): boolean {
  const regime = REGIME_OF[special];
  if (state.nation.regime === regime) return false;
  state.nation.regime = regime;
  if (regime === 'one_party') {
    transferSeatsToExecutive(state);
    if (playerIsOpposition(state)) revokePlayerMandate(state);
  }
  return true;
}

/**
 * Chamado pelo processo legislativo quando uma opção de lei ENTRA EM VIGOR (fim da implementação
 * ou MP editada). Executa efeitos especiais (mudança de regime), choques de legitimidade e
 * atualiza a identidade do país.
 */
export function onLawEnacted(state: GameState, categoryId: string, optionId: string): void {
  const option = getLawOption(categoryId, optionId);
  if (!option) return;
  const nation = state.nation;
  const before = nation.identity;

  const regimeChanged = option.special ? applyRegimeChange(state, option.special) : false;
  if (option.legitimacyShock) nation.legitimacy = clamp100(nation.legitimacy + option.legitimacyShock);
  nation.identity = computeIdentity(state, [categoryId, optionId]);

  const categoryName = getLawCategory(categoryId)?.name ?? categoryId;
  if (regimeChanged && option.special) {
    const regime = REGIME_OF[option.special];
    const headline = REGIME_HEADLINE[regime];
    publishNews(state, {
      headline,
      body: option.description,
      category: 'government',
      sentiment: regime === 'one_party' ? -1 : 0,
      importance: 3,
    });
    addHistory(state, { kind: 'reform', title: headline, importance: 3 });
    recordMilestone(state, headline, `${categoryName}: ${option.name}.`);
  } else if (Math.abs(option.legitimacyShock ?? 0) >= NC.milestoneShock) {
    recordMilestone(state, option.name, `${categoryName}: entra em vigor e abala a legitimidade.`);
  }

  const identityChanged =
    before.officialName !== nation.identity.officialName ||
    before.systemLabel !== nation.identity.systemLabel;
  if (identityChanged) {
    const nameChanged = before.officialName !== nation.identity.officialName;
    recordMilestone(
      state,
      nameChanged ? `País passa a se chamar ${nation.identity.officialName}` : nation.identity.systemLabel,
      nation.identity.description,
    );
    if (nameChanged)
      publishNews(state, {
        headline: `País passa a se chamar ${nation.identity.officialName}`,
        category: 'government',
        importance: 3,
      });
  }
}
