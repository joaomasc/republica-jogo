import type { DerivedAttributes } from '../candidate/types';
import { diffDays } from '../core/date';
import { clamp, clamp100, round, sum } from '../core/math';
import type { CandidateId, StateId, UnitId } from '../core/types';
import { STATE_IDS } from '../core/types';
import { OFFICES } from '../election/offices';
import { latestPoll } from '../election/polls';
import type { ElectoralUnit, Poll } from '../election/types';
import { computeIntentions, OTHERS_KEY, type IntentionSnapshot } from '../election/voterModel';
import { evaluatePromise } from '../government/promises';
import { IDEOLOGY_AXES, type IdeologyVector } from '../ideology/axes';
import { averageIdeology, ideologyExtremity } from '../ideology/ideology';
import { ISSUES, topIssues, type IssueId } from '../ideology/issues';
import { buildNationalUnits } from '../map/units';
import { REGIONS } from '../map/regions';
import { STATES } from '../map/states';
import { POP_TYPE_IDS, POP_TYPES, type PopTypeId } from '../population/popTypes';
import { popsOfState } from '../population/population';
import { getPlayer, getPlayerParty, getPlayerStatus } from './access';
import { economyLayer } from './economyLayers';
import type { GameState } from './state';

const snapshotCache = new WeakMap<GameState, IntentionSnapshot | null>();

/** Intenção de voto "real" do modelo (memoizada por referência de estado). Não exibir crua ao jogador: use pesquisas. */
export function getSnapshot(state: GameState): IntentionSnapshot | null {
  if (snapshotCache.has(state)) return snapshotCache.get(state) ?? null;
  const snap =
    state.election && state.election.status !== 'finished'
      ? computeIntentions(state, state.election)
      : null;
  snapshotCache.set(state, snap);
  return snap;
}

export function daysToElection(state: GameState): number | null {
  return state.election ? diffDays(state.date, state.election.date) : null;
}

export interface TopBarMetrics {
  date: string;
  money: number | null;
  moneyLabel: string;
  popularity: number;
  intention: number | null;
  intentionRank: number | null;
  stability: number;
  approval: number | null;
  daysToElection: number | null;
}

export function topBarMetrics(state: GameState): TopBarMetrics {
  const player = getPlayer(state);
  const poll = latestPoll(state, 'public') ?? latestPoll(state);
  const ranked = poll
    ? Object.entries(poll.total.shares)
        .filter(([id]) => id !== OTHERS_KEY)
        .sort((a, b) => b[1] - a[1])
    : [];
  const rank = ranked.findIndex(([id]) => id === player.id);
  const gov = state.government;
  return {
    date: state.date,
    money: state.campaign ? state.campaign.money : gov?.budget ? gov.budget.balance * 1e9 : null,
    moneyLabel: state.campaign ? 'Caixa de campanha' : gov?.budget ? 'Saldo do orçamento' : 'Caixa',
    popularity: round(player.attributes.popularity, 0),
    intention: poll ? (poll.total.shares[player.id] ?? 0) : null,
    intentionRank: rank >= 0 ? rank + 1 : null,
    stability: round(gov ? gov.stability : getPlayerParty(state).unity, 0),
    approval: gov ? round(gov.approval, 0) : null,
    daysToElection: daysToElection(state),
  };
}

export function derivedAttributes(state: GameState): DerivedAttributes {
  const player = getPlayer(state);
  const snap = getSnapshot(state);
  const status = getPlayerStatus(state);
  const evaluated = state.promises.filter((p) => p.status !== 'pending');
  const kept =
    evaluated.filter((p) => p.status === 'fulfilled').length +
    evaluated.filter((p) => p.status === 'partial').length * 0.5;
  const fulfillment = evaluated.length > 0 ? kept / evaluated.length : 0.6;
  const ideology = status?.perceivedIdeology ?? player.ideology;
  const poll = latestPoll(state);
  return {
    rejection: round((poll?.rejection[player.id] ?? player.scandal / 200) * 100, 1),
    publicKnowledge: round(snap?.knowledge[player.id] ?? player.fame, 1),
    trust: round(
      clamp100(player.attributes.credibility * 0.6 + fulfillment * 40 - player.scandal * 0.3),
      1,
    ),
    polarization: round(
      clamp100(ideologyExtremity(ideology) * 120 + (status?.rejectionMod ?? 0) * 2),
      1,
    ),
    militantBase: state.campaign?.militants ?? 0,
  };
}

