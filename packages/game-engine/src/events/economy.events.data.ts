import {
  goodPrice,
  goodShortage,
  groupIsStriking,
  groupRadicalismOf,
  isPresident,
  scandalLevel,
} from './conditions';
import type { EventDefinition } from './types';

/**
 * Eventos econômico-políticos da expansão "Nação": ciclo de commodities, greves, fuga de
 * capitais, apagão, carestia, CPI, reforma agrária e crise cambial. Toda resposta tem
 * ganhadores e perdedores; as descrições são factuais.
 */
export const NATION_EVENT_DEFINITIONS: EventDefinition[] = [
  {
    id: 'commodity_supercycle',
    category: 'economy',
    phases: ['governing'],
    weight: 3,
    cooldownDays: 900,
    condition: isPresident,
    title: 'Superciclo das commodities',
    description:
      'A demanda global por grãos, carne, minério e petróleo dispara e os preços internacionais sobem. Exportadores faturam mais; o custo dos alimentos e dos combustíveis também pressiona o consumidor.',
    options: [
      {
        id: 'ride',
        label: 'Aproveitar a bonança e ampliar investimentos',
        description: 'Exportadores lucram; o Estado gasta mais com a receita extra.',
        effects: [
          {
            type: 'worldPrice',
            goods: ['grain', 'soy', 'meat', 'iron_ore', 'oil'],
            factor: 1.35,
            label: 'superciclo das commodities',
          },
          {
            type: 'economyShock',
            label: 'Superciclo das commodities',
            months: 12,
            growth: 0.8,
            inflation: 0.3,
            confidence: 2,
          },
          { type: 'interestGroup', groupId: 'agribusiness', delta: 6 },
          { type: 'interestGroup', groupId: 'industry', delta: -2 },
          { type: 'approval', delta: 2 },
        ],
      },
      {
        id: 'save',
        label: 'Poupar parte da receita e proteger a indústria do câmbio forte',
        description: 'Menos crescimento imediato, menos risco quando o ciclo virar.',
        effects: [
          {
            type: 'worldPrice',
            goods: ['grain', 'soy', 'meat', 'iron_ore', 'oil'],
            factor: 1.35,
            label: 'superciclo das commodities',
          },
          {
            type: 'economyShock',
            label: 'Superciclo (com poupança)',
            months: 12,
            growth: 0.4,
            confidence: 3,
          },
          { type: 'interestGroup', groupId: 'agribusiness', delta: 2 },
          { type: 'interestGroup', groupId: 'industry', delta: 3 },
          { type: 'interestGroup', groupId: 'business', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'commodity_crash',
    category: 'crisis',
    phases: ['governing'],
    weight: 3,
    cooldownDays: 700,
    negative: true,
    condition: isPresident,
    title: 'Crash das commodities',
    description:
      'Os preços internacionais de grãos, minério e petróleo despencam. Quem exporta perde receita; quem compra esses insumos paga menos.',
    options: [
      {
        id: 'support',
        label: 'Socorrer os exportadores com crédito e renegociação de dívidas',
        description: 'Protege empregos no campo e na mineração e custa ao Tesouro.',
        effects: [
          {
            type: 'worldPrice',
            goods: ['grain', 'soy', 'meat', 'iron_ore', 'oil'],
            factor: 0.7,
            label: 'queda das commodities',
          },
          {
            type: 'economyShock',
            label: 'Queda das commodities',
            months: 8,
            growth: -0.5,
            confidence: -1,
          },
          { type: 'budgetSpend', category: 'administration', share: 0.04 },
          { type: 'interestGroup', groupId: 'agribusiness', delta: 6 },
          { type: 'interestGroup', groupId: 'workers', delta: -2 },
        ],
      },
      {
        id: 'adjust',
        label: 'Deixar o mercado e o câmbio se ajustarem',
        description: 'Preserva o caixa; produtores e regiões exportadoras sofrem mais.',
        effects: [
          {
            type: 'worldPrice',
            goods: ['grain', 'soy', 'meat', 'iron_ore', 'oil'],
            factor: 0.7,
            label: 'queda das commodities',
          },
          {
            type: 'economyShock',
            label: 'Queda das commodities',
            months: 10,
            growth: -0.9,
            unemployment: 0.3,
            confidence: -1,
          },
          { type: 'interestGroup', groupId: 'agribusiness', delta: -6 },
          { type: 'interestGroup', groupId: 'business', delta: 2 },
          { type: 'popSatisfaction', popTypes: ['farmers'], delta: -4 },
        ],
      },
    ],
  },
  {
    id: 'oil_discovery',
    category: 'opportunity',
    phases: ['governing'],
    weight: 2,
    cooldownDays: 1500,
    once: true,
    condition: isPresident,
    title: 'Descoberta de petróleo em águas profundas',
    description:
      'Uma nova província de petróleo é confirmada na costa fluminense. A pergunta é quem vai explorá-la: o Estado, em regime de monopólio ou parceria, ou empresas privadas por concessão.',
    options: [
      {
        id: 'state',
        label: 'Explorar por empresa estatal',
        description: 'O Estado fica com a renda; o investimento depende do caixa público.',
        effects: [
          { type: 'buildingLevels', stateId: 'RJ', buildingId: 'oil_field', delta: 1, owner: 'state' },
          { type: 'interestGroup', groupId: 'unions', delta: 5 },
          { type: 'interestGroup', groupId: 'civil_servants', delta: 3 },
          { type: 'interestGroup', groupId: 'business', delta: -4 },
          { type: 'budgetSpend', category: 'infrastructure', share: 0.03 },
          {
            type: 'history',
            kind: 'reform',
            title: 'Nova província de petróleo será explorada pelo Estado',
            importance: 2,
          },
        ],
      },
      {
        id: 'concession',
        label: 'Leiloar a concessão a empresas privadas e estrangeiras',
        description: 'Atrai capital e tecnologia; parte da renda vai para os concessionários.',
        effects: [
          {
            type: 'buildingLevels',
            stateId: 'RJ',
            buildingId: 'oil_field',
            delta: 1,
            owner: 'foreign',
          },
          { type: 'capitalFlow', privateFactor: 1.05, foreignFactor: 1.1 },
          { type: 'interestGroup', groupId: 'business', delta: 5 },
          { type: 'interestGroup', groupId: 'industry', delta: 2 },
          { type: 'interestGroup', groupId: 'unions', delta: -5 },
          { type: 'interestGroup', groupId: 'social_movements', delta: -3 },
          {
            type: 'history',
            kind: 'reform',
            title: 'Nova província de petróleo vai a leilão de concessão',
            importance: 2,
          },
        ],
      },
    ],
  },
  {
    id: 'truckers_strike',
    category: 'crisis',
    phases: ['governing'],
    weight: 5,
    cooldownDays: 400,
    negative: true,
    condition: (s) =>
      isPresident(s) &&
      !groupIsStriking(s, 'workers') &&
      (s.economy.inflation > 5.5 || goodPrice(s, 'fuel') > 1.2) &&
      groupRadicalismOf(s, 'workers') >= 25,
    title: 'Greve dos caminhoneiros',
    description:
      'Caminhoneiros bloqueiam rodovias contra o preço do diesel e o custo do frete. Os supermercados esvaziam e as fábricas ficam sem peças.',
    options: [
      {
        id: 'negotiate',
        label: 'Negociar subsídio ao diesel e tabela de frete',
        description: 'Encerra a paralisação rápido, com custo fiscal e pressão sobre os preços.',
        effects: [
          { type: 'budgetSpend', category: 'infrastructure', share: 0.05 },
          {
            type: 'economyShock',
            label: 'Greve dos caminhoneiros',
            months: 1,
            growth: -0.3,
            inflation: 0.3,
          },
          { type: 'unrest', delta: 2 },
          { type: 'interestGroup', groupId: 'workers', delta: 5 },
          { type: 'interestGroup', groupId: 'business', delta: -3 },
          { type: 'radicalism', groupId: 'workers', delta: -10 },
        ],
      },
      {
        id: 'force',
        label: 'Acionar a Justiça e as forças de segurança para liberar as estradas',
        description: 'Preserva o caixa, mas aumenta o conflito e prolonga o desabastecimento.',
        effects: [
          {
            type: 'economyShock',
            label: 'Greve dos caminhoneiros',
            months: 3,
            growth: -0.7,
            inflation: 0.5,
          },
          { type: 'unrest', delta: 5 },
          { type: 'approval', delta: -2 },
          { type: 'interestGroup', groupId: 'workers', delta: -6 },
          { type: 'interestGroup', groupId: 'commerce', delta: 2 },
          { type: 'radicalism', groupId: 'workers', delta: 8 },
        ],
      },
    ],
  },
  {
    id: 'general_strike',
    category: 'crisis',
    phases: ['governing'],
    weight: 3,
    cooldownDays: 600,
    negative: true,
    condition: (s) =>
      isPresident(s) &&
      !groupIsStriking(s, 'unions') &&
      groupRadicalismOf(s, 'unions') >= 55 &&
      s.interestGroups.unions.approval < 45,
    title: 'Centrais sindicais convocam greve geral',
    description:
      'Sindicatos de várias categorias anunciam uma paralisação nacional contra a política do governo. Indústria, transporte e serviços públicos podem parar.',
    options: [
      {
        id: 'dialogue',
        label: 'Abrir uma mesa de negociação com as centrais',
        description: 'Reduz o conflito e dá ganhos aos trabalhadores; empresários reclamam.',
        effects: [
          { type: 'politicalCapital', delta: -8 },
          { type: 'interestGroup', groupId: 'unions', delta: 8 },
          { type: 'interestGroup', groupId: 'workers', delta: 4 },
          { type: 'interestGroup', groupId: 'business', delta: -5 },
          { type: 'radicalism', groupId: 'unions', delta: -15 },
          { type: 'economyShock', label: 'Paralisação parcial', months: 1, growth: -0.3 },
        ],
      },
      {
        id: 'hold',
        label: 'Manter a política e declarar a greve ilegal',
        description: 'Sustenta o rumo do governo, mas o país para e o conflito cresce.',
        effects: [
          { type: 'economyShock', label: 'Greve geral', months: 2, growth: -1.1, unemployment: 0.2 },
          { type: 'unrest', delta: 6 },
          { type: 'legitimacy', delta: -2 },
          { type: 'interestGroup', groupId: 'unions', delta: -8 },
          { type: 'interestGroup', groupId: 'business', delta: 3 },
          { type: 'radicalism', groupId: 'unions', delta: 8 },
        ],
      },
    ],
  },
  {
    id: 'capital_flight',
    category: 'crisis',
    phases: ['governing'],
    weight: 4,
    cooldownDays: 500,
    negative: true,
    condition: (s) =>
      isPresident(s) &&
      (s.economy.confidence < 42 ||
        (s.interestGroups.business.approval < 30 && groupRadicalismOf(s, 'business') >= 45)),
    title: 'Fuga de capitais',
    description:
      'Investidores retiram recursos do país, apostando contra o rumo da política econômica. O dólar sobe e os fundos de investimento encolhem.',
    options: [
      {
        id: 'signal',
        label: 'Sinalizar regras estáveis e respeito a contratos',
        description: 'Reconquista confiança; o governo abre mão de parte da agenda.',
        effects: [
          { type: 'capitalFlow', privateFactor: 0.94, foreignFactor: 0.9 },
          { type: 'exchangeRate', factor: 1.05 },
          { type: 'economyShock', label: 'Fuga de capitais', months: 5, growth: -0.3, confidence: 2 },
          { type: 'politicalCapital', delta: -8 },
          { type: 'interestGroup', groupId: 'business', delta: 6 },
          { type: 'interestGroup', groupId: 'unions', delta: -3 },
        ],
      },
      {
        id: 'capital_controls',
        label: 'Impor controles à saída de capitais',
        description: 'Segura as reservas e o câmbio; afasta o investidor estrangeiro.',
        effects: [
          { type: 'capitalFlow', privateFactor: 0.88, foreignFactor: 0.78 },
          { type: 'exchangeRate', factor: 1.03 },
          { type: 'economyShock', label: 'Controle de capitais', months: 8, growth: -0.4, confidence: -3 },
          { type: 'interestGroup', groupId: 'business', delta: -7 },
          { type: 'interestGroup', groupId: 'industry', delta: 2 },
          { type: 'interestGroup', groupId: 'workers', delta: 2 },
          { type: 'radicalism', groupId: 'business', delta: 8 },
        ],
      },
    ],
  },
  {
    id: 'foreign_automaker',
    category: 'opportunity',
    phases: ['governing'],
    weight: 4,
    cooldownDays: 600,
    title: 'Montadora estrangeira anuncia fábrica',
    description:
      'Uma fabricante global de veículos quer erguer uma planta no Paraná. Ela condiciona o investimento a incentivos e a regras estáveis de conteúdo local.',
    options: [
      {
        id: 'incentives',
        label: 'Conceder incentivos fiscais e infraestrutura',
        description: 'Mais empregos industriais e capital externo, ao custo de renúncia fiscal.',
        effects: [
          {
            type: 'buildingLevels',
            stateId: 'PR',
            buildingId: 'auto_plant',
            delta: 2,
            owner: 'foreign',
          },
          { type: 'capitalFlow', privateFactor: 1, foreignFactor: 1.06 },
          { type: 'budgetSpend', category: 'administration', share: 0.03 },
          { type: 'interestGroup', groupId: 'industry', delta: 5 },
          { type: 'interestGroup', groupId: 'unions', delta: 2 },
          { type: 'interestGroup', groupId: 'social_movements', delta: -2 },
          { type: 'popSatisfaction', popTypes: ['industrial_workers'], delta: 3 },
        ],
      },
      {
        id: 'local_content',
        label: 'Exigir conteúdo local e transferência de tecnologia',
        description: 'Fortalece a cadeia nacional; a montadora reduz o projeto.',
        effects: [
          {
            type: 'buildingLevels',
            stateId: 'PR',
            buildingId: 'auto_plant',
            delta: 1,
            owner: 'foreign',
          },
          { type: 'interestGroup', groupId: 'industry', delta: 3 },
          { type: 'interestGroup', groupId: 'tech', delta: 3 },
          { type: 'interestGroup', groupId: 'business', delta: -2 },
        ],
      },
      {
        id: 'decline',
        label: 'Recusar privilégios e manter as regras gerais',
        effects: [
          { type: 'interestGroup', groupId: 'industry', delta: -3 },
          { type: 'attribute', attribute: 'credibility', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'blackout',
    category: 'crisis',
    phases: ['governing'],
    weight: 6,
    cooldownDays: 365,
    negative: true,
    condition: (s) => isPresident(s) && goodShortage(s, 'electricity') > 0.04,
    title: 'Apagão',
    description:
      'A oferta de energia não acompanha a demanda e blecautes atingem várias capitais. Fábricas reduzem turnos e o comércio fecha mais cedo.',
    options: [
      {
        id: 'rationing',
        label: 'Decretar racionamento e acelerar térmicas de emergência',
        description: 'Evita o colapso do sistema; custa caro e pesa no bolso.',
        effects: [
          { type: 'economyShock', label: 'Racionamento de energia', months: 4, growth: -0.6, inflation: 0.3 },
          { type: 'budgetSpend', category: 'infrastructure', share: 0.06 },
          { type: 'unrest', delta: 3 },
          { type: 'interestGroup', groupId: 'industry', delta: -3 },
          { type: 'approval', delta: -1 },
        ],
      },
      {
        id: 'market',
        label: 'Deixar a tarifa subir para segurar a demanda',
        description: 'Atrai investimento na oferta; encarece a energia para todos.',
        effects: [
          { type: 'economyShock', label: 'Energia cara', months: 6, growth: -0.4, inflation: 0.6 },
          { type: 'unrest', delta: 4 },
          { type: 'interestGroup', groupId: 'business', delta: 2 },
          { type: 'interestGroup', groupId: 'workers', delta: -4 },
          { type: 'approval', delta: -2 },
        ],
      },
    ],
  },
  {
    id: 'food_price_protests',
    category: 'crisis',
    phases: ['governing'],
    weight: 5,
    cooldownDays: 240,
    negative: true,
    condition: (s) =>
      isPresident(s) &&
      s.economy.inflation > 7 && (goodPrice(s, 'processed_food') > 1.2 || goodPrice(s, 'grain') > 1.25),
    title: 'Protestos contra a carestia',
    description:
      'Com o preço dos alimentos nas alturas, mercados são alvo de panelaços e marchas. Movimentos sociais, aposentados e sindicatos cobram providências.',
    options: [
      {
        id: 'supply',
        label: 'Reforçar o abastecimento e as transferências às famílias',
        description: 'Alivia o consumidor e pressiona o orçamento.',
        effects: [
          { type: 'budgetSpend', category: 'social', share: 0.07 },
          { type: 'popSatisfaction', popTypes: ['unemployed', 'workers'], delta: 4 },
          { type: 'unrest', delta: -3 },
          { type: 'interestGroup', groupId: 'social_movements', delta: 4 },
          { type: 'interestGroup', groupId: 'agribusiness', delta: -2 },
        ],
      },
      {
        id: 'discipline',
        label: 'Manter a disciplina fiscal e monetária',
        description: 'Protege a estabilidade de preços no médio prazo; o custo de vida pesa agora.',
        effects: [
          { type: 'economyShock', label: 'Aperto monetário', months: 6, growth: -0.3, inflation: -0.4, confidence: 2 },
          { type: 'unrest', delta: 5 },
          { type: 'approval', delta: -2 },
          { type: 'interestGroup', groupId: 'business', delta: 3 },
          { type: 'interestGroup', groupId: 'retirees', delta: -2 },
          { type: 'radicalism', groupId: 'social_movements', delta: 6 },
        ],
      },
    ],
  },
  {
    id: 'congress_cpi',
    category: 'scandal',
    phases: ['governing', 'legislating'],
    weight: 4,
    cooldownDays: 365,
    negative: true,
    condition: (s) => scandalLevel(s) >= 12 || (s.government?.approval ?? 100) < 40,
    title: 'CPI no Congresso',
    description:
      'A oposição reúne as assinaturas para abrir uma Comissão Parlamentar de Inquérito. Depoimentos e vazamentos dominam o noticiário.',
    options: [
      {
        id: 'cooperate',
        label: 'Colaborar com as investigações e abrir os documentos',
        description: 'Desgasta no curto prazo, mas reduz o risco de ruptura institucional.',
        effects: [
          { type: 'scandal', delta: 4 },
          { type: 'legitimacy', delta: 1 },
          { type: 'attribute', attribute: 'credibility', delta: 2 },
          { type: 'relation', partyId: 'all', delta: 2 },
        ],
      },
      {
        id: 'block',
        label: 'Usar a base para esvaziar a CPI',
        description: 'Protege o governo agora e cobra um preço em capital político e imagem.',
        effects: [
          { type: 'politicalCapital', delta: -10 },
          { type: 'scandal', delta: 8 },
          { type: 'legitimacy', delta: -2 },
          { type: 'relation', partyId: 'coalition', delta: 3 },
          { type: 'relation', partyId: 'all', delta: -2 },
        ],
      },
    ],
  },
  {
    id: 'agrarian_reform_march',
    category: 'politics',
    phases: ['governing'],
    weight: 4,
    cooldownDays: 400,
    condition: (s) =>
      isPresident(s) &&
      (s.interestGroups.social_movements.approval < 55 ||
        groupRadicalismOf(s, 'social_movements') >= 35),
    title: 'Marcha pela reforma agrária',
    description:
      'Milhares de famílias sem-terra marcham até a capital e ocupam fazendas improdutivas. Produtores rurais pedem reintegração de posse e segurança jurídica.',
    options: [
      {
        id: 'receive',
        label: 'Receber os líderes e abrir negociação de assentamentos',
        description: 'Reduz a tensão no campo; proprietários e a bancada ruralista reagem mal.',
        effects: [
          { type: 'interestGroup', groupId: 'social_movements', delta: 6 },
          { type: 'radicalism', groupId: 'social_movements', delta: -10 },
          { type: 'interestGroup', groupId: 'agribusiness', delta: -5 },
          { type: 'popSatisfaction', popTypes: ['farmers'], delta: 2 },
          { type: 'unrest', delta: -2 },
        ],
      },
      {
        id: 'order',
        label: 'Garantir a ordem e a propriedade no campo',
        description: 'Tranquiliza o agronegócio; o conflito social tende a crescer.',
        effects: [
          { type: 'interestGroup', groupId: 'agribusiness', delta: 5 },
          { type: 'interestGroup', groupId: 'social_movements', delta: -6 },
          { type: 'radicalism', groupId: 'social_movements', delta: 8 },
          { type: 'unrest', delta: 3 },
        ],
      },
    ],
  },
  {
    id: 'currency_crisis',
    category: 'crisis',
    phases: ['governing'],
    weight: 4,
    cooldownDays: 600,
    negative: true,
    condition: (s) => isPresident(s) && s.market.exchangeRate > 1.3,
    title: 'Crise cambial',
    description:
      'O real se desvaloriza rapidamente. Importados e dívidas em dólar ficam mais caros, e a inflação ameaça voltar. Exportadores e quem tem renda em dólar ganham.',
    options: [
      {
        id: 'raise_rates',
        label: 'Elevar os juros para atrair capital e conter a inflação',
        description: 'Segura o câmbio; encarece o crédito e esfria a atividade.',
        effects: [
          { type: 'exchangeRate', factor: 0.95 },
          { type: 'economyShock', label: 'Aperto contra a crise cambial', months: 8, growth: -0.9, inflation: -0.5, confidence: 2 },
          { type: 'interestGroup', groupId: 'retirees', delta: 2 },
          { type: 'interestGroup', groupId: 'industry', delta: -5 },
          { type: 'interestGroup', groupId: 'commerce', delta: -3 },
        ],
      },
      {
        id: 'float',
        label: 'Deixar o câmbio flutuar e proteger quem depende de importados',
        description: 'Beneficia exportadores e a indústria local; a inflação sobe.',
        effects: [
          { type: 'exchangeRate', factor: 1.04 },
          { type: 'economyShock', label: 'Câmbio desvalorizado', months: 8, growth: 0.2, inflation: 0.9, confidence: -2 },
          { type: 'interestGroup', groupId: 'agribusiness', delta: 4 },
          { type: 'interestGroup', groupId: 'industry', delta: 3 },
          { type: 'interestGroup', groupId: 'workers', delta: -4 },
          { type: 'unrest', delta: 2 },
        ],
      },
    ],
  },
];
