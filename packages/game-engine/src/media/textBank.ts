import type { IssueId } from '../ideology/issues';
import type { DebateStrategy } from './interactions';

/** Perguntas procedurais por tema. Variáveis: {place} {unemployment} {inflation} {office} {player}. */
export const ISSUE_QUESTIONS: Record<IssueId, string[]> = {
  jobs: [
    'O desemprego em {place} está em {unemployment}%. O que você fará para gerar empregos?',
    'Muitos jovens não encontram trabalho. Qual o seu plano?',
  ],
  healthcare: [
    'As filas nos hospitais são a maior queixa do eleitor. Qual a sua proposta para a saúde?',
    'Falta médico nos postos de {place}. Como resolver?',
  ],
  education: [
    'A educação pública vai mal nas avaliações. O que você muda?',
    'Como manter os jovens na escola em {place}?',
  ],
  security: [
    'A violência preocupa os moradores de {place}. Como pretende enfrentar o crime?',
    'Você é a favor de penas mais duras?',
  ],
  taxes: [
    'Empresários reclamam da carga tributária. Você vai mexer nos impostos?',
    'Quem deve pagar mais impostos no Brasil?',
  ],
  inflation: [
    'A inflação está em {inflation}% e corrói o salário. O que fazer?',
    'O preço da comida subiu muito. Qual a sua resposta?',
  ],
  corruption: [
    'Como garantir que não haverá corrupção no seu mandato?',
    'O eleitor desconfia dos políticos. Por que confiar em você?',
  ],
  infrastructure: [
    'Estradas esburacadas e obras paradas: como destravar a infraestrutura?',
    'Saneamento básico ainda não chega a todos. Qual seu plano?',
  ],
  housing: ['O aluguel ficou impagável em {place}. Qual a solução para a moradia?'],
  environment: [
    'Desenvolvimento ou preservação: de que lado você está?',
    'Como enfrentar as queimadas e o desmatamento?',
  ],
  pensions: ['A Previdência está quebrada? Você mexeria nas aposentadorias?'],
  regulation: ['Abrir uma empresa no Brasil é um pesadelo burocrático. O que você faria?'],
  credit: ['O pequeno empresário não consegue crédito. Como ajudar?'],
  agriculture: ['O agronegócio pede mais apoio. Qual sua política para o campo?'],
  technology: ['Como preparar {place} para a economia digital?'],
  transport: ['O transporte público é caro e lotado. Qual a sua proposta?'],
  welfare: ['Os programas de transferência de renda devem ser ampliados ou revistos?'],
};

export const TECHNICAL_ANSWERS = [
  'Apresentar um diagnóstico com números e um plano em etapas.',
  'Explicar que a solução exige gestão, metas e acompanhamento técnico.',
];
export const EVASIVE_ANSWERS = [
  'Dizer que "vai estudar o tema com a equipe" e mudar de assunto.',
  'Responder com generalidades sobre "o futuro do país".',
];
export const EMPATHETIC_ANSWERS = [
  'Contar a história de uma família que sofre com o problema e prometer cuidado.',
];

export const HOSTILE_QUESTIONS = {
  scandal: 'Vamos falar de "{memory}". Os eleitores merecem uma explicação.',
  promise: 'Você prometeu "{memory}" e não cumpriu. Por que acreditar agora?',
  party: 'Seu partido está rachado. Como governar se nem o {party} se entende?',
  polls: 'As pesquisas mostram você com apenas {share}. Sua candidatura não decolou?',
  experience: 'Críticos dizem que falta experiência a você. O que responde?',
};

export const HOSTILE_ANSWERS = {
  empathetic: 'Reconhecer erros, pedir desculpas e mostrar o que aprendeu.',
  technical: 'Explicar os fatos com documentos e dados.',
  attack: 'Acusar adversários e a imprensa de perseguição.',
  evasive: 'Dizer que o assunto "já foi esclarecido" e mudar de tema.',
};

export const DEBATE_MODERATOR = [
  'Candidato(a), o tema é {topic}. O senhor(a) tem dois minutos.',
  'Pergunta sobre {topic}: o que fará nos primeiros 100 dias?',
];

export const DEBATE_ATTACKS = {
  record: '"{player}, como explicar {memory}? O eleitor não esqueceu!"',
  promise: '"{player}, você prometeu {memory}. Cadê?"',
  ideology: '"As ideias de {player} são um perigo para {place}!"',
  experience: '"{player} nunca administrou nada. Vai aprender no cargo?"',
  party: '"Nem o partido de {player} confia nele(a)!"',
};

export const STRATEGY_TEXT: Record<
  DebateStrategy,
  { name: string; description: string; line: string }
> = {
  technical: {
    name: 'Técnica',
    description: 'Dados, planos e números. Agrada o eleitor escolarizado.',
    line: 'responde com números e um plano detalhado.',
  },
  popular: {
    name: 'Popular',
    description: 'Linguagem simples, exemplos do dia a dia.',
    line: 'fala a língua do povo com exemplos do cotidiano.',
  },
  aggressive: {
    name: 'Agressiva',
    description: 'Parte para cima. Anima a base, aumenta a rejeição.',
    line: 'parte para o ataque, em tom duro.',
  },
  conciliatory: {
    name: 'Conciliadora',
    description: 'Busca consensos. Reduz rejeição, ganha pouco.',
    line: 'adota tom conciliador e propõe diálogo.',
  },
  emotional: {
    name: 'Emocional',
    description: 'Histórias e sentimentos. Arriscado sem credibilidade.',
    line: 'conta uma história emocionante.',
  },
  evasive: {
    name: 'Evasiva',
    description: 'Foge do tema. Seguro, mas custa credibilidade.',
    line: 'desvia do assunto.',
  },
};
