import { addDays } from '../core/date';
import { approach, clamp } from '../core/math';
import { hashSeed, Rng } from '../core/rng';
import type { ActionResult, IsoDate, StateId } from '../core/types';
import { serviceQuality } from '../economy/budget';
import { evaluatePromise } from '../government/promises';
import { addHistory } from '../history/history';
import { openImpeachment } from '../legislature/impeachment';
import { pushAlert } from '../media/alerts';
import { publishNews } from '../media/news';
import type { GameState } from '../simulation/state';
import { localScope } from '../simulation/localScope';

/**
 * Revolta popular ("clima nas ruas") no lugar que o jogador governa. A temperatura sobe com
 * desemprego, carestia, serviços ruins, promessas quebradas, escândalos e impopularidade; cai com
 * emprego, obras entregues e diálogo. Ela escala por degraus (no máximo um por mês) e cada degrau
 * tem efeitos maiores. No topo, abre um processo de afastamento (impeachment ou cassação).
 */

export const STREET_STAGES = [
  { name: 'Calma', min: 0 },
  { name: 'Insatisfação', min: 25 },
  { name: 'Protestos', min: 40 },
  { name: 'Grandes manifestações', min: 55 },
  { name: 'Ocupações e bloqueios', min: 70 },
  { name: 'Greve geral', min: 82 },
  { name: 'Revolta', min: 92 },
] as const;

export type StreetResponse = 'speech' | 'negotiate' | 'concede' | 'repress' | 'emergency';

export interface StreetState {
  heat: number;
  stage: number;
  monthsAtStage: number;
  /** Alívio temporário (negociação, pauta atendida): pontos e meses restantes. */
  relief: number;
  reliefMonths: number;
  /** Memória da repressão: radicaliza por um tempo. */
  radicalization: number;
  /** Último uso de cada resposta (para recarga). */
  lastUse: Partial<Record<StreetResponse, IsoDate>>;
  /** Votação de cassação marcada (governador/prefeito). */
  removalVote: IsoDate | null;
  emergencyMonths: number;
}

export const StreetConstants = {
  base: 12,
  approvalFactor: 0.8,
  unemploymentReference: 8,
  unemploymentFactor: 2.4,
  unemploymentRiseFactor: 1.5,
  inflationReference: 6,
  inflationFactor: 2.2,
  brokenPromise: 4,
  brokenPromiseCap: 16,
  scandalFactor: 0.2,
  serviceFactor: 35,
  nationalSpillover: 0.2,
  heatRate: 0.35,
  /** Meses no degrau Revolta até abrir o processo de afastamento. */
  removalAfterMonths: 2,
  /** Efeitos mensais por degrau (aprovação, capital político, legitimidade, confiança). */
  effects: [
    { approval: 0, capital: 0, legitimacy: 0, confidence: 0 },
    { approval: -0.3, capital: 0, legitimacy: 0, confidence: 0 },
    { approval: -0.8, capital: -1, legitimacy: 0, confidence: -0.5 },
    { approval: -1.5, capital: -2, legitimacy: -0.5, confidence: -1 },
    { approval: -2, capital: -3, legitimacy: -1, confidence: -2 },
    { approval: -3, capital: -4, legitimacy: -1.5, confidence: -3 },
    { approval: -4, capital: -5, legitimacy: -3, confidence: -4 },
  ],
};
const S = StreetConstants;

const pct1 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function street(state: GameState): StreetState {
  state.nation.street ??= {
    heat: 15,
    stage: 0,
    monthsAtStage: 0,
    relief: 0,
    reliefMonths: 0,
    radicalization: 0,
    lastUse: {},
    removalVote: null,
    emergencyMonths: 0,
  };
  return state.nation.street as StreetState;
}

/** As ruas valem para o chefe do Executivo (é ele quem é cobrado). */
function active(state: GameState): boolean {
  return state.phase === 'governing' && state.government?.branch === 'executive';
}

export interface StreetFactor {
  label: string;
  value: number;
}

