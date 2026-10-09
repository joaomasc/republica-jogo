import type { EventDefinition } from './types';
import {
  deficitIsHigh,
  hasCoalition,
  hasStaff,
  inCampaign,
  isPresident,
  partyUnity,
  playerIsLeading,
  playerPollShare,
} from './conditions';
import { NATION_EVENT_DEFINITIONS } from './economy.events.data';

/**
 * Catálogo de eventos. Placeholders disponíveis no texto:
 * {playerName} {playerParty} {unitName} {stateName} {opponentName} {groupName} {partyName}
 */
export const EVENT_DEFINITIONS: EventDefinition[] = [
  // ───────────────────────── CAMPANHA ─────────────────────────
  {
    id: 'donor_offer',
    category: 'opportunity',
    phases: ['campaign'],
    weight: 10,
    cooldownDays: 20,
    title: 'Um grande doador bate à porta',
    description:
      'Um empresário influente oferece uma doação generosa à campanha de {playerName}. Ele diz não querer "nada em troca"... por enquanto.',
    options: [
      {
        id: 'accept',
        label: 'Aceitar a doação',
        effects: [
          { type: 'money', amount: 300_000 },
          { type: 'interestGroup', groupId: 'business', delta: 5 },
          { type: 'chain', eventId: 'donation_investigation', inDays: 10, chance: 0.35 },
        ],
      },
      {
        id: 'transparent',
        label: 'Aceitar metade, com prestação de contas pública',
        effects: [
          { type: 'money', amount: 150_000 },
          { type: 'attribute', attribute: 'credibility', delta: 2 },
        ],
      },
      {
        id: 'refuse',
        label: 'Recusar educadamente',
        effects: [
          { type: 'attribute', attribute: 'credibility', delta: 3 },
          { type: 'interestGroup', groupId: 'business', delta: -3 },
        ],
      },
    ],
  },
  {
    id: 'donation_investigation',
    category: 'scandal',
    phases: ['campaign', 'governing', 'legislating'],
    weight: 0,
    chainOnly: true,
    negative: true,
    title: 'Doação de campanha sob investigação',
    description:
      'O Ministério Público abriu apuração sobre a doação recebida por {playerName}. A imprensa já fala em caixa dois.',
    options: [
      {
        id: 'explain',
        label: 'Dar entrevista coletiva e explicar tudo',
        effects: [
          { type: 'attribute', attribute: 'credibility', delta: -3 },
          { type: 'rejection', delta: 2 },
          { type: 'scandal', delta: 5 },
          {
            type: 'history',
            kind: 'scandal',
            title: 'Doação de campanha investigada',
            importance: 2,
            sentiment: -1,
          },
        ],
      },
      {
        id: 'return',
        label: 'Devolver o dinheiro',
        effects: [
          { type: 'money', amount: -300_000 },
          { type: 'attribute', attribute: 'credibility', delta: 1 },
          { type: 'scandal', delta: 2 },
        ],
      },
      {
        id: 'blame',
        label: 'Culpar o tesoureiro e afastá-lo',
        effects: [
          { type: 'rejection', delta: 1 },
          { type: 'enthusiasm', delta: -6 },
          { type: 'removeStaff' },
          { type: 'scandal', delta: 6 },
          {
            type: 'history',
            kind: 'scandal',
            title: 'Tesoureiro afastado após denúncia',
            importance: 2,
            sentiment: -1,
          },
        ],
      },
    ],
  },
  {
    id: 'viral_video',
    category: 'media',
    phases: ['campaign'],
    weight: 8,
    cooldownDays: 25,
    title: 'Seu vídeo viralizou!',
    description:
      'Um vídeo espontâneo de {playerName} conversando com eleitores acumula milhões de visualizações.',
    options: [
      {
        id: 'live',
        label: 'Fazer uma live para surfar a onda',
        effects: [
          { type: 'knowledge', delta: 6 },
          { type: 'enthusiasm', delta: 5 },
          { type: 'energy', delta: -10 },
          { type: 'popMomentum', popTypes: ['students', 'tech_workers'], delta: 3 },
        ],
      },
      {
        id: 'humble',
        label: 'Agradecer com humildade',
        effects: [
          { type: 'knowledge', delta: 3 },
          { type: 'popMomentum', popTypes: 'all', delta: 1.5 },
        ],
      },
    ],
  },
  {
    id: 'fake_news',
    category: 'media',
    phases: ['campaign'],
    weight: 9,
    cooldownDays: 20,
    negative: true,
    title: 'Fake news contra {playerName}',
    description:
      'Uma montagem acusando {playerName} de algo que nunca disse se espalha por grupos de mensagens.',
    options: [
      {
        id: 'deny',
        label: 'Desmentir com força nas redes',
        effects: [
          { type: 'money', amount: -40_000 },
          { type: 'rejection', delta: 0.5 },
          { type: 'knowledge', delta: 2 },
        ],
      },
      {
        id: 'sue',
        label: 'Acionar a Justiça Eleitoral',
        effects: [
          { type: 'money', amount: -80_000 },
          { type: 'attribute', attribute: 'credibility', delta: 2 },
        ],
      },
      {
        id: 'ignore',
        label: 'Ignorar',
        effects: [
          { type: 'rejection', delta: 3 },
          { type: 'popMomentum', popTypes: ['retirees', 'workers'], delta: -2 },
        ],
      },
    ],
  },
  {
    id: 'opponent_scandal',
    accusesOpponent: true,
    category: 'opponent',
    phases: ['campaign'],
    weight: 8,
    cooldownDays: 20,
    context: ['opponent'],
    title: 'Escândalo atinge {opponentName}',
    description:
      'Reportagem revela irregularidades envolvendo {opponentName}. A campanha adversária está na defensiva.',
    options: [
      {
        id: 'exploit',
        label: 'Explorar o escândalo na propaganda',
        effects: [
          { type: 'opponent', target: 'context', rejection: 6, popMomentum: -2 },
          { type: 'rejection', delta: 1 },
          { type: 'enthusiasm', delta: 4 },
        ],
      },
      {
        id: 'silent',
        label: 'Manter o foco nas propostas',
        effects: [
          { type: 'opponent', target: 'context', rejection: 4 },
          { type: 'attribute', attribute: 'credibility', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'party_crisis',
    category: 'party',
    phases: ['campaign', 'governing', 'legislating'],
    weight: 6,
    cooldownDays: 40,
    negative: true,
    weightModifier: (s) => (partyUnity(s) < 55 ? 3 : 1),
    title: '{playerParty} enfrenta crise interna',
    description:
      'Facções do {playerParty} trocam acusações publicamente. A militância está confusa.',
    options: [
      {
        id: 'mediate',
        label: 'Mediar pessoalmente o conflito',
        effects: [
          { type: 'energy', delta: -15 },
          { type: 'partyUnity', delta: 12 },
          { type: 'attribute', attribute: 'leadership', delta: 1 },
        ],
      },
      {
        id: 'side',
        label: 'Tomar partido da ala majoritária',
        effects: [
          { type: 'partyUnity', delta: -4 },
          { type: 'enthusiasm', delta: 5 },
        ],
      },
      {
        id: 'ignore',
        label: 'Ficar fora da briga',
        effects: [
          { type: 'partyUnity', delta: -8 },
          { type: 'militants', pct: -6 },
          {
            type: 'news',
            headline: 'Partido de {playerName} rachado às vésperas da eleição',
            sentiment: -1,
            category: 'party',
          },
        ],
      },
    ],
  },
  {
    id: 'strike',
    category: 'regional',
    phases: ['campaign'],
    weight: 6,
    cooldownDays: 25,
    context: ['unit'],
    title: 'Greve paralisa {unitName}',
    description:
      'Trabalhadores cruzam os braços em {unitName}. Jornalistas querem saber de que lado você está.',
    options: [
      {
        id: 'support',
        label: 'Apoiar os grevistas',
        effects: [
          { type: 'popMomentum', popTypes: ['workers', 'industrial_workers'], delta: 5 },
          { type: 'popMomentum', popTypes: ['business', 'merchants'], delta: -4 },
          { type: 'ideologyShift', shift: { economy: -3 } },
        ],
      },
      {
        id: 'order',
        label: 'Defender a volta ao trabalho',
        effects: [
          { type: 'popMomentum', popTypes: ['business', 'merchants'], delta: 4 },
          { type: 'popMomentum', popTypes: ['workers', 'industrial_workers'], delta: -4 },
          { type: 'ideologyShift', shift: { economy: 3 } },
        ],
      },
      {
        id: 'mediate',
        label: 'Propor mediação',
        effects: [
          { type: 'presence', delta: 6, scope: 'context' },
          { type: 'energy', delta: -10 },
          { type: 'attribute', attribute: 'negotiation', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'flood',
    category: 'crisis',
    phases: ['campaign'],
    weight: 5,
    cooldownDays: 40,
    context: ['unit'],
    title: 'Enchentes atingem {unitName}',
    description: 'Chuvas fortes deixam milhares de desabrigados em {unitName}.',
    options: [
      {
        id: 'visit',
        label: 'Ir ao local e ajudar pessoalmente',
        effects: [
          { type: 'energy', delta: -20 },
          { type: 'presence', delta: 15, scope: 'context' },
          { type: 'knowledge', delta: 5, scope: 'context' },
          { type: 'money', amount: -50_000 },
        ],
      },
      {
        id: 'team',
        label: 'Enviar equipe e doações',
        effects: [
          { type: 'money', amount: -30_000 },
          { type: 'presence', delta: 6, scope: 'context' },
        ],
      },
      {
        id: 'criticize',
        label: 'Culpar o governo pela falta de prevenção',
        effects: [
          { type: 'regionalMomentum', delta: 3, scope: 'context' },
          { type: 'rejection', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'celebrity_endorsement',
    category: 'opportunity',
    phases: ['campaign'],
    weight: 6,
    cooldownDays: 40,
    title: 'Celebridade declara apoio',
    description: 'Um cantor popular quer gravar um vídeo apoiando {playerName}.',
    options: [
      {
        id: 'accept',
        label: 'Aceitar e divulgar',
        effects: [
          { type: 'knowledge', delta: 4 },
          { type: 'popMomentum', popTypes: ['students', 'workers'], delta: 3 },
          { type: 'enthusiasm', delta: 3 },
        ],
      },
      {
        id: 'decline',
        label: 'Agradecer, mas manter distância',
        effects: [{ type: 'attribute', attribute: 'credibility', delta: 1 }],
      },
    ],
  },
  {
    id: 'community_leaders',
    category: 'opportunity',
    phases: ['campaign'],
    weight: 6,
    cooldownDays: 30,
    context: ['unit'],
    title: 'Lideranças de {unitName} oferecem apoio',
    description:
      'Associações de bairro e lideranças comunitárias de {unitName} querem fechar com {playerName}, em troca de compromissos.',
    options: [
      {
        id: 'accept',
        label: 'Aceitar e assumir compromissos',
        effects: [
          { type: 'presence', delta: 14, scope: 'context' },
          { type: 'regionalMomentum', delta: 4, scope: 'context' },
          { type: 'issueFocus', issue: 'infrastructure', delta: 10 },
        ],
      },
      {
        id: 'decline',
        label: 'Recusar acordos',
        effects: [{ type: 'attribute', attribute: 'credibility', delta: 1 }],
      },
    ],
  },
  {
    id: 'agro_pressure',
    category: 'politics',
    phases: ['campaign'],
    weight: 5,
    cooldownDays: 45,
    title: 'Produtores cobram posição sobre licenciamento ambiental',
    description:
      'Entidades do agronegócio e ambientalistas querem uma resposta clara de {playerName}.',
    options: [
      {
        id: 'production',
        label: 'Defender licenciamento mais ágil',
        effects: [
          { type: 'ideologyShift', shift: { environment: 6 } },
          { type: 'popMomentum', popTypes: ['farmers', 'business'], delta: 5 },
          { type: 'popMomentum', popTypes: ['students', 'health_workers'], delta: -3 },
        ],
      },
      {
        id: 'environment',
        label: 'Defender a proteção ambiental',
        effects: [
          { type: 'ideologyShift', shift: { environment: -6 } },
          { type: 'popMomentum', popTypes: ['students', 'middle_class'], delta: 4 },
          { type: 'popMomentum', popTypes: ['farmers'], delta: -6 },
        ],
      },
      {
        id: 'evade',
        label: 'Responder de forma vaga',
        effects: [{ type: 'attribute', attribute: 'credibility', delta: -2 }],
      },
    ],
  },
  {
    id: 'apps_regulation',
    category: 'politics',
    phases: ['campaign'],
    weight: 5,
    cooldownDays: 45,
    title: 'Debate sobre motoristas de aplicativo',
    description:
      'Motoristas e entregadores protestam. Regular as plataformas ou deixar o mercado decidir?',
    options: [
      {
        id: 'regulate',
        label: 'Defender direitos trabalhistas para os apps',
        effects: [
          { type: 'ideologyShift', shift: { economy: -3 } },
          { type: 'popMomentum', popTypes: ['workers', 'unemployed'], delta: 4 },
          { type: 'popMomentum', popTypes: ['tech_workers', 'business'], delta: -3 },
        ],
      },
      {
        id: 'freedom',
        label: 'Defender a liberdade das plataformas',
        effects: [
          { type: 'ideologyShift', shift: { economy: 3 } },
          { type: 'popMomentum', popTypes: ['tech_workers', 'business'], delta: 4 },
          { type: 'popMomentum', popTypes: ['workers'], delta: -3 },
        ],
      },
    ],
  },
  {
    id: 'violence_wave',
    category: 'crisis',
    phases: ['campaign'],
    weight: 6,
    cooldownDays: 35,
    context: ['unit'],
    title: 'Onda de violência em {unitName}',
    description: 'Uma sequência de crimes choca {unitName}. Segurança vira o assunto da semana.',
    options: [
      {
        id: 'tough',
        label: 'Discurso duro: "bandido não terá vez"',
        effects: [
          { type: 'ideologyShift', shift: { security: 6 } },
          { type: 'popMomentum', popTypes: ['merchants', 'retirees', 'middle_class'], delta: 4 },
          { type: 'popMomentum', popTypes: ['students'], delta: -3 },
          { type: 'issueFocus', issue: 'security', delta: 12 },
        ],
      },
      {
        id: 'prevention',
        label: 'Defender prevenção e inteligência',
        effects: [
          { type: 'ideologyShift', shift: { security: -6 } },
          { type: 'popMomentum', popTypes: ['students', 'health_workers'], delta: 4 },
          { type: 'popMomentum', popTypes: ['merchants'], delta: -2 },
          { type: 'issueFocus', issue: 'security', delta: 8 },
        ],
      },
      {
        id: 'visit',
        label: 'Visitar as famílias das vítimas',
        effects: [
          { type: 'energy', delta: -10 },
          { type: 'presence', delta: 10, scope: 'context' },
        ],
      },
    ],
  },
  {
    id: 'staff_quits',
    category: 'campaign',
    phases: ['campaign'],
    weight: 5,
    cooldownDays: 30,
    negative: true,
    condition: hasStaff,
    title: 'Membro da equipe abandona a campanha',
    description:
      'Um integrante importante da equipe de {playerName} pediu demissão e deu entrevista criticando a campanha.',
    options: [
      {
        id: 'replace',
        label: 'Contratar substituto às pressas',
        effects: [
          { type: 'money', amount: -60_000 },
          { type: 'rejection', delta: 0.5 },
        ],
      },
      {
        id: 'go_on',
        label: 'Seguir sem ele',
        effects: [{ type: 'removeStaff' }, { type: 'enthusiasm', delta: -5 }],
      },
    ],
  },
  {
    id: 'surprise_poll',
    category: 'media',
    phases: ['campaign'],
    weight: 4,
    cooldownDays: 30,
    condition: (s) => inCampaign(s) && playerPollShare(s) > 0.08 && !playerIsLeading(s),
    title: 'Pesquisa aponta crescimento de {playerName}',
    description:
      'Levantamento independente mostra {playerName} em ascensão. A militância comemora.',
    options: [
      {
        id: 'ok',
        label: 'Ótima notícia!',
        effects: [
          { type: 'enthusiasm', delta: 6 },
          { type: 'militants', pct: 5 },
        ],
      },
    ],
  },
  {
    id: 'volunteer_surge',
    category: 'campaign',
    phases: ['campaign'],
    weight: 4,
    cooldownDays: 35,
    title: 'Voluntários se multiplicam',
    description: 'Comitês espontâneos de apoio a {playerName} surgem em várias cidades.',
    options: [
      {
        id: 'ok',
        label: 'Organizar os novos voluntários',
        effects: [
          { type: 'militants', pct: 12 },
          { type: 'enthusiasm', delta: 4 },
        ],
      },
    ],
  },
  {
    id: 'old_post',
    category: 'scandal',
    phases: ['campaign'],
    weight: 6,
    cooldownDays: 30,
    negative: true,
    title: 'Post antigo de {playerName} reaparece',
    description: 'Uma publicação de anos atrás, considerada ofensiva por muitos, volta a circular.',
    options: [
      {
        id: 'apologize',
        label: 'Pedir desculpas publicamente',
        effects: [
          { type: 'attribute', attribute: 'credibility', delta: 1 },
          { type: 'rejection', delta: 1 },
        ],
      },
      {
        id: 'defend',
        label: 'Defender o que disse',
        effects: [
          { type: 'rejection', delta: 3 },
          { type: 'enthusiasm', delta: 4 },
          { type: 'ideologyShift', shift: { social: 3 } },
        ],
      },
      {
        id: 'delete',
        label: 'Apagar e ignorar',
        effects: [
          { type: 'rejection', delta: 2 },
          { type: 'attribute', attribute: 'credibility', delta: -2 },
        ],
      },
    ],
  },
  {
    id: 'prime_time_invite',
    category: 'opportunity',
    phases: ['campaign'],
    weight: 6,
    cooldownDays: 20,
    title: 'Convite para entrevista em horário nobre',
    description:
      'A TV Horizonte convida {playerName} para uma entrevista ao vivo. Alta audiência, alto risco.',
    options: [
      {
        id: 'accept',
        label: 'Aceitar o convite',
        effects: [{ type: 'interview', interviewType: 'tv' }],
      },
      {
        id: 'decline',
        label: 'Recusar',
        effects: [
          {
            type: 'news',
            headline: '{playerName} foge de entrevista na TV, dizem adversários',
            sentiment: -1,
            category: 'interview',
          },
          { type: 'rejection', delta: 0.5 },
        ],
      },
    ],
  },
  {
    id: 'alliance_offer',
    category: 'politics',
    phases: ['campaign'],
    weight: 5,
    cooldownDays: 40,
    context: ['party'],
    title: '{partyName} propõe aliança',
    description:
      'O {partyName} oferece apoio formal à candidatura de {playerName}: mais tempo de TV e estrutura, em troca de espaço no futuro governo.',
    options: [
      {
        id: 'accept',
        label: 'Fechar a aliança',
        effects: [
          { type: 'knowledge', delta: 4 },
          { type: 'relation', partyId: 'context', delta: 25 },
          { type: 'partyUnity', delta: -4 },
          { type: 'money', amount: 120_000 },
          {
            type: 'history',
            kind: 'alliance',
            title: 'Aliança com o {partyName}',
            importance: 2,
            sentiment: 1,
          },
        ],
      },
      {
        id: 'decline',
        label: 'Recusar e manter a independência',
        effects: [
          { type: 'relation', partyId: 'context', delta: -10 },
          { type: 'partyUnity', delta: 4 },
        ],
      },
    ],
  },
  {
    id: 'health_scare',
    category: 'campaign',
    phases: ['campaign'],
    weight: 3,
    cooldownDays: 60,
    negative: true,
    title: 'Mal-estar durante a agenda',
    description: '{playerName} passa mal no meio de um evento. Os médicos recomendam repouso.',
    options: [
      {
        id: 'rest',
        label: 'Repousar',
        effects: [
          { type: 'energy', delta: 30 },
          { type: 'popMomentum', popTypes: ['retirees'], delta: 1 },
        ],
      },
      {
        id: 'keep_going',
        label: 'Seguir a agenda ("nada vai me parar")',
        effects: [
          { type: 'energy', delta: -20 },
          { type: 'enthusiasm', delta: 4 },
        ],
      },
    ],
  },
  {
    id: 'popular_festival',
    category: 'regional',
    phases: ['campaign'],
    weight: 6,
    cooldownDays: 15,
    context: ['unit'],
    title: 'Festa popular em {unitName}',
    description: 'A tradicional festa de {unitName} reúne milhares de pessoas neste fim de semana.',
    options: [
      {
        id: 'attend',
        label: 'Comparecer e dançar com o povo',
        effects: [
          { type: 'energy', delta: -10 },
          { type: 'presence', delta: 12, scope: 'context' },
          { type: 'knowledge', delta: 4, scope: 'context' },
        ],
      },
      { id: 'skip', label: 'Manter a agenda', effects: [] },
    ],
  },
  {
    id: 'student_protest',
    category: 'crisis',
    phases: ['campaign', 'governing'],
    weight: 4,
    cooldownDays: 45,
    title: 'Protesto estudantil por mais verbas',
    description: 'Estudantes ocupam as ruas exigindo investimento em educação.',
    options: [
      {
        id: 'support',
        label: 'Apoiar os estudantes',
        effects: [
          { type: 'popMomentum', popTypes: ['students'], delta: 5 },
          { type: 'popSatisfaction', popTypes: ['students'], delta: 3 },
          { type: 'interestGroup', groupId: 'youth', delta: 6 },
        ],
      },
      {
        id: 'condemn',
        label: 'Criticar a desordem',
        effects: [
          { type: 'popMomentum', popTypes: ['retirees', 'merchants'], delta: 2 },
          { type: 'popMomentum', popTypes: ['students'], delta: -5 },
          { type: 'interestGroup', groupId: 'youth', delta: -6 },
        ],
      },
    ],
  },
  {
    id: 'fuel_prices',
    category: 'economy',
    phases: ['campaign'],
    weight: 5,
    cooldownDays: 40,
    title: 'Preço dos combustíveis dispara',
    description: 'O litro da gasolina bate recorde. Caminhoneiros ameaçam greve.',
    options: [
      {
        id: 'subsidy',
        label: 'Prometer subsídio aos combustíveis',
        effects: [
          { type: 'ideologyShift', shift: { economy: -4 } },
          { type: 'popMomentum', popTypes: ['workers', 'merchants', 'farmers'], delta: 3 },
          { type: 'popMomentum', popTypes: ['business'], delta: -2 },
        ],
      },
      {
        id: 'market',
        label: 'Defender a política de preços de mercado',
        effects: [
          { type: 'ideologyShift', shift: { economy: 4 } },
          { type: 'popMomentum', popTypes: ['business'], delta: 3 },
          { type: 'popMomentum', popTypes: ['workers'], delta: -3 },
        ],
      },
    ],
  },
  {
    id: 'ex_ally_attack',
    category: 'opponent',
    phases: ['campaign'],
    weight: 4,
    cooldownDays: 50,
    negative: true,
    condition: (s) => playerPollShare(s) > 0.12,
    title: 'Ex-aliado faz denúncias contra {playerName}',
    description: 'Um antigo aliado, hoje do lado adversário, diz ter "provas" contra {playerName}.',
    options: [
      {
        id: 'respond',
        label: 'Responder ponto a ponto',
        effects: [
          { type: 'energy', delta: -10 },
          { type: 'rejection', delta: 1 },
        ],
      },
      {
        id: 'counter',
        label: 'Contra-atacar o adversário dele',
        effects: [
          { type: 'opponent', target: 'leader', rejection: 2 },
          { type: 'rejection', delta: 2 },
        ],
      },
      {
        id: 'silence',
        label: 'Silêncio',
        effects: [
          { type: 'rejection', delta: 2.5 },
          { type: 'scandal', delta: 3 },
        ],
      },
    ],
  },
  {
    id: 'debate_prep_offer',
    category: 'opportunity',
    phases: ['campaign'],
    weight: 4,
    cooldownDays: 40,
    title: 'Ex-marqueteiro oferece consultoria',
    description: 'Um consultor experiente se oferece para preparar {playerName} para os debates.',
    options: [
      {
        id: 'hire',
        label: 'Aceitar a consultoria',
        effects: [
          { type: 'money', amount: -70_000 },
          { type: 'prep', delta: 0.15 },
        ],
      },
      { id: 'decline', label: 'Dispensar', effects: [] },
    ],
  },
  {
    id: 'tv_guaranteed_scandal',
    accusesOpponent: true,
    category: 'scandal',
    phases: ['campaign'],
    weight: 3,
    cooldownDays: 60,
    negative: true,
    context: ['opponent'],
    title: 'Dossiê contra {playerName} circula em Brasília',
    description:
      'Aliados de {opponentName} estariam distribuindo um dossiê contra você a jornalistas.',
    options: [
      {
        id: 'expose',
        label: 'Denunciar a manobra',
        effects: [
          { type: 'opponent', target: 'context', rejection: 3 },
          { type: 'rejection', delta: 1 },
        ],
      },
      { id: 'lawyers', label: 'Acionar advogados', effects: [{ type: 'money', amount: -60_000 }] },
    ],
  },

  // ───────────────────────── GOVERNO ─────────────────────────
  {
    id: 'budget_hole',
    category: 'economy',
    phases: ['governing'],
    weight: 8,
    cooldownDays: 120,
    negative: true,
    condition: deficitIsHigh,
    title: 'Rombo nas contas públicas',
    description: 'Técnicos alertam: o déficit está fora de controle. O mercado reage mal.',
    options: [
      {
        id: 'cut',
        label: 'Anunciar corte de gastos',
        effects: [
          { type: 'approval', delta: -4 },
          { type: 'economyShock', label: 'Ajuste fiscal', months: 6, confidence: 6, growth: -0.3 },
          { type: 'interestGroup', groupId: 'civil_servants', delta: -6 },
        ],
      },
      {
        id: 'tax',
        label: 'Propor aumento temporário de impostos',
        effects: [
          { type: 'approval', delta: -3 },
          { type: 'interestGroup', groupId: 'business', delta: -8 },
          { type: 'economyShock', label: 'Imposto extra', months: 6, confidence: -2 },
        ],
      },
      {
        id: 'ignore',
        label: 'Não fazer nada',
        effects: [
          {
            type: 'economyShock',
            label: 'Desconfiança fiscal',
            months: 8,
            confidence: -8,
            inflation: 0.6,
          },
        ],
      },
    ],
  },
  {
    id: 'servants_strike',
    category: 'crisis',
    phases: ['governing'],
    weight: 6,
    cooldownDays: 150,
    negative: true,
    title: 'Servidores públicos entram em greve',
    description: 'Professores e servidores da saúde exigem reajuste salarial.',
    options: [
      {
        id: 'raise',
        label: 'Conceder reajuste',
        effects: [
          { type: 'budgetSpend', category: 'administration', share: 0.08 },
          { type: 'interestGroup', groupId: 'civil_servants', delta: 10 },
          { type: 'interestGroup', groupId: 'unions', delta: 6 },
          { type: 'approval', delta: 1 },
        ],
      },
      {
        id: 'negotiate',
        label: 'Abrir mesa de negociação',
        effects: [
          { type: 'politicalCapital', delta: -10 },
          { type: 'interestGroup', groupId: 'civil_servants', delta: 3 },
        ],
      },
      {
        id: 'firm',
        label: 'Cortar o ponto dos grevistas',
        effects: [
          { type: 'approval', delta: -3 },
          { type: 'interestGroup', groupId: 'unions', delta: -12 },
          { type: 'interestGroup', groupId: 'business', delta: 3 },
        ],
      },
    ],
  },
  {
    id: 'natural_disaster_gov',
    category: 'crisis',
    phases: ['governing'],
    weight: 5,
    cooldownDays: 180,
    negative: true,
    title: 'Desastre natural deixa milhares de desabrigados',
    description:
      'Chuvas e deslizamentos destroem bairros inteiros. A população espera uma resposta rápida.',
    options: [
      {
        id: 'aid',
        label: 'Plano emergencial de ajuda',
        effects: [
          { type: 'budgetSpend', category: 'social', share: 0.08 },
          { type: 'approval', delta: 5 },
          {
            type: 'history',
            kind: 'crisis',
            title: 'Resposta rápida a desastre natural',
            importance: 2,
            sentiment: 1,
          },
        ],
      },
      {
        id: 'request',
        label: 'Pedir ajuda a outras esferas de governo',
        effects: [
          { type: 'politicalCapital', delta: -6 },
          { type: 'approval', delta: 2 },
        ],
      },
      {
        id: 'minimal',
        label: 'Resposta mínima (preservar o caixa)',
        effects: [
          { type: 'approval', delta: -8 },
          {
            type: 'history',
            kind: 'crisis',
            title: 'Omissão em desastre natural',
            importance: 2,
            sentiment: -1,
          },
        ],
      },
    ],
  },
  {
    id: 'minister_scandal',
    category: 'scandal',
    phases: ['governing'],
    weight: 5,
    cooldownDays: 150,
    negative: true,
    condition: (s) => (s.government?.ministers.length ?? 0) > 0,
    title: 'Escândalo atinge membro do primeiro escalão',
    description: 'Um integrante da equipe de governo é acusado de favorecer empresas em contratos.',
    options: [
      {
        id: 'fire',
        label: 'Demitir imediatamente',
        effects: [
          { type: 'relation', partyId: 'coalition', delta: -10 },
          { type: 'approval', delta: 2 },
          { type: 'attribute', attribute: 'credibility', delta: 3 },
        ],
      },
      {
        id: 'defend',
        label: 'Defender o aliado',
        effects: [
          { type: 'approval', delta: -6 },
          { type: 'scandal', delta: 8 },
          { type: 'relation', partyId: 'coalition', delta: 5 },
          {
            type: 'history',
            kind: 'scandal',
            title: 'Governo defende auxiliar investigado',
            importance: 2,
            sentiment: -1,
          },
        ],
      },
      {
        id: 'investigate',
        label: 'Abrir sindicância interna',
        effects: [
          { type: 'politicalCapital', delta: -8 },
          { type: 'approval', delta: -1 },
        ],
      },
    ],
  },
  {
    id: 'commodity_boom',
    category: 'economy',
    phases: ['governing', 'legislating', 'campaign'],
    weight: 3,
    cooldownDays: 365,
    title: 'Alta nos preços das commodities',
    description:
      'A demanda internacional por soja, minério e petróleo dispara. A economia agradece.',
    options: [
      {
        id: 'ok',
        label: 'Aproveitar o bom momento',
        effects: [
          {
            type: 'economyShock',
            label: 'Boom de commodities',
            months: 8,
            growth: 0.9,
            confidence: 5,
          },
          { type: 'popSatisfaction', popTypes: ['farmers', 'business'], delta: 4 },
        ],
      },
    ],
  },
  {
    id: 'global_crisis',
    category: 'economy',
    phases: ['governing', 'legislating'],
    weight: 3,
    cooldownDays: 400,
    negative: true,
    title: 'Crise financeira internacional',
    description: 'Bolsas despencam no mundo todo. O dólar dispara e o crédito seca.',
    options: [
      {
        id: 'stimulus',
        label: 'Pacote de estímulo',
        effects: [
          {
            type: 'economyShock',
            label: 'Crise global (com estímulo)',
            months: 8,
            growth: -0.9,
            confidence: -6,
            inflation: 0.4,
          },
          { type: 'budgetSpend', category: 'infrastructure', share: 0.1 },
          { type: 'approval', delta: 2 },
        ],
      },
      {
        id: 'austerity',
        label: 'Austeridade para proteger as contas',
        effects: [
          {
            type: 'economyShock',
            label: 'Crise global (com austeridade)',
            months: 10,
            growth: -1.4,
            confidence: -2,
          },
          { type: 'approval', delta: -4 },
        ],
      },
    ],
  },
  {
    id: 'factory_investment',
    category: 'opportunity',
    phases: ['governing'],
    weight: 4,
    cooldownDays: 200,
    title: 'Multinacional quer construir fábrica',
    description:
      'Uma empresa estrangeira estuda instalar uma grande fábrica, mas pede incentivos fiscais.',
    options: [
      {
        id: 'incentives',
        label: 'Oferecer incentivos fiscais',
        effects: [
          {
            type: 'economyShock',
            label: 'Nova fábrica',
            months: 12,
            growth: 0.3,
            unemployment: -0.2,
          },
          { type: 'interestGroup', groupId: 'industry', delta: 8 },
          { type: 'budgetSpend', category: 'administration', share: 0.03 },
        ],
      },
      {
        id: 'no',
        label: 'Recusar privilégios',
        effects: [
          { type: 'interestGroup', groupId: 'industry', delta: -4 },
          { type: 'attribute', attribute: 'credibility', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'cost_of_living_protest',
    category: 'crisis',
    phases: ['governing'],
    weight: 6,
    cooldownDays: 120,
    negative: true,
    condition: (s) => s.economy.inflation > 6,
    title: 'Protestos contra o custo de vida',
    description: 'Com a inflação alta, milhares vão às ruas reclamar dos preços.',
    options: [
      {
        id: 'relief',
        label: 'Ampliar programas sociais',
        effects: [
          { type: 'budgetSpend', category: 'social', share: 0.06 },
          { type: 'approval', delta: 3 },
          { type: 'popSatisfaction', popTypes: ['unemployed', 'workers'], delta: 4 },
        ],
      },
      {
        id: 'explain',
        label: 'Pronunciamento em rede nacional',
        effects: [
          { type: 'approval', delta: -1 },
          { type: 'politicalCapital', delta: -5 },
        ],
      },
    ],
  },
  {
    id: 'coalition_rebellion',
    category: 'politics',
    phases: ['governing'],
    weight: 6,
    cooldownDays: 120,
    negative: true,
    condition: hasCoalition,
    title: 'Base aliada ameaça rebelião',
    description: 'Líderes da base reclamam de falta de espaço e ameaçam votar contra o governo.',
    options: [
      {
        id: 'amendments',
        label: 'Liberar emendas',
        effects: [
          { type: 'budgetSpend', category: 'administration', share: 0.03 },
          { type: 'relation', partyId: 'coalition', delta: 12 },
        ],
      },
      {
        id: 'meet',
        label: 'Reunir os líderes no palácio',
        effects: [
          { type: 'politicalCapital', delta: -10 },
          { type: 'relation', partyId: 'coalition', delta: 8 },
        ],
      },
      {
        id: 'confront',
        label: 'Enfrentar publicamente a chantagem',
        effects: [
          { type: 'relation', partyId: 'coalition', delta: -15 },
          { type: 'approval', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'epidemic',
    category: 'crisis',
    phases: ['governing'],
    weight: 4,
    cooldownDays: 240,
    negative: true,
    title: 'Surto de dengue',
    description: 'Hospitais lotados e casos em alta. A saúde pública é posta à prova.',
    options: [
      {
        id: 'emergency',
        label: 'Mutirão de combate e reforço nos hospitais',
        effects: [
          { type: 'budgetSpend', category: 'health', share: 0.06 },
          { type: 'approval', delta: 3 },
          { type: 'interestGroup', groupId: 'retirees', delta: 4 },
        ],
      },
      {
        id: 'downplay',
        label: 'Minimizar o problema',
        effects: [
          { type: 'approval', delta: -6 },
          {
            type: 'history',
            kind: 'crisis',
            title: 'Governo minimiza surto de dengue',
            importance: 2,
            sentiment: -1,
          },
        ],
      },
    ],
  },
  {
    id: 'press_investigation',
    category: 'media',
    phases: ['governing', 'legislating'],
    weight: 5,
    cooldownDays: 150,
    negative: true,
    title: 'Reportagem investiga contratos do seu gabinete',
    description:
      'Um grande jornal prepara série de reportagens sobre contratos assinados por sua equipe.',
    options: [
      {
        id: 'transparency',
        label: 'Abrir todos os documentos',
        effects: [
          { type: 'approval', delta: 2 },
          { type: 'politicalCapital', delta: -5 },
          { type: 'attribute', attribute: 'credibility', delta: 2 },
        ],
      },
      {
        id: 'attack_press',
        label: 'Atacar a imprensa',
        effects: [
          { type: 'approval', delta: -2 },
          { type: 'scandal', delta: 4 },
          { type: 'interestGroup', groupId: 'social_movements', delta: -3 },
        ],
      },
      { id: 'ignore', label: 'Não comentar', effects: [{ type: 'approval', delta: -1 }] },
    ],
  },
  {
    id: 'summit_invite',
    category: 'opportunity',
    phases: ['governing'],
    weight: 3,
    cooldownDays: 200,
    condition: isPresident,
    title: 'Convite para cúpula internacional',
    description:
      'Chefes de Estado se reúnem para discutir comércio e clima. O Brasil é convidado de honra.',
    options: [
      {
        id: 'attend',
        label: 'Comparecer e discursar',
        effects: [
          { type: 'fame', delta: 4 },
          { type: 'approval', delta: 2 },
          { type: 'ideologyShift', shift: { foreign: -4 } },
        ],
      },
      {
        id: 'skip',
        label: 'Priorizar a agenda doméstica',
        effects: [{ type: 'interestGroup', groupId: 'business', delta: -2 }],
      },
    ],
  },
  {
    id: 'record_harvest',
    category: 'economy',
    phases: ['governing', 'legislating'],
    weight: 3,
    cooldownDays: 300,
    title: 'Safra recorde',
    description:
      'O campo bate recorde de produção, puxando o PIB e segurando os preços dos alimentos.',
    options: [
      {
        id: 'ok',
        label: 'Celebrar com os produtores',
        effects: [
          { type: 'economyShock', label: 'Safra recorde', months: 6, growth: 0.5, inflation: -0.3 },
          { type: 'popSatisfaction', popTypes: ['farmers'], delta: 5 },
          { type: 'interestGroup', groupId: 'agribusiness', delta: 4 },
        ],
      },
    ],
  },

  {
    id: 'group_protest',
    category: 'crisis',
    phases: ['governing'],
    weight: 0,
    chainOnly: true,
    negative: true,
    title: '{groupName} protestam contra o governo',
    description:
      'Insatisfeitos com os rumos do governo, os {groupName} organizam atos e ameaçam paralisações.',
    options: [
      {
        id: 'negotiate',
        label: 'Abrir negociação',
        effects: [
          { type: 'politicalCapital', delta: -8 },
          { type: 'interestGroup', groupId: 'context', delta: 10 },
          { type: 'radicalism', groupId: 'context', delta: -12 },
        ],
      },
      {
        id: 'concede',
        label: 'Atender parte das reivindicações',
        effects: [
          { type: 'budgetSpend', category: 'social', share: 0.04 },
          { type: 'interestGroup', groupId: 'context', delta: 15 },
          { type: 'approval', delta: 1 },
          { type: 'radicalism', groupId: 'context', delta: -18 },
        ],
      },
      {
        id: 'ignore',
        label: 'Ignorar os protestos',
        effects: [
          { type: 'approval', delta: -3 },
          { type: 'interestGroup', groupId: 'context', delta: -5 },
          { type: 'radicalism', groupId: 'context', delta: 8 },
        ],
      },
    ],
  },

  // ───────────────────────── MANDATO LEGISLATIVO ─────────────────────────
  {
    id: 'party_line_pressure',
    category: 'party',
    phases: ['legislating'],
    weight: 6,
    cooldownDays: 90,
    title: 'Bancada pressiona por fidelidade',
    description:
      'A liderança do {playerParty} exige que você siga a orientação partidária numa votação polêmica.',
    options: [
      {
        id: 'follow',
        label: 'Seguir o partido',
        effects: [
          { type: 'partyUnity', delta: 5 },
          { type: 'approval', delta: -1 },
        ],
      },
      {
        id: 'conscience',
        label: 'Votar com a consciência',
        effects: [
          { type: 'partyUnity', delta: -6 },
          { type: 'attribute', attribute: 'credibility', delta: 2 },
          { type: 'approval', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'lobby_offer',
    category: 'scandal',
    phases: ['legislating', 'governing'],
    weight: 4,
    cooldownDays: 180,
    title: 'Lobista oferece "vantagens"',
    description:
      'Um lobista sugere que uma emenda favorável ao setor dele "seria muito bem recompensada".',
    options: [
      {
        id: 'refuse',
        label: 'Recusar',
        effects: [{ type: 'attribute', attribute: 'credibility', delta: 2 }],
      },
      {
        id: 'report',
        label: 'Denunciar à Polícia Federal',
        effects: [
          { type: 'attribute', attribute: 'credibility', delta: 4 },
          { type: 'fame', delta: 3 },
          { type: 'approval', delta: 3 },
          {
            type: 'history',
            kind: 'event',
            title: 'Denunciou tentativa de suborno',
            importance: 2,
            sentiment: 1,
          },
        ],
      },
      {
        id: 'accept',
        label: 'Aceitar discretamente',
        effects: [
          { type: 'scandal', delta: 10 },
          { type: 'chain', eventId: 'bribe_exposed', inDays: 60, chance: 0.5 },
        ],
      },
    ],
  },
  {
    id: 'bribe_exposed',
    category: 'scandal',
    phases: ['legislating', 'governing', 'campaign', 'career'],
    weight: 0,
    chainOnly: true,
    negative: true,
    title: 'Operação policial expõe esquema de propina',
    description: 'Gravações mostram negociações suspeitas envolvendo {playerName}.',
    options: [
      {
        id: 'deny',
        label: 'Negar tudo',
        effects: [
          { type: 'scandal', delta: 20 },
          { type: 'approval', delta: -10 },
          { type: 'attribute', attribute: 'credibility', delta: -10 },
          {
            type: 'history',
            kind: 'scandal',
            title: 'Envolvimento em esquema de propina',
            importance: 3,
            sentiment: -1,
          },
        ],
      },
      {
        id: 'confess',
        label: 'Admitir erro e colaborar',
        effects: [
          { type: 'scandal', delta: 12 },
          { type: 'approval', delta: -6 },
          { type: 'attribute', attribute: 'credibility', delta: -5 },
          {
            type: 'history',
            kind: 'scandal',
            title: 'Admitiu participação em esquema',
            importance: 3,
            sentiment: -1,
          },
        ],
      },
    ],
  },
  {
    id: 'committee_chair',
    category: 'opportunity',
    phases: ['legislating'],
    weight: 4,
    cooldownDays: 240,
    title: 'Convite para presidir comissão',
    description: 'Você foi indicado(a) para presidir uma comissão importante.',
    options: [
      {
        id: 'accept',
        label: 'Aceitar',
        effects: [
          { type: 'fame', delta: 5 },
          { type: 'politicalCapital', delta: 12 },
          { type: 'attribute', attribute: 'experience', delta: 2 },
        ],
      },
      { id: 'decline', label: 'Recusar', effects: [] },
    ],
  },
  // Expansão Nação: economia, greves, capitais, energia, Congresso.
  ...NATION_EVENT_DEFINITIONS,
];

export function getEventDefinition(id: string): EventDefinition | undefined {
  return EVENT_DEFINITIONS.find((e) => e.id === id);
}