/** Unidades exibidas no mapa: as da eleição corrente ou, sem eleição, os 27 estados. */
export function mapUnits(state: GameState): ElectoralUnit[] {
  return state.election?.units ?? buildNationalUnits(state.population);
}

export const MAP_MODES = [
  'intention',
  'popularity',
  'party',
  'campaign',
  'population',
  'economy',
  'results',
  'industrialization',
  'income',
  'unemployment',
  'informality',
  'construction',
  'resources',
] as const;
export type MapMode = (typeof MAP_MODES)[number];

export const MAP_MODE_LABELS: Record<MapMode, string> = {
  intention: 'Intenção de voto',
  popularity: 'Popularidade',
  party: 'Influência partidária',
  campaign: 'Campanha',
  population: 'População',
  economy: 'Economia',
  results: 'Resultados',
  industrialization: 'Industrialização',
  income: 'Renda média',
  unemployment: 'Desemprego',
  informality: 'Informalidade',
  construction: 'Obras em andamento',
  resources: 'Recursos naturais',
};

export interface MapCell {
  value: number;
  label: string;
  /** Cor categórica (partido do líder), quando aplicável. */
  color?: string;
  leaderName?: string;
  /** Força do líder (0..1) — intensidade da cor categórica. */
  strength?: number;
}

export interface MapLayer {
  mode: MapMode;
  title: string;
  scale: 'sequential' | 'diverging' | 'categorical';
  cells: Record<UnitId, MapCell>;
  legend: { low: string; high: string };
}

function candidateColor(state: GameState, id: CandidateId): string {
  return state.parties[state.candidates[id]?.partyId ?? '']?.color ?? '#888';
}

/** Pesquisa mais recente com recorte por unidade (o jogador só "vê" o eleitorado por pesquisas). */
export function latestUnitPoll(state: GameState): Poll | null {
  const polls = state.election?.polls ?? [];
  for (let i = polls.length - 1; i >= 0; i--) {
    const p = polls[i];
    if (p?.byUnit && p.round === state.election?.round) return p;
  }
  return null;
}

function pollSupportForType(
  state: GameState,
  typeId: PopTypeId,
): { support: number; undecided: number } | null {
  const polls = state.election?.polls ?? [];
  for (let i = polls.length - 1; i >= 0; i--) {
    const set = polls[i]?.byPopType?.[typeId];
    if (set && polls[i]?.round === state.election?.round) {
      const decided =
        sum(
          Object.entries(set.shares)
            .filter(([id]) => id !== OTHERS_KEY)
            .map(([, v]) => v),
        ) || 1;
      return { support: (set.shares[state.playerId] ?? 0) / decided, undecided: set.undecided };
    }
  }
  return null;
}