/** Temperatura-alvo e o que a compõe. */
export function streetFactors(state: GameState): { target: number; factors: StreetFactor[]; demands: string[] } {
  const gov = state.government;
  const scope = localScope(state);
  const st = street(state);
  const player = state.candidates[state.playerId];
  const factors: StreetFactor[] = [];
  const add = (label: string, value: number) => {
    if (Math.abs(value) >= 0.5) factors.push({ label, value: Math.round(value * 10) / 10 });
  };
  add('Base', S.base);
  const approval = gov?.approval ?? 50;
  add(`Aprovação de ${Math.round(approval)}%`, (50 - approval) * S.approvalFactor);
  add(`Desemprego de ${pct1(scope.unemployment)}%`, Math.max(0, scope.unemployment - S.unemploymentReference) * S.unemploymentFactor + Math.max(0, scope.unemployment - scope.unemployment0) * S.unemploymentRiseFactor);
  add(`Inflação de ${pct1(state.economy.inflation)}%`, Math.max(0, state.economy.inflation - S.inflationReference) * S.inflationFactor);
  const broken = gov ? state.promises.filter((p) => p.status === 'pending' && gov.monthsInOffice >= 12 && evaluatePromise(state, p) === 'broken').length : 0;
  add(`${broken} promessa(s) não cumprida(s)`, Math.min(S.brokenPromiseCap, broken * S.brokenPromise));
  add('Escândalos', (player?.scandal ?? 0) * S.scandalFactor);
  const services = (['health', 'education', 'security'] as const).map((c) => serviceQuality(state, c));
  const avgService = services.reduce((a, b) => a + b, 0) / services.length;
  add(avgService >= 1 ? 'Serviços públicos bons' : 'Serviços públicos ruins', (1 - avgService) * S.serviceFactor);
  if (scope.kind !== 'country') add('Clima no resto do país', state.nation.unrest * S.nationalSpillover);
  add('Memória da repressão', st.radicalization);
  if (st.reliefMonths > 0) add('Diálogo e concessões', -st.relief);
  const target = clamp(factors.reduce((a, f) => a + f.value, 0), 0, 100);
  // Pauta: as maiores causas viram cartazes.
  const demands: string[] = [];
  const sorted = [...factors].filter((f) => f.value > 3 && f.label !== 'Base').sort((a, b) => b.value - a.value);
  for (const f of sorted.slice(0, 3)) {
    if (f.label.startsWith('Desemprego')) demands.push('Emprego já!');
    else if (f.label.startsWith('Inflação')) demands.push('Contra a carestia');
    else if (f.label.includes('promessa')) demands.push('Cumpra o que prometeu!');
    else if (f.label.startsWith('Serviços')) demands.push('Saúde, educação e segurança');
    else if (f.label.startsWith('Aprovação') || f.label === 'Escândalos') demands.push(`Fora, ${player?.ballotName ?? 'governo'}!`);
    else if (f.label.startsWith('Memória')) demands.push('Contra a violência policial');
    else if (f.label.startsWith('Clima')) demands.push('Mudança já');
  }
  return { target, factors, demands: [...new Set(demands)] };
}

function stageFor(heat: number): number {
  let s = 0;
  STREET_STAGES.forEach((st, i) => {
    if (heat >= st.min) s = i;
  });
  return s;
}

/** Votação de cassação (governador/prefeito): 2/3 da casa local. */
function removalSupport(state: GameState): { yes: number; required: number; total: number } {
  const chamber = state.congress.chambers[0];
  const total = chamber?.totalSeats ?? 0;
  if (!chamber) return { yes: 0, required: 1, total: 0 };
  const heat = street(state).heat;
  const coalition = state.congress.coalition;
  let yes = 0;
  for (const [pid, seats] of Object.entries(chamber.seats)) {
    const inBase = coalition.includes(pid);
    const rel = (state.congress.relations[pid] ?? 0) / 100;
    const p = clamp(inBase ? (heat - 85) / 30 - rel * 0.3 : 0.45 + (heat - 70) / 60 - rel * 0.4, 0, 1);
    yes += seats * p;
  }
  return { yes: Math.round(yes), required: Math.ceil((total * 2) / 3), total };
}

