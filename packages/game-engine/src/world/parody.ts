/**
 * MUNDO PARÓDIA — sátira no estilo das charges políticas.
 *
 * Personagens e partidos são FICTÍCIOS, com nomes-trocadilho e caricaturas desenhadas
 * (nunca fotos). Não representam fatos, falas ou posições reais de ninguém.
 * Regras de equilíbrio: todos os campos do espectro são parodiados no mesmo tom, e
 * eventos que acusam adversários de irregularidades nunca escolhem personagens de paródia.
 */
import type { AvatarConfig } from '../candidate/appearance';
import type { CandidateAttributes } from '../candidate/attributes';
import type { Gender } from '../candidate/types';
import type { PartyId, StateId } from '../core/types';
import type { OfficeId } from '../election/offices';
import type { PartySymbol } from '../parties/types';

export const WORLD_IDS = ['real', 'fictional', 'parody'] as const;
export type WorldId = (typeof WORLD_IDS)[number];

export const WORLDS: Record<WorldId, { name: string; description: string }> = {
  real: {
    name: 'Brasil real',
    description: 'Os 30 partidos registrados no TSE, com sigla, número e logo oficiais.',
  },
  fictional: {
    name: 'Fictício',
    description: 'Partidos e políticos inventados. Qualquer semelhança é coincidência.',
  },
  parody: {
    name: 'Paródia',
    description:
      'Sátira à la charge: partidos e políticos com nomes-trocadilho e caricaturas. É humor, não notícia.',
  },
};

export const REAL_WORLD_DISCLAIMER =
  'Partidos reais (registro no TSE em out/2026). Posições ideológicas e forças são aproximações do modelo do jogo; candidatos, eventos e escândalos são fictícios.';

export const PARODY_DISCLAIMER =
  'Mundo paródia: personagens e partidos são caricaturas fictícias, em tom de sátira. Nada aqui descreve fatos, falas ou posições reais.';

export interface PartySkin {
  name: string;
  acronym: string;
  color?: string;
  symbol?: PartySymbol;
  leaderName: string;
  description: string;
}

/** "Pele" de paródia sobre cada partido do modelo (mesma ideologia/mecânica, outro nome). */
export const PARODY_PARTY_SKINS: Record<PartyId, PartySkin> = {
  ftu: {
    name: 'Partido dos Trabalhadores Eternos',
    acronym: 'PTE',
    symbol: 'star',
    leaderName: 'Gleice Hofmanha',
    description:
      'A estrela vermelha que nunca sai de moda. Sindicatos, churrasco e discurso de improviso.',
  },
  alb: {
    name: 'Partido Novíssimo de Novo',
    acronym: 'NOVÍSSIMO',
    leaderName: 'João Amoedinho',
    description: 'Gestão, planilha e laranja na logo. Promete o Estado mínimo — com app.',
  },
  pop: {
    name: 'Partido Liberal Mitológico',
    acronym: 'PLM',
    color: '#1f4e9c',
    symbol: 'flag',
    leaderName: 'Valdemar da Costa Neto Neto',
    description: 'Verde, amarelo e motociata. Ordem, família e muita live no fim de semana.',
  },
  udc: {
    name: 'Movimento Democrático do Bem-Bom',
    acronym: 'MDBB',
    leaderName: 'Baleia Rossinho',
    description: 'O centro do centro do Centrão. Sempre na base — de qualquer governo.',
  },
  ren: {
    name: 'Rede Sustentabilíssima',
    acronym: 'REDINHA',
    leaderName: 'Marina Selva',
    description: 'Pequena, verde e convicta. Floresta em pé e reunião que vai até tarde.',
  },
  psa: {
    name: 'Progressistas da Roça',
    acronym: 'PdR',
    leaderName: 'Arthur Lirinha',
    description: 'Do agro para o Congresso: trator, crédito rural e emenda na mão.',
  },
  nes: {
    name: 'Partido do Sol e da Liberdade Total',
    acronym: 'PSOLzinho',
    symbol: 'sun',
    leaderName: 'Erika Hiltonzinha',
    description: 'Ocupação, assembleia e textão. A esquerda que acha a outra esquerda de centro.',
  },
  renova: {
    name: 'Partido da Renovação Turbo Boost',
    acronym: 'PRTBoost',
    symbol: 'bolt',
    leaderName: 'Coach Leonardo Avalanche',
    description: 'Alta performance, mentalidade de dono e corte de cabelo no estilo influencer.',
  },
  pfr: {
    name: 'Partido Social Democrático do Muro',
    acronym: 'PSDM',
    leaderName: 'Gilberto Kassabino',
    description:
      '"Nem esquerda, nem direita, nem centro." Governadores e prefeitos para todo lado.',
  },
};

