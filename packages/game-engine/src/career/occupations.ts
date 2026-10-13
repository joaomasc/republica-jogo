/**
 * OCUPAÇÕES DA ENTRESSAFRA — o que o político faz entre um mandato (ou derrota) e a próxima eleição.
 *
 * Cada ocupação mexe todo mês em fama, credibilidade, reputação e nos recursos da pré-campanha
 * (base eleitoral e caixa), e traz eventos próprios. Alguns efeitos dependem do mundo: o
 * secretário colhe a avaliação do governo em que trabalha; o internacional se afasta da base.
 * O avanço por marcos e as decisões de cada bloco ficam em `interlude.ts`.
 */
import { GameConstants } from '../config/constants';
import { clamp, clamp100 } from '../core/math';
import type { ActionResult } from '../core/types';
import { nationalSatisfaction } from '../legislature/plebiscite';
import { governmentScore } from '../parties/parties';
import { getPlayer, getPlayerParty } from '../simulation/access';
import type { GameState } from '../simulation/state';

export const OCCUPATION_IDS = [
  'secretario',
  'comentarista',
  'presidente_partido',
  'consultor',
  'ong',
  'professor',
  'profissao',
  'livro',
  'influenciador',
  'internacional',
] as const;
export type OccupationId = (typeof OCCUPATION_IDS)[number];

/** Efeito mensal de uma ocupação. */
export interface OccupationMonthly {
  fame: number;
  credibility: number;
  reputation: number;
  unity?: number;
  scandal?: number;
  /** Base eleitoral no alvo (pontos por mês; soma-se à perda natural). */
  base?: number;
  /** Caixa da pré-campanha (fração do caixa inicial por mês). */
  warChest?: number;
}

export interface OccupationDef {
  id: OccupationId;
  name: string;
  icon: string;
  description: string;
  monthly: OccupationMonthly;
  /** Em uma frase: o que a ocupação dá e tira para a próxima campanha. */
  tradeoff: string;
}

export const OCCUPATIONS: Record<OccupationId, OccupationDef> = {
  secretario: {
    id: 'secretario',
    name: 'Secretário de governo aliado',
    icon: 'landmark',
    description:
      'Mantém visibilidade e experiência de gestão. O desgaste do governo respinga em você.',
    monthly: { fame: 0.3, credibility: 0.05, reputation: 0.05, scandal: 0.1, base: 0.5 },
    tradeoff: 'Base no estado e fama; a credibilidade sobe ou desce com a avaliação do governo.',
  },
  comentarista: {
    id: 'comentarista',
    name: 'Comentarista de TV e rádio',
    icon: 'tv',
    description: 'Fama em alta; cada opinião faz aliados e inimigos.',
    monthly: { fame: 0.6, credibility: -0.05, reputation: 0 },
    tradeoff: 'Fama (conhecimento inicial alto); um pouco de credibilidade a menos.',
  },
  presidente_partido: {
    id: 'presidente_partido',
    name: 'Presidente do partido',
    icon: 'flag',
    description: 'Controle do fundo e das candidaturas — e das brigas internas.',
    monthly: { fame: 0.2, credibility: 0, reputation: 0.05, unity: 0.3, warChest: 0.01 },
    tradeoff: 'Partido unido e parte do fundo para você; pouca fama.',
  },
  consultor: {
    id: 'consultor',
    name: 'Consultor',
    icon: 'briefcase',
    description: 'Ganha bem e faz contatos. Clientes polêmicos podem virar escândalo.',
    monthly: {
      fame: -0.1,
      credibility: -0.05,
      reputation: 0.05,
      scandal: 0.15,
      warChest: 0.025,
    },
    tradeoff: 'Caixa para a campanha; risco de escândalo e fama em queda.',
  },
  ong: {
    id: 'ong',
    name: 'ONG ou instituto',
    icon: 'heart-handshake',
    description: 'Credibilidade cresce, a fama nem tanto.',
    monthly: { fame: 0.05, credibility: 0.15, reputation: 0.1, base: 0.7 },
    tradeoff: 'Credibilidade e base comunitária no alvo; pouca fama.',
  },
  professor: {
    id: 'professor',
    name: 'Professor universitário',
    icon: 'graduation-cap',
    description: 'Credibilidade e rede acadêmica; longe dos holofotes.',
    monthly: { fame: -0.05, credibility: 0.2, reputation: 0.05 },
    tradeoff: 'A maior alta de credibilidade (menos rejeição); a fama some.',
  },
  profissao: {
    id: 'profissao',
    name: 'Voltar à profissão',
    icon: 'briefcase',
    description: 'Vida normal: neutro, mas a fama cai mais rápido.',
    monthly: { fame: -0.3, credibility: 0.05, reputation: 0, warChest: 0.01 },
    tradeoff: 'Um pouco de caixa guardado; a fama cai rápido.',
  },
  livro: {
    id: 'livro',
    name: 'Escrever um livro',
    icon: 'book-open',
    description: 'Fama e debate público — e o risco de revelações.',
    monthly: { fame: 0.35, credibility: 0.05, reputation: 0.05 },
    tradeoff: 'Fama e credibilidade moderadas; eventos de revelação.',
  },
  influenciador: {
    id: 'influenciador',
    name: 'Influenciador digital',
    icon: 'smartphone',
    description: 'Fama enorme nas redes, credibilidade em baixa.',
    monthly: { fame: 0.8, credibility: -0.15, reputation: -0.05 },
    tradeoff: 'A maior fama; credibilidade e reputação em queda (mais rejeição).',
  },
  internacional: {
    id: 'internacional',
    name: 'Cargo internacional',
    icon: 'globe',
    description: 'Prestígio lá fora, distância da base eleitoral.',
    monthly: { fame: 0.1, credibility: 0.15, reputation: 0.1, base: -0.6 },
    tradeoff: 'Credibilidade e reputação; a base eleitoral se dissolve.',
  },
};