function openRemoval(state: GameState): void {
  const st = street(state);
  const gov = state.government;
  if (!gov) return;
  if (gov.jurisdiction.level === 'federal') {
    if (!state.legislature.impeachment || state.legislature.impeachment.stage === 'concluded')
      openImpeachment(state, true, 'Revolta popular: o país parou e a base pede a saída do governo.');
    return;
  }
  if (st.removalVote) return;
  st.removalVote = addDays(state.date, 30);
  const house = gov.jurisdiction.level === 'municipal' ? 'Câmara Municipal' : 'Assembleia Legislativa';
  publishNews(state, { headline: `${house} abre processo de cassação de ${state.candidates[state.playerId]?.ballotName ?? 'governante'}`, category: 'government', sentiment: -1, importance: 3 });
  pushAlert(state, { kind: 'removal', severity: 'danger', title: 'Processo de cassação', message: `${house} vota em 30 dias. Acalme as ruas e segure a base.`, link: 'government' });
  addHistory(state, { kind: 'crisis', title: `${house} abre processo de cassação`, importance: 3, sentiment: -1 });
}

function resolveRemoval(state: GameState): void {
  const st = street(state);
  if (!st.removalVote || st.removalVote > state.date) return;
  st.removalVote = null;
  const v = removalSupport(state);
  const removed = v.yes >= v.required;
  publishNews(state, {
    headline: removed ? `Cassado(a): ${v.yes} votos a favor (precisava de ${v.required})` : `Cassação rejeitada: ${v.yes} votos (precisava de ${v.required})`,
    category: 'government',
    sentiment: removed ? -1 : 1,
    importance: 3,
  });
  if (removed) {
    addHistory(state, { kind: 'defeat', title: 'Cassado(a) após revolta popular', importance: 3, sentiment: -1 });
    endTermLater(state);
  } else {
    addHistory(state, { kind: 'victory', title: 'Sobreviveu ao processo de cassação', importance: 2, sentiment: 1 });
  }
}

/** Fim do mandato por cassação (injetado pelo módulo de governo para evitar ciclo de importação). */
let endTermHook: ((state: GameState) => void) | null = null;
export function setRemovalHandler(fn: (state: GameState) => void): void {
  endTermHook = fn;
}
function endTermLater(state: GameState): void {
  endTermHook?.(state);
}

/** Tick mensal das ruas. */
export function processStreetMonth(state: GameState): void {
  if (!active(state)) return;
  const st = street(state);
  const { target } = streetFactors(state);
  st.heat = clamp(approach(st.heat, target, S.heatRate), 0, 100);
  if (st.reliefMonths > 0) st.reliefMonths -= 1;
  if (st.reliefMonths === 0) st.relief = 0;
  st.radicalization = Math.max(0, st.radicalization - 0.5);
  if (st.emergencyMonths > 0) {
    st.emergencyMonths -= 1;
    st.heat = Math.min(st.heat, STREET_STAGES[3].min - 1);
  }
  // Sobe ou desce no máximo um degrau por mês.
  const want = stageFor(st.heat);
  const prev = st.stage;
  st.stage = want > st.stage ? st.stage + 1 : want < st.stage ? st.stage - 1 : st.stage;
  st.monthsAtStage = st.stage === prev ? st.monthsAtStage + 1 : 0;
  const fx = S.effects[st.stage] ?? S.effects[0]!;
  const gov = state.government!;
  gov.approval = clamp(gov.approval + fx.approval, 0, 100);
  gov.politicalCapital = clamp(gov.politicalCapital + fx.capital, 0, 100);
  state.nation.legitimacy = clamp(state.nation.legitimacy + fx.legitimacy, 0, 100);
  state.economy.confidence = clamp(state.economy.confidence + fx.confidence, 0, 100);
  const scope = localScope(state);
  if (st.stage > prev) {
    const name = STREET_STAGES[st.stage]!.name;
    publishNews(state, { headline: `${name} ${scope.kind === 'country' ? 'pelo país' : `em ${scope.name}`}`, category: 'government', sentiment: -1, importance: st.stage >= 4 ? 3 : 2 });
    if (st.stage >= 2)
      pushAlert(state, { kind: 'street', severity: st.stage >= 4 ? 'danger' : 'warning', title: `Ruas: ${name}`, message: 'Veja as causas e responda no Gabinete (negociar, atender a pauta, reprimir…).', link: 'government' });
  } else if (st.stage < prev && prev >= 2) {
    publishNews(state, { headline: `Ruas mais calmas ${scope.kind === 'country' ? 'no país' : `em ${scope.name}`}: ${STREET_STAGES[st.stage]!.name.toLowerCase()}`, category: 'government', sentiment: 1, importance: 1 });
  }
  if (st.stage >= 6 && st.monthsAtStage >= S.removalAfterMonths - 1) openRemoval(state);
  resolveRemoval(state);
}

