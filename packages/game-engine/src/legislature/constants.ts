/**
 * Constantes de balanceamento do processo legislativo. Reexportadas em `GameConstants.legislature`.
 */
export const LegislatureConstants = {
  /** Partido vota a favor de uma bandeira sua (ou contra derrubá-la). */
  platformLogit: 1.2,
  /** Credibilidade ao propor uma bandeira própria / ao contrariar uma bandeira própria. */
  platformKeepCredibility: 2,
  platformBreakCredibility: 5,
  /** Dias de comissão por instrumento (sem urgência). MP: comissão mista. */
  committeeDays: { pl: 45, plp: 60, pec: 75, mp: 30 },
  /** Dias de comissão com urgência. */
  urgentCommitteeDays: 7,
  /** Vigência máxima de uma Medida Provisória (dias). */
  mpMaxDays: 120,
  /** MP pendente há mais de N dias tranca a pauta da casa em que está. */
  mpLockDays: 45,
  /** Adiamento das demais votações enquanto a pauta está trancada (dias). */
  mpLockPostponeDays: 3,
  /** Prazo de sanção (dias corridos ≈ 15 dias úteis). */
  sanctionDays: 21,
  /** Dias até o Executivo NPC decidir a sanção. */
  npcSanctionDays: 5,
  /** Prazo para o Congresso apreciar o veto (dias). */
  vetoSessionDays: 30,
  /** Intervalo entre os dois turnos de uma PEC (dias). */
  pecRoundGapDays: 7,
  /** Antecedência do plebiscito após a aprovação (dias). */
  plebisciteDays: 60,
  /** Quórum de PEC (fração dos membros) e de lei complementar/derrubada de veto. */
  pecQuorum: 0.6,
  absoluteMajority: 0.5,
  /** Impeachment: 2/3 na Câmara (autorização) e no Senado (condenação). */
  impeachmentQuorum: 2 / 3,

  /** PEC de parlamentar: assinaturas de 1/3 da casa. */
  pecSignatureShare: 1 / 3,
  /** Prazo para reunir as assinaturas antes do arquivamento (dias). */
  signatureWindowDays: 180,
  signatureCapital: 4,
  /** Fração dos apoiadores ainda não signatários conquistada por rodada de coleta. */
  signatureCollectRate: 0.45,

  /** Pauta: atraso base e adicional por hostilidade do presidente da casa (dias). */
  agendaBaseDays: 12,
  agendaHostilityDays: 60,
  agendaUrgentDays: 2,
  /** Negociação de pauta: votação marcada em até N dias. */
  agendaDealDays: 7,
  /** Antecedência entre a inclusão na pauta e a votação (dias). */
  voteNoticeDays: 3,
  /** Abaixo desta postura o presidente da casa engaveta o projeto (salvo urgência/negociação). */
  shelveRelation: -35,
  shelveRecheckDays: 45,
  /** Engavetado por mais que isso: arquivado. */
  shelveMaxDays: 360,
  agendaCapital: 12,
  agendaRelationGain: 15,
  /** Peso da preferência ideológica do presidente da casa na sua postura (pontos por unidade de afinidade). */
  speakerIdeologyWeight: 400,

  /** Parecer do relator: efeito no plenário (logit). */
  relatorReportLogit: { pending: 0, favorable: 0.35, amended: 0.15, unfavorable: -0.6 },
  /** Probabilidade mínima de apoio do relator para parecer favorável / com emendas. */
  relatorFavorableP: 0.58,
  relatorAmendedP: 0.42,
  relatorNoiseSd: 0.7,
  /** Influência da postura do presidente da casa no parecer (logit por 100 pontos). */
  relatorSpeakerWeight: 0.6,
  /** Peso do alinhamento do relator escolhido com a postura do presidente da casa. */
  relatorAlignWeight: 0.8,
  relatorLobbyCapital: 8,
  relatorLobbyLean: 0.9,
  /** Jogador parlamentar pode ser relator com relação boa com o presidente da casa. */
  relatorPlayerMinRelation: 25,
  relatorPlayerChance: 0.3,

  /** Urgência pedida pelo Executivo / por parlamentar; urgência urgentíssima (votar tudo no dia). */
  urgencyCapital: 10,
  urgencyLegislatorCapital: 15,
  rushCapital: 8,
  rushSpeakerRelation: -4,

  /** Modelo de voto (seção 5.3). */
  pragmatismIdeologyCut: 0.45,
  pragmatismDealWeight: 0.6,
  /** Orientação do governo à base em projetos que não são do Executivo. */
  govOrientationLogit: 0.6,
  govOrientationMinGain: 0.015,
  authorPartyLogit: 1.2,
  /** Projetos de parlamentares/bancadas NPC raramente prosperam. */
  npcBillPenalty: 0.5,
  /** Sessão de veto: base do governo segura o veto; oposição tende a derrubar. */
  vetoLoyaltyLogit: 1.4,
  vetoOppositionLogit: 0.4,
  absenceMax: 0.06,
  caucusPointLogit: 0.12,
  caucusPreferredLogit: 0.8,
  caucusOpposedLogit: 0.9,
  caucusRelationLogit: 0.01,
  caucusBonusMax: 2,

  /** Bancadas: composição e ações. */
  caucusAffinityExp: 8,
  caucusMaxPartyShare: 0.8,
  caucusMaxTotalShare: 0.85,
  caucusMeetCapital: 8,
  caucusMeetRelation: 12,
  caucusMeetBonus: 0.5,
  caucusJoinMinAffinity: 0.55,
  caucusJoinRelation: 15,
  caucusLeaveRelation: -20,
  caucusGroupApproval: 2,
  caucusVoteRelation: 2,
  caucusVoteRelationLoss: 4,
  caucusRelationDrift: 0.03,

  /** Mesa diretora. */
  speakerRunCapital: 10,
  speakerSupportCapital: 15,
  speakerBackLogit: 0.8,
  speakerElectionNoiseSd: 0.35,
  speakerRelationDrift: 0.05,
  speakerBackedRelation: 20,
  speakerCandidates: 3,

  /** Executivo NPC e projetos de parlamentares/bancadas. */
  npcExecBillChance: 0.35,
  npcLegislatorBillChance: 0.5,
  npcCaucusBillShare: 0.4,
  npcMpShare: 0.3,
  npcUrgencyChance: 0.25,
  npcCommitteeDeathChance: 0.35,
  /** O Executivo NPC veta quando a mudança o afasta da própria ideologia além deste limite. */
  npcVetoGain: -0.03,
  /** Ganho de afinidade mínimo para um NPC propor a mudança. */
  npcMinGain: 0.01,
  /** Reformas acima deste custo político não partem de NPCs. */
  npcMaxCost: 75,
  /** Governo federal NPC (jogador fora da esfera federal): chance mensal de mudar uma lei. */
  npcFederalChangeChance: 0.04,

  /** Base do governo NPC. */
  govCoalitionMinAffinity: 0.8,
  govCoalitionTargetShare: 0.5,
  govCoalitionFloorAffinity: 0.62,
  pragmaticExtremity: 0.15,

  /** Fidelidade ao governo e emendas parlamentares (jogador legislador). */
  loyaltyStart: 50,
  loyaltyInCoalition: 62,
  loyaltyVoteGain: 3,
  loyaltyVoteLoss: 6,
  loyaltyDrift: 0.08,
  /** Cota anual de emendas individuais (R$ bi/ano). */
  amendmentQuota: { deputado_federal: 0.037, senador: 0.06, deputado_estadual: 0.009, vereador: 0.002 },
  amendmentBaseRelease: 0.6,
  amendmentLoyaltyRelease: 0.5,
  /** Efeito de executar 100% da cota anual: satisfação no estado de origem, popularidade, aprovação. */
  amendmentSatisfactionPerYear: 5,
  amendmentPopularityPerYear: 4,
  amendmentApprovalPerYear: 3,

  /** Reação ao voto do jogador (fidelidade partidária, Pops e grupos). */
  voteLoyaltyGain: 2,
  voteLoyaltyLoss: 6,
  votePopEffect: 0.15,
  voteGroupEffect: 0.4,
  voteOutsideStateFactor: 0.25,

  /** Plebiscito. */
  plebisciteIdeologyFactor: 14,
  plebisciteApprovalFactor: 0.03,
  plebisciteNoiseSd: 0.25,

  /** Impeachment (seção 5.5). */
  impeachApprovalMax: 30,
  impeachScandalMin: 50,
  impeachWeakBaseShare: 1 / 3,
  impeachBaseChance: 0.12,
  impeachCamaraDays: 30,
  impeachSenadoDays: 45,
  impeachBaseLogit: -1.2,
  impeachApprovalRef: 35,
  impeachApprovalFactor: 0.06,
  impeachCoalitionLogit: 1.8,
  impeachOppositionLogit: 0.8,
  impeachTargetPartyLogit: 3,
  impeachRelationFactor: 0.015,
  impeachScandalFactor: 0.02,
  impeachLegitimacyFactor: 0.02,
  impeachIdeologyFactor: 3,
  impeachDefenseCapital: 15,
  impeachDefenseLogit: 0.35,
  impeachDefenseTargetLogit: 0.7,
  impeachDefenseRelation: 10,
  /** Executivo NPC: satisfação nacional abaixo disso abre espaço para impeachment (raro). */
  npcImpeachSatisfactionMax: 32,
  npcImpeachChance: 0.03,
  impeachCooldownMonths: 24,
  fileImpeachCapital: 20,
  fileImpeachMaxSatisfaction: 40,

  /** Moção de desconfiança (parlamentarismo/semipresidencialismo). */
  confidenceMonths: 3,
  confidenceShare: 0.5,
  confidenceBaseLogit: 0.2,
  confidenceCoalitionLogit: 2.2,
  confidenceOppositionLogit: 1,
  confidenceApprovalFactor: 0.04,

  /** Registros. */
  logLimit: 80,
  timelineLimit: 40,
  billsKeep: 40,
  inactiveKeep: 30,
} as const;