/**
 * Efeito mensal efetivo da ocupação (com o que depende do mundo). O secretário colhe a
 * avaliação do governo: credibilidade de −0,1 a +0,2 por mês.
 */
export function occupationMonthly(state: GameState, id: OccupationId): OccupationMonthly {
  const m = OCCUPATIONS[id].monthly;
  if (id === 'secretario') {
    const score = governmentScore(nationalSatisfaction(state));
    return { ...m, credibility: m.credibility + 0.15 * score };
  }
  return m;
}

/** Fama líquida por ano (ocupação − perda natural de quem está fora do cargo). */
export function occupationNetFamePerYear(state: GameState, id: OccupationId): number {
  return occupationMonthly(state, id).fame * 12 - GameConstants.career.fameDecayPerYearOutOfOffice;
}

/** Efeitos de um mês da ocupação atual (chamado a cada mês avançado fora do cargo). */
export function applyOccupationMonth(state: GameState): void {
  if (state.phase !== 'career') return;
  const I = GameConstants.career.interlude;
  const interlude = state.career.interlude;
  if (interlude) interlude.base = clamp(interlude.base - I.baseDecayPerMonth, 0, 100);
  const id = state.career.occupation;
  if (!id) return;
  const m = occupationMonthly(state, id);
  const player = getPlayer(state);
  player.fame = clamp100(player.fame + m.fame);
  player.attributes.credibility = clamp100(player.attributes.credibility + m.credibility);
  state.career.reputation = clamp100(state.career.reputation + m.reputation);
  if (m.scandal) player.scandal = clamp(player.scandal + m.scandal, 0, 100);
  if (m.unity) {
    const party = getPlayerParty(state);
    party.unity = clamp100(party.unity + m.unity);
  }
  if (interlude && m.base) interlude.base = clamp(interlude.base + m.base, 0, 100);
  if (interlude && m.warChest)
    interlude.warChest = clamp(interlude.warChest + m.warChest, 0, I.warChestMax);
}

export function chooseOccupation(state: GameState, id: OccupationId | null): ActionResult {
  if (state.phase !== 'career') return { ok: false, message: 'Só fora do cargo.' };
  if (id !== null && !OCCUPATIONS[id]) return { ok: false, message: 'Ocupação inválida.' };
  state.career.occupation = id;
  return {
    ok: true,
    message: id ? `Agora você é: ${OCCUPATIONS[id].name.toLowerCase()}.` : 'Sem ocupação definida.',
  };
}
