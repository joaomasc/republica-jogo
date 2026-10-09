/**
 * CAMPANHA DINÂMICA — o turno semanal.
 *
 * Toda semana: (1) uma PAUTA em alta favorece quem dá ênfase àquele tema; (2) os RIVAIS
 * reagem às pesquisas e mudam de tática; (3) a equipe traz 3 CARTAS (oportunidades e
 * dilemas com custo e risco) e o jogador escolhe uma. O tempo para até a escolha.
 */
import { diffDays } from '../core/date';
import { withRng, type Rng } from '../core/rng';
import type { ActionResult, CandidateId, UnitId } from '../core/types';
import { computeIntentions } from '../election/voterModel';
import type { RivalStyle } from '../election/types';
import { applyEffects } from '../events/effects';
import type { Effect, EventContext } from '../events/types';
import { ISSUE_DEFINITIONS, ISSUES, type IssueId } from '../ideology/issues';
import { publishNews } from '../media/news';
import { POP_TYPES, type PopTypeId } from '../population/popTypes';
import { getPlayer, getPlayerStatus } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { ImpactMeter } from './impact';
import type { RivalMove, WeekCard, WeekState } from './types';

export const RIVAL_STYLE_INFO: Record<RivalStyle, { name: string; description: string }> = {
  populist: { name: 'Populista', description: 'Fala com o povão e abraça qualquer pauta em alta.' },
  technocrat: { name: 'Técnico', description: 'Planilha e classe média. Raramente ataca.' },
  attacker: { name: 'Agressivo', description: 'Ataca muito — principalmente quem está crescendo.' },
  machine: {
    name: 'Máquina',
    description: 'Estrutura partidária: presença física forte nas regiões.',
  },
  digital: {
    name: 'Digital',
    description: 'Redes e cortes de vídeo: ganha conhecimento rápido e os jovens.',
  },
};

/** Estilo dos personagens do mundo paródia. */
const PARODY_STYLES: Record<string, RivalStyle> = {
  lulao: 'populist',
  radad: 'technocrat',
  alcmim: 'machine',
  bolos: 'attacker',
  marina: 'technocrat',
  campinho: 'digital',
  bolsonario: 'attacker',
  micheline: 'populist',
  tarcidio: 'technocrat',
  zama: 'technocrat',
  caiadao: 'machine',
  ferreirinha: 'digital',
  marco: 'digital',
  tebete: 'technocrat',
  ratao: 'machine',
  leiteiro: 'technocrat',
  paes: 'populist',
  nunis: 'machine',
  barbalhao: 'machine',
  gomos: 'attacker',
};

export const STYLE_POPS: Record<RivalStyle, PopTypeId[]> = {
  populist: ['workers', 'unemployed', 'retirees', 'industrial_workers'],
  technocrat: ['middle_class', 'business', 'tech_workers', 'civil_servants'],
  attacker: ['merchants', 'farmers', 'workers'],
  machine: ['civil_servants', 'retirees', 'farmers'],
  digital: ['students', 'tech_workers', 'middle_class'],
};

function styleFor(state: GameState, id: CandidateId): RivalStyle {
  const c = state.candidates[id]!;
  if (c.parodyKey && PARODY_STYLES[c.parodyKey]) return PARODY_STYLES[c.parodyKey]!;
  const a = c.attributes;
  const party = state.parties[c.partyId];
  const scores: Record<RivalStyle, number> = {
    populist: a.charisma + a.popularity,
    technocrat: a.management + a.experience,
    attacker: a.oratory + (state.election?.participants[id]?.aggressiveness ?? 0.5) * 80,
    machine: (party?.influence ?? 50) + (party?.militancy ?? 50) * 0.8,
    digital: a.communication * 1.6,
  };
  return (Object.entries(scores) as [RivalStyle, number][]).sort((x, y) => y[1] - x[1])[0]![0];
}

function playerName(state: GameState): string {
  return getPlayer(state).ballotName;
}

