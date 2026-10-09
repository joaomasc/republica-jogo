import { GameConstants } from '../config/constants';
import { clamp, clamp100, sum } from '../core/math';
import type { Rng } from '../core/rng';
import type { CandidateId, PartyId, StateId } from '../core/types';
import type { OfficeId } from '../election/offices';
import type { IdeologyVector } from '../ideology/axes';
import { jitterIdeology } from '../ideology/ideology';
import type { Party } from '../parties/types';
import { randomAppearance, type AvatarConfig } from './appearance';
import { ATTRIBUTE_IDS, ATTRIBUTE_POINT_BUY, type CandidateAttributes } from './attributes';
import { BACKGROUNDS, getBackground } from './backgrounds';
import { randomName } from './names';
import type { ParodyPolitician } from '../world/parody';
import type { Candidate, Gender } from './types';

export interface CreateCandidateInput {
  firstName: string;
  lastName: string;
  ballotName?: string;
  age: number;
  gender: Gender;
  appearance: AvatarConfig;
  /** Valores após a distribuição de pontos (sem bônus de origem). */
  attributes: CandidateAttributes;
  ideology: IdeologyVector;
  backgroundId: string;
  homeStateId: StateId;
  /** Bandeiras (leis que defende): categoria → opção. */
  platform?: Record<string, string>;
}

export function pointsSpent(attrs: CandidateAttributes): number {
  return sum(ATTRIBUTE_IDS.map((id) => attrs[id] - ATTRIBUTE_POINT_BUY.base));
}

export function validateCandidateInput(input: CreateCandidateInput): string | null {
  if (input.firstName.trim().length < 2) return 'Informe o nome do candidato.';
  if (input.lastName.trim().length < 2) return 'Informe o sobrenome do candidato.';
  if (input.age < 18 || input.age > 90) return 'A idade deve estar entre 18 e 90 anos.';
  for (const id of ATTRIBUTE_IDS) {
    const v = input.attributes[id];
    if (v < ATTRIBUTE_POINT_BUY.min || v > ATTRIBUTE_POINT_BUY.max)
      return 'Atributo fora dos limites permitidos.';
  }
  if (pointsSpent(input.attributes) > ATTRIBUTE_POINT_BUY.freePoints)
    return 'Você distribuiu mais pontos do que o permitido.';
  return null;
}

export function applyBackground(
  attrs: CandidateAttributes,
  backgroundId: string,
  ageYears: number,
): CandidateAttributes {
  const bg = getBackground(backgroundId);
  const out = { ...attrs };
  for (const [id, bonus] of Object.entries(bg.bonuses) as [keyof CandidateAttributes, number][])
    out[id] = clamp100(out[id] + bonus);
  // Idade traz experiência; juventude, energia (tratada na campanha).
  out.experience = clamp100(out.experience + clamp((ageYears - 35) * 0.4, -6, 12));
  return out;
}

export function buildPlayerCandidate(
  input: CreateCandidateInput,
  id: CandidateId,
  partyId: PartyId,
): Candidate {
  const bg = getBackground(input.backgroundId);
  const attributes = applyBackground(input.attributes, input.backgroundId, input.age);
  const first = input.firstName.trim();
  const last = input.lastName.trim();
  return {
    id,
    firstName: first,
    lastName: last,
    ballotName: input.ballotName?.trim() || `${first} ${last}`,
    age: input.age,
    gender: input.gender,
    partyId,
    homeStateId: input.homeStateId,
    appearance: input.appearance,
    attributes,
    ideology: { ...input.ideology },
    backgroundId: input.backgroundId,
    isPlayer: true,
    fame: clamp100(4 + attributes.popularity * 0.18 + bg.fameBonus),
    scandal: 0,
    currentOffice: null,
    bio: `${bg.name} de ${input.age} anos.`,
    ...(input.platform && Object.keys(input.platform).length > 0 ? { platform: { ...input.platform } } : {}),
  };
}

