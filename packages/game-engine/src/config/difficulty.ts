export const DIFFICULTY_IDS = ['easy', 'normal', 'hard', 'simulation'] as const;
export type DifficultyId = (typeof DIFFICULTY_IDS)[number];

export interface DifficultyPreset {
  id: DifficultyId;
  name: string;
  description: string;
  /** Multiplicador de dinheiro inicial e arrecadação do jogador. */
  resources: number;
  /** Multiplicador de custos das ações. */
  costs: number;
  /** Multiplicador da volatilidade eleitoral (ruído no dia da eleição). */
  volatility: number;
  /** Multiplicador da frequência de eventos. */
  eventRate: number;
  /** Probabilidade relativa de eventos negativos. */
  negativeEventBias: number;
  /** Força dos adversários (orçamento e eficiência). */
  opponentStrength: number;
  /** Penalidade adicional na aprovação de leis (em logit). */
  lawDifficulty: number;
  /** Multiplicador da margem de erro e do viés das pesquisas. */
  uncertainty: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyPreset> = {
  easy: {
    id: 'easy',
    name: 'Fácil',
    description: 'Mais recursos, adversários fracos e pesquisas precisas.',
    resources: 1.45,
    costs: 0.85,
    volatility: 0.6,
    eventRate: 0.8,
    negativeEventBias: 0.7,
    opponentStrength: 0.75,
    lawDifficulty: -0.4,
    uncertainty: 0.6,
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    description: 'Experiência equilibrada.',
    resources: 1,
    costs: 1,
    volatility: 1,
    eventRate: 1,
    negativeEventBias: 1,
    opponentStrength: 1,
    lawDifficulty: 0,
    uncertainty: 1,
  },
  hard: {
    id: 'hard',
    name: 'Difícil',
    description: 'Recursos escassos, adversários agressivos, Congresso resistente.',
    resources: 0.75,
    costs: 1.15,
    volatility: 1.25,
    eventRate: 1.2,
    negativeEventBias: 1.3,
    opponentStrength: 1.25,
    lawDifficulty: 0.35,
    uncertainty: 1.3,
  },
  simulation: {
    id: 'simulation',
    name: 'Simulação',
    description: 'Alta incerteza e volatilidade: o modelo fala mais alto que o jogador.',
    resources: 0.9,
    costs: 1.05,
    volatility: 1.6,
    eventRate: 1.35,
    negativeEventBias: 1.15,
    opponentStrength: 1.15,
    lawDifficulty: 0.25,
    uncertainty: 1.7,
  },
};
