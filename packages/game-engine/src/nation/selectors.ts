import { round } from '../core/math';
import { SECTOR_LABELS } from '../executive/labels';
import { federalOption } from '../laws/federal';
import { getLawCategory, getLawOption } from '../laws/laws.data';
import { CAUCUS_LIST } from '../legislature/caucuses.data';
import type { CaucusId } from '../legislature/types';
import { INTEREST_GROUP_IDS, type InterestGroupId } from '../politics/types';
import type { GameState } from '../simulation/state';
import { baseInfluenceOf } from './clout';
import { NationConstants as NC } from './constants';
import { groupRadicalism } from './groups';
import { legitimacyFactors, levelLabel, type LegitimacyFactor } from './legitimacy';
import type { CountryIdentity, RegimeId } from './types';

export interface NationStrikeView {
  id: string;
  groupId: InterestGroupId;
  groupName: string;
  label: string;
  sectorLabel: string;
  /** Fração da produção perdida (0..1). */
  intensity: number;
  monthsLeft: number;
}

export interface NationOverview {
  legitimacy: number;
  legitimacyTarget: number;
  legitimacyLabel: string;
  legitimacyFactors: LegitimacyFactor[];
  regime: { id: RegimeId; label: string };
  identity: CountryIdentity;
  unrest: number;
  unrestLabel: string;
  strikes: NationStrikeView[];
  /** Mais recentes primeiro. */
  milestones: { date: string; title: string; description: string }[];
}

export interface GroupLawView {
  categoryId: string;
  categoryName: string;
  optionId: string;
  optionName: string;
  /** A opção preferida está em vigor na esfera federal. */
  inForce: boolean;
  currentOptionName: string;
}

export interface GroupCaucusView {
  id: CaucusId;
  name: string;
  shortName: string;
  strength: number;
}

export interface InterestGroupView {
  id: InterestGroupId;
  name: string;
  icon: string;
  leaderName: string;
  /** Peso político normalizado (0..1, soma 1). */
  clout: number;
  /** Peso relativo à base histórica (1 = igual ao início). */
  cloutVsBase: number;
  influence: number;
  approval: number;
  radicalism: number;
  radicalismLabel: string;
  striking: boolean;
  preferredLaws: GroupLawView[];
  caucuses: GroupCaucusView[];
}

/** Visão geral da Nação para a interface. */
export function nationOverview(state: GameState): NationOverview {
  const nation = state.nation;
  const { target, factors } = legitimacyFactors(state);
  return {
    legitimacy: round(nation.legitimacy, 1),
    legitimacyTarget: round(target, 1),
    legitimacyLabel: levelLabel(NC.legitimacyLevels, nation.legitimacy),
    legitimacyFactors: factors.map((f) => ({ ...f, value: round(f.value, 1) })),
    regime: { id: nation.regime, label: NC.regimeLabels[nation.regime] ?? nation.regime },
    identity: nation.identity,
    unrest: round(nation.unrest, 1),
    unrestLabel: levelLabel(NC.unrestLevels, nation.unrest),
    strikes: nation.strikes.map((s) => ({
      id: s.id,
      groupId: s.groupId,
      groupName: state.interestGroups[s.groupId]?.name ?? s.groupId,
      label: s.label,
      sectorLabel: s.sector === null ? 'Todos os setores' : SECTOR_LABELS[s.sector],
      intensity: s.intensity,
      monthsLeft: s.monthsLeft,
    })),
    milestones: [...nation.milestones].reverse(),
  };
}

/** Grupos de interesse com peso, humor, radicalismo, leis preferidas e bancadas ligadas (maior peso primeiro). */
export function interestGroupsOverview(state: GameState): InterestGroupView[] {
  const striking = new Set(state.nation.strikes.map((s) => s.groupId));
  const views: InterestGroupView[] = [];
  for (const id of INTEREST_GROUP_IDS) {
    const g = state.interestGroups[id];
    if (!g) continue;
    const preferredLaws: GroupLawView[] = [];
    for (const [categoryId, optionId] of Object.entries(g.preferredLaws)) {
      const category = getLawCategory(categoryId);
      const option = getLawOption(categoryId, optionId);
      if (!category || !option) continue;
      const current = federalOption(state, categoryId);
      preferredLaws.push({
        categoryId,
        categoryName: category.name,
        optionId,
        optionName: option.name,
        inForce: current === optionId,
        currentOptionName: (current && getLawOption(categoryId, current)?.name) || '',
      });
    }
    const caucuses: GroupCaucusView[] = CAUCUS_LIST.filter((c) =>
      c.interestGroups.includes(id),
    ).map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      strength: round(state.legislature.caucuses[c.id]?.strength ?? 0.5, 2),
    }));
    const clout = g.clout ?? 1 / INTEREST_GROUP_IDS.length;
    const baseInfluence = baseInfluenceOf(id);
    views.push({
      id,
      name: g.name,
      icon: g.icon,
      leaderName: g.leaderName,
      clout: round(clout, 4),
      cloutVsBase: round(g.influence / (baseInfluence || 1), 2),
      influence: round(g.influence, 1),
      approval: round(g.approval, 1),
      radicalism: round(groupRadicalism(state, id), 1),
      radicalismLabel: levelLabel(NC.radicalismLevels, groupRadicalism(state, id)),
      striking: striking.has(id),
      preferredLaws,
      caucuses,
    });
  }
  return views.sort((a, b) => b.clout - a.clout);
}

/** Identidade do país (nome oficial, sistema, descrição e cor). */
export function countryIdentity(state: GameState): CountryIdentity {
  return state.nation.identity;
}
