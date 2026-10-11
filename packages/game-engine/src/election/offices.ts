import type { StateId } from '../core/types';
import { cityCouncilSeats, cityOf } from '../map/cities';
import { stateAssemblySeats, STATES } from '../map/states';

export const OFFICE_IDS = [
  'vereador',
  'prefeito',
  'deputado_estadual',
  'deputado_federal',
  'senador',
  'governador',
  'presidente',
] as const;
export type OfficeId = (typeof OFFICE_IDS)[number];
export type OfficeLevel = 'municipal' | 'estadual' | 'federal';

export interface OfficeDefinition {
  id: OfficeId;
  name: string;
  icon: string;
  level: OfficeLevel;
  branch: 'executive' | 'legislative';
  system: 'majoritarian' | 'proportional';
  /** Há segundo turno se ninguém atingir maioria absoluta dos votos válidos. */
  runoff: boolean;
  termYears: number;
  cycle: 'general' | 'municipal';
  minAge: number;
  campaignDays: number;
  /** Multiplicador de dinheiro/custos (campanhas legislativas são mais baratas). */
  costFactor: number;
  opponents: number;
  unitsKind: 'states' | 'stateZones' | 'cityZones';
  legislatureName: string;
  /** Limite de mandatos consecutivos (executivo). */
  termLimit?: number;
  prestige: number;
  description: string;
  rules: string[];
}

export const OFFICES: Record<OfficeId, OfficeDefinition> = {
  vereador: {
    id: 'vereador',
    name: 'Vereador(a)',
    icon: 'home',
    level: 'municipal',
    branch: 'legislative',
    system: 'proportional',
    runoff: false,
    termYears: 4,
    cycle: 'municipal',
    minAge: 18,
    campaignDays: 50,
    costFactor: 0.18,
    opponents: 8,
    unitsKind: 'cityZones',
    legislatureName: 'Câmara Municipal',
    prestige: 1,
    description: 'Representa os bairros da cidade na Câmara Municipal.',
    rules: [
      'Eleição proporcional: votos do partido definem cadeiras',
      'Disputa por zonas da cidade',
      'Mandato de 4 anos',
    ],
  },
  prefeito: {
    id: 'prefeito',
    name: 'Prefeito(a)',
    icon: 'building',
    level: 'municipal',
    branch: 'executive',
    system: 'majoritarian',
    runoff: true,
    termYears: 4,
    cycle: 'municipal',
    minAge: 21,
    campaignDays: 55,
    costFactor: 0.6,
    opponents: 4,
    unitsKind: 'cityZones',
    legislatureName: 'Câmara Municipal',
    termLimit: 2,
    prestige: 3,
    description: 'Governa a cidade: orçamento municipal, vereadores e serviços locais.',
    rules: [
      'Maioria absoluta ou segundo turno',
      'Orçamento municipal',
      'Precisa negociar com a Câmara',
    ],
  },
  deputado_estadual: {
    id: 'deputado_estadual',
    name: 'Deputado(a) Estadual',
    icon: 'landmark',
    level: 'estadual',
    branch: 'legislative',
    system: 'proportional',
    runoff: false,
    termYears: 4,
    cycle: 'general',
    minAge: 21,
    campaignDays: 55,
    costFactor: 0.2,
    opponents: 8,
    unitsKind: 'stateZones',
    legislatureName: 'Assembleia Legislativa',
    prestige: 2,
    description: 'Legisla na Assembleia do seu estado.',
    rules: ['Eleição proporcional estadual', 'Disputa por regiões do estado', 'Mandato de 4 anos'],
  },
  deputado_federal: {
    id: 'deputado_federal',
    name: 'Deputado(a) Federal',
    icon: 'landmark',
    level: 'federal',
    branch: 'legislative',
    system: 'proportional',
    runoff: false,
    termYears: 4,
    cycle: 'general',
    minAge: 21,
    campaignDays: 55,
    costFactor: 0.28,
    opponents: 8,
    unitsKind: 'stateZones',
    legislatureName: 'Câmara dos Deputados',
    prestige: 3,
    description: 'Representa seu estado na Câmara dos Deputados.',
    rules: ['Eleição proporcional pelo estado', 'Bancada fixa por estado', 'Vota leis nacionais'],
  },
  senador: {
    id: 'senador',
    name: 'Senador(a)',
    icon: 'scroll',
    level: 'federal',
    branch: 'legislative',
    system: 'majoritarian',
    runoff: false,
    termYears: 8,
    cycle: 'general',
    minAge: 35,
    campaignDays: 55,
    costFactor: 0.5,
    opponents: 4,
    unitsKind: 'stateZones',
    legislatureName: 'Senado Federal',
    prestige: 4,
    description: 'Uma vaga por estado, eleição majoritária de turno único.',
    rules: ['Mais votado vence (turno único)', 'Mandato de 8 anos', 'Vota leis nacionais'],
  },
  governador: {
    id: 'governador',
    name: 'Governador(a)',
    icon: 'castle',
    level: 'estadual',
    branch: 'executive',
    system: 'majoritarian',
    runoff: true,
    termYears: 4,
    cycle: 'general',
    minAge: 30,
    campaignDays: 60,
    costFactor: 0.7,
    opponents: 4,
    unitsKind: 'stateZones',
    legislatureName: 'Assembleia Legislativa',
    termLimit: 2,
    prestige: 5,
    description: 'Governa o estado: orçamento estadual, segurança, saúde e educação.',
    rules: ['Maioria absoluta ou segundo turno', 'Orçamento estadual', 'Negocia com a Assembleia'],
  },
  presidente: {
    id: 'presidente',
    name: 'Presidente',
    icon: 'crown',
    level: 'federal',
    branch: 'executive',
    system: 'majoritarian',
    runoff: true,
    termYears: 4,
    cycle: 'general',
    minAge: 35,
    campaignDays: 60,
    costFactor: 1,
    opponents: 5,
    unitsKind: 'states',
    legislatureName: 'Congresso Nacional',
    termLimit: 2,
    prestige: 6,
    description: 'Disputa nacional nos 27 estados. Governa o país e negocia com o Congresso.',
    rules: ['Maioria absoluta ou segundo turno', 'Orçamento federal', 'Câmara e Senado'],
  },
};

