/**
 * Ferramenta de balanceamento do modo nação: começa NO PODER (Presidente) com pacotes de leis
 * diferentes, governa por N anos em S seeds resolvendo as decisões bloqueantes automaticamente
 * e imprime uma tabela comparativa de indicadores.
 *
 * Uso: npx tsx packages/game-engine/scripts/governance-sim.ts [anos=4] [seeds=3] [pacotes]
 *   pacotes: lista separada por vírgula (padrao,liberal,desenvolvimentista,social_democrata,
 *   socialista,planificado). Padrão: todos.
 */
import {
  dispatch,
  diffMonths,
  federalLaws,
  pendingDecisions,
  startGame,
  type GameAction,
  type GameState,
  type InterestGroupId,
  type NewGameConfig,
  type PopTypeId,
} from '../src/index';
import { LAW_PRESETS, type LawPresetId } from '../src/scenarios/presets';
import { defaultConfig } from './bot';

export const PRESET_IDS = Object.keys(LAW_PRESETS) as LawPresetId[];

export const REPORT_POP_TYPES: PopTypeId[] = [
  'business',
  'industrial_workers',
  'farmers',
  'unemployed',
];

export interface GovernanceReport {
  /** Estado ao final da simulação. */
  state: GameState;
  /** Meses efetivamente simulados. */
  months: number;
  /** `false` se o mandato acabou, o jogo travou ou a guarda estourou antes do pedido. */
  completed: boolean;
  stoppedReason: string | null;
  /** Decisões bloqueantes resolvidas automaticamente. */
  decisions: { events: number; votes: number; sanctions: number; other: number };
  growthAvg: number;
  inflationAvg: number;
  unemploymentFinal: number;
  manufacturingStart: number;
  manufacturingEnd: number;
  exportsFinal: number;
  importsFinal: number;
  debtFinal: number;
  approvalFinal: number;
  legitimacyFinal: number;
  clout: Partial<Record<InterestGroupId, number>>;
  /** Satisfação média (0..100) e participação (0..1) de cada tipo de Pop. */
  pops: Partial<Record<PopTypeId, { satisfaction: number; share: number }>>;
  /** Leis federais vigentes ao final (categoria → opção). */
  laws: Record<string, string>;
}

/** Configuração de governo "no poder" como Presidente com um pacote de leis. */
export function governanceConfig(
  seed: number,
  preset: LawPresetId | Record<string, string> = 'padrao',
  overrides: Partial<NewGameConfig> = {},
): NewGameConfig {
  const lawPreset = typeof preset === 'string' ? LAW_PRESETS[preset] : preset;
  return {
    ...defaultConfig(seed, 'presidente', 'SP'),
    startInOffice: true,
    lawPreset: { ...lawPreset },
    ...overrides,
  };
}

function act(state: GameState, action: GameAction): { state: GameState; ok: boolean } {
  const out = dispatch(state, action);
  return { state: out.state, ok: out.result.ok };
}

/**
 * Resolve tudo o que impede o tempo de andar: eventos (1ª opção disponível), votos, sanções
 * e impeachment. Devolve `false` se algo não pôde ser resolvido.
 */