export function mapLayer(state: GameState, mode: MapMode, partyId?: string): MapLayer {
  const units = mapUnits(state);
  const player = getPlayer(state);
  const status = getPlayerStatus(state);
  const cells: Record<UnitId, MapCell> = {};
  const pct = (v: number) => `${round(v * 100, 1)}%`;

  switch (mode) {
    case 'intention': {
      const poll = latestUnitPoll(state);
      for (const u of units) {
        const set = poll?.byUnit?.[u.id];
        if (!set) {
          cells[u.id] = { value: 0, label: 'Sem pesquisa' };
          continue;
        }
        const named = Object.entries(set.shares).filter(([id]) => id !== OTHERS_KEY);
        const decided = sum(named.map(([, v]) => v)) || 1;
        const ranked = named.sort((a, b) => b[1] - a[1]);
        const [leaderId, leaderShare] = ranked[0] ?? ['', 0];
        const mine = (set.shares[player.id] ?? 0) / decided;
        cells[u.id] = {
          value: mine,
          label: `Você: ${pct(mine)} · Líder: ${pct(leaderShare / decided)}`,
          color: candidateColor(state, leaderId),
          leaderName: state.candidates[leaderId]?.ballotName ?? '',
          strength: leaderShare / decided,
        };
      }
      const source = poll
        ? `${poll.pollster}, ${poll.date.split('-').reverse().join('/')}`
        : 'sem pesquisa';
      return {
        mode,
        title: `Intenção de voto — ${source}`,
        scale: 'categorical',
        cells,
        legend: { low: 'Cor = quem lidera', high: 'Intensidade = sua votação' },
      };
    }
    case 'popularity': {
      const poll = latestPoll(state);
      const rej = poll?.rejection[player.id] ?? 0;
      for (const u of units) {
        if (status) {
          const k = (status.knowledge[u.id] ?? 0) / 100;
          const v = clamp(k * (1 - rej), 0, 1);
          cells[u.id] = {
            value: v,
            label: `Conhecimento ${pct(k)} · Rejeição (pesquisa) ${pct(rej)}`,
          };
        } else {
          const pops = popsOfState(state.population, u.stateId);
          const total = sum(pops.map((p) => p.size));
          const sat = total > 0 ? sum(pops.map((p) => p.satisfaction * p.size)) / total : 50;
          cells[u.id] = { value: sat / 100, label: `Satisfação ${round(sat, 0)}%` };
        }
      }
      return {
        mode,
        title: status ? 'Sua popularidade' : 'Satisfação da população',
        scale: 'sequential',
        cells,
        legend: { low: 'Baixa', high: 'Alta' },
      };
    }
    case 'party': {
      const pid = partyId ?? player.partyId;
      const party = state.parties[pid];
      for (const u of units) {
        const region = state.regions[u.stateId];
        const strength = region?.partyStrength[pid] ?? 0;
        const strongest = region
          ? Object.entries(region.partyStrength).sort(
              (a, b) =>
                b[1] * (state.parties[b[0]]?.popularity ?? 0) -
                a[1] * (state.parties[a[0]]?.popularity ?? 0),
            )[0]
          : undefined;
        const leader = strongest ? state.parties[strongest[0]] : undefined;
        cells[u.id] = {
          value: clamp(strength / 100, 0, 1),
          label: `${party?.acronym ?? ''}: força ${round(strength, 0)} · Mais forte: ${leader?.acronym ?? '—'}`,
          ...(leader ? { color: leader.color, leaderName: leader.acronym } : {}),
        };
      }
      return {
        mode,
        title: `Influência: ${party?.acronym ?? ''}`,
        scale: 'sequential',
        cells,
        legend: { low: 'Fraca', high: 'Forte' },
      };
    }
    case 'campaign': {
      for (const u of units) {
        const presence = status?.presence[u.id] ?? 0;
        const knowledge = status?.knowledge[u.id] ?? 0;
        cells[u.id] = {
          value: presence / 100,
          label: `Presença ${round(presence, 0)} · Conhecimento ${round(knowledge, 0)}`,
        };
      }
      return {
        mode,
        title: 'Sua presença de campanha',
        scale: 'sequential',
        cells,
        legend: { low: 'Nenhuma', high: 'Forte' },
      };
    }
    case 'population': {
      const max = Math.max(...units.map((u) => u.voters), 1);
      for (const u of units)
        cells[u.id] = {
          value: Math.sqrt(u.voters / max),
          label: `${(u.voters / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi eleitores`,
        };
      return {
        mode,
        title: 'Eleitorado',
        scale: 'sequential',
        cells,
        legend: { low: 'Menor', high: 'Maior' },
      };
    }
    case 'economy': {
      for (const u of units) {
        const region = state.regions[u.stateId];
        const unemployment = region?.unemployment ?? state.economy.unemployment;
        if (u.kind === 'zone') {
          const income =
            sum(u.pops.map((p) => (state.population.pops[p.popId]?.income ?? 0) * p.voters)) /
            Math.max(1, u.voters);
          cells[u.id] = {
            value: clamp(income / 9000, 0, 1),
            label: `Renda média R$ ${Math.round(income).toLocaleString('pt-BR')}`,
          };
        } else
          cells[u.id] = {
            value: clamp((unemployment - 3) / 12, 0, 1),
            label: `Desemprego ${round(unemployment, 1)}%`,
          };
      }
      const zone = units[0]?.kind === 'zone';
      return {
        mode,
        title: zone ? 'Renda média' : 'Desemprego',
        scale: zone ? 'sequential' : 'diverging',
        cells,
        legend: zone ? { low: 'Menor renda', high: 'Maior renda' } : { low: 'Baixo', high: 'Alto' },
      };
    }
    case 'industrialization':
    case 'income':
    case 'unemployment':
    case 'informality':
    case 'construction':
    case 'resources':
      return economyLayer(state, mode, units);
    case 'results': {
      const result = state.election?.results[state.election.results.length - 1];
      for (const u of units) {
        const r = result?.byUnit[u.id];
        if (!r || !r.winnerId) {
          cells[u.id] = { value: 0, label: 'Sem resultado' };
          continue;
        }
        const total = Math.max(1, r.validVotes);
        const mine = (r.votes[player.id] ?? 0) / total;
        const winnerShare = (r.votes[r.winnerId] ?? 0) / total;
        cells[u.id] = {
          value: winnerShare,
          label: `Vencedor: ${state.candidates[r.winnerId]?.ballotName ?? ''} (${pct(winnerShare)}) · Você: ${pct(mine)}`,
          color: candidateColor(state, r.winnerId),
          leaderName: state.candidates[r.winnerId]?.ballotName ?? '',
          strength: winnerShare,
        };
      }
      return {
        mode,
        title: 'Resultado por região',
        scale: 'categorical',
        cells,
        legend: { low: 'Cor = vencedor', high: 'Intensidade = votação' },
      };
    }
  }
}

