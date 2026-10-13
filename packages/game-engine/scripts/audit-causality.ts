/**
 * AUDITORIA DE CAUSALIDADE — mede, com bots, de onde vem cada variação de número relevante.
 *
 * - Intenção de voto: quanto da variação diária real tem fonte registrada no medidor de impacto,
 *   quanto fica só num balde genérico e quanto não tem registro nenhum; erro das pesquisas.
 * - Aprovação no governo: quanto da variação mensal tem causa listada.
 * - Eventos: quantos saem sem gatilho no estado.
 *
 * Uso: npx tsx packages/game-engine/scripts/audit-causality.ts [campanha|aprovacao|eventos|tudo] [sementes]
 */
import {
  blockingReason,
  dispatch,
  pendingDecisions,
  startGame,
  type GameState,
} from '../src/index';
import { CAUSE_GROUP_LABEL, SOURCE_GROUP } from '../src/campaign/explain';
import { computeIntentions } from '../src/election/voterModel';
import { EVENT_DEFINITIONS, getEventDefinition } from '../src/events/events.data';
import { defaultConfig } from './bot';

const part = process.argv[2] ?? 'tudo';
const SEEDS = Number(process.argv[3] ?? 8);

const act = (s: GameState, a: Parameters<typeof dispatch>[1]): GameState => dispatch(s, a).state;
const pp = (v: number): string => (v * 100).toFixed(2);
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs: number[]): number => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** Rótulos genéricos das versões antigas (balde sem fato nomeado). */
const GENERIC_LABELS = [
  'Campanha dos adversários',
  'Desgaste natural (todos perdem presença e momentum)',
  'Passagem do tempo (indecisos, economia, popularidade)',
  'Eventos e efeitos em andamento',
];

function playerShare(s: GameState): number {
  const snap = computeIntentions(s, s.election!, { includeSegments: false });
  return snap.total.shares[s.playerId] ?? 0;
}

/** Soma |Δ| por grupo de causa; rótulos genéricos antigos contam à parte. */
function impactTotal(s: GameState): {
  specific: number;
  generic: number;
  bySource: Map<string, number>;
} {
  const bySource = new Map<string, number>();
  let specific = 0;
  let generic = 0;
  for (const e of s.campaign?.impact ?? []) {
    const key = GENERIC_LABELS.includes(e.label)
      ? 'genérico'
      : (CAUSE_GROUP_LABEL[SOURCE_GROUP[e.source]] ?? e.source);
    bySource.set(key, (bySource.get(key) ?? 0) + Math.abs(e.share));
    if (key === 'genérico') generic += Math.abs(e.share);
    else specific += Math.abs(e.share);
  }
  return { specific, generic, bySource };
}

function resolveBlockers(s: GameState, active: boolean): GameState {
  for (let g = 0; g < 20; g++) {
    const ev = s.events.pending[0];
    if (ev) {
      s = act(s, {
        type: 'event/resolve',
        instanceId: ev.instanceId,
        optionId: ev.options.find((o) => o.available)?.id ?? '',
      });
      continue;
    }
    if (s.interactions.interview) {
      let guard = 0;
      while (s.interactions.interview && !s.interactions.interview.finished && guard++ < 10) {
        const q = s.interactions.interview.questions[s.interactions.interview.index];
        s = act(s, { type: 'interview/answer', answerId: q?.answers[0]?.id ?? '' });
      }
      s = act(s, { type: 'interview/close' });
      continue;
    }
    if (s.campaign?.week?.pending) {
      s = act(s, {
        type: 'week/choose',
        cardId: active ? (s.campaign.week.cards[0]?.id ?? null) : null,
      });
      continue;
    }
    const debate = s.election?.debates.find((d) => d.status === 'scheduled' && d.date === s.date);
    if (debate) {
      s = act(s, { type: 'debate/start', debateId: debate.id });
      let guard = 0;
      while (s.interactions.debate && s.interactions.debate.stage !== 'finished' && guard++ < 30)
        s = act(s, { type: 'debate/move', strategy: 'popular' });
      s = act(s, { type: 'debate/close' });
      continue;
    }
    break;
  }
  return s;
}

/* ─────────── Campanha ─────────── */

interface CampaignRun {
  final: number;
  absTotal: number;
  unrecorded: number;
  specific: number;
  generic: number;
  bySource: Map<string, number>;
  pollNoise: number[];
  pollDiffs: { dPoll: number; dTrue: number }[];
}

