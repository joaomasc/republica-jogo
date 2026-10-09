import type { IdeologyAxis } from './axes';

/** Temas/prioridades que os eleitores (Pops) valorizam. */
export const ISSUES = [
  'jobs',
  'healthcare',
  'education',
  'security',
  'taxes',
  'inflation',
  'corruption',
  'infrastructure',
  'housing',
  'environment',
  'pensions',
  'regulation',
  'credit',
  'agriculture',
  'technology',
  'transport',
  'welfare',
] as const;

export type IssueId = (typeof ISSUES)[number];
export type IssueWeights = Partial<Record<IssueId, number>>;

export interface IssueDefinition {
  id: IssueId;
  name: string;
  /** Eixos ideológicos que ganham peso quando o tema é prioritário. */
  axes: IdeologyAxis[];
  icon: string;
}

export const ISSUE_DEFINITIONS: Record<IssueId, IssueDefinition> = {
  jobs: { id: 'jobs', name: 'Emprego', axes: ['economy', 'trade'], icon: 'briefcase' },
  healthcare: { id: 'healthcare', name: 'Saúde', axes: ['economy'], icon: 'heart-pulse' },
  education: { id: 'education', name: 'Educação', axes: ['social'], icon: 'graduation-cap' },
  security: { id: 'security', name: 'Segurança', axes: ['security'], icon: 'shield' },
  taxes: { id: 'taxes', name: 'Impostos', axes: ['fiscal'], icon: 'receipt' },
  inflation: {
    id: 'inflation',
    name: 'Inflação',
    axes: ['fiscal', 'economy'],
    icon: 'trending-up',
  },
  corruption: { id: 'corruption', name: 'Corrupção', axes: ['institutions'], icon: 'scale' },
  infrastructure: {
    id: 'infrastructure',
    name: 'Infraestrutura',
    axes: ['federalism', 'economy'],
    icon: 'construction',
  },
  housing: { id: 'housing', name: 'Moradia', axes: ['economy'], icon: 'home' },
  environment: { id: 'environment', name: 'Meio ambiente', axes: ['environment'], icon: 'trees' },
  pensions: {
    id: 'pensions',
    name: 'Previdência',
    axes: ['economy', 'fiscal'],
    icon: 'piggy-bank',
  },
  regulation: {
    id: 'regulation',
    name: 'Burocracia',
    axes: ['economy', 'institutions'],
    icon: 'file-stack',
  },
  credit: { id: 'credit', name: 'Crédito', axes: ['economy'], icon: 'landmark' },
  agriculture: {
    id: 'agriculture',
    name: 'Agropecuária',
    axes: ['environment', 'trade'],
    icon: 'wheat',
  },
  technology: {
    id: 'technology',
    name: 'Tecnologia',
    axes: ['trade', 'institutions'],
    icon: 'cpu',
  },
  transport: { id: 'transport', name: 'Transporte', axes: ['federalism'], icon: 'bus' },
  welfare: {
    id: 'welfare',
    name: 'Assistência social',
    axes: ['economy', 'fiscal'],
    icon: 'hand-heart',
  },
};

export function emptyIssueRecord(value = 0): Record<IssueId, number> {
  const out = {} as Record<IssueId, number>;
  for (const issue of ISSUES) out[issue] = value;
  return out;
}

export function topIssues(weights: IssueWeights, count: number): IssueId[] {
  return (Object.entries(weights) as [IssueId, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([id]) => id);
}
