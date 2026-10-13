/**
 * ENTRESSAFRA JOGÁVEL — a preparação da próxima eleição.
 *
 * Fora do cargo, o jogador escolhe um ALVO (cargo, estado/cidade, ano) e avança por MARCOS do
 * calendário político (meio e fim de ano, janela partidária, convenções, início da campanha).
 * Em cada bloco faz UMA preparação (base eleitoral, doadores, aliança, mídia, treino), vive o que
 * a ocupação traz e recebe um resumo do que mudou. Os recursos acumulados entram na campanha:
 *
 * - base eleitoral → presença e conhecimento iniciais nas regiões do alvo;
 * - caixa da pré-campanha → % a mais no caixa inicial;
 * - aliados → partidos que não lançam candidato e transferem parte dos eleitores;
 * - fama → conhecimento inicial; credibilidade → rejeição; reputação → fundo partidário e alianças.
 */
import { addKnowledge, addPresence } from '../campaign/statusOps';
import { earn } from '../campaign/finance';
import { GameConstants } from '../config/constants';
import { deepClone } from '../core/clone';
import { formatDateShort, makeDate, yearOf } from '../core/date';
import { clamp, clamp100, round } from '../core/math';
import { withRng } from '../core/rng';
import type { ActionResult, IsoDate, PartyId, StateId } from '../core/types';
import { OFFICES, jurisdictionFor, type Jurisdiction, type OfficeId } from '../election/offices';
import { setupElection } from '../election/setup';
import { computeIntentions, OTHERS_KEY } from '../election/voterModel';
import { processScheduledEvents, rollEvent } from '../events/events';
import { publishNews } from '../media/news';
import { partyCompatibility } from '../parties/parties';
import { getPlayer, getPlayerParty, getPlayerStatus } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { campaignStartFor, careerOptions, fastForward } from './career';
import type { InterludeChange, InterludeState, InterludeTarget } from './types';

const K = GameConstants.career;
const I = K.interlude;

/* ───────────── Alvo ───────────── */

function keyOf(j: Jurisdiction): string {
  return `${j.level}:${j.stateId ?? 'BR'}:${j.cityId ?? ''}`;
}

/** Chave do lugar do alvo ("municipal:BA:2927408"). */
export function targetKey(t: Pick<InterludeTarget, 'officeId' | 'stateId' | 'cityId'>): string {
  return keyOf(jurisdictionFor(t.officeId, t.stateId, t.cityId));
}

export function targetLabel(t: InterludeTarget): string {
  const j = jurisdictionFor(t.officeId, t.stateId, t.cityId);
  return `${OFFICES[t.officeId].name} — ${j.label}, ${t.year}`;
}

/** Quanto da base acompanha o jogador ao mudar de alvo (mesma cidade, mesmo estado, outro). */
function portability(from: string | null, to: string): number {
  // Base sem lugar (save antigo) adota o lugar do alvo.
  if (!from) return 1;
  if (from === to) return I.basePortability.same;
  const [, ufA] = from.split(':');
  const [, ufB] = to.split(':');
  return ufA === ufB || ufA === 'BR' || ufB === 'BR'
    ? I.basePortability.state
    : I.basePortability.other;
}

/** Alvo padrão: o último cargo disputado, no estado de origem, na próxima eleição possível. */
export function defaultTarget(state: GameState): InterludeTarget | null {
  const player = getPlayer(state);
  const last = state.career.elections.at(-1)?.officeId ?? state.career.lastOfficeId ?? 'prefeito';
  const options = careerOptions(state);
  const opt =
    options.find((o) => o.officeId === last && o.eligible) ?? options.find((o) => o.eligible);
  return opt
    ? { officeId: opt.officeId, stateId: player.homeStateId, cityId: null, year: opt.year }
    : null;
}

function createInterlude(state: GameState): InterludeState {
  return {
    startedOn: state.date,
    target: defaultTarget(state),
    base: 0,
    baseKey: null,
    warChest: 0,
    allies: [],
    prepDone: false,
    summaries: [],
  };
}

/**
 * Começa a entressafra. Quem sai de um mandato ou de uma eleição deixa base no lugar: o mandato
 * vale pela aprovação; a derrota, pelos votos recebidos.
 */