const COOLDOWN: Record<StreetResponse, number> = { speech: 30, negotiate: 60, concede: 180, repress: 60, emergency: 365 };

export interface StreetResponseView {
  id: StreetResponse;
  name: string;
  description: string;
  available: boolean;
  reason: string | null;
}

const RESPONSES: Record<StreetResponse, { name: string; description: string; minStage: number }> = {
  speech: { name: 'Pronunciamento', description: 'Fala à população em rede de rádio e TV. Efeito pequeno; melhor com boa comunicação. Custa 3 de capital.', minStage: 1 },
  negotiate: { name: 'Mesa de negociação', description: 'Recebe lideranças e abre diálogo: esfria as ruas por 3 meses. Custa 8 de capital.', minStage: 2 },
  concede: { name: 'Atender a pauta', description: 'Anuncia medidas para a pauta (custa 2% da receita do ano). Acalma por 4 meses e melhora a aprovação.', minStage: 2 },
  repress: { name: 'Reprimir', description: 'Polícia nas ruas: acalma na hora, mas radicaliza, derruba a legitimidade e pode sair pela culatra.', minStage: 2 },
  emergency: { name: 'Estado de emergência', description: 'Só o presidente. Contém as ruas por 3 meses (no máximo grandes manifestações), com alto custo de legitimidade e aprovação.', minStage: 4 },
};

export function streetResponses(state: GameState): StreetResponseView[] {
  const st = street(state);
  const gov = state.government;
  return (Object.keys(RESPONSES) as StreetResponse[]).map((id) => {
    const def = RESPONSES[id];
    let reason: string | null = null;
    if (!active(state)) reason = 'Só o chefe do Executivo responde às ruas.';
    else if (st.stage < def.minStage) reason = `Disponível a partir de "${STREET_STAGES[def.minStage]!.name}".`;
    else if (id === 'emergency' && gov?.jurisdiction.level !== 'federal') reason = 'Só o presidente decreta estado de emergência.';
    else {
      const last = st.lastUse[id];
      if (last && addDays(last, COOLDOWN[id]) > state.date) reason = `Já usado recentemente (aguarde até ${addDays(last, COOLDOWN[id]).split('-').reverse().join('/')}).`;
      else if (id === 'speech' && (gov?.politicalCapital ?? 0) < 3) reason = 'Capital político insuficiente.';
      else if (id === 'negotiate' && (gov?.politicalCapital ?? 0) < 8) reason = 'Capital político insuficiente.';
    }
    return { id, name: def.name, description: def.description, available: reason === null, reason };
  });
}

