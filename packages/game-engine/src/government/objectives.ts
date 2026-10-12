/**
 * OBJETIVOS DE MANDATO (banco de conteúdo, seção 16).
 *
 * No início do mandato o jogo oferece 6 objetivos da esfera; o jogador escolhe até 3 nos primeiros
 * meses. Ao fim do mandato, cada objetivo cumprido dá reputação e credibilidade.
 */
import { GameConstants } from '../config/constants';
import { withRng } from '../core/rng';
import type { ActionResult, StateId } from '../core/types';
import type { GameState } from '../simulation/state';

const O = GameConstants.objectives;

type Level = 'municipal' | 'estadual' | 'federal' | 'legislativo';

export interface ObjectiveDef {
  id: string;
  title: string;
  levels: Level[];
  /** Cumprido agora? (avaliado ao vivo e no fim do mandato). */
  check: (s: GameState) => boolean;
}

export interface ObjectivesState {
  offered: string[];
  chosen: string[];
  /** Valores de referência do início do mandato. */
  baseline: { unemployment: number; inflation: number };
}

const chose = (s: GameState, eventId: string, optionId = 'a') =>
  s.events.choices?.[eventId] === optionId;
const decided = (s: GameState, cardKey: string) =>
  s.government?.decisions?.includes(cardKey) ?? false;
const unemploymentNow = (s: GameState): number => {
  const gov = s.government;
  const stateId = gov?.jurisdiction.stateId as StateId | null | undefined;
  return gov && gov.jurisdiction.level !== 'federal' && stateId
    ? (s.regions[stateId]?.unemployment ?? s.economy.unemployment)
    : s.economy.unemployment;
};
const inaugurationsThisTerm = (s: GameState): number => {
  const start = s.government?.startDate ?? '9999';
  return s.history.filter((h) => h.title.startsWith('Inaugurou:') && h.date >= start).length;
};

export const OBJECTIVES: ObjectiveDef[] = [
  // Executivo (qualquer esfera)
  {
    id: 'sem_deficit',
    title: 'Terminar o mandato sem déficit',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) => (s.government?.budget?.balance ?? -1) >= 0,
  },
  {
    id: 'desemprego_menos2',
    title: 'Reduzir o desemprego em 2 pontos',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) =>
      !!s.government?.objectives &&
      unemploymentNow(s) <= s.government.objectives.baseline.unemployment - 2,
  },
  {
    id: 'aprovacao_50',
    title: 'Manter aprovação acima de 50% por 2 anos',
    levels: ['municipal', 'estadual', 'federal', 'legislativo'],
    check: (s) => {
      const h = s.government?.approvalHistory ?? [];
      return h.length >= 24 && h.slice(-24).every((x) => x.value >= 50);
    },
  },
  {
    id: 'obras_3',
    title: 'Inaugurar 3 obras',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) => inaugurationsThisTerm(s) >= 3,
  },
  {
    id: 'sem_greve',
    title: 'Nenhuma greve de servidores',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) => !!s.government && !s.government.hadServantsStrike,
  },
  {
    id: 'promessas_100',
    title: 'Cumprir todas as promessas',
    levels: ['municipal', 'estadual', 'federal', 'legislativo'],
    check: (s) => s.promises.length > 0 && s.promises.every((p) => p.status === 'fulfilled'),
  },
  {
    id: 'governo_digital',
    title: 'Implantar governo digital',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) => decided(s, 'governo_digital'),
  },
  {
    id: 'concurso',
    title: 'Concurso público para saúde e educação',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) => decided(s, 'concurso'),
  },
  {
    id: 'comissionados',
    title: 'Cortar cargos comissionados',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) => decided(s, 'corte_comissionados') || chose(s, 'est_cargos_comissionados'),
  },
  {
    id: 'industria',
    title: 'Atrair uma grande indústria',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) =>
      decided(s, 'atracao_industria') || (s.events.firedCount.est_montadora_resposta ?? 0) > 0,
  },
  {
    id: 'habitacao',
    title: 'Lançar um plano de habitação popular',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) => decided(s, 'plano_habitacao') || chose(s, 'fed_casas_populares'),
  },
  {
    id: 'clima',
    title: 'Aprovar um plano de adaptação climática',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) => decided(s, 'plano_climatico') || chose(s, 'mun_mudanca_clima_plano'),
  },
  {
    id: 'primeiro_emprego',
    title: 'Programa de primeiro emprego',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) => decided(s, 'emprego_jovem') || chose(s, 'mun_estagio_jovem'),
  },
  {
    id: 'anticorrupcao',
    title: 'Pacote anticorrupção e transparência',
    levels: ['municipal', 'estadual', 'federal'],
    check: (s) => decided(s, 'anticorrupcao') || decided(s, 'transparencia'),
  },
  // Prefeitura
  {
    id: 'lixao',
    title: 'Fechar o lixão',
    levels: ['municipal'],
    check: (s) => chose(s, 'mun_lixao') || chose(s, 'mun_lixao', 'b'),
  },
  {
    id: 'tempo_integral',
    title: 'Escola em tempo integral',
    levels: ['municipal', 'estadual'],
    check: (s) => chose(s, 'mun_tempo_integral') || chose(s, 'est_integral'),
  },
  {
    id: 'ciclovias',
    title: 'Ampliar as ciclovias',
    levels: ['municipal'],
    check: (s) => chose(s, 'mun_ciclovia'),
  },
  {
    id: 'orcamento_participativo',
    title: 'Aprovar orçamento participativo',
    levels: ['municipal'],
    check: (s) => chose(s, 'mun_orcamento_participativo'),
  },
  {
    id: 'restaurante',
    title: 'Abrir restaurante popular',
    levels: ['municipal'],
    check: (s) => chose(s, 'mun_restaurante_popular'),
  },
  // Governo estadual
  {
    id: 'rodovia',
    title: 'Duplicar uma rodovia estadual',
    levels: ['estadual'],
    check: (s) => chose(s, 'est_rodovia_mortal'),
  },
  {
    id: 'previdencia_estadual',
    title: 'Aprovar a reforma da previdência estadual',
    levels: ['estadual'],
    check: (s) => chose(s, 'est_previdencia'),
  },
  {
    id: 'cameras',
    title: 'Câmeras corporais na polícia',
    levels: ['estadual'],
    check: (s) => chose(s, 'est_cameras_corporais'),
  },
  {
    id: 'hospital_regional',
    title: 'Concluir o hospital regional',
    levels: ['estadual'],
    check: (s) => chose(s, 'est_hospital_regional') || chose(s, 'est_hospital_regional', 'b'),
  },
  // Presidência
  {
    id: 'inflacao_meta',
    title: 'Inflação na meta (até 4,5%)',
    levels: ['federal'],
    check: (s) => s.economy.inflation <= 4.5,
  },
  {
    id: 'desemprego_6',
    title: 'Desemprego abaixo de 6%',
    levels: ['federal'],
    check: (s) => s.economy.unemployment < 6,
  },
  {
    id: 'reforma_tributaria',
    title: 'Aprovar a reforma tributária',
    levels: ['federal'],
    check: (s) => chose(s, 'fed_reforma_tributaria'),
  },
  {
    id: 'mercosul_ue',
    title: 'Ratificar o acordo Mercosul–UE',
    levels: ['federal'],
    check: (s) => chose(s, 'fed_mercosul_ue'),
  },
  {
    id: 'fila_inss',
    title: 'Zerar a fila do INSS',
    levels: ['federal'],
    check: (s) => chose(s, 'fed_fila_inss') || chose(s, 'fed_fila_inss', 'b'),
  },
  {
    id: 'desmatamento',
    title: 'Reduzir o desmatamento da Amazônia',
    levels: ['federal', 'estadual'],
    check: (s) => chose(s, 'fed_desmatamento') || chose(s, 'est_desmatamento'),
  },
  // Legislativo
  {
    id: 'leis_5',
    title: 'Aprovar 5 projetos de sua autoria',
    levels: ['legislativo'],
    check: (s) => (s.government?.billsPassed ?? 0) >= 5,
  },
  {
    id: 'comissao',
    title: 'Presidir uma comissão',
    levels: ['legislativo'],
    check: (s) => chose(s, 'committee_chair', 'accept'),
  },
  {
    id: 'frente',
    title: 'Liderar uma frente parlamentar',
    levels: ['legislativo'],
    check: (s) => chose(s, 'leg_frente_parlamentar'),
  },
  {
    id: 'premio',
    title: 'Ganhar prêmio de melhor parlamentar',
    levels: ['legislativo'],
    check: (s) => (s.events.firedCount.leg_premio ?? 0) > 0,
  },
  {
    id: 'verba',
    title: 'Abrir mão de verba e auxílios',
    levels: ['legislativo'],
    check: (s) => chose(s, 'leg_auxilio_moradia') || chose(s, 'leg_verba_gabinete'),
  },
  {
    id: 'transparencia_leg',
    title: 'Propor projeto de transparência',
    levels: ['legislativo'],
    check: (s) => chose(s, 'leg_transparencia'),
  },
];