export function startInterlude(
  state: GameState,
  from?: { jurisdiction: Jurisdiction; base: number },
): void {
  const it = createInterlude(state);
  if (from) {
    it.baseKey = keyOf(from.jurisdiction);
    it.base = round(clamp(from.base, 0, 60), 1);
    // O alvo padrão fica no mesmo lugar quando o cargo é local.
    if (it.target && from.jurisdiction.stateId) {
      it.target.stateId = from.jurisdiction.stateId as StateId;
      it.target.cityId = from.jurisdiction.cityId ?? null;
    }
  }
  state.career.interlude = it;
}

/** Entressafra em curso (cria uma, em saves antigos). Mutável: use em ações. */
export function ensureInterlude(state: GameState): InterludeState {
  return (state.career.interlude ??= createInterlude(state));
}

/** Leitura sem mutar o estado (para a interface). */
export function interludeView(state: GameState): InterludeState {
  return state.career.interlude ?? createInterlude(state);
}

export function setInterludeTarget(
  state: GameState,
  officeId: OfficeId,
  stateId: StateId,
  cityId: string | null,
): ActionResult {
  if (state.phase !== 'career') return { ok: false, message: 'Só fora do cargo.' };
  const option = careerOptions(state).find((o) => o.officeId === officeId);
  if (!option?.eligible) return { ok: false, message: option?.reason ?? 'Cargo indisponível.' };
  const it = ensureInterlude(state);
  const target: InterludeTarget = {
    officeId,
    stateId,
    cityId: OFFICES[officeId].unitsKind === 'cityZones' ? cityId : null,
    year: option.year,
  };
  const key = targetKey(target);
  const kept = it.baseKey ? portability(it.baseKey, key) : 1;
  const before = it.base;
  if (it.baseKey !== key) {
    it.base = round(it.base * kept, 1);
    it.baseKey = it.base > 0 ? key : null;
  }
  it.target = target;
  const lost = before - it.base;
  return {
    ok: true,
    message: `Novo alvo: ${targetLabel(target)}.`,
    ...(lost >= 0.5
      ? {
          details: [
            `A base eleitoral não viaja inteira: ${Math.round(before)} → ${Math.round(it.base)}.`,
          ],
        }
      : {}),
  };
}

/* ───────────── Marcos ───────────── */

export interface InterludeMilestone {
  date: IsoDate;
  label: string;
  kind: 'semester' | 'window' | 'convention' | 'campaign';
}

