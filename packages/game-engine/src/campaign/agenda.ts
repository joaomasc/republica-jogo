import { addDays, diffDays } from '../core/date';
import { formatMoney } from '../core/math';
import type { ActionResult, UnitId } from '../core/types';
import { INTERVIEW_TYPES, type InterviewType } from '../media/interactions';
import {
  answerInterview,
  closeInterview,
  INTERVIEW_TYPE_INFO,
  pickAutoAnswer,
  startInterview,
} from '../media/interview';
import { POP_TYPE_IDS, type PopTypeId } from '../population/popTypes';
import { getPlayerStatus } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { actionCost, performCampaignAction } from './actions';
import { CAMPAIGN_ACTIONS, getCampaignAction, type CampaignActionDefinition } from './actions.data';
import { ImpactMeter } from './impact';
import type { AgendaConfig, AgendaFrequency, AgendaItem, AgendaState } from './types';

/** Energia mínima que a agenda preserva (abaixo de 15 as ações rendem menos). */
const ENERGY_FLOOR = 15;
const MAX_ITEMS = 12;
const FREQUENCIES: AgendaFrequency[] = [1, 2, 3, 7];

/** Ações que podem entrar na agenda (propostas e discursos exigem escolher uma proposta). */
export const AGENDA_ACTIONS: CampaignActionDefinition[] = CAMPAIGN_ACTIONS.filter(
  (a) => a.target !== 'proposal' && a.target !== 'unitAndProposal',
);

export const DEFAULT_AGENDA: AgendaConfig = {
  enabled: false,
  items: [],
  minMoney: 0,
  autoRest: true,
};

function item(id: string, partial: Partial<AgendaItem> & Pick<AgendaItem, 'kind'>): AgendaItem {
  return { id, every: 1, unit: 'auto', popTypeId: 'auto', enabled: true, ...partial };
}

/** Rotinas prontas para começar. */
export const AGENDA_PRESETS: {
  id: string;
  name: string;
  description: string;
  items: AgendaItem[];
}[] = [
  {
    id: 'ground',
    name: 'Rua (recomendada)',
    description:
      'Redes todo dia, comício dia sim, dia não e porta a porta nos outros dias. A que mais rendeu nos testes.',
    items: [
      item('p1', { kind: 'action', actionId: 'social_media' }),
      item('p2', { kind: 'action', actionId: 'rally', every: 2 }),
      item('p3', { kind: 'action', actionId: 'door_to_door' }),
    ],
  },
  {
    id: 'balanced',
    name: 'Equilibrada',
    description:
      'Redes todo dia, TV a cada 3 dias e comício nas regiões onde você está mais fraco nos outros dias.',
    items: [
      item('p1', { kind: 'action', actionId: 'social_media' }),
      item('p2', { kind: 'action', actionId: 'tv_program', every: 3 }),
      item('p3', { kind: 'action', actionId: 'rally' }),
    ],
  },
  {
    id: 'media',
    name: 'Mídia',
    description: 'Para ficar conhecido rápido: redes, podcast, jornal e entrevista de TV.',
    items: [
      item('p1', { kind: 'action', actionId: 'social_media' }),
      item('p2', { kind: 'action', actionId: 'podcast', every: 2 }),
      item('p3', { kind: 'action', actionId: 'newspaper_article', every: 3 }),
      item('p4', { kind: 'interview', interviewType: 'tv', every: 3 }),
      item('p5', { kind: 'action', actionId: 'tv_program' }),
    ],
  },
];

/** Ocupa o dia inteiro (no máximo uma por dia)? */
export function isDayActivity(
  entry: Pick<AgendaItem, 'kind' | 'actionId' | 'interviewType'>,
): boolean {
  if (entry.kind === 'interview')
    return INTERVIEW_TYPE_INFO[entry.interviewType ?? 'tv'].energy >= 8;
  return (getCampaignAction(entry.actionId ?? '')?.days ?? 0) >= 1;
}

export function agendaItemLabel(entry: AgendaItem): string {
  if (entry.kind === 'interview')
    return `Entrevista: ${INTERVIEW_TYPE_INFO[entry.interviewType ?? 'tv'].name}`;
  return getCampaignAction(entry.actionId ?? '')?.name ?? entry.actionId ?? '?';
}