function levelOf(s: GameState): Level | null {
  const gov = s.government;
  if (!gov) return null;
  return gov.branch === 'legislative' ? 'legislativo' : (gov.jurisdiction.level as Level);
}

/** Sorteia os objetivos oferecidos no início do mandato (chamada na posse). */
export function offerObjectives(state: GameState): void {
  const gov = state.government;
  const level = levelOf(state);
  if (!gov || !level) return;
  const pool = OBJECTIVES.filter((o) => o.levels.includes(level)).map((o) => o.id);
  const offered = withRng(state, (rng) => rng.shuffle(pool).slice(0, O.offered));
  gov.objectives = {
    offered,
    chosen: [],
    baseline: { unemployment: unemploymentNow(state), inflation: state.economy.inflation },
  };
}

export function chooseObjectives(state: GameState, ids: string[]): ActionResult {
  const gov = state.government;
  const obj = gov?.objectives;
  if (!gov || !obj) return { ok: false, message: 'Sem mandato em curso.' };
  if (gov.monthsInOffice > O.chooseUntilMonth)
    return { ok: false, message: 'Os objetivos são definidos nos primeiros meses do mandato.' };
  const unique = [...new Set(ids)];
  if (unique.length === 0 || unique.length > O.max)
    return { ok: false, message: `Escolha de 1 a ${O.max} objetivos.` };
  if (!unique.every((id) => obj.offered.includes(id)))
    return { ok: false, message: 'Objetivo inválido.' };
  obj.chosen = unique;
  return { ok: true, message: 'Objetivos do mandato definidos.' };
}

export function objectiveTitle(id: string): string {
  return OBJECTIVES.find((o) => o.id === id)?.title ?? id;
}

/** Situação ao vivo dos objetivos escolhidos. */
export function objectiveProgress(
  state: GameState,
): { id: string; title: string; done: boolean }[] {
  const chosen = state.government?.objectives?.chosen ?? [];
  return chosen.map((id) => {
    const def = OBJECTIVES.find((o) => o.id === id);
    let done: boolean;
    try {
      done = !!def?.check(state);
    } catch {
      done = false; // estado parcial (save antigo): conta como não cumprido
    }
    return { id, title: def?.title ?? id, done };
  });
}