export interface UnitDetails {
  unit: ElectoralUnit;
  stateName: string;
  regionName: string;
  population: number;
  candidates: { id: CandidateId; name: string; color: string; share: number }[];
  playerShare: number | null;
  playerKnowledge: number | null;
  playerPresence: number | null;
  playerRejection: number | null;
  unemployment: number;
  income: number;
  problems: IssueId[];
  strongParties: { id: string; acronym: string; color: string; strength: number }[];
  composition: { typeId: PopTypeId; voters: number; share: number }[];
}

export function unitDetails(state: GameState, unitId: UnitId): UnitDetails | null {
  const unit = mapUnits(state).find((u) => u.id === unitId);
  if (!unit) return null;
  const poll = latestUnitPoll(state);
  const agg = poll?.byUnit?.[unitId];
  const status = getPlayerStatus(state);
  const region = state.regions[unit.stateId];
  const s = STATES[unit.stateId];
  const decided = agg
    ? sum(
        Object.entries(agg.shares)
          .filter(([id]) => id !== OTHERS_KEY)
          .map(([, v]) => v),
      ) || 1
    : 1;
  const candidates = agg
    ? Object.entries(agg.shares)
        .filter(([id]) => id !== OTHERS_KEY)
        .map(([id, v]) => ({
          id,
          name: state.candidates[id]?.ballotName ?? id,
          color: candidateColor(state, id),
          share: v / decided,
        }))
        .sort((a, b) => b.share - a.share)
    : [];
  const pops = unit.pops.map((p) => ({ pop: state.population.pops[p.popId], voters: p.voters }));
  const priorities: Partial<Record<IssueId, number>> = {};
  for (const { pop, voters } of pops)
    if (pop)
      for (const issue of ISSUES)
        priorities[issue] = (priorities[issue] ?? 0) + pop.priorities[issue] * voters;
  const strong = region
    ? Object.entries(region.partyStrength)
        .map(([id, strength]) => ({
          id,
          acronym: state.parties[id]?.acronym ?? id,
          color: state.parties[id]?.color ?? '#999',
          strength: strength * ((state.parties[id]?.popularity ?? 0) / 50),
        }))
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 3)
    : [];
  const income =
    sum(pops.map(({ pop, voters }) => (pop?.income ?? 0) * voters)) / Math.max(1, unit.voters);
  return {
    unit,
    stateName: s.name,
    regionName: REGIONS[s.region].name,
    population: unit.kind === 'state' ? s.population * 1000 : Math.round(unit.voters / 0.76),
    candidates,
    playerShare: agg ? (agg.shares[state.playerId] ?? 0) / decided : null,
    playerKnowledge: status ? (status.knowledge[unitId] ?? 0) : null,
    playerPresence: status ? (status.presence[unitId] ?? 0) : null,
    playerRejection: poll ? (poll.rejection[state.playerId] ?? 0) : null,
    unemployment: region?.unemployment ?? state.economy.unemployment,
    income,
    problems: topIssues(priorities, 3),
    strongParties: strong,
    composition: unit.pops
      .map((p) => ({
        typeId: state.population.pops[p.popId]?.typeId ?? 'workers',
        voters: p.voters,
        share: p.voters / Math.max(1, unit.voters),
      }))
      .sort((a, b) => b.voters - a.voters),
  };
}

