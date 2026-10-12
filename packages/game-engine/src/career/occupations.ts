/**
 * ENTRESSAFRA JOGÁVEL — o que o político faz entre um mandato (ou derrota) e a próxima eleição.
 *
 * A ocupação escolhida mexe todo mês em fama, credibilidade e reputação, e traz eventos próprios:
 * o tempo avança em blocos de 6 meses, com uma decisão por bloco.
 */
import { clamp, clamp100 } from '../core/math';
import { addMonths, makeDate, yearOf } from '../core/date';
import type { ActionResult } from '../core/types';
import { rollEvent } from '../events/events';
import { getPlayer, getPlayerParty } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { fastForward } from './career';

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

export interface OccupationDef {
  id: OccupationId;
  name: string;
  icon: string;
  description: string;
  /** Efeito mensal enquanto durar a ocupação. */
  monthly: {
    fame: number;
    credibility: number;
    reputation: number;
    unity?: number;
    scandal?: number;
  };
}

export const OCCUPATIONS: Record<OccupationId, OccupationDef> = {
  secretario: {
    id: 'secretario',
    name: 'Secretário de governo aliado',
    icon: 'landmark',
    description:
      'Mantém visibilidade e experiência de gestão. O desgaste do governo respinga em você.',
    monthly: { fame: 0.3, credibility: 0.05, reputation: 0.05, scandal: 0.1 },
  },
  comentarista: {
    id: 'comentarista',
    name: 'Comentarista de TV e rádio',
    icon: 'tv',
    description: 'Fama em alta; cada opinião faz aliados e inimigos.',
    monthly: { fame: 0.6, credibility: -0.05, reputation: 0 },
  },
  presidente_partido: {
    id: 'presidente_partido',
    name: 'Presidente do partido',
    icon: 'flag',
    description: 'Controle do fundo e das candidaturas — e das brigas internas.',
    monthly: { fame: 0.2, credibility: 0, reputation: 0.05, unity: 0.3 },
  },
  consultor: {
    id: 'consultor',
    name: 'Consultor',
    icon: 'briefcase',
    description: 'Ganha bem e faz contatos. Clientes polêmicos podem virar escândalo.',
    monthly: { fame: -0.1, credibility: -0.05, reputation: 0.05, scandal: 0.15 },
  },
  ong: {
    id: 'ong',
    name: 'ONG ou instituto',
    icon: 'heart-handshake',
    description: 'Credibilidade cresce, a fama nem tanto.',
    monthly: { fame: 0.05, credibility: 0.15, reputation: 0.1 },
  },
  professor: {
    id: 'professor',
    name: 'Professor universitário',
    icon: 'graduation-cap',
    description: 'Credibilidade e rede acadêmica; longe dos holofotes.',
    monthly: { fame: -0.05, credibility: 0.2, reputation: 0.05 },
  },
  profissao: {
    id: 'profissao',
    name: 'Voltar à profissão',
    icon: 'briefcase',
    description: 'Vida normal: neutro, mas a fama cai mais rápido.',
    monthly: { fame: -0.3, credibility: 0.05, reputation: 0 },
  },
  livro: {
    id: 'livro',
    name: 'Escrever um livro',
    icon: 'book-open',
    description: 'Fama e debate público — e o risco de revelações.',
    monthly: { fame: 0.35, credibility: 0.05, reputation: 0.05 },
  },
  influenciador: {
    id: 'influenciador',
    name: 'Influenciador digital',
    icon: 'smartphone',
    description: 'Fama enorme nas redes, credibilidade em baixa.',
    monthly: { fame: 0.8, credibility: -0.15, reputation: -0.05 },
  },
  internacional: {
    id: 'internacional',
    name: 'Cargo internacional',
    icon: 'globe',
    description: 'Prestígio lá fora, distância da base eleitoral.',
    monthly: { fame: 0.1, credibility: 0.15, reputation: 0.1 },
  },
};

/** Efeitos de um mês da ocupação atual (chamado a cada mês avançado fora do cargo). */
export function applyOccupationMonth(state: GameState): void {
  const id = state.career.occupation;
  if (!id || state.phase !== 'career') return;
  const m = OCCUPATIONS[id].monthly;
  const player = getPlayer(state);
  player.fame = clamp100(player.fame + m.fame);
  player.attributes.credibility = clamp100(player.attributes.credibility + m.credibility);
  state.career.reputation = clamp100(state.career.reputation + m.reputation);
  if (m.scandal) player.scandal = clamp(player.scandal + m.scandal, 0, 100);
  if (m.unity) {
    const party = getPlayerParty(state);
    party.unity = clamp100(party.unity + m.unity);
  }
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

/** Avança 6 meses fora do cargo e traz um acontecimento da ocupação para decidir. */
export function advanceCareer(state: GameState): ActionResult {
  if (state.phase !== 'career') return { ok: false, message: 'Indisponível agora.' };
  if (state.events.pending.length > 0)
    return { ok: false, message: 'Resolva o evento pendente primeiro.' };
  const target = addMonths(state.date, 6);
  // Não atravessa o início do ano eleitoral sem o jogador perceber.
  const limit = makeDate(yearOf(state.date) + 2, 1, 15);
  fastForward(state, target < limit ? target : limit);
  rollEvent(state, 1);
  return {
    ok: true,
    message: `Seis meses depois: ${state.date.slice(5, 7)}/${yearOf(state.date)}.`,
  };
}