type AvatarLook = Partial<AvatarConfig> & Pick<AvatarConfig, 'presentation'>;

function look(l: AvatarLook): AvatarConfig {
  return {
    skinTone: '#f6cfa8',
    faceShape: 'oval',
    eyes: 'almond',
    eyeColor: '#3d2a1e',
    eyebrows: 'straight',
    hairStyle: 'short',
    hairColor: '#3b2416',
    beard: 'none',
    glasses: 'none',
    accessory: 'none',
    outfit: 'suit',
    outfitColor: '#1f2a44',
    shirtColor: '#ffffff',
    tie: l.presentation === 'feminine' ? 'none' : 'classic',
    tieColor: '#1d4ed8',
    expression: 'smile',
    ...l,
  };
}

export interface ParodyPolitician {
  key: string;
  firstName: string;
  lastName: string;
  ballotName: string;
  gender: Gender;
  age: number;
  partyId: PartyId;
  homeStateId: StateId;
  /** Cargos que o personagem disputa (estado obrigatório para cargos estaduais/municipais). */
  runsFor: { officeId: OfficeId; stateId?: StateId }[];
  fame: number;
  /** Atributos em destaque (os demais vêm da força do adversário). */
  strengths: Partial<CandidateAttributes>;
  appearance: AvatarConfig;
  bio: string;
}

const P = (p: ParodyPolitician) => p;