/** Valida e normaliza a configuração vinda da interface. */
export function updateAgenda(state: GameState, config: AgendaConfig): ActionResult {
  const campaign = state.campaign;
  if (!campaign || state.phase !== 'campaign')
    return { ok: false, message: 'A agenda só existe durante a campanha.' };
  if (config.items.length > MAX_ITEMS)
    return { ok: false, message: `A agenda aceita no máximo ${MAX_ITEMS} compromissos.` };
  const items: AgendaItem[] = [];
  for (const raw of config.items) {
    if (!FREQUENCIES.includes(raw.every)) return { ok: false, message: 'Frequência inválida.' };
    if (raw.kind === 'action') {
      if (!AGENDA_ACTIONS.some((a) => a.id === raw.actionId))
        return { ok: false, message: 'Ação inválida na agenda.' };
    } else if (raw.kind === 'interview') {
      if (!INTERVIEW_TYPES.includes(raw.interviewType as InterviewType))
        return { ok: false, message: 'Entrevista inválida na agenda.' };
    } else return { ok: false, message: 'Compromisso inválido.' };
    items.push({
      id: String(raw.id).slice(0, 40),
      kind: raw.kind,
      ...(raw.kind === 'action'
        ? { actionId: raw.actionId }
        : { interviewType: raw.interviewType }),
      every: raw.every,
      unit:
        raw.unit === 'auto' || state.election?.units.some((u) => u.id === raw.unit)
          ? raw.unit
          : 'auto',
      popTypeId:
        raw.popTypeId === 'auto' || POP_TYPE_IDS.includes(raw.popTypeId) ? raw.popTypeId : 'auto',
      enabled: !!raw.enabled,
    });
  }
  const previous = campaign.agenda;
  campaign.agenda = {
    enabled: !!config.enabled,
    items,
    minMoney: Math.max(0, Math.round(Number(config.minMoney) || 0)),
    autoRest: !!config.autoRest,
    busyUntil: previous?.busyUntil ?? null,
    lastRun: previous?.lastRun ?? null,
  };
  return {
    ok: true,
    message: campaign.agenda.enabled ? 'Agenda salva e ativa.' : 'Agenda salva (pausada).',
  };
}

/** Região com mais eleitores "a conquistar" (eleitores × falta de presença). */
function autoUnit(state: GameState): UnitId | undefined {
  const election = state.election;
  const status = getPlayerStatus(state);
  if (!election || !status) return undefined;
  let best: UnitId | undefined;
  let score = -1;
  for (const u of election.units) {
    const s = u.voters * (1 - (status.presence[u.id] ?? 0) / 110);
    if (s > score) {
      score = s;
      best = u.id;
    }
  }
  return best;
}

/** Maior grupo social em que seu momentum ainda está fraco. */
function autoPopType(state: GameState): PopTypeId | undefined {
  const election = state.election;
  const status = getPlayerStatus(state);
  if (!election || !status) return undefined;
  const voters: Partial<Record<PopTypeId, number>> = {};
  for (const u of election.units)
    for (const up of u.pops) {
      const pop = state.population.pops[up.popId];
      if (pop) voters[pop.typeId] = (voters[pop.typeId] ?? 0) + up.voters;
    }
  let best: PopTypeId | undefined;
  let score = -1;
  for (const t of POP_TYPE_IDS) {
    const m = Math.max(0, Math.min(50, status.popMomentum[t] ?? 0));
    const s = (voters[t] ?? 0) * (1 - m / 60);
    if (s > score) {
      score = s;
      best = t;
    }
  }
  return best;
}

export interface AgendaDayReport {
  done: string[];
  skipped: string[];
  spent: number;
}

function runInterview(state: GameState, type: InterviewType): boolean {
  const meter = new ImpactMeter(state);
  let ok = false;
  const label = `Entrevista automática: ${INTERVIEW_TYPE_INFO[type].name}`;
  meter.step(
    'interview',
    label,
    () => {
      if (!startInterview(state, type).ok) return;
      for (let guard = 0; guard < 10; guard++) {
        const session = state.interactions.interview;
        if (!session || session.finished) break;
        const answer = pickAutoAnswer(state);
        if (!answer || !answerInterview(state, answer.id).ok) break;
      }
      closeInterview(state);
      ok = true;
    },
    `agenda-interview:${state.date}`,
  );
  return ok;
}