export const OFFICE_LIST: OfficeDefinition[] = OFFICE_IDS.map((id) => OFFICES[id]);

export function getOffice(id: OfficeId): OfficeDefinition {
  return OFFICES[id];
}

/** Número de cadeiras em disputa (eleições proporcionais) no estado ou na cidade. */
export function officeSeats(officeId: OfficeId, stateId: StateId, cityId?: string | null): number {
  switch (officeId) {
    case 'vereador':
      return cityCouncilSeats(stateId, cityId);
    case 'deputado_estadual':
      return stateAssemblySeats(stateId);
    case 'deputado_federal':
      return STATES[stateId].federalSeats;
    default:
      return 1;
  }
}

/** Ano da próxima eleição para o cargo a partir de um ano de referência. */
export function nextElectionYear(officeId: OfficeId, fromYear: number): number {
  const base = OFFICES[officeId].cycle === 'general' ? 2026 : 2028;
  if (fromYear <= base) return base;
  return base + Math.ceil((fromYear - base) / 4) * 4;
}

export interface Jurisdiction {
  level: OfficeLevel;
  stateId: StateId | null;
  /** Cidade (código IBGE) nas esferas municipais; ausente = capital (saves antigos). */
  cityId?: string;
  label: string;
}

export function jurisdictionFor(
  officeId: OfficeId,
  stateId: StateId,
  cityId?: string | null,
): Jurisdiction {
  const office = OFFICES[officeId];
  const state = STATES[stateId];
  if (office.level === 'federal' && office.unitsKind === 'states')
    return { level: 'federal', stateId: null, label: 'Brasil' };
  if (office.unitsKind === 'cityZones') {
    const city = cityOf(stateId, cityId);
    return { level: 'municipal', stateId, cityId: city.id, label: `${city.name} (${state.id})` };
  }
  return {
    level: office.level === 'federal' ? 'estadual' : office.level,
    stateId,
    label: state.name,
  };
}
