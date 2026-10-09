import {
  ATTRIBUTE_IDS,
  defaultAppearance,
  dispatch,
  getPlayer,
  neutralIdeology,
  proposalsFor,
  OFFICES,
  type CandidateAttributes,
  type GameState,
  type NewGameConfig,
  type OfficeId,
  type StateId,
} from '../src/index';

export type BotStrategy = 'passive' | 'active';

export function defaultConfig(
  seed: number,
  officeId: OfficeId,
  stateId: StateId,
  partyId = 'udc',
): NewGameConfig {
  const attributes = {} as CandidateAttributes;
  for (const id of ATTRIBUTE_IDS) attributes[id] = 45;
  return {
    seed,
    difficulty: 'normal',
    mode: 'career',
    candidate: {
      firstName: 'Teste',
      lastName: 'Silva',
      age: 45,
      gender: 'female',
      appearance: defaultAppearance(),
      attributes,
      ideology: { ...neutralIdeology(), economy: 55, social: 50 },
      backgroundId: 'lawyer',
      homeStateId: stateId,
    },
    party: { kind: 'existing', partyId },
    office: { officeId, stateId },
    now: '2026-01-01',
  };
}

function act(state: GameState, action: Parameters<typeof dispatch>[1]): GameState {
  return dispatch(state, action).state;
}

function resolvePending(state: GameState): GameState {
  let s = state;
  for (const ev of s.events.pending)
    s = act(s, {
      type: 'event/resolve',
      instanceId: ev.instanceId,
      optionId: ev.options.find((o) => o.available)?.id ?? '',
    });
  if (s.interactions.interview) {
    let guard = 0;
    while (s.interactions.interview && !s.interactions.interview.finished && guard++ < 10) {
      const q = s.interactions.interview.questions[s.interactions.interview.index];
      s = act(s, { type: 'interview/answer', answerId: q?.answers[0]?.id ?? '' });
    }
    s = act(s, { type: 'interview/close' });
  }
  const debate = s.election?.debates.find((d) => d.status === 'scheduled' && d.date === s.date);
  if (debate) {
    s = act(s, { type: 'debate/start', debateId: debate.id });
    let guard = 0;
    while (s.interactions.debate && s.interactions.debate.stage !== 'finished' && guard++ < 30)
      s = act(s, { type: 'debate/move', strategy: 'popular' });
    s = act(s, { type: 'debate/close' });
  }
  return s;
}

/** Joga uma campanha inteira com uma estratégia simples e devolve o estado no dia da eleição. */
export function playCampaign(initial: GameState, strategy: BotStrategy): GameState {
  let s = initial;
  let guard = 0;
  const level = OFFICES[s.election?.officeId ?? 'presidente'].level;
  const proposals = proposalsFor(level);
  let proposalIdx = 0;
  while (s.phase === 'campaign' && guard++ < 400) {
    s = resolvePending(s);
    if (s.phase !== 'campaign') break;
    if (strategy === 'active' && s.election && s.campaign) {
      const units = [...s.election.units].sort((a, b) => b.voters - a.voters);
      const target = units[guard % Math.min(units.length, 6)];
      if (guard === 1) {
        s = act(s, { type: 'campaign/hire', roleId: 'marketer', level: 2 });
        s = act(s, { type: 'campaign/hire', roleId: 'coordinator', level: 1 });
      }
      if (guard % 7 === 1 && s.campaign && s.campaign.money > 0) {
        s = act(s, {
          type: 'campaign/ad',
          input: {
            channel: 'tv',
            unitIds: [],
            targetPopTypes: [],
            tone: 'positive',
            days: 7,
            intensity: 1,
          },
        });
        s = act(s, {
          type: 'campaign/ad',
          input: {
            channel: 'social',
            unitIds: [],
            targetPopTypes: [],
            tone: 'positive',
            days: 7,
            intensity: 1,
          },
        });
      }
      if (guard % 10 === 2 && proposals[proposalIdx])
        s = act(s, {
          type: 'campaign/action',
          input: { actionId: 'proposal', proposalId: proposals[proposalIdx++]?.id ?? '' },
        });
      s = act(s, { type: 'campaign/action', input: { actionId: 'social_media' } });
      s = act(s, { type: 'campaign/action', input: { actionId: 'tv_program' } });
      if (target && s.phase === 'campaign') {
        const res = dispatch(s, {
          type: 'campaign/action',
          input: { actionId: (s.campaign?.energy ?? 0) > 30 ? 'rally' : 'rest', unitId: target.id },
        });
        s = res.state;
        if (res.result.ok) continue;
      }
    }
    s = resolvePending(s);
    if (s.phase === 'campaign') s = act(s, { type: 'time/advance', step: 'day' });
  }
  return s;
}

export function summarizeCampaign(
  start: GameState,
  end: GameState,
): Record<string, string | number> {
  const player = getPlayer(end);
  const firstPoll = start.election?.polls[0];
  const lastPoll = end.election?.polls.filter((p) => p.kind === 'public').at(-1);
  return {
    office: end.election?.officeId ?? '',
    phase: end.phase,
    pollStart: Math.round((firstPoll?.total.shares[player.id] ?? 0) * 1000) / 10,
    pollEnd: Math.round((lastPoll?.total.shares[player.id] ?? 0) * 1000) / 10,
    money: Math.round(end.campaign?.money ?? 0),
    news: end.media.news.length,
  };
}