/**
 * Executa os compromissos de hoje. Chamada uma vez por dia, antes de o dia passar,
 * apenas quando o tempo é avançado pelo jogador (não durante ações manuais de vários dias).
 */
export function runAgendaDay(state: GameState): AgendaDayReport | null {
  const agenda: AgendaState | undefined = state.campaign?.agenda;
  const campaign = state.campaign;
  const election = state.election;
  if (!agenda?.enabled || !campaign || !election || state.phase !== 'campaign') return null;
  if (state.date >= election.date || agenda.lastRun === state.date) return null;
  if (!election.candidateIds.includes(state.playerId)) return null;
  agenda.lastRun = state.date;

  const report: AgendaDayReport = { done: [], skipped: [], spent: 0 };
  const day = diffDays(election.roundStartDate, state.date);
  let dayTaken = !!agenda.busyUntil && state.date < agenda.busyUntil;

  for (const entry of agenda.items) {
    if (!entry.enabled || day % entry.every !== 0) continue;
    if (
      state.events.pending.length > 0 ||
      state.interactions.interview ||
      state.interactions.debate
    )
      break;
    const main = isDayActivity(entry);
    if (main && dayTaken) continue;
    const label = agendaItemLabel(entry);

    if (entry.kind === 'interview') {
      const type = entry.interviewType ?? 'tv';
      if (campaign.energy - INTERVIEW_TYPE_INFO[type].energy < ENERGY_FLOOR) {
        report.skipped.push(`${label} (energia)`);
        continue;
      }
      if (runInterview(state, type)) {
        report.done.push(label);
        if (main) dayTaken = true;
      } else report.skipped.push(label);
      continue;
    }

    const def = getCampaignAction(entry.actionId ?? '');
    if (!def) continue;
    const cost = actionCost(state, def);
    if (campaign.money - cost < agenda.minMoney) {
      report.skipped.push(`${label} (caixa)`);
      continue;
    }
    if (campaign.energy - def.energy < ENERGY_FLOOR) {
      report.skipped.push(`${label} (energia)`);
      continue;
    }
    const daysLeft = diffDays(state.date, election.date);
    if (def.days > daysLeft) continue;
    const unitId =
      def.target === 'unit' ? (entry.unit === 'auto' ? autoUnit(state) : entry.unit) : undefined;
    const popTypeId =
      def.target === 'popType'
        ? entry.popTypeId === 'auto'
          ? autoPopType(state)
          : entry.popTypeId
        : undefined;
    const out = performCampaignAction(state, {
      actionId: def.id,
      ...(unitId ? { unitId } : {}),
      ...(popTypeId ? { popTypeId } : {}),
    });
    if (!out.result.ok) {
      report.skipped.push(`${label} (${out.result.message.replace(/\.$/, '').toLowerCase()})`);
      continue;
    }
    const logEntry = campaign.log[0];
    if (logEntry) logEntry.auto = true;
    report.done.push(label);
    report.spent += cost;
    if (main) {
      dayTaken = true;
      if (def.days > 1) agenda.busyUntil = addDays(state.date, def.days);
    }
  }

  if (!dayTaken && agenda.autoRest && campaign.energy < 40) {
    const out = performCampaignAction(state, { actionId: 'rest' });
    if (out.result.ok) {
      const logEntry = campaign.log[0];
      if (logEntry) logEntry.auto = true;
      report.done.push('Descansar');
    }
  }
  return report;
}

/** Junta os relatórios de vários dias num resumo curto ("3× Comício, 7× Redes"). */
export function summarizeAgenda(reports: AgendaDayReport[]): string[] {
  if (reports.length === 0) return [];
  const count = (list: string[]) => {
    const c = new Map<string, number>();
    for (const x of list) c.set(x, (c.get(x) ?? 0) + 1);
    return [...c.entries()].map(([k, n]) => `${n}× ${k}`).join(', ');
  };
  const done = reports.flatMap((r) => r.done);
  const skipped = reports.flatMap((r) => r.skipped);
  const spent = reports.reduce((a, r) => a + r.spent, 0);
  const out: string[] = [];
  if (done.length) out.push(`Agenda: ${count(done)}`);
  if (spent > 0) out.push(`Gasto da agenda: ${formatMoney(spent)}`);
  if (skipped.length) out.push(`Pulados: ${count(skipped)}`);
  return out;
}