/** Tema em alta, ponderado pelo que o eleitorado da disputa considera prioritário. */
function pickTrend(state: GameState, rng: Rng, previous: IssueId | null): IssueId {
  const election = state.election!;
  const weight: Partial<Record<IssueId, number>> = {};
  for (const u of election.units)
    for (const up of u.pops) {
      const pop = state.population.pops[up.popId];
      if (!pop) continue;
      for (const issue of ISSUES)
        weight[issue] = (weight[issue] ?? 0) + pop.priorities[issue] * up.voters;
    }
  const pool = ISSUES.filter((i) => i !== previous);
  return rng.weightedPick(pool, (i) => (weight[i] ?? 1) * rng.range(0.4, 1.6)) ?? pool[0]!;
}

/** Os rivais olham as pesquisas e decidem a tática da semana. */
function rivalReactions(
  state: GameState,
  rng: Rng,
  shares: Record<CandidateId, number>,
  previous: Record<CandidateId, number> | null,
  trend: IssueId,
): RivalMove[] {
  const election = state.election!;
  const me = state.playerId;
  const ranked = election.candidateIds
    .filter((id) => id !== me)
    .sort((a, b) => (shares[b] ?? 0) - (shares[a] ?? 0));
  const leader = [...election.candidateIds].sort((a, b) => (shares[b] ?? 0) - (shares[a] ?? 0))[0];
  const myDelta = previous ? (shares[me] ?? 0) - (previous[me] ?? 0) : 0;
  const myStatus = getPlayerStatus(state);
  // Onde o jogador está mais forte: maior presença+momentum entre as regiões populosas.
  const myBest = myStatus
    ? [...election.units]
        .sort(
          (a, b) =>
            b.voters *
              (1 +
                (myStatus.presence[b.id] ?? 0) / 50 +
                (myStatus.regionalMomentum[b.id] ?? 0) / 25) -
            a.voters *
              (1 +
                (myStatus.presence[a.id] ?? 0) / 50 +
                (myStatus.regionalMomentum[a.id] ?? 0) / 25),
        )
        .slice(0, 2)
    : [];
  const moves: RivalMove[] = [];
  const trendName = ISSUE_DEFINITIONS[trend].name.toLowerCase();

  ranked.forEach((id, rank) => {
    const st = election.participants[id];
    const c = state.candidates[id];
    if (!st || !c) return;
    st.style ??= styleFor(state, id);
    const delta = previous ? (shares[id] ?? 0) - (previous[id] ?? 0) : 0;
    const name = c.ballotName;
    let text: string;
    if ((delta < -0.006 || st.style === 'attacker') && rank <= 2 && rng.chance(0.75)) {
      const target = myDelta > 0.008 || leader === me ? me : leader !== id ? leader : me;
      st.tactic = { kind: 'attack', targetId: target };
      const targetName = state.candidates[target ?? '']?.ballotName ?? 'o líder';
      text =
        delta < -0.006
          ? `${name} perdeu terreno e vai partir para o ataque contra ${target === me ? 'você' : targetName}.`
          : `${name} mantém a linha dura e mira em ${target === me ? 'você' : targetName}.`;
    } else if (myDelta > 0.008 && rank <= 1 && myBest.length > 0) {
      st.tactic = { kind: 'contest', units: myBest.map((u) => u.id) };
      text = `${name} viu você crescer e vai disputar ${myBest.map((u) => u.name).join(' e ')}.`;
    } else if (st.style === 'populist' || st.style === 'digital' || rng.chance(0.3)) {
      st.tactic = { kind: 'trend' };
      st.issueFocus[trend] = Math.min(100, (st.issueFocus[trend] ?? 0) + 20);
      text = `${name} abraçou a pauta da semana: ${trendName}.`;
    } else {
      st.tactic = { kind: 'base' };
      const unit = election.units.find((u) => u.id === st.focusUnits[0]);
      text = `${name} reforça a própria base${unit ? ` em ${unit.name}` : ''}.`;
    }
    if (rank < 3) moves.push({ candidateId: id, text });
  });
  return moves;
}

/* ───────────── Cartas ───────────── */

interface CardTemplate {
  weight: number;
  build: () => Omit<WeekCard, 'id'> | null;
}

function weakestUnit(state: GameState): { id: UnitId; name: string } | null {
  const election = state.election!;
  const st = getPlayerStatus(state);
  if (!st) return null;
  const u = [...election.units].sort(
    (a, b) =>
      b.voters * (1 - (st.presence[b.id] ?? 0) / 110) -
      a.voters * (1 - (st.presence[a.id] ?? 0) / 110),
  )[0];
  return u ? { id: u.id, name: u.name } : null;
}