export function resolveBlockers(
  state: GameState,
  tally?: GovernanceReport['decisions'],
): { state: GameState; resolved: boolean } {
  let s = state;
  let guard = 0;
  while (guard++ < 60) {
    const event = s.events.pending[0];
    if (event) {
      const optionId = event.options.find((o) => o.available)?.id ?? event.options[0]?.id ?? '';
      const r = act(s, { type: 'event/resolve', instanceId: event.instanceId, optionId });
      if (!r.ok) return { state: s, resolved: false };
      s = r.state;
      if (tally) tally.events++;
      continue;
    }
    const decision = pendingDecisions(s).find((d) => d.blocking);
    if (!decision) return { state: s, resolved: true };
    const billId = decision.billId ?? '';
    let attempt: GameAction[];
    let bucket: keyof GovernanceReport['decisions'];
    switch (decision.kind) {
      case 'sanction':
        attempt = [
          { type: 'leg/sanction', billId, decision: 'sanction' },
          { type: 'leg/sanction', billId, decision: 'veto' },
        ];
        bucket = 'sanctions';
        break;
      case 'vote':
      case 'veto_vote':
        attempt = [
          { type: 'leg/vote', billId, vote: 'yes' },
          { type: 'leg/vote', billId, vote: 'no' },
          { type: 'leg/vote', billId, vote: 'abstain' },
        ];
        bucket = 'votes';
        break;
      case 'impeachment_vote':
        attempt = [
          { type: 'leg/impeachment', op: 'vote', vote: 'no' },
          { type: 'leg/impeachment', op: 'vote', vote: 'abstain' },
          { type: 'leg/impeachment', op: 'vote', vote: 'yes' },
        ];
        bucket = 'other';
        break;
      default:
        attempt = [{ type: 'leg/impeachment', op: 'defend' }];
        bucket = 'other';
    }
    let done = false;
    for (const action of attempt) {
      const r = act(s, action);
      if (r.ok) {
        s = r.state;
        done = true;
        if (tally) tally[bucket]++;
        break;
      }
    }
    if (!done) return { state: s, resolved: false };
  }
  return { state: s, resolved: false };
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/**
 * Governa por `months` meses a partir da configuração (resolvendo bloqueios automaticamente)
 * e devolve os indicadores. Determinístico para a mesma configuração.
 */
export function simulateGovernance(config: NewGameConfig, months: number): GovernanceReport {
  let s = startGame(config);
  const startDate = s.date;
  const decisions = { events: 0, votes: 0, sanctions: 0, other: 0 };
  const growth: number[] = [];
  const inflation: number[] = [];
  const manufacturingStart = s.industry.stats.manufacturingShare;
  let stoppedReason: string | null = null;
  let guard = 0;

  while (diffMonths(startDate, s.date) < months && guard++ < months * 12 + 50) {
    if (s.phase !== 'governing' && s.phase !== 'legislating') {
      stoppedReason = `Fase ${s.phase}: o mandato terminou.`;
      break;
    }
    const cleared = resolveBlockers(s, decisions);
    s = cleared.state;
    if (!cleared.resolved) {
      stoppedReason = 'Bloqueio que o simulador não conseguiu resolver.';
      break;
    }
    const before = s.date;
    s = act(s, { type: 'time/advance', step: 'month' }).state;
    if (s.date !== before) {
      growth.push(s.economy.growth);
      inflation.push(s.economy.inflation);
    }
  }
  if (!stoppedReason && diffMonths(startDate, s.date) < months && guard >= months * 12 + 50)
    stoppedReason = 'Limite de iterações atingido antes do prazo pedido.';
  const finalized = resolveBlockers(s, decisions);
  s = finalized.state;

  const pops: GovernanceReport['pops'] = {};
  const allPops = Object.values(s.population.pops);
  const totalSize = allPops.reduce((a, p) => a + p.size, 0) || 1;
  for (const type of REPORT_POP_TYPES) {
    const group = allPops.filter((p) => p.typeId === type);
    const size = group.reduce((a, p) => a + p.size, 0);
    pops[type] = {
      satisfaction: size > 0 ? group.reduce((a, p) => a + p.satisfaction * p.size, 0) / size : 0,
      share: size / totalSize,
    };
  }
  const clout: GovernanceReport['clout'] = {};
  for (const g of Object.values(s.interestGroups)) clout[g.id] = g.clout ?? 0;

  const months_ = diffMonths(startDate, s.date);
  return {
    state: s,
    months: months_,
    completed: months_ >= months,
    stoppedReason,
    decisions,
    growthAvg: mean(growth),
    inflationAvg: mean(inflation),
    unemploymentFinal: s.economy.unemployment,
    manufacturingStart,
    manufacturingEnd: s.industry.stats.manufacturingShare,
    exportsFinal: s.industry.stats.exports,
    importsFinal: s.industry.stats.imports,
    debtFinal: s.economy.debt,
    approvalFinal: s.government?.approval ?? s.career.lastEvaluation?.approval ?? 0,
    legitimacyFinal: s.nation.legitimacy,
    clout,
    pops,
    laws: { ...federalLaws(s).enacted },
  };
}

// ---------------------------------------------------------------------------
// Execução por linha de comando
// ---------------------------------------------------------------------------

const pad = (v: string | number, n: number) => String(v).padEnd(n);
const num = (v: number, digits = 1) => v.toFixed(digits);

function average(reports: GovernanceReport[], pick: (r: GovernanceReport) => number): number {
  return mean(reports.map(pick));
}

function printTable(rows: { preset: string; reports: GovernanceReport[] }[]): void {
  const header = [
    ['pacote', 14],
    ['cresc%', 7],
    ['infl%', 7],
    ['desemp%', 8],
    ['ind0%', 6],
    ['ind1%', 6],
    ['export', 9],
    ['import', 9],
    ['dívida%', 8],
    ['aprov', 6],
    ['legit', 6],
    ['meses', 6],
  ] as const;
  console.log(header.map(([h, n]) => pad(h, n)).join(' '));
  for (const { preset, reports } of rows) {
    const a = (f: (r: GovernanceReport) => number) => average(reports, f);
    console.log(
      [
        pad(preset, 14),
        pad(num(a((r) => r.growthAvg)), 7),
        pad(num(a((r) => r.inflationAvg)), 7),
        pad(num(a((r) => r.unemploymentFinal)), 8),
        pad(num(a((r) => r.manufacturingStart) * 100), 6),
        pad(num(a((r) => r.manufacturingEnd) * 100), 6),
        pad(
          num(
            a((r) => r.exportsFinal),
            0,
          ),
          9,
        ),
        pad(
          num(
            a((r) => r.importsFinal),
            0,
          ),
          9,
        ),
        pad(num(a((r) => r.debtFinal)), 8),
        pad(
          num(
            a((r) => r.approvalFinal),
            0,
          ),
          6,
        ),
        pad(
          num(
            a((r) => r.legitimacyFinal),
            0,
          ),
          6,
        ),
        pad(
          num(
            a((r) => r.months),
            0,
          ),
          6,
        ),
      ].join(' '),
    );
  }

  console.log('\nClout dos grupos de interesse (média, %):');
  const groupIds = Object.keys(rows[0]?.reports[0]?.clout ?? {}) as InterestGroupId[];
  console.log([pad('pacote', 14), ...groupIds.map((g) => pad(g.slice(0, 9), 10))].join(' '));
  for (const { preset, reports } of rows)
    console.log(
      [
        pad(preset, 14),
        ...groupIds.map((g) => pad(num(average(reports, (r) => (r.clout[g] ?? 0) * 100)), 10)),
      ].join(' '),
    );

  console.log('\nPops (satisfação média 0..100 · participação %):');
  console.log([pad('pacote', 14), ...REPORT_POP_TYPES.map((t) => pad(t, 22))].join(' '));
  for (const { preset, reports } of rows)
    console.log(
      [
        pad(preset, 14),
        ...REPORT_POP_TYPES.map((t) =>
          pad(
            `${num(
              average(reports, (r) => r.pops[t]?.satisfaction ?? 0),
              0,
            )} · ${num(average(reports, (r) => (r.pops[t]?.share ?? 0) * 100))}`,
            22,
          ),
        ),
      ].join(' '),
    );
}

function main(): void {
  const years = Number(process.argv[2] ?? 4);
  const seeds = Number(process.argv[3] ?? 3);
  const wanted = (process.argv[4] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as LawPresetId[];
  const presets = wanted.length > 0 ? wanted : PRESET_IDS;
  const rows: { preset: string; reports: GovernanceReport[] }[] = [];
  for (const preset of presets) {
    if (!(preset in LAW_PRESETS)) {
      console.error(`Pacote desconhecido: ${preset}. Opções: ${PRESET_IDS.join(', ')}`);
      process.exit(1);
    }
    const reports: GovernanceReport[] = [];
    for (let i = 0; i < seeds; i++) {
      const report = simulateGovernance(governanceConfig(100 + i, preset), years * 12);
      if (report.stoppedReason) console.error(`[${preset} #${i}] ${report.stoppedReason}`);
      reports.push(report);
    }
    rows.push({ preset, reports });
  }
  console.log(`\nGovernança de ${years} ano(s), ${seeds} seed(s), Presidente em 2027\n`);
  printTable(rows);
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('scripts/governance-sim.ts')) main();
