import type {
  AvatarConfig,
  CandidateAttributes,
  CreatePartyInput,
  DifficultyId,
  EconomicSituation,
  Gender,
  IdeologyVector,
  OfficeId,
  SandboxOptions,
  StateId,
  WorldId,
} from '@republica/game-engine';

/** Pré-configuração vinda do Sandbox ou de um Cenário. */
export interface WizardPreset {
  mode: 'career' | 'sandbox' | 'scenario';
  scenarioId?: string;
  officeId?: OfficeId;
  stateId?: StateId;
  year?: number;
  difficulty?: DifficultyId;
  economy?: EconomicSituation;
  partyId?: string;
  backgroundId?: string;
  sandbox?: SandboxOptions;
  lockOffice?: boolean;
  world?: WorldId;
}

export interface WizardState {
  firstName: string;
  lastName: string;
  ballotName: string;
  age: number;
  gender: Gender;
  homeStateId: StateId;
  appearance: AvatarConfig;
  backgroundId: string;
  attributes: CandidateAttributes;
  ideology: IdeologyVector;
  /** Bandeiras: leis que o personagem defende (categoria → opção). */
  platform: Record<string, string>;
  party: { kind: 'existing'; partyId: string } | { kind: 'new'; input: CreatePartyInput };
  officeId: OfficeId;
  stateId: StateId;
  /** Cidade das eleições municipais (código IBGE; `null` = capital). */
  cityId: string | null;
  difficulty: DifficultyId;
  world: WorldId;
  weekly: boolean;
}
