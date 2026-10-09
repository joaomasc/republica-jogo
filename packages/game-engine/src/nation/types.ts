import type { IsoDate } from '../core/types';
import type { SectorId } from '../economy/industry/types';
import type { LawsState } from '../laws/types';
import type { InterestGroupId } from '../politics/types';

export type RegimeId = 'presidential' | 'semi_presidential' | 'parliamentary' | 'one_party';

export interface Strike {
  id: string;
  groupId: InterestGroupId;
  /** Setor paralisado (null = greve geral). */
  sector: SectorId | null;
  /** Fração da produção perdida no setor (0..1). */
  intensity: number;
  monthsLeft: number;
  label: string;
}

/** Identidade política/econômica do país, derivada das leis (ex.: "República Socialista"). */
export interface CountryIdentity {
  /** Nome oficial do país conforme o regime. */
  officialName: string;
  /** Rótulo do sistema (ex.: "Capitalismo liberal", "Social-democracia", "Socialismo de Estado"). */
  systemLabel: string;
  /** Descrição curta para a interface. */
  description: string;
  /** Cor de destaque para a interface. */
  color: string;
}

export interface ScenarioObjective {
  id: string;
  title: string;
  description: string;
  /** Métrica avaliada mensalmente. */
  metric:
    | 'manufacturing_share'
    | 'gdp_growth_avg'
    | 'unemployment_max'
    | 'inflation_max'
    | 'approval_min'
    | 'law_enacted'
    | 'trade_balance_min'
    | 'industry_levels'
    | 'avg_wage_growth'
    | 'legitimacy_min'
    | 'bills_passed';
  /** Alvo numérico (ou id de opção de lei para `law_enacted`). */
  target: number | string;
  /** Prazo (data) para cumprir; null = até o fim do mandato. */
  deadline: IsoDate | null;
  status: 'active' | 'completed' | 'failed';
  progress: number;
}

export interface NationState {
  /** Legitimidade do regime e das instituições (0..100). Baixa → crises, greves, impeachment. */
  legitimacy: number;
  regime: RegimeId;
  /** Leis FEDERAIS quando o jogador não legisla na esfera federal (senão, ficam em `state.laws`). */
  federalLaws: LawsState | null;
  /** Inquietação social agregada (0..100). */
  unrest: number;
  strikes: Strike[];
  identity: CountryIdentity;
  objectives: ScenarioObjective[];
  /** Linha do tempo de marcos nacionais (mudança de regime, grandes reformas, crises). */
  milestones: { date: IsoDate; title: string; description: string }[];
  /** Clima nas ruas no lugar que o jogador governa (ver nation/revolt.ts). */
  street?: unknown;
}