function cardTemplates(
  state: GameState,
  rng: Rng,
  trend: IssueId,
  shares: Record<CandidateId, number>,
): CardTemplate[] {
  const election = state.election!;
  const me = state.playerId;
  const trendName = ISSUE_DEFINITIONS[trend].name;
  const weak = weakestUnit(state);
  const rivals = election.candidateIds
    .filter((id) => id !== me)
    .sort((a, b) => (shares[b] ?? 0) - (shares[a] ?? 0));
  const rival = rivals[0] ? state.candidates[rivals[0]] : null;
  const attackedMe = rivals.some((id) => election.participants[id]?.tactic?.targetId === me);
  const daysLeft = diffDays(state.date, election.date);
  const debateSoon = election.debates.some(
    (d) => d.status === 'scheduled' && diffDays(state.date, d.date) <= 10 && d.date >= state.date,
  );
  const groups: PopTypeId[] = [
    'workers',
    'business',
    'retirees',
    'students',
    'farmers',
    'civil_servants',
  ];
  const group = rng.pick(groups);
  const opposite: Partial<Record<PopTypeId, PopTypeId>> = {
    workers: 'business',
    business: 'workers',
    retirees: 'students',
    students: 'retirees',
    farmers: 'tech_workers',
    civil_servants: 'merchants',
  };
  const opp = opposite[group] ?? 'middle_class';
  const ctx: EventContext = {
    playerName: playerName(state),
    issueName: trendName,
    ...(weak ? { unitId: weak.id, unitName: weak.name } : {}),
    ...(rival && rivals[0] ? { opponentId: rivals[0], opponentName: rival.ballotName } : {}),
  };

  return [
    {
      weight: 2,
      build: () => ({
        title: `Abraçar a pauta: ${trendName}`,
        description: `O assunto da semana é ${trendName.toLowerCase()}. Lance um pacote de propostas e ocupe o noticiário.`,
        icon: 'megaphone',
        chance: 1,
        effects: [
          { type: 'money', amount: -90_000 },
          { type: 'issueFocus', issue: trend, delta: 25 },
          { type: 'knowledge', delta: 2 },
        ],
        ctx,
      }),
    },
    {
      weight: 2,
      build: () => ({
        title: 'Convite para programa de auditório',
        description:
          'Audiência gigante no domingo. Se você for bem, vira assunto; se escorregar, vira meme.',
        icon: 'tv',
        chance: 0.7,
        effects: [
          { type: 'energy', delta: -15 },
          { type: 'knowledge', delta: 6 },
          { type: 'popMomentum', popTypes: 'all', delta: 3 },
        ],
        failure: [
          { type: 'energy', delta: -15 },
          { type: 'knowledge', delta: 4 },
          { type: 'rejection', delta: 2 },
        ],
        ctx,
      }),
    },
    {
      weight: 2,
      build: () => ({
        title: 'Parceria com influenciador',
        description:
          'Um influenciador com milhões de seguidores topa gravar com você. Imprevisível.',
        icon: 'smartphone',
        chance: 0.65,
        effects: [
          { type: 'money', amount: -40_000 },
          { type: 'popMomentum', popTypes: ['students', 'tech_workers'], delta: 8 },
          { type: 'knowledge', delta: 3 },
        ],
        failure: [
          { type: 'money', amount: -40_000 },
          { type: 'rejection', delta: 1.5 },
          {
            type: 'news',
            headline: 'Vídeo de {playerName} com influenciador gera polêmica',
            sentiment: -1,
          },
        ],
        ctx,
      }),
    },
    {
      weight: weak ? 3 : 0,
      build: () =>
        weak
          ? {
              title: `Virada em ${weak.name}`,
              description: `É onde você tem mais eleitores a conquistar. Uma semana inteira de agenda lá.`,
              icon: 'map-pin',
              chance: 1,
              effects: [
                { type: 'money', amount: -120_000 },
                { type: 'energy', delta: -20 },
                { type: 'presence', delta: 25, scope: 'context' },
                { type: 'regionalMomentum', delta: 8, scope: 'context' },
                { type: 'knowledge', delta: 8, scope: 'context' },
              ],
              ctx,
            }
          : null,
    },
    {
      weight: weak ? 2 : 0,
      build: () =>
        weak
          ? {
              title: `Aliança com cacique de ${weak.name}`,
              description:
                'Uma liderança local oferece apoio. A ala ideológica do seu partido torce o nariz.',
              icon: 'handshake',
              chance: 0.85,
              effects: [
                { type: 'regionalMomentum', delta: 12, scope: 'context' },
                { type: 'presence', delta: 15, scope: 'context' },
                { type: 'partyUnity', delta: -4 },
              ],
              failure: [
                { type: 'partyUnity', delta: -6 },
                { type: 'rejection', delta: 1 },
                {
                  type: 'news',
                  headline: 'Aliado de {playerName} em {unitName} é alvo de críticas',
                  sentiment: -1,
                },
              ],
              ctx,
            }
          : null,
    },
    {
      weight: 2,
      build: () => ({
        title: `Reunião com ${POP_TYPES[group].plural.toLowerCase()}`,
        description: `Compromissos firmes com ${POP_TYPES[group].plural.toLowerCase()} — que ${POP_TYPES[opp].plural.toLowerCase()} não vão gostar.`,
        icon: 'users',
        chance: 1,
        effects: [
          { type: 'popMomentum', popTypes: [group], delta: 10 },
          { type: 'popMomentum', popTypes: [opp], delta: -4 },
        ],
        ctx,
      }),
    },
    {
      weight: rival ? 2 : 0,
      build: () =>
        rival
          ? {
              title: `Comparativo contra ${rival.ballotName}`,
              description: `Peça mostrando as contradições de ${rival.ballotName} em propostas e votações. Pode colar — ou soar baixaria.`,
              icon: 'scale',
              chance: 0.6,
              effects: [
                { type: 'opponent', target: 'context', popMomentum: -4, rejection: 2 },
                { type: 'rejection', delta: 0.8 },
              ],
              failure: [
                { type: 'rejection', delta: 2.5 },
                {
                  type: 'news',
                  headline: 'Ataque de {playerName} a {opponentName} repercute mal',
                  sentiment: -1,
                },
              ],
              ctx,
            }
          : null,
    },
    {
      weight: attackedMe ? 4 : 0,
      build: () => ({
        title: 'Responder aos ataques',
        description: 'Os rivais estão mirando em você. Uma resposta firme estanca a sangria.',
        icon: 'shield',
        chance: 0.8,
        effects: [
          { type: 'rejection', delta: -2 },
          { type: 'enthusiasm', delta: 6 },
        ],
        failure: [{ type: 'rejection', delta: 1 }],
        ctx,
      }),
    },
    {
      weight: 2,
      build: () => ({
        title: 'Jantar com grandes doadores',
        description: 'Caixa reforçado — e a oposição vai dizer que você é o candidato dos ricos.',
        icon: 'utensils',
        chance: 0.75,
        effects: [{ type: 'money', amount: 450_000 }],
        failure: [
          { type: 'money', amount: 300_000 },
          { type: 'popMomentum', popTypes: ['workers', 'unemployed'], delta: -4 },
        ],
        ctx,
      }),
    },
    {
      weight: 2,
      build: () => ({
        title: 'Mutirão da militância',
        description: 'Fim de semana de bandeiraço em todo lugar. Anima a base.',
        icon: 'flag',
        chance: 1,
        effects: [
          { type: 'energy', delta: -10 },
          { type: 'enthusiasm', delta: 10 },
          { type: 'militants', pct: 12 },
          { type: 'presence', delta: 4, scope: 'all' },
        ],
        ctx,
      }),
    },
    {
      weight: debateSoon ? 4 : 0,
      build: () => ({
        title: 'Imersão para o debate',
        description: 'Simulados com a equipe a semana toda. Você chega afiado — e cansado.',
        icon: 'graduation-cap',
        chance: 1,
        effects: [
          { type: 'prep', delta: 0.25 },
          { type: 'energy', delta: -15 },
        ],
        ctx,
      }),
    },
    {
      weight: daysLeft <= 14 ? 3 : 0,
      build: () => ({
        title: 'Virada final: tudo ou nada',
        description: 'Gastar o que resta em uma ofensiva total na reta final.',
        icon: 'flame',
        chance: 0.75,
        effects: [
          { type: 'money', amount: -300_000 },
          { type: 'popMomentum', popTypes: 'all', delta: 5 },
          { type: 'enthusiasm', delta: 8 },
        ],
        failure: [
          { type: 'money', amount: -300_000 },
          { type: 'popMomentum', popTypes: 'all', delta: 1 },
        ],
        ctx,
      }),
    },
  ];
}

