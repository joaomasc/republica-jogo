import type { StaffMember, StaffRoleId } from './types';

export type StaffEffectKey =
  | 'actionEffect'
  | 'adEffect'
  | 'gaffeRisk'
  | 'pollDiscount'
  | 'fundraising'
  | 'presenceDecay'
  | 'socialEffect'
  | 'debateBonus'
  | 'interviewBonus'
  | 'energyRegen';

export interface StaffRoleDefinition {
  id: StaffRoleId;
  name: string;
  icon: string;
  description: string;
  /** Salário diário (R$) com escala de dinheiro = 1, nível 1. */
  dailySalary: number;
  effects: Partial<Record<StaffEffectKey, number>>;
}

export const STAFF_LEVELS: Record<1 | 2 | 3, { name: string; salary: number; effect: number }> = {
  1: { name: 'Júnior', salary: 1, effect: 1 },
  2: { name: 'Pleno', salary: 1.8, effect: 1.6 },
  3: { name: 'Sênior', salary: 3, effect: 2.2 },
};

export const STAFF_ROLES: Record<StaffRoleId, StaffRoleDefinition> = {
  coordinator: {
    id: 'coordinator',
    name: 'Coordenador(a) de campanha',
    icon: 'clipboard-check',
    description: '+ efeito de todas as ações de campanha.',
    dailySalary: 2_600,
    effects: { actionEffect: 0.1 },
  },
  marketer: {
    id: 'marketer',
    name: 'Marqueteiro(a)',
    icon: 'sparkles',
    description: '+ eficiência da propaganda paga.',
    dailySalary: 3_200,
    effects: { adEffect: 0.15 },
  },
  press: {
    id: 'press',
    name: 'Assessor(a) de imprensa',
    icon: 'newspaper',
    description: 'Menos gafes e entrevistas melhores.',
    dailySalary: 1_800,
    effects: { gaffeRisk: 0.25, interviewBonus: 0.06 },
  },
  analyst: {
    id: 'analyst',
    name: 'Estatístico(a)',
    icon: 'bar-chart-3',
    description: 'Pesquisas internas mais baratas e precisas.',
    dailySalary: 1_500,
    effects: { pollDiscount: 0.3 },
  },
  treasurer: {
    id: 'treasurer',
    name: 'Captador(a) de recursos',
    icon: 'piggy-bank',
    description: '+ arrecadação diária.',
    dailySalary: 1_900,
    effects: { fundraising: 0.2 },
  },
  regional: {
    id: 'regional',
    name: 'Coordenador(a) regional',
    icon: 'map-pin',
    description: 'A presença nas regiões dura mais.',
    dailySalary: 2_100,
    effects: { presenceDecay: 0.25 },
  },
  social_media: {
    id: 'social_media',
    name: 'Social media',
    icon: 'share-2',
    description: '+ efeito de redes sociais, internet e influenciadores.',
    dailySalary: 1_400,
    effects: { socialEffect: 0.2 },
  },
  coach: {
    id: 'coach',
    name: 'Preparador(a) de debates',
    icon: 'mic-vocal',
    description: '+ desempenho em debates e entrevistas.',
    dailySalary: 1_600,
    effects: { debateBonus: 0.06, interviewBonus: 0.03 },
  },
};

/** Soma dos bônus de um tipo vindo da equipe contratada. */
export function staffBonus(staff: readonly StaffMember[], key: StaffEffectKey): number {
  let total = 0;
  for (const member of staff) {
    const role = STAFF_ROLES[member.roleId];
    const value = role.effects[key];
    if (value) total += value * STAFF_LEVELS[member.level].effect;
  }
  return total;
}

export function staffDailyCost(staff: readonly StaffMember[], moneyScale: number): number {
  let total = 0;
  for (const member of staff)
    total += STAFF_ROLES[member.roleId].dailySalary * STAFF_LEVELS[member.level].salary;
  return total * moneyScale;
}

export function hiringCost(roleId: StaffRoleId, level: 1 | 2 | 3, moneyScale: number): number {
  // Contratação: equivalente a 5 dias de salário (luvas).
  return STAFF_ROLES[roleId].dailySalary * STAFF_LEVELS[level].salary * moneyScale * 5;
}