/** Marcos até o início da campanha do alvo (o próximo é o fim do bloco atual). */
export function interludeMilestones(state: GameState): InterludeMilestone[] {
  const target = interludeView(state).target;
  if (!target) return [];
  const start = campaignStartFor(target.officeId, target.year);
  const out: InterludeMilestone[] = [];
  for (let y = yearOf(state.date); y < target.year; y++) {
    out.push({ date: makeDate(y, 6, 30), label: `Meio de ${y}`, kind: 'semester' });
    out.push({ date: makeDate(y, 12, 31), label: `Fim de ${y}`, kind: 'semester' });
  }
  out.push({
    date: makeDate(target.year, 4, 5),
    label: 'Janela partidária (último dia para trocar de partido)',
    kind: 'window',
  });
  out.push({
    date: makeDate(target.year, 7, 20),
    label: 'Convenções partidárias',
    kind: 'convention',
  });
  out.push({ date: start, label: 'Início da campanha', kind: 'campaign' });
  return out
    .filter((m) => m.date > state.date && m.date <= start)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function nextMilestone(state: GameState): InterludeMilestone | null {
  return interludeMilestones(state)[0] ?? null;
}

/** Data da janela partidária da eleição de `year` (filiação depois disso não vale para ela). */
export function partyWindow(year: number): IsoDate {
  return makeDate(year, 4, 5);
}

/* ───────────── Preparação (uma por bloco) ───────────── */

export type PrepId = 'base' | 'funds' | 'alliance' | 'media' | 'training';

export interface PrepOption {
  id: PrepId;
  name: string;
  icon: string;
  /** O que rende, em números, e onde isso pesa na campanha. */
  effect: string;
  available: boolean;
  reason?: string;
}

function baseGain(state: GameState): number {
  return round(I.prep.base + getPlayer(state).attributes.leadership / 25, 1);
}

function trainingGain(state: GameState, attr: 'oratory' | 'communication'): number {
  return round(I.prep.training * (1 - getPlayer(state).attributes[attr] / 100), 1);
}

function fundsGain(state: GameState): number {
  return round(I.prep.funds * (0.6 + state.career.reputation / 125), 3);
}

/** Chance (mostrada antes) de um partido fechar apoio: afinidade e reputação. */
export function allianceChance(state: GameState, partyId: PartyId): number {
  const player = getPlayer(state);
  const party = state.parties[partyId];
  if (!party || partyId === player.partyId) return 0;
  const compat = partyCompatibility(player.ideology, party);
  if (compat < I.allyMinCompatibility) return 0;
  return clamp(
    0.15 +
      (0.8 * (compat - I.allyMinCompatibility)) / (100 - I.allyMinCompatibility) +
      (state.career.reputation - 50) / 200,
    0.05,
    0.9,
  );
}

export function prepOptions(state: GameState): PrepOption[] {
  const it = interludeView(state);
  const done = it.prepDone ? 'Você já se preparou neste bloco: avance até o próximo marco.' : null;
  const where = it.target
    ? jurisdictionFor(it.target.officeId, it.target.stateId, it.target.cityId).label
    : null;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const opts: PrepOption[] = [
    {
      id: 'base',
      name: 'Trabalho de base',
      icon: 'map-pin',
      effect: where
        ? `Base eleitoral em ${where} +${baseGain(state)} (vira presença e conhecimento no início da campanha).`
        : 'Escolha um alvo primeiro.',
      available: !done && !!where,
      ...(done ? { reason: done } : !where ? { reason: 'Escolha a próxima eleição.' } : {}),
    },
    {
      id: 'funds',
      name: 'Rodada com doadores',
      icon: 'hand-coins',
      effect: `Caixa da pré-campanha +${pct(fundsGain(state))} do caixa inicial (reputação ajuda); credibilidade ${I.prep.fundsCredibility}.`,
      available: !done && it.warChest < I.warChestMax,
      ...(done
        ? { reason: done }
        : it.warChest >= I.warChestMax
          ? { reason: 'Caixa no limite.' }
          : {}),
    },
    {
      id: 'alliance',
      name: 'Costurar aliança',
      icon: 'handshake',
      effect: `Partido aliado não lança candidato contra você e leva ${pct(I.allyWeight)} da identificação partidária dos eleitores dele. Até ${I.maxAllies} aliados.`,
      available: !done && it.allies.length < I.maxAllies,
      ...(done
        ? { reason: done }
        : it.allies.length >= I.maxAllies
          ? { reason: 'Limite de aliados.' }
          : {}),
    },
    {
      id: 'media',
      name: 'Aparições na mídia',
      icon: 'tv',
      effect: `Fama +${I.prep.media} (conhecimento inicial na campanha); credibilidade ${I.prep.mediaCredibility}.`,
      available: !done,
      ...(done ? { reason: done } : {}),
    },
    {
      id: 'training',
      name: 'Preparação pessoal',
      icon: 'graduation-cap',
      effect: `Oratória +${trainingGain(state, 'oratory')} e comunicação +${trainingGain(state, 'communication')} (rende menos quanto mais preparado): debates, entrevistas e ações rendem mais.`,
      available: !done,
      ...(done ? { reason: done } : {}),
    },
  ];
  return opts;
}

export function performPrep(state: GameState, id: PrepId, partyId?: PartyId): ActionResult {
  if (state.phase !== 'career') return { ok: false, message: 'Só fora do cargo.' };
  const option = prepOptions(state).find((o) => o.id === id);
  if (!option) return { ok: false, message: 'Preparação inválida.' };
  if (!option.available) return { ok: false, message: option.reason ?? 'Indisponível agora.' };
  const it = ensureInterlude(state);
  const player = getPlayer(state);
  let message: string;
  switch (id) {
    case 'base': {
      const key = targetKey(it.target!);
      if (it.baseKey !== key) {
        it.base = round(it.base * portability(it.baseKey, key), 1);
        it.baseKey = key;
      }
      const gain = baseGain(state);
      it.base = clamp(it.base + gain, 0, 100);
      message = `Base eleitoral +${gain} (agora ${Math.round(it.base)}).`;
      break;
    }
    case 'funds': {
      const gain = fundsGain(state);
      it.warChest = clamp(it.warChest + gain, 0, I.warChestMax);
      player.attributes.credibility = clamp100(
        player.attributes.credibility + I.prep.fundsCredibility,
      );
      message = `Caixa da pré-campanha agora em +${Math.round(it.warChest * 100)}% do caixa inicial.`;
      break;
    }
    case 'alliance': {
      const party = partyId ? state.parties[partyId] : undefined;
      if (!party) return { ok: false, message: 'Escolha um partido.' };
      if (it.allies.includes(party.id)) return { ok: false, message: 'Já é aliado.' };
      const chance = allianceChance(state, party.id);
      if (chance <= 0)
        return {
          ok: false,
          message: `Afinidade com o ${party.acronym} abaixo de ${I.allyMinCompatibility}%: não há conversa.`,
        };
      const ok = withRng(state, (rng) => rng.chance(chance));
      if (ok) {
        it.allies.push(party.id);
        publishNews(state, {
          headline: `${party.acronym} fecha apoio a ${player.ballotName} para ${it.target ? OFFICES[it.target.officeId].name.toLowerCase() : 'a próxima eleição'}`,
          category: 'party',
          sentiment: 1,
        });
      }
      message = ok
        ? `O ${party.acronym} fechou apoio (chance era ${Math.round(chance * 100)}%).`
        : `O ${party.acronym} preferiu esperar (chance era ${Math.round(chance * 100)}%).`;
      break;
    }
    case 'media':
      player.fame = clamp100(player.fame + I.prep.media);
      player.attributes.credibility = clamp100(
        player.attributes.credibility + I.prep.mediaCredibility,
      );
      message = `Fama +${I.prep.media}.`;
      break;
    case 'training': {
      const o = trainingGain(state, 'oratory');
      const c = trainingGain(state, 'communication');
      player.attributes.oratory = clamp100(player.attributes.oratory + o);
      player.attributes.communication = clamp100(player.attributes.communication + c);
      message = `Oratória +${o} e comunicação +${c}.`;
      break;
    }
  }
  it.prepDone = true;
  return { ok: true, message };
}

/* ───────────── Avanço por marcos ───────────── */

interface Snapshot {
  fame: number;
  credibility: number;
  reputation: number;
  scandal: number;
  unity: number;
  base: number;
  warChest: number;
  allies: number;
}

function snapshot(state: GameState): Snapshot {
  const player = getPlayer(state);
  const it = interludeView(state);
  return {
    fame: player.fame,
    credibility: player.attributes.credibility,
    reputation: state.career.reputation,
    scandal: player.scandal,
    unity: getPlayerParty(state).unity,
    base: it.base,
    warChest: it.warChest * 100,
    allies: it.allies.length,
  };
}

const SNAPSHOT_LABEL: Record<keyof Snapshot, string> = {
  fame: 'Fama',
  credibility: 'Credibilidade',
  reputation: 'Reputação',
  scandal: 'Escândalo',
  unity: 'Unidade do partido',
  base: 'Base eleitoral',
  warChest: 'Caixa da pré-campanha',
  allies: 'Partidos aliados',
};

function diffSnapshots(a: Snapshot, b: Snapshot): InterludeChange[] {
  return (Object.keys(a) as (keyof Snapshot)[])
    .filter((k) => Math.abs(b[k] - a[k]) >= 0.5)
    .map((k) => ({
      label: SNAPSHOT_LABEL[k],
      before: round(a[k], 1),
      after: round(b[k], 1),
      unit: k === 'warChest' ? ('%' as const) : ('' as const),
    }));
}

/** Avança até o próximo marco: meses da ocupação, consequências agendadas e um acontecimento. */
export function advanceInterlude(state: GameState): ActionResult {
  if (state.phase !== 'career') return { ok: false, message: 'Indisponível agora.' };
  if (state.events.pending.length > 0)
    return { ok: false, message: 'Resolva o acontecimento pendente primeiro.' };
  const it = ensureInterlude(state);
  const m = nextMilestone(state);
  if (!m)
    return {
      ok: false,
      message: it.target
        ? 'A campanha começa agora: lance a candidatura.'
        : 'Escolha a próxima eleição para preparar.',
    };
  const from = state.date;
  const before = snapshot(state);
  const logged = state.events.log[0]?.instanceId;
  fastForward(state, m.date);
  // Consequências de decisões anteriores (ex.: auditoria das contas de campanha).
  processScheduledEvents(state);
  if (state.events.pending.length === 0) rollEvent(state, 1);
  it.prepDone = false;
  const notes: string[] = [];
  for (const e of state.events.log) {
    if (e.instanceId === logged) break;
    notes.push(e.title);
  }
  for (const p of state.events.pending) notes.push(`${p.title} (decida agora)`);
  it.summaries.unshift({
    from,
    to: state.date,
    milestone: m.label,
    changes: diffSnapshots(before, snapshot(state)),
    notes,
  });
  if (it.summaries.length > 12) it.summaries.length = 12;
  return { ok: true, message: `${m.label} — ${formatDateShort(state.date)}.` };
}

/* ───────────── Na campanha ───────────── */

/**
 * Leva os recursos da entressafra para a campanha recém-montada e encerra a entressafra.
 * Retorna as linhas do que entrou (para a notícia e o histórico).
 */
export function applyInterludeToCampaign(state: GameState): string[] {
  const it = state.career.interlude;
  const election = state.election;
  const campaign = state.campaign;
  const status = getPlayerStatus(state);
  if (!it || !election || !campaign || !status) return [];
  const notes: string[] = [];
  const base = it.base * portability(it.baseKey, keyOf(election.jurisdiction));
  if (base >= 0.5) {
    for (const unit of election.units) {
      addPresence(status, unit.id, base * I.basePresenceFactor);
      addKnowledge(status, unit.id, base * I.baseKnowledgeFactor);
    }
    notes.push(`Base eleitoral ${Math.round(base)}: mais presença e conhecimento desde o 1º dia`);
  }
  if (it.warChest > 0) {
    const extra = Math.round(campaign.money * it.warChest);
    earn(state, extra, 'donations', 'Caixa da pré-campanha');
    notes.push(`Caixa da pré-campanha: +${Math.round(it.warChest * 100)}% no caixa inicial`);
  }
  const running = new Set(election.candidateIds.map((id) => state.candidates[id]?.partyId));
  const allies = it.allies.filter((p) => !running.has(p) && state.parties[p]);
  if (allies.length > 0 && OFFICES[election.officeId].system === 'majoritarian') {
    election.endorsements = {
      ...election.endorsements,
      [state.playerId]: allies.map((partyId) => ({ partyId, weight: I.allyWeight })),
    };
    notes.push(`Coligação: ${allies.map((p) => state.parties[p]!.acronym).join(', ')}`);
  }
  state.career.interlude = null;
  return notes;
}

/** Partidos aliados que não devem lançar candidato contra o jogador. */
export function interludeAllies(state: GameState): PartyId[] {
  return state.career.interlude?.allies ?? [];
}

/* ───────────── Prévia: "se a eleição fosse hoje" ───────────── */

export interface CandidacyProjection {
  share: number;
  rank: number;
  candidates: number;
  leaderName: string;
  leaderShare: number;
  /** Conhecimento médio (0–100) e rejeição (fração) no 1º dia. */
  knowledge: number;
  rejection: number;
  money: number;
}

/**
 * Monta a eleição do alvo numa cópia do estado, com os recursos de hoje, e mede a largada.
 * É uma estimativa: adversários e mundo mudam até lá.
 */
export function projectCandidacy(state: GameState): CandidacyProjection | null {
  const it = interludeView(state);
  const target = it.target;
  if (!target || state.phase !== 'career') return null;
  const option = careerOptions(state).find((o) => o.officeId === target.officeId);
  const sim = deepClone(state);
  sim.career.interlude = deepClone(it);
  try {
    setupElection(sim, {
      officeId: target.officeId,
      stateId: target.stateId,
      cityId: target.cityId,
      year: target.year,
      playerIncumbent: !!option?.reelection,
      allies: it.allies,
    });
    applyInterludeToCampaign(sim);
    const election = sim.election!;
    const snap = computeIntentions(sim, election, { includeSegments: false });
    const ranked = Object.entries(snap.total.shares)
      .filter(([id]) => id !== OTHERS_KEY)
      .sort((a, b) => b[1] - a[1]);
    const me = sim.playerId;
    const leader = ranked[0];
    return {
      share: snap.total.shares[me] ?? 0,
      rank: ranked.findIndex(([id]) => id === me) + 1,
      candidates: ranked.length,
      leaderName: (leader && sim.candidates[leader[0]]?.ballotName) ?? '—',
      leaderShare: leader?.[1] ?? 0,
      knowledge: snap.knowledge[me] ?? 0,
      rejection: snap.rejection[me] ?? 0,
      money: sim.campaign?.money ?? 0,
    };
  } catch {
    return null;
  }
}
