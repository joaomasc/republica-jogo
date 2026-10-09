import type { DifficultyId } from '../config/difficulty';
import type { StateId } from '../core/types';
import type { EconomicSituation } from '../economy/economy';
import type { OfficeId } from '../election/offices';
import type { ObjectiveDefinition } from './objectives';

export interface ScenarioDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  difficulty: DifficultyId;
  officeId: OfficeId;
  stateId: StateId;
  year: number;
  economy: EconomicSituation;
  /** Partido sugerido (o jogador ainda pode trocar). */
  partyId?: string;
  backgroundId?: string;
  fame?: number;
  startingMoneyFactor?: number;
  /** Começa já empossado no cargo (modo nação). */
  startInOffice?: boolean;
  /** Leis federais iniciais diferentes do padrão (categoria → opção). */
  lawPreset?: Record<string, string>;
  /** Objetivos avaliados durante o mandato (`law_enacted` aceita alternativas com `|`). */
  objectives?: ObjectiveDefinition[];
}

/** Cenários prontos. Todos fictícios: nenhum reproduz eleições reais. */
export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'gerais_2026',
    name: 'Eleições Gerais',
    tagline: 'A grande disputa nacional',
    description:
      'Concorra à Presidência num país dividido. Economia estável, adversários conhecidos.',
    icon: 'crown',
    difficulty: 'normal',
    officeId: 'presidente',
    stateId: 'SP',
    year: 2026,
    economy: 'normal',
  },
  {
    id: 'outsider',
    name: 'O Outsider',
    tagline: 'Ninguém te conhece. Ainda.',
    description:
      'Influenciador(a) num partido pequeno tenta a Presidência em meio à desaceleração econômica.',
    icon: 'sparkles',
    difficulty: 'hard',
    officeId: 'presidente',
    stateId: 'MG',
    year: 2026,
    economy: 'slowdown',
    partyId: 'renova',
    backgroundId: 'influencer',
    fame: 6,
  },
  {
    id: 'prefeitura',
    name: 'A Prefeitura',
    tagline: 'Governar a cidade',
    description:
      'Dispute a prefeitura de Recife: zonas da cidade, Câmara Municipal e orçamento local.',
    icon: 'building',
    difficulty: 'normal',
    officeId: 'prefeito',
    stateId: 'PE',
    year: 2028,
    economy: 'normal',
  },
  {
    id: 'crise_rj',
    name: 'Estado em Crise',
    tagline: 'Quem quer governar o caos?',
    description: 'Governo do Rio de Janeiro em meio a uma crise econômica severa.',
    icon: 'flame',
    difficulty: 'hard',
    officeId: 'governador',
    stateId: 'RJ',
    year: 2026,
    economy: 'crisis',
  },
  {
    id: 'primeiro_mandato',
    name: 'Primeiro Mandato',
    tagline: 'Começar por baixo',
    description: 'Uma vaga de vereador(a) em Belo Horizonte. Ideal para aprender o jogo.',
    icon: 'home',
    difficulty: 'easy',
    officeId: 'vereador',
    stateId: 'MG',
    year: 2028,
    economy: 'normal',
  },
  {
    id: 'senado_ba',
    name: 'Corrida ao Senado',
    tagline: 'Uma vaga, muitos caciques',
    description: 'Turno único pela vaga da Bahia no Senado.',
    icon: 'scroll',
    difficulty: 'normal',
    officeId: 'senador',
    stateId: 'BA',
    year: 2026,
    economy: 'normal',
  },
  {
    id: 'bonanca',
    name: 'Bonança',
    tagline: 'Tempos de vacas gordas',
    description: 'Governo de Goiás com a economia bombando — mas o eleitor quer mais.',
    icon: 'sun',
    difficulty: 'easy',
    officeId: 'governador',
    stateId: 'GO',
    year: 2026,
    economy: 'boom',
  },
  {
    id: 'presidencia_2027',
    name: 'Presidência da República',
    tagline: 'Governar o país a partir da posse',
    description:
      'Você já venceu a eleição. Comece em 2027 com o Congresso formado, a economia estável e o país para administrar.',
    icon: 'crown',
    difficulty: 'normal',
    officeId: 'presidente',
    stateId: 'SP',
    year: 2026,
    economy: 'normal',
    partyId: 'udc',
    startInOffice: true,
  },
  {
    id: 'sonho_industrial',
    name: 'O Sonho Industrial',
    tagline: 'Fábricas, empregos e um país que produz',
    description:
      'Presidente com a meta de ampliar a participação da indústria na economia sem deixar o desemprego subir.',
    icon: 'factory',
    difficulty: 'normal',
    officeId: 'presidente',
    stateId: 'SP',
    year: 2026,
    economy: 'normal',
    partyId: 'ftu',
    backgroundId: 'unionist',
    startInOffice: true,
    objectives: [
      {
        id: 'industria_3pp',
        title: 'Reindustrializar o país',
        description:
          'Elevar em 3 pontos percentuais a participação da indústria de transformação no valor adicionado até o fim do mandato.',
        metric: 'manufacturing_share',
        target: 0.03,
        relative: true,
        deadline: null,
      },
      {
        id: 'desemprego_8',
        title: 'Manter o emprego',
        description: 'Terminar o mandato com desemprego de no máximo 8%.',
        metric: 'unemployment_max',
        target: 8,
        deadline: null,
      },
    ],
  },
  {
    id: 'choque_liberal',
    name: 'Choque Liberal',
    tagline: 'Menos Estado, mais mercado',
    description:
      'Presidente de um partido liberal com uma agenda de abertura: livre mercado, impostos baixos e comércio aberto.',
    icon: 'scale',
    difficulty: 'normal',
    officeId: 'presidente',
    stateId: 'SP',
    year: 2026,
    economy: 'normal',
    partyId: 'alb',
    backgroundId: 'entrepreneur',
    startInOffice: true,
    objectives: [
      {
        id: 'lei_laissez_faire',
        title: 'Aprovar o livre mercado',
        description: 'Fazer entrar em vigor o sistema econômico de livre mercado (laissez-faire).',
        metric: 'law_enacted',
        target: 'econ_laissez_faire',
        deadline: null,
      },
      {
        id: 'lei_imposto_baixo',
        title: 'Aprovar a tributação baixa',
        description: 'Fazer entrar em vigor a política de impostos baixos.',
        metric: 'law_enacted',
        target: 'tax_low',
        deadline: null,
      },
      {
        id: 'lei_comercio_aberto',
        title: 'Abrir o comércio',
        description: 'Fazer entrar em vigor a política de comércio aberto.',
        metric: 'law_enacted',
        target: 'trade_open',
        deadline: null,
      },
      {
        id: 'crescimento_3',
        title: 'Crescer pelo mercado',
        description: 'Terminar o mandato com crescimento médio do PIB de pelo menos 3% ao ano.',
        metric: 'gdp_growth_avg',
        target: 3,
        deadline: null,
      },
    ],
  },
  {
    id: 'revolucao_pelo_voto',
    name: 'Revolução pelo Voto',
    tagline: 'Mudar o sistema dentro das regras',
    description:
      'Presidente de um partido socialista tenta transformar a economia pela via institucional, sem perder a legitimidade.',
    icon: 'star',
    difficulty: 'hard',
    officeId: 'presidente',
    stateId: 'SP',
    year: 2026,
    economy: 'normal',
    partyId: 'nes',
    backgroundId: 'teacher',
    startInOffice: true,
    objectives: [
      {
        id: 'sistema_cooperativo',
        title: 'Mudar o sistema econômico',
        description:
          'Ter em vigor o socialismo de mercado (cooperativas) ou a economia planificada.',
        metric: 'law_enacted',
        target: 'econ_cooperative|econ_planned',
        deadline: null,
      },
      {
        id: 'legitimidade_40',
        title: 'Preservar a legitimidade',
        description: 'Terminar o mandato com legitimidade das instituições de pelo menos 40.',
        metric: 'legitimacy_min',
        target: 40,
        deadline: null,
      },
    ],
  },
  {
    id: 'crise_da_divida',
    name: 'Crise da Dívida',
    tagline: 'O país no vermelho',
    description:
      'Presidente assume em plena crise econômica, com inflação alta e pouco apoio. Estabilizar sem perder o governo.',
    icon: 'flame',
    difficulty: 'hard',
    officeId: 'presidente',
    stateId: 'SP',
    year: 2026,
    economy: 'crisis',
    partyId: 'udc',
    backgroundId: 'civil_servant',
    startInOffice: true,
    objectives: [
      {
        id: 'inflacao_6',
        title: 'Domar a inflação',
        description: 'Terminar o mandato com inflação anual de no máximo 6%.',
        metric: 'inflation_max',
        target: 6,
        deadline: null,
      },
      {
        id: 'aprovacao_40',
        title: 'Manter o apoio popular',
        description: 'Terminar o mandato com aprovação de pelo menos 40%.',
        metric: 'approval_min',
        target: 40,
        deadline: null,
      },
    ],
  },
  {
    id: 'prefeitura_salvador',
    name: 'Prefeitura de Salvador',
    tagline: 'A cidade é sua: emprego, obras e ruas',
    description:
      'Prefeito(a) recém-empossado(a) de Salvador, com desemprego acima da média. Use as obras públicas para gerar empregos e cuidado com o clima nas ruas.',
    icon: 'building',
    difficulty: 'normal',
    officeId: 'prefeito',
    stateId: 'BA',
    year: 2028,
    economy: 'normal',
    partyId: 'udc',
    backgroundId: 'community',
    startInOffice: true,
    objectives: [
      {
        id: 'desemprego_cidade',
        title: 'Reduzir o desemprego',
        description: 'Chegar ao fim do mandato com o desemprego da cidade em até 10%.',
        metric: 'unemployment_max',
        target: 10,
        deadline: null,
      },
    ],
  },
  {
    id: 'governo_bahia',
    name: 'Governo da Bahia',
    tagline: 'Hospitais, estradas e polos industriais',
    description:
      'Governador(a) da Bahia no primeiro mês de mandato. Atraia indústrias com polos industriais, entregue obras e mantenha a Assembleia ao seu lado.',
    icon: 'landmark',
    difficulty: 'normal',
    officeId: 'governador',
    stateId: 'BA',
    year: 2027,
    economy: 'normal',
    partyId: 'udc',
    backgroundId: 'community',
    startInOffice: true,
  },
  {
    id: 'baixo_clero',
    name: 'O Deputado do Baixo Clero',
    tagline: 'Pouco poder, muita articulação',
    description:
      'Deputado(a) federal de primeiro mandato. Sem cargo na mesa, o caminho é negociar e aprovar um projeto de sua autoria.',
    icon: 'landmark',
    difficulty: 'normal',
    officeId: 'deputado_federal',
    stateId: 'GO',
    year: 2026,
    economy: 'normal',
    partyId: 'udc',
    backgroundId: 'community',
    startInOffice: true,
    objectives: [
      {
        id: 'projeto_proprio',
        title: 'Aprovar um projeto seu',
        description: 'Ter um projeto de sua autoria aprovado no Congresso.',
        metric: 'bills_passed',
        target: 1,
        deadline: null,
      },
    ],
  },
  {
    id: 'senado_2027',
    name: 'Senador da República',
    tagline: 'Oito anos de mandato, voto decisivo',
    description:
      'Senador(a) eleito(a) para a casa que revisa as leis e julga o Executivo. Construa influência e aprove projetos.',
    icon: 'scroll',
    difficulty: 'normal',
    officeId: 'senador',
    stateId: 'PR',
    year: 2026,
    economy: 'normal',
    partyId: 'pfr',
    backgroundId: 'lawyer',
    startInOffice: true,
    objectives: [
      {
        id: 'projeto_senado',
        title: 'Aprovar um projeto seu',
        description: 'Ter um projeto de sua autoria aprovado no Congresso.',
        metric: 'bills_passed',
        target: 1,
        deadline: null,
      },
      {
        id: 'aprovacao_senado_45',
        title: 'Manter a imagem pública',
        description: 'Terminar o mandato com aprovação de pelo menos 45%.',
        metric: 'approval_min',
        target: 45,
        deadline: null,
      },
    ],
  },
];

export function getScenario(id: string): ScenarioDefinition | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