function playCampaign(seed: number, active: boolean, weekly: boolean): CampaignRun {
  let s = startGame({ ...defaultConfig(seed, 'prefeito', 'RS'), weekly });
  const units = [...s.election!.units].sort((a, b) => b.voters - a.voters);
  let unrecorded = 0;
  const truthAt = new Map<string, number>();
  for (let guard = 1; s.phase === 'campaign' && guard < 400; guard++) {
    const before = playerShare(s);
    const logBefore = (s.campaign?.impact ?? []).reduce((a, e) => a + e.share, 0);
    s = resolveBlockers(s, active);
    if (active && s.phase === 'campaign' && s.campaign) {
      if (guard === 1) {
        s = act(s, { type: 'campaign/hire', roleId: 'marketer', level: 2 });
        s = act(s, { type: 'campaign/hire', roleId: 'coordinator', level: 1 });
      }
      if (guard % 7 === 1 && s.campaign && s.campaign.money > 0)
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
      s = act(s, { type: 'campaign/action', input: { actionId: 'social_media' } });
      const target = units[guard % Math.min(units.length, 6)];
      if (target && (s.campaign?.energy ?? 0) > 30)
        s = act(s, { type: 'campaign/action', input: { actionId: 'rally', unitId: target.id } });
      s = resolveBlockers(s, active);
    }
    if (s.phase !== 'campaign') break;
    const out = dispatch(s, { type: 'time/advance', step: 'day' });
    if (!out.result.ok) continue;
    s = out.state;
    if (s.phase !== 'campaign') break;
    const after = playerShare(s);
    truthAt.set(s.date, after);
    const logAfter = (s.campaign?.impact ?? []).reduce((a, e) => a + e.share, 0);
    // O registro pode ser podado pelo limite: só conta o resíduo quando a soma é comparável.
    if ((s.campaign?.impact?.length ?? 0) < 880)
      unrecorded += Math.abs(after - before - (logAfter - logBefore));
  }
  const imp = impactTotal(s);
  const absTotal = imp.specific + imp.generic + unrecorded;
  const polls = (s.election?.polls ?? []).filter((p) => p.kind === 'public');
  const pollNoise: number[] = [];
  const pollDiffs: { dPoll: number; dTrue: number }[] = [];
  let prev: { poll: number; truth: number } | null = null;
  for (const p of polls) {
    const truth = truthAt.get(p.date);
    if (truth === undefined) continue;
    const poll = p.total.shares[s.playerId] ?? 0;
    pollNoise.push(poll - truth);
    if (prev) pollDiffs.push({ dPoll: poll - prev.poll, dTrue: truth - prev.truth });
    prev = { poll, truth };
  }
  return {
    final: s.election ? playerShare(s) : 0,
    absTotal,
    unrecorded,
    specific: imp.specific,
    generic: imp.generic,
    bySource: imp.bySource,
    pollNoise,
    pollDiffs,
  };
}

