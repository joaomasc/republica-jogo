import { federalLaws } from '../laws/federal';
import { getLawOption } from '../laws/laws.data';
import type { LawTag } from '../laws/types';
import type { GameState } from '../simulation/state';
import { NationConstants as NC } from './constants';
import type { CountryIdentity, RegimeId } from './types';

/** Opções federais vigentes, com uma troca opcional ainda não gravada (lei que acabou de entrar). */
export function effectiveEnacted(
  state: GameState,
  override?: readonly [categoryId: string, optionId: string],
): Record<string, string> {
  const enacted = { ...federalLaws(state).enacted };
  if (override) enacted[override[0]] = override[1];
  return enacted;
}

/** Quantas opções vigentes carregam a etiqueta. */
export function countTag(enacted: Record<string, string>, tag: LawTag): number {
  let count = 0;
  for (const [categoryId, optionId] of Object.entries(enacted))
    if (getLawOption(categoryId, optionId)?.tags?.includes(tag)) count += 1;
  return count;
}

const ECON_DESCRIPTION: Record<string, string> = {
  econ_laissez_faire: 'economia de livre mercado, com Estado mínimo',
  econ_mixed: 'economia de mercado regulada',
  econ_developmental: 'Estado indutor da industrialização, com planos e bancos públicos',
  econ_cooperative: 'cooperativas e propriedade social dos meios de produção, com mercado',
  econ_planned: 'planejamento central da produção e controle de preços',
};

const ECON_COLOR: Record<string, string> = {
  econ_laissez_faire: '#e9c46a',
  econ_mixed: '#2a9d8f',
  econ_developmental: '#277da1',
  econ_cooperative: '#c9184a',
  econ_planned: '#9d0208',
};

const SOCIAL_DEMOCRACY_COLOR = '#e76f51';
const ONE_PARTY_COLOR = '#6c757d';

/** Rótulo do sistema econômico a partir da lei de sistema econômico e das etiquetas das demais. */
function economicLabel(enacted: Record<string, string>): { label: string; color: string } {
  const econ = enacted.economic_system ?? 'econ_mixed';
  switch (econ) {
    case 'econ_laissez_faire':
      return { label: 'Capitalismo liberal', color: ECON_COLOR.econ_laissez_faire as string };
    case 'econ_developmental':
      return { label: 'Desenvolvimentismo', color: ECON_COLOR.econ_developmental as string };
    case 'econ_cooperative':
      return { label: 'Socialismo de mercado', color: ECON_COLOR.econ_cooperative as string };
    case 'econ_planned':
      return { label: 'Socialismo de Estado', color: ECON_COLOR.econ_planned as string };
    default: {
      const socialDem = countTag(enacted, 'social_democratic');
      const liberal = countTag(enacted, 'liberal');
      if (socialDem >= 4 && socialDem > liberal + 1)
        return { label: 'Social-democracia', color: SOCIAL_DEMOCRACY_COLOR };
      if (liberal >= 4 && liberal > socialDem + 1)
        return { label: 'Economia mista de mercado', color: ECON_COLOR.econ_mixed as string };
      return { label: 'Economia mista', color: ECON_COLOR.econ_mixed as string };
    }
  }
}

function regimeDescription(regime: RegimeId, authoritarian: number): string {
  if (regime === 'one_party') return 'Estado de partido único';
  const base: Record<Exclude<RegimeId, 'one_party'>, string> = {
    presidential: 'presidencialista',
    semi_presidential: 'semipresidencialista',
    parliamentary: 'parlamentarista',
  };
  return authoritarian >= 2
    ? `Regime ${base[regime]} com traços autoritários`
    : `Democracia ${base[regime]}`;
}

/**
 * Identidade do país derivada das leis federais vigentes e do regime (ex.: partido único com
 * economia planificada → "República Popular do Brasil" / "Socialismo de Estado").
 */
export function computeIdentity(
  state: GameState,
  override?: readonly [categoryId: string, optionId: string],
  regimeOverride?: RegimeId,
): CountryIdentity {
  const enacted = effectiveEnacted(state, override);
  const regime = regimeOverride ?? state.nation.regime;
  const econ = enacted.economic_system ?? 'econ_mixed';
  const economic = economicLabel(enacted);
  const socialist =
    econ === 'econ_planned' ||
    econ === 'econ_cooperative' ||
    countTag(enacted, 'communist') + countTag(enacted, 'socialist') >= 2;

  let officialName = 'República Federativa do Brasil';
  if (regime === 'one_party') officialName = socialist ? 'República Popular do Brasil' : 'República do Brasil';
  else if (econ === 'econ_planned') officialName = 'República Socialista do Brasil';

  const planned = econ === 'econ_planned' || econ === 'econ_cooperative';
  const regimeLabel = NC.regimeLabels[regime] ?? regime;
  const systemLabel =
    regime === 'one_party' && planned ? economic.label : `${regimeLabel} · ${economic.label}`;

  const description = `${regimeDescription(regime, countTag(enacted, 'authoritarian'))} com ${
    ECON_DESCRIPTION[econ] ?? ECON_DESCRIPTION.econ_mixed
  }.`;
  const color = regime === 'one_party' && !socialist ? ONE_PARTY_COLOR : economic.color;
  return { officialName, systemLabel, description, color };
}