export interface NpcOptions {
  id: CandidateId;
  party: Party;
  homeStateId: StateId;
  /** 0.5 = fraco, 1 = normal, 1.5 = muito forte. */
  strength: number;
  incumbentOffice?: OfficeId | null;
  /** Conhecimento público inicial (sobrescreve o sorteio). */
  fame?: number;
}

export function generateNpcCandidate(rng: Rng, opts: NpcOptions): Candidate {
  const genderRoll = rng.next();
  const gender: Gender = genderRoll < 0.52 ? 'male' : genderRoll < 0.97 ? 'female' : 'nonbinary';
  const name = randomName(
    rng,
    gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'neutral',
  );
  const age = rng.int(35, 72);
  const bg = rng.pick(BACKGROUNDS);
  const attributes = {} as CandidateAttributes;
  for (const id of ATTRIBUTE_IDS)
    attributes[id] = clamp(Math.round(rng.normal(48 * opts.strength, 11)), 15, 92);
  const finalAttrs = applyBackground(attributes, bg.id, age);
  const presentation =
    gender === 'male' ? 'masculine' : gender === 'female' ? 'feminine' : 'neutral';
  const useNickname = rng.chance(0.25);
  const ballotName = useNickname
    ? `${name.firstName} ${rng.pick(['do Povo', 'da Saúde', 'Trabalhador', 'Professor', 'Doutor', 'Guerreiro', 'Amigo'])}`
    : `${name.firstName} ${name.lastName}`;
  return {
    id: opts.id,
    firstName: name.firstName,
    lastName: name.lastName,
    ballotName,
    age,
    gender,
    partyId: opts.party.id,
    homeStateId: opts.homeStateId,
    appearance: randomAppearance(rng, presentation, age),
    attributes: finalAttrs,
    ideology: jitterIdeology(opts.party.ideology, rng, 6),
    backgroundId: bg.id,
    isPlayer: false,
    fame: clamp100(
      opts.fame ??
        (opts.incumbentOffice
          ? GameConstants.opponents.startingKnowledgeIncumbent
          : rng.range(
              GameConstants.opponents.startingKnowledgeMin,
              GameConstants.opponents.startingKnowledgeMax,
            )),
    ),
    scandal: rng.chance(0.15) ? rng.int(5, 25) : 0,
    currentOffice: opts.incumbentOffice ?? null,
    bio: `${bg.name}, ${age} anos, filiado(a) ao ${opts.party.acronym}.`,
  };
}

/**
 * Veste um NPC sorteado com um personagem do mundo paródia: nome, idade, caricatura e pontos
 * fortes. A força geral, o dinheiro e a ideologia continuam vindo do sorteio/partido.
 */
export function applyParodyPersona(
  npc: Candidate,
  persona: ParodyPolitician,
  party: Pick<Party, 'acronym'>,
): Candidate {
  const attributes = { ...npc.attributes };
  for (const [k, v] of Object.entries(persona.strengths) as [keyof CandidateAttributes, number][])
    attributes[k] = clamp(Math.round((v + attributes[k]) / 2 + 8), 15, 95);
  return {
    ...npc,
    firstName: persona.firstName,
    lastName: persona.lastName,
    ballotName: persona.ballotName,
    age: persona.age,
    gender: persona.gender,
    homeStateId: persona.homeStateId,
    appearance: { ...persona.appearance },
    attributes,
    // Mais conhecido que um NPC comum, mas sem atropelar o jogador.
    fame: clamp100(Math.max(npc.fame, Math.min(persona.fame, npc.fame + 15))),
    scandal: 0,
    parodyKey: persona.key,
    bio: `${persona.bio} (${party.acronym}) — personagem de paródia.`,
  };
}

/** Apelo pessoal do candidato (0..1). */
export function personalAppeal(attrs: CandidateAttributes): number {
  const w = GameConstants.voter.appealWeights;
  return (
    (attrs.charisma * w.charisma +
      attrs.credibility * w.credibility +
      attrs.communication * w.communication +
      attrs.popularity * w.popularity +
      attrs.oratory * w.oratory) /
    100
  );
}

export function candidateFullName(c: Pick<Candidate, 'firstName' | 'lastName'>): string {
  return `${c.firstName} ${c.lastName}`;
}