function campaignReport(active: boolean, weekly: boolean): void {
  const runs = Array.from({ length: SEEDS }, (_, i) => playCampaign(i + 1, active, weekly));
  const sum = (k: 'absTotal' | 'unrecorded' | 'specific' | 'generic'): number =>
    runs.reduce((a, r) => a + r[k], 0);
  const T = sum('absTotal');
  console.log(
    `\n== Campanha prefeito/RS · bot ${active ? 'ativo' : 'passivo'} · semanal ${weekly ? 'sim' : 'não'} · ${SEEDS} sementes ==`,
  );
  console.log(
    `Intenção real final: ${pp(mean(runs.map((r) => r.final)))}% (dp ${pp(sd(runs.map((r) => r.final)))})`,
  );
  console.log(
    `|Δ| com causa nomeada: ${((sum('specific') / T) * 100).toFixed(1)}% · balde genérico: ${((sum('generic') / T) * 100).toFixed(1)}% · SEM REGISTRO: ${((sum('unrecorded') / T) * 100).toFixed(1)}%`,
  );
  const sources = new Map<string, number>();
  for (const r of runs) for (const [k, v] of r.bySource) sources.set(k, (sources.get(k) ?? 0) + v);
  console.log(
    '  por grupo:',
    [...sources.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${((v / T) * 100).toFixed(1)}%`)
      .join(' · '),
  );
  const noise = runs.flatMap((r) => r.pollNoise);
  const diffs = runs.flatMap((r) => r.pollDiffs);
  const dP = diffs.map((d) => d.dPoll);
  const err = diffs.map((d) => d.dPoll - d.dTrue);
  console.log(
    `Pesquisas: erro dp ${pp(sd(noise))} p.p. (máx ${pp(Math.max(0, ...noise.map(Math.abs)))}); entre pesquisas seguidas, ${((sd(err) ** 2 / Math.max(1e-12, sd(dP) ** 2)) * 100).toFixed(0)}% da variância é erro de pesquisa`,
  );
}

/* ─────────── Aprovação ─────────── */

function approvalReport(): void {
  const finals: number[] = [];
  let explained = 0;
  let total = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    let s = startGame({
      ...defaultConfig(seed, 'prefeito', 'BA'),
      scenarioId: 'prefeitura_salvador',
    });
    let last = s.government?.approval ?? 0;
    for (let guard = 0; guard < 3000 && s.phase === 'governing'; guard++) {
      const ev = s.events.pending[0];
      if (ev) {
        s = act(s, {
          type: 'event/resolve',
          instanceId: ev.instanceId,
          optionId: ev.options.find((o) => o.available)?.id ?? '',
        });
        continue;
      }
      const d = pendingDecisions(s).find((x) => x.blocking);
      if (d && 'billId' in d && d.billId) {
        s = act(s, { type: 'leg/vote', billId: d.billId, vote: 'yes' });
        continue;
      }
      if (blockingReason(s)) break;
      const out = dispatch(s, { type: 'time/advance', step: 'month' });
      if (!out.result.ok) break;
      s = out.state;
      if (s.government) {
        total += Math.abs(s.government.approval - last);
        last = s.government.approval;
      }
    }
    finals.push(
      s.career.lastEvaluation?.approval ?? s.government?.approvalHistory.at(-1)?.value ?? NaN,
    );
    const log = (s.career.lastEvaluation as { approvalLog?: { delta: number }[] } | null)
      ?.approvalLog;
    explained += (log ?? []).reduce((a, e) => a + Math.abs(e.delta), 0);
  }
  console.log(`\n== Aprovação · prefeitura de Salvador · bot passivo · ${SEEDS} mandatos ==`);
  console.log(
    `Aprovação final média: ${mean(finals).toFixed(1)} (${finals.map((f) => f.toFixed(0)).join(', ')})`,
  );
  console.log(
    `|Δ| mensal total ${total.toFixed(1)}; com causa listada: ${total > 0 ? ((Math.min(explained, total) / total) * 100).toFixed(0) : '0'}%`,
  );
}

/* ─────────── Eventos ─────────── */

function trigger(id: string): string {
  const d = getEventDefinition(id);
  if (!d) return '?';
  if (d.chainOnly) return 'encadeado';
  if (d.condition) return 'condição';
  if (d.weightModifier) return 'peso dinâmico';
  if (d.months) return 'calendário';
  return 'sem gatilho';
}

function eventsReport(): void {
  console.log('\n== Eventos sorteáveis por fase ==');
  for (const phase of ['campaign', 'governing', 'legislating', 'career'] as const) {
    const defs = EVENT_DEFINITIONS.filter((d) => d.phases.includes(phase) && !d.chainOnly);
    const none = defs.filter((d) => trigger(d.id) === 'sem gatilho').length;
    console.log(
      `${phase.padEnd(12)} ${String(defs.length).padStart(4)} sorteáveis · sem gatilho no estado: ${none} (${((none / defs.length) * 100).toFixed(0)}%)`,
    );
  }
  const fired = new Map<string, number>();
  for (let seed = 1; seed <= SEEDS; seed++) {
    let s = startGame({
      ...defaultConfig(seed, 'prefeito', 'BA'),
      scenarioId: 'prefeitura_salvador',
    });
    for (let guard = 0; guard < 3000 && s.phase === 'governing'; guard++) {
      const ev = s.events.pending[0];
      if (ev) {
        s = act(s, {
          type: 'event/resolve',
          instanceId: ev.instanceId,
          optionId: ev.options.find((o) => o.available)?.id ?? '',
        });
        continue;
      }
      const d = pendingDecisions(s).find((x) => x.blocking);
      if (d && 'billId' in d && d.billId) {
        s = act(s, { type: 'leg/vote', billId: d.billId, vote: 'yes' });
        continue;
      }
      if (blockingReason(s)) break;
      const out = dispatch(s, { type: 'time/advance', step: 'month' });
      if (!out.result.ok) break;
      s = out.state;
    }
    for (const e of s.events.log)
      fired.set(trigger(e.eventId), (fired.get(trigger(e.eventId)) ?? 0) + 1);
  }
  const all = [...fired.values()].reduce((a, b) => a + b, 0);
  console.log(
    `Disparados em ${SEEDS} mandatos: ${[...fired.entries()].map(([k, v]) => `${k} ${((v / all) * 100).toFixed(0)}%`).join(' · ')}`,
  );
}

if (part === 'campanha' || part === 'tudo') {
  campaignReport(false, true);
  campaignReport(true, true);
  campaignReport(false, false);
  campaignReport(true, false);
}
if (part === 'aprovacao' || part === 'tudo') approvalReport();
if (part === 'eventos' || part === 'tudo') eventsReport();