export const PARODY_POLITICIANS: ParodyPolitician[] = [
  // ── Esquerda ──
  P({
    key: 'lulao',
    firstName: 'Lúcio',
    lastName: 'Lulão da Silveira',
    ballotName: 'Lulão',
    gender: 'male',
    age: 80,
    partyId: 'ftu',
    homeStateId: 'SP',
    runsFor: [{ officeId: 'presidente' }],
    fame: 96,
    strengths: { charisma: 90, oratory: 88, negotiation: 85, experience: 92, communication: 80 },
    appearance: look({
      presentation: 'masculine',
      skinTone: '#e8b48a',
      faceShape: 'round',
      hairStyle: 'receding',
      hairColor: '#e6e6e6',
      beard: 'full',
      eyebrows: 'thick',
      tieColor: '#c1121f',
      expression: 'laugh',
      accessory: 'party_pin',
    }),
    bio: 'Ex-metalúrgico, contador de causos e campeão de discursos sem papel.',
  }),
  P({
    key: 'radad',
    firstName: 'Fernando',
    lastName: 'Radad',
    ballotName: 'Radad',
    gender: 'male',
    age: 63,
    partyId: 'ftu',
    homeStateId: 'SP',
    runsFor: [
      { officeId: 'presidente' },
      { officeId: 'governador', stateId: 'SP' },
      { officeId: 'prefeito', stateId: 'SP' },
    ],
    fame: 82,
    strengths: { management: 78, experience: 75, credibility: 62, charisma: 45 },
    appearance: look({
      presentation: 'masculine',
      faceShape: 'long',
      hairStyle: 'side_part',
      hairColor: '#9a9a9a',
      expression: 'serious',
      tieColor: '#c1121f',
    }),
    bio: 'Professor que explica a planilha antes de responder à pergunta.',
  }),
  P({
    key: 'alcmim',
    firstName: 'Geraldo',
    lastName: 'Alcmim',
    ballotName: 'Alcmim',
    gender: 'male',
    age: 74,
    partyId: 'ftu',
    homeStateId: 'SP',
    runsFor: [
      { officeId: 'governador', stateId: 'SP' },
      { officeId: 'senador', stateId: 'SP' },
    ],
    fame: 80,
    strengths: { management: 72, credibility: 70, experience: 88, charisma: 30 },
    appearance: look({
      presentation: 'masculine',
      faceShape: 'long',
      hairStyle: 'bald',
      hairColor: '#9a9a9a',
      glasses: 'square',
      expression: 'serious',
    }),
    bio: 'Picolé de chuchu certificado. Nunca levantou a voz — nem para pedir voto.',
  }),
  P({
    key: 'bolos',
    firstName: 'Guilherme',
    lastName: 'Bolos',
    ballotName: 'Bolos',
    gender: 'male',
    age: 44,
    partyId: 'nes',
    homeStateId: 'SP',
    runsFor: [
      { officeId: 'prefeito', stateId: 'SP' },
      { officeId: 'governador', stateId: 'SP' },
      { officeId: 'presidente' },
    ],
    fame: 72,
    strengths: { oratory: 80, leadership: 78, charisma: 70, management: 40 },
    appearance: look({
      presentation: 'masculine',
      hairStyle: 'short',
      hairColor: '#1b1b1b',
      beard: 'stubble',
      outfit: 'polo',
      tie: 'none',
      outfitColor: '#7f1d1d',
      expression: 'determined',
    }),
    bio: 'Megafone na mão e assembleia marcada para as 19h (começa às 21h).',
  }),
  P({
    key: 'marina',
    firstName: 'Marina',
    lastName: 'Selva',
    ballotName: 'Marina Selva',
    gender: 'female',
    age: 68,
    partyId: 'ren',
    homeStateId: 'AC',
    runsFor: [{ officeId: 'presidente' }, { officeId: 'senador', stateId: 'AC' }],
    fame: 78,
    strengths: { credibility: 80, oratory: 70, experience: 80, charisma: 50 },
    appearance: look({
      presentation: 'feminine',
      skinTone: '#965c38',
      faceShape: 'long',
      hairStyle: 'bun',
      hairColor: '#3b2416',
      glasses: 'round',
      outfit: 'shirt',
      outfitColor: '#14532d',
      expression: 'serious',
    }),
    bio: 'Fala baixo, cita a floresta e aparece de quatro em quatro anos.',
  }),
  P({
    key: 'campinho',
    firstName: 'João',
    lastName: 'Campinho',
    ballotName: 'João Campinho',
    gender: 'male',
    age: 32,
    partyId: 'ftu',
    homeStateId: 'PE',
    runsFor: [
      { officeId: 'governador', stateId: 'PE' },
      { officeId: 'prefeito', stateId: 'PE' },
    ],
    fame: 70,
    strengths: { communication: 85, charisma: 78, popularity: 70, experience: 40 },
    appearance: look({
      presentation: 'masculine',
      hairStyle: 'wavy',
      hairColor: '#3b2416',
      outfit: 'shirt',
      tie: 'none',
      expression: 'smile',
    }),
    bio: 'Prefeito-influencer: dança no TikTok e inaugura obra no mesmo vídeo.',
  }),
  // ── Direita ──
  P({
    key: 'bolsonario',
    firstName: 'Jaime',
    lastName: 'Bolsonário',
    ballotName: 'Bolsonário',
    gender: 'male',
    age: 71,
    partyId: 'pop',
    homeStateId: 'RJ',
    runsFor: [{ officeId: 'presidente' }],
    fame: 95,
    strengths: {
      charisma: 82,
      communication: 86,
      leadership: 75,
      negotiation: 30,
      credibility: 45,
    },
    appearance: look({
      presentation: 'masculine',
      faceShape: 'long',
      hairStyle: 'side_part',
      hairColor: '#9a9a9a',
      eyebrows: 'angry',
      tieColor: '#15803d',
      accessory: 'flag_pin',
      expression: 'determined',
    }),
    bio: 'Capitão das lives de quinta-feira e do cercadinho.',
  }),
  P({
    key: 'micheline',
    firstName: 'Micheline',
    lastName: 'Bolsonária',
    ballotName: 'Micheline',
    gender: 'female',
    age: 44,
    partyId: 'pop',
    homeStateId: 'DF',
    runsFor: [
      { officeId: 'presidente' },
      { officeId: 'senador', stateId: 'DF' },
      { officeId: 'governador', stateId: 'DF' },
    ],
    fame: 80,
    strengths: { charisma: 80, communication: 78, popularity: 72, experience: 35 },
    appearance: look({
      presentation: 'feminine',
      hairStyle: 'long',
      hairColor: '#a8742f',
      outfit: 'dress',
      outfitColor: '#1e3a8a',
      accessory: 'earrings',
      expression: 'smile',
    }),
    bio: 'Discurso emocionado, microfone na mão e plateia em pé.',
  }),
  P({
    key: 'tarcidio',
    firstName: 'Tarcídio',
    lastName: 'de Fritas',
    ballotName: 'Tarcídio',
    gender: 'male',
    age: 51,
    partyId: 'pop',
    homeStateId: 'SP',
    runsFor: [{ officeId: 'governador', stateId: 'SP' }, { officeId: 'presidente' }],
    fame: 82,
    strengths: { management: 85, experience: 70, credibility: 68, charisma: 58 },
    appearance: look({
      presentation: 'masculine',
      faceShape: 'square',
      hairStyle: 'buzz',
      hairColor: '#3b2416',
      expression: 'confident',
    }),
    bio: 'Engenheiro que responde tudo com "vamos entregar". Inclusive "bom dia".',
  }),
  P({
    key: 'zama',
    firstName: 'Romeu',
    lastName: 'Zama',
    ballotName: 'Zama',
    gender: 'male',
    age: 61,
    partyId: 'alb',
    homeStateId: 'MG',
    runsFor: [{ officeId: 'governador', stateId: 'MG' }, { officeId: 'presidente' }],
    fame: 72,
    strengths: { management: 80, credibility: 66, charisma: 40, oratory: 38 },
    appearance: look({
      presentation: 'masculine',
      hairStyle: 'receding',
      hairColor: '#e6e6e6',
      outfit: 'shirt',
      tie: 'none',
      expression: 'smile',
    }),
    bio: 'Empresário de fala mansa que trata o Estado como uma loja de departamentos.',
  }),
  P({
    key: 'caiadao',
    firstName: 'Ronaldo',
    lastName: 'Caiadão',
    ballotName: 'Caiadão',
    gender: 'male',
    age: 77,
    partyId: 'psa',
    homeStateId: 'GO',
    runsFor: [{ officeId: 'governador', stateId: 'GO' }, { officeId: 'presidente' }],
    fame: 70,
    strengths: { experience: 88, leadership: 70, negotiation: 60, charisma: 45 },
    appearance: look({
      presentation: 'masculine',
      faceShape: 'square',
      hairStyle: 'side_part',
      hairColor: '#e6e6e6',
      tieColor: '#f59e0b',
      expression: 'serious',
    }),
    bio: 'Médico, fazendeiro e orador de sotaque goiano inconfundível.',
  }),
  P({
    key: 'ferreirinha',
    firstName: 'Nicolau',
    lastName: 'Ferreirinha',
    ballotName: 'Ferreirinha',
    gender: 'male',
    age: 30,
    partyId: 'pop',
    homeStateId: 'MG',
    runsFor: [
      { officeId: 'senador', stateId: 'MG' },
      { officeId: 'governador', stateId: 'MG' },
      { officeId: 'deputado_federal', stateId: 'MG' },
    ],
    fame: 74,
    strengths: { communication: 90, charisma: 72, popularity: 75, experience: 30 },
    appearance: look({
      presentation: 'masculine',
      hairStyle: 'side_part',
      hairColor: '#1b1b1b',
      outfit: 'blazer',
      tie: 'none',
      expression: 'confident',
    }),
    bio: 'Fenômeno dos cortes de vídeo. Cada discurso vira 40 reels.',
  }),
  P({
    key: 'marco',
    firstName: 'Pablo',
    lastName: 'Março',
    ballotName: 'Pablo Março',
    gender: 'male',
    age: 39,
    partyId: 'renova',
    homeStateId: 'SP',
    runsFor: [
      { officeId: 'prefeito', stateId: 'SP' },
      { officeId: 'presidente' },
      { officeId: 'governador', stateId: 'GO' },
    ],
    fame: 68,
    strengths: { communication: 92, charisma: 80, credibility: 30, management: 45 },
    appearance: look({
      presentation: 'masculine',
      hairStyle: 'buzz',
      hairColor: '#3b2416',
      beard: 'stubble',
      outfit: 'blazer',
      outfitColor: '#2b2d42',
      shirtColor: '#222222',
      tie: 'none',
      expression: 'laugh',
    }),
    bio: 'Coach de alta performance. Vende curso até no debate.',
  }),
  // ── Centro ──
  P({
    key: 'tebete',
    firstName: 'Simone',
    lastName: 'Tebete',
    ballotName: 'Tebete',
    gender: 'female',
    age: 56,
    partyId: 'udc',
    homeStateId: 'MS',
    runsFor: [
      { officeId: 'presidente' },
      { officeId: 'senador', stateId: 'MS' },
      { officeId: 'governador', stateId: 'MS' },
    ],
    fame: 68,
    strengths: { credibility: 74, negotiation: 75, oratory: 70, charisma: 52 },
    appearance: look({
      presentation: 'feminine',
      hairStyle: 'bob',
      hairColor: '#3b2416',
      outfit: 'blazer',
      outfitColor: '#4a4e69',
      expression: 'confident',
    }),
    bio: 'A terceira via que sempre chega em terceiro — e depois vira ministra.',
  }),
  P({
    key: 'ratao',
    firstName: 'Ratão',
    lastName: 'Júnior',
    ballotName: 'Ratão Jr.',
    gender: 'male',
    age: 45,
    partyId: 'pfr',
    homeStateId: 'PR',
    runsFor: [{ officeId: 'governador', stateId: 'PR' }, { officeId: 'presidente' }],
    fame: 74,
    strengths: { popularity: 80, charisma: 72, management: 70, communication: 75 },
    appearance: look({
      presentation: 'masculine',
      faceShape: 'round',
      hairStyle: 'side_part',
      hairColor: '#3b2416',
      expression: 'laugh',
    }),
    bio: 'Herdeiro de um programa de auditório e da arte de não brigar com ninguém.',
  }),
  P({
    key: 'leiteiro',
    firstName: 'Eduardo',
    lastName: 'Leiteiro',
    ballotName: 'Leiteiro',
    gender: 'male',
    age: 41,
    partyId: 'pfr',
    homeStateId: 'RS',
    runsFor: [{ officeId: 'governador', stateId: 'RS' }, { officeId: 'presidente' }],
    fame: 64,
    strengths: { management: 75, communication: 72, credibility: 65 },
    appearance: look({
      presentation: 'masculine',
      hairStyle: 'side_part',
      hairColor: '#6a4325',
      outfit: 'blazer',
      tie: 'none',
      expression: 'smile',
    }),
    bio: 'Gestor de camisa social e mangas dobradas. Já trocou de partido mais que de gravata.',
  }),
  P({
    key: 'paes',
    firstName: 'Eduardo',
    lastName: 'Pães',
    ballotName: 'Pães',
    gender: 'male',
    age: 56,
    partyId: 'udc',
    homeStateId: 'RJ',
    runsFor: [
      { officeId: 'prefeito', stateId: 'RJ' },
      { officeId: 'governador', stateId: 'RJ' },
    ],
    fame: 76,
    strengths: { communication: 82, charisma: 74, management: 70, negotiation: 72 },
    appearance: look({
      presentation: 'masculine',
      faceShape: 'round',
      hairStyle: 'receding',
      hairColor: '#6a4325',
      outfit: 'shirt',
      tie: 'none',
      expression: 'laugh',
    }),
    bio: 'Prefeito de bermuda no fim de semana e de bate-boca no Twitter na semana.',
  }),
  P({
    key: 'nunis',
    firstName: 'Ricardo',
    lastName: 'Nunis',
    ballotName: 'Nunis',
    gender: 'male',
    age: 58,
    partyId: 'udc',
    homeStateId: 'SP',
    runsFor: [{ officeId: 'prefeito', stateId: 'SP' }],
    fame: 60,
    strengths: { management: 68, negotiation: 70, charisma: 35 },
    appearance: look({
      presentation: 'masculine',
      hairStyle: 'short',
      hairColor: '#9a9a9a',
      glasses: 'square',
      expression: 'serious',
    }),
    bio: 'O prefeito que você esquece o nome, mas que ganhou a eleição.',
  }),
  P({
    key: 'barbalhao',
    firstName: 'Helder',
    lastName: 'Barbalhão',
    ballotName: 'Barbalhão',
    gender: 'male',
    age: 47,
    partyId: 'udc',
    homeStateId: 'PA',
    runsFor: [
      { officeId: 'governador', stateId: 'PA' },
      { officeId: 'senador', stateId: 'PA' },
    ],
    fame: 66,
    strengths: { negotiation: 78, management: 68, popularity: 66 },
    appearance: look({
      presentation: 'masculine',
      skinTone: '#d29a6c',
      hairStyle: 'side_part',
      hairColor: '#1b1b1b',
      expression: 'smile',
    }),
    bio: 'Herdeiro de uma dinastia política do Norte e de um sobrenome que abre portas.',
  }),
  P({
    key: 'gomos',
    firstName: 'Ciro',
    lastName: 'Gomos',
    ballotName: 'Ciro Gomos',
    gender: 'male',
    age: 68,
    partyId: 'pfr',
    homeStateId: 'CE',
    runsFor: [{ officeId: 'presidente' }, { officeId: 'governador', stateId: 'CE' }],
    fame: 74,
    strengths: { oratory: 88, experience: 82, credibility: 55, negotiation: 25 },
    appearance: look({
      presentation: 'masculine',
      faceShape: 'long',
      hairStyle: 'side_part',
      hairColor: '#e6e6e6',
      eyebrows: 'angry',
      expression: 'determined',
    }),
    bio: 'Sabe a resposta para tudo e briga com todo mundo — a começar pelos aliados.',
  }),
];

/** Personagem de paródia disponível para um partido/cargo/estado nesta eleição. */
export function pickParodyPolitician(
  partyId: PartyId,
  officeId: OfficeId,
  stateId: StateId | null,
  used: ReadonlySet<string>,
): ParodyPolitician | null {
  const options = PARODY_POLITICIANS.filter(
    (p) =>
      p.partyId === partyId &&
      !used.has(p.key) &&
      p.runsFor.some((r) => r.officeId === officeId && (!r.stateId || r.stateId === stateId)),
  ).sort((a, b) => b.fame - a.fame);
  return options[0] ?? null;
}