export interface PopTypeSummary {
  typeId: PopTypeId;
  name: string;
  icon: string;
  color: string;
  voters: number;
  share: number;
  satisfaction: number;
  income: number;
  turnout: number;
  ideology: IdeologyVector;
  topPriorities: IssueId[];
  playerSupport: number | null;
  undecided: number | null;
  momentum: number;
  topParty: { acronym: string; color: string; affinity: number } | null;
}

export function popTypeSummaries(state: GameState): PopTypeSummary[] {
  const status = getPlayerStatus(state);
  const units = mapUnits(state);
  const weights: Record<string, number> = {};
  for (const u of units)
    for (const p of u.pops) weights[p.popId] = (weights[p.popId] ?? 0) + p.voters;
  const totalVoters = sum(Object.values(weights));
  return POP_TYPE_IDS.map((typeId) => {
    const def = POP_TYPES[typeId];
    const pops = Object.values(state.population.pops).filter(
      (p) => p.typeId === typeId && (weights[p.id] ?? 0) > 0,
    );
    const w = (id: string) => weights[id] ?? 0;
    const voters = sum(pops.map((p) => w(p.id)));
    const avg = (fn: (p: (typeof pops)[number]) => number) =>
      voters > 0 ? sum(pops.map((p) => fn(p) * w(p.id))) / voters : 0;
    const priorities: Partial<Record<IssueId, number>> = {};
    for (const issue of ISSUES) priorities[issue] = avg((p) => p.priorities[issue]);
    const partyAff: Record<string, number> = {};
    for (const party of Object.values(state.parties))
      partyAff[party.id] = avg((p) => p.partyAffinity[party.id] ?? 0);
    const top = Object.entries(partyAff).sort((a, b) => b[1] - a[1])[0];
    const topParty = top ? state.parties[top[0]] : undefined;
    const polled = pollSupportForType(state, typeId);
    return {
      typeId,
      name: def.plural,
      icon: def.icon,
      color: def.color,
      voters,
      share: totalVoters > 0 ? voters / totalVoters : 0,
      satisfaction: round(
        avg((p) => p.satisfaction),
        1,
      ),
      income: Math.round(avg((p) => p.income)),
      turnout: avg((p) => p.turnout),
      ideology: averageIdeology(pops.map((p) => ({ ideology: p.ideology, weight: w(p.id) }))),
      topPriorities: topIssues(priorities, 4),
      playerSupport: polled ? polled.support : null,
      undecided: polled ? polled.undecided : null,
      momentum: round(status?.popMomentum[typeId] ?? 0, 1),
      topParty:
        topParty && top
          ? { acronym: topParty.acronym, color: topParty.color, affinity: top[1] }
          : null,
    };
  });
}

export function promiseOverview(
  state: GameState,
): { id: string; title: string; status: string; projected: string }[] {
  return state.promises.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    projected: p.status === 'pending' && state.government ? evaluatePromise(state, p) : p.status,
  }));
}

export function stateIdeology(state: GameState, stateId: StateId): IdeologyVector {
  return state.regions[stateId]?.ideology ?? averageIdeology([]);
}

export function nationalIdeology(state: GameState): IdeologyVector {
  return averageIdeology(
    STATE_IDS.flatMap((id) =>
      popsOfState(state.population, id).map((p) => ({ ideology: p.ideology, weight: p.size })),
    ),
  );
}

export function axisList(): readonly (typeof IDEOLOGY_AXES)[number][] {
  return IDEOLOGY_AXES;
}

export function officeOf(state: GameState) {
  const id = state.election?.officeId ?? state.government?.officeId ?? null;
  return id ? OFFICES[id] : null;
}