function drawCards(
  state: GameState,
  rng: Rng,
  trend: IssueId,
  shares: Record<CandidateId, number>,
  week: number,
): WeekCard[] {
  const pool = cardTemplates(state, rng, trend, shares).filter((t) => t.weight > 0);
  const cards: WeekCard[] = [];
  while (cards.length < 3 && pool.length > 0) {
    const t = rng.weightedPick(pool, (x) => x.weight);
    if (!t) break;
    pool.splice(pool.indexOf(t), 1);
    const card = t.build();
    if (card) cards.push({ ...card, id: `w${week}c${cards.length}` });
  }
  return cards;
}

/** Abre a reunião da semana (chamada no início de cada semana de campanha). */
export function startWeek(state: GameState, rng: Rng): void {
  const election = state.election;
  const campaign = state.campaign;
  if (!state.settings.weekly || !election || !campaign || state.phase !== 'campaign') return;
  if (!election.candidateIds.includes(state.playerId)) return;
  if (diffDays(state.date, election.date) < 2) return;
  const snap = computeIntentions(state, election, { includeSegments: false });
  const shares = { ...snap.total.shares };
  const prev = campaign.week;
  const index = Math.floor(diffDays(election.roundStartDate, state.date) / 7) + 1;
  if (prev && prev.startDate === state.date) return;
  // Ênfase em temas esfria a cada semana (sem cair abaixo da base do partido): pauta velha não rende.
  for (const id of election.candidateIds) {
    const st = election.participants[id];
    const party = state.parties[state.candidates[id]?.partyId ?? ''];
    if (!st) continue;
    for (const issue of Object.keys(st.issueFocus) as IssueId[]) {
      const floor = party?.priorities.includes(issue) ? 30 : 0;
      st.issueFocus[issue] = Math.max(floor, (st.issueFocus[issue] ?? 0) * 0.75);
    }
  }
  const trend = pickTrend(state, rng, prev?.trend ?? null);
  election.trend = trend;
  const sameRound = prev && prev.startDate >= election.roundStartDate;
  const rivalMoves = rivalReactions(state, rng, shares, sameRound ? prev.shares : null, trend);
  const week: WeekState = {
    index,
    startDate: state.date,
    trend,
    cards: drawCards(state, rng, trend, shares, index),
    pending: true,
    outcome: null,
    rivalMoves,
    shares,
    lastWeekDelta:
      sameRound && prev ? (shares[state.playerId] ?? 0) - (prev.shares[state.playerId] ?? 0) : null,
  };
  campaign.week = week;
  publishNews(state, {
    headline: `${ISSUE_DEFINITIONS[trend].name} domina o debate eleitoral nesta semana`,
    category: 'campaign',
    importance: 2,
  });
}

/** Para quem chama fora de um withRng (início de campanha, 2º turno). */
export function beginWeek(state: GameState): void {
  withRng(state, (rng) => startWeek(state, rng));
}

/** O jogador escolhe uma carta (ou nenhuma) e a semana começa. */
export function chooseWeekCard(state: GameState, cardId: string | null): ActionResult {
  const week = state.campaign?.week;
  if (!week?.pending) return { ok: false, message: 'Não há reunião de campanha em aberto.' };
  if (cardId === null) {
    week.pending = false;
    week.outcome = { cardId: null, success: true, details: [] };
    return { ok: true, message: 'Semana sem jogada especial. Bora pra rua!' };
  }
  const card = week.cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, message: 'Carta inválida.' };
  const success = withRng(state, (rng) => rng.chance(card.chance));
  const effects: Effect[] = success ? card.effects : (card.failure ?? card.effects);
  const meter = new ImpactMeter(state);
  let details: string[] = [];
  meter.step('card', card.title, () => {
    details = applyEffects(state, effects, card.ctx);
  });
  week.pending = false;
  week.outcome = { cardId, success, details };
  return {
    ok: true,
    message: success ? `${card.title}: deu certo!` : `${card.title}: não saiu como planejado.`,
    details,
  };
}