/** O jogador responde às ruas. */
export function respondToStreet(state: GameState, id: StreetResponse): ActionResult {
  const view = streetResponses(state).find((r) => r.id === id);
  if (!view) return { ok: false, message: 'Resposta inválida.' };
  if (!view.available) return { ok: false, message: view.reason ?? 'Indisponível.' };
  const st = street(state);
  const gov = state.government!;
  const player = state.candidates[state.playerId];
  const rng = new Rng(hashSeed(state.meta.seed, 'street', state.date, id));
  st.lastUse[id] = state.date;
  let message = '';
  switch (id) {
    case 'speech': {
      gov.politicalCapital -= 3;
      const comm = (player?.attributes.communication ?? 50) / 100;
      const cut = 2 + comm * 6;
      st.heat = clamp(st.heat - cut, 0, 100);
      message = `Pronunciamento feito: as ruas esfriaram um pouco (−${cut.toFixed(0)}).`;
      break;
    }
    case 'negotiate':
      gov.politicalCapital -= 8;
      st.relief = Math.max(st.relief, 15);
      st.reliefMonths = 3;
      st.heat = clamp(st.heat - 6, 0, 100);
      message = 'Mesa de negociação aberta: as ruas tendem a esfriar nos próximos 3 meses.';
      break;
    case 'concede': {
      const b = gov.budget;
      const cost = b ? (b.revenueTaxes + b.revenueOther) * 0.02 : 0;
      if (b) b.balance -= cost;
      st.relief = Math.max(st.relief, 20);
      st.reliefMonths = 4;
      st.heat = clamp(st.heat - 8, 0, 100);
      gov.approval = clamp(gov.approval + 2, 0, 100);
      message = `Pauta atendida (custo de R$ ${cost.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi): as ruas esfriam e a aprovação sobe.`;
      break;
    }
    case 'repress': {
      const backfire = st.stage >= 5 && rng.next() < 0.35;
      st.radicalization = Math.min(20, st.radicalization + 8);
      state.nation.legitimacy = clamp(state.nation.legitimacy - 3, 0, 100);
      gov.approval = clamp(gov.approval - 2, 0, 100);
      if (backfire) {
        st.heat = clamp(st.heat + 10, 0, 100);
        message = 'A repressão saiu pela culatra: imagens de violência revoltam o país e as ruas pegam fogo.';
        publishNews(state, { headline: 'Repressão violenta a manifestantes causa revolta', category: 'government', sentiment: -1, importance: 3 });
      } else {
        st.heat = clamp(st.heat - 18, 0, 100);
        message = 'As ruas foram esvaziadas à força. Funciona agora, mas radicaliza e custa legitimidade.';
        publishNews(state, { headline: 'Polícia dispersa manifestações', category: 'government', sentiment: -1, importance: 2 });
      }
      break;
    }
    case 'emergency':
      st.emergencyMonths = 3;
      state.nation.legitimacy = clamp(state.nation.legitimacy - 8, 0, 100);
      gov.approval = clamp(gov.approval - 4, 0, 100);
      message = 'Estado de emergência decretado por 3 meses.';
      publishNews(state, { headline: 'Governo decreta estado de emergência', category: 'government', sentiment: -1, importance: 3 });
      break;
  }
  return { ok: true, message };
}

export interface StreetView {
  active: boolean;
  heat: number;
  target: number;
  stage: number;
  stageName: string;
  stages: string[];
  factors: StreetFactor[];
  demands: string[];
  responses: StreetResponseView[];
  removal: { date: IsoDate; yes: number; required: number; total: number } | null;
  where: string;
  stateId: StateId | null;
}

/** Painel "Clima nas ruas". */
export function streetView(state: GameState): StreetView {
  const st = street(state);
  const f = streetFactors(state);
  const scope = localScope(state);
  const removal = st.removalVote ? { date: st.removalVote, ...removalSupport(state) } : null;
  return {
    active: active(state),
    heat: Math.round(st.heat),
    target: Math.round(f.target),
    stage: st.stage,
    stageName: STREET_STAGES[st.stage]!.name,
    stages: STREET_STAGES.map((s) => s.name),
    factors: f.factors.sort((a, b) => b.value - a.value),
    // Sem gente nas ruas, não há pauta.
    demands: st.stage >= 1 ? f.demands : [],
    responses: streetResponses(state),
    removal,
    where: scope.name,
    stateId: scope.stateId,
  };
}
