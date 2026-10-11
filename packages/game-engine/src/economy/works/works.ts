import { addHistory } from '../../history/history';
import { clamp, round } from '../../core/math';
import { hashSeed, Rng } from '../../core/rng';
import { STATE_IDS, type ActionResult, type IsoDate, type StateId } from '../../core/types';
import type { OfficeLevel } from '../../election/offices';
import { stateOfName } from '../../map/stateNames';
import { cityOf } from '../../map/cities';
import { STATES } from '../../map/states';
import { pushAlert } from '../../media/alerts';
import { publishNews } from '../../media/news';
import type { GameState } from '../../simulation/state';
import { BUILDINGS } from '../industry/buildings.data';
import { buildContext } from '../industry/context';
import { expectedReturn, queueProject, resourceRoom } from '../industry/simulate';
import { BUILDING_IDS } from '../industry/types';
import type { BudgetCategory } from '../types';
import { getWorkType, PUBLIC_WORK_TYPES, WORK_SIZES, type PublicWorkType, type WorkSize } from './works.data';

/**
 * Obras públicas por esfera (prefeitura, governo estadual, governo federal):
 * - pagas pelo orçamento da esfera ao longo do prazo;
 * - empregam trabalhadores da construção na região enquanto andam (com efeito multiplicador);
 * - ao inaugurar, deixam empregos permanentes, melhoram o serviço público da esfera e, no caso de
 *   distritos/polos industriais, atraem empresas privadas para o estado;
 * - os governos controlados pelo computador também fazem obras pelo país.
 */

export interface PublicWork {
  id: string;
  typeId: string;
  size: WorkSize;
  level: OfficeLevel;
  stateId: StateId;
  /** Obra do governo do jogador. */
  player: boolean;
  /** Quem toca a obra (ex.: "Prefeitura de Salvador"). */
  sponsor: string;
  cost: number;
  months: number;
  /** Meses de execução que faltam. */
  monthsLeft: number;
  startedOn: IsoDate;
  status: 'running' | 'stalled' | 'done';
  doneOn?: IsoDate;
  /** Empregos na obra enquanto ela anda. */
  tempJobs: number;
  /** Empregos permanentes depois de inaugurada. */
  permanentJobs: number;
}

export const WorksConstants = {
  /** Empregos diretos na construção por R$ 1 bi/ano gasto na obra. */
  jobsPerBiYear: 12000,
  /** Empregos indiretos (comércio, serviços, fornecedores) por emprego direto. */
  localMultiplier: 0.5,
  /** Fração das vagas preenchida por quem já trabalhava na informalidade (não reduz o desemprego aberto). */
  informalShare: 0.25,
  /** Gasto anual máximo comprometido com obras (fração da receita da esfera). */
  maxCommitment: 0.3,
  /** Abaixo deste saldo (fração da receita anual), as obras param por falta de verba. */
  stallBalance: -0.35,
  /** Teto do ganho de qualidade de serviço vindo de obras. */
  maxServiceBonus: 0.4,
  /** Obras de governos NPC ativas no país, no máximo. */
  maxNpcWorks: 70,
  /** Inaugurações guardadas no histórico. */
  keepDone: 120,
};
const W = WorksConstants;

function works(state: GameState): PublicWork[] {
  state.industry.works ??= [];
  return state.industry.works as PublicWork[];
}

/** Esfera do Executivo do jogador (ou null se não é chefe de Executivo). */
export function playerWorksScope(
  state: GameState,
): { level: OfficeLevel; stateId: StateId | null; cityId?: string } | null {
  const gov = state.government;
  if (!gov || gov.branch !== 'executive' || state.phase !== 'governing') return null;
  return {
    level: gov.jurisdiction.level,
    stateId: (gov.jurisdiction.stateId as StateId | undefined) ?? null,
    ...(gov.jurisdiction.cityId ? { cityId: gov.jurisdiction.cityId } : {}),
  };
}

export function sponsorLabel(level: OfficeLevel, stateId: StateId, cityId?: string): string {
  if (level === 'municipal') return `Prefeitura de ${cityOf(stateId, cityId).name}`;
  if (level === 'estadual') return `Governo ${stateOfName(stateId)}`;
  return 'Governo Federal';
}

function makeWork(state: GameState, type: PublicWorkType, size: WorkSize, level: OfficeLevel, stateId: StateId, player: boolean, cityId?: string): PublicWork {
  const sz = WORK_SIZES[size];
  const cost = round(type.cost * sz.cost, 2);
  const months = Math.max(4, Math.round(type.months * sz.months));
  const perYear = cost / (months / 12);
  state.industry.nextProjectId = (state.industry.nextProjectId ?? 0) + 1;
  return {
    id: `op_${state.industry.nextProjectId.toString(36)}`,
    typeId: type.id,
    size,
    level,
    stateId,
    player,
    sponsor: sponsorLabel(level, stateId, cityId),
    cost,
    months,
    monthsLeft: months,
    startedOn: state.date,
    status: 'running',
    tempJobs: Math.round(perYear * W.jobsPerBiYear),
    permanentJobs: Math.round(cost * type.permanentJobsPerBi),
  };
}

/** Gasto anual já comprometido com obras do jogador (R$ bi/ano). */
export function playerWorksAnnualCost(state: GameState): number {
  let total = 0;
  for (const w of works(state)) if (w.player && w.status !== 'done') total += w.cost / (w.months / 12);
  return total;
}

export interface WorkOption {
  typeId: string;
  name: string;
  icon: string;
  description: string;
  category: BudgetCategory;
  sizes: { size: WorkSize; name: string; cost: number; months: number; tempJobs: number; permanentJobs: number }[];
  attractsInvestment: number;
  blocked: string | null;
}

/** Obras que o jogador pode iniciar agora (catálogo da sua esfera), com custo, prazo e empregos. */
export function workOptions(state: GameState): WorkOption[] {
  const scope = playerWorksScope(state);
  if (!scope) return [];
  const b = state.government?.budget;
  const revenue = b ? b.revenueTaxes + b.revenueOther : 0;
  const room = revenue * W.maxCommitment - playerWorksAnnualCost(state);
  return PUBLIC_WORK_TYPES.filter((t) => t.levels.includes(scope.level)).map((t) => {
    const sizes = (Object.keys(WORK_SIZES) as WorkSize[]).map((size) => {
      const sz = WORK_SIZES[size];
      const cost = round(t.cost * sz.cost, 2);
      const months = Math.max(4, Math.round(t.months * sz.months));
      return { size, name: sz.name, cost, months, tempJobs: Math.round((cost / (months / 12)) * W.jobsPerBiYear), permanentJobs: Math.round(cost * t.permanentJobsPerBi) };
    });
    const smallest = sizes[0]!;
    const blocked = room < smallest.cost / (smallest.months / 12) ? 'Capacidade de investimento esgotada: conclua obras ou aumente a receita.' : null;
    return { typeId: t.id, name: t.name, icon: t.icon, description: t.description, category: t.category, sizes, attractsInvestment: t.attractsInvestment ?? 0, blocked };
  });
}

/** Inicia uma obra pública do governo do jogador. */
export function startPublicWork(state: GameState, typeId: string, size: WorkSize, stateIdArg?: StateId): ActionResult {
  const scope = playerWorksScope(state);
  if (!scope) return { ok: false, message: 'Só o chefe do Executivo (prefeito, governador ou presidente) inicia obras públicas.' };
  const type = getWorkType(typeId);
  if (!type || !type.levels.includes(scope.level)) return { ok: false, message: 'Esta obra não é da sua esfera de governo.' };
  if (!WORK_SIZES[size]) return { ok: false, message: 'Porte inválido.' };
  const stateId = scope.level === 'federal' ? (stateIdArg ?? 'DF') : scope.stateId;
  if (!stateId || !STATE_IDS.includes(stateId)) return { ok: false, message: 'Escolha onde construir.' };
  const b = state.government?.budget;
  if (!b) return { ok: false, message: 'Orçamento indisponível.' };
  const w = makeWork(state, type, size, scope.level, stateId, true, scope.cityId);
  const revenue = b.revenueTaxes + b.revenueOther;
  if (playerWorksAnnualCost(state) + w.cost / (w.months / 12) > revenue * W.maxCommitment)
    return { ok: false, message: `Capacidade de investimento esgotada (até ${Math.round(W.maxCommitment * 100)}% da receita por ano em obras).` };
  works(state).push(w);
  publishNews(state, { headline: `${w.sponsor} inicia obra: ${type.name} (${STATES[stateId].name})`, category: 'government', sentiment: 1, importance: 1 });
  return {
    ok: true,
    message: `Obra iniciada: ${type.name} (${WORK_SIZES[size].name.toLowerCase()}).`,
    details: [
      `Custo: R$ ${w.cost.toLocaleString('pt-BR')} bi em ${w.months} meses`,
      `Empregos na obra: ${w.tempJobs.toLocaleString('pt-BR')} · permanentes: ${w.permanentJobs.toLocaleString('pt-BR')}`,
    ],
  };
}

/** Cancela uma obra do jogador (o que já foi gasto não volta). */
export function cancelPublicWork(state: GameState, id: string): ActionResult {
  const list = works(state);
  const w = list.find((x) => x.id === id);
  if (!w || !w.player || w.status === 'done') return { ok: false, message: 'Obra não encontrada.' };
  state.industry.works = list.filter((x) => x.id !== id);
  const gov = state.government;
  if (gov) gov.approval = clamp(gov.approval - 1, 0, 100);
  publishNews(state, { headline: `${w.sponsor} abandona obra de ${getWorkType(w.typeId)?.name ?? 'infraestrutura'}`, category: 'government', sentiment: -1, importance: 1 });
  return { ok: true, message: 'Obra cancelada. O dinheiro já gasto não volta e a população não gostou.' };
}

/** Chave da esfera que recebe o ganho de serviço (ex.: "municipal:BA"). */
function serviceKey(level: OfficeLevel, stateId: StateId): string {
  return level === 'federal' ? 'federal' : `${level}:${stateId}`;
}

/** Ganho de qualidade do serviço vindo das obras concluídas na esfera do jogador. */
export function worksServiceBonus(state: GameState, category: BudgetCategory): number {
  const gov = state.government;
  if (!gov) return 0;
  const key = serviceKey(gov.jurisdiction.level, (gov.jurisdiction.stateId as StateId | undefined) ?? 'DF');
  return state.industry.worksService?.[key]?.[category] ?? 0;
}

function inaugurate(state: GameState, w: PublicWork, rng: Rng): void {
  const type = getWorkType(w.typeId);
  if (!type) return;
  w.status = 'done';
  w.doneOn = state.date;
  const ind = state.industry;
  if (w.player) {
    ind.worksPermanent ??= {};
    ind.worksPermanent[w.stateId] = (ind.worksPermanent[w.stateId] ?? 0) + w.permanentJobs;
  }
  const impact = WORK_SIZES[w.size].impact;
  if (type.serviceGain > 0) {
    ind.worksService ??= {};
    const key = serviceKey(w.level, w.stateId);
    const cur = ind.worksService[key] ?? {};
    cur[type.category] = clamp((cur[type.category] ?? 0) + type.serviceGain * impact, 0, W.maxServiceBonus);
    ind.worksService[key] = cur;
  }
  // Distritos e polos industriais: empresas privadas começam a se instalar.
  const attract = Math.round((type.attractsInvestment ?? 0) * impact);
  if (attract > 0) {
    const ctx = buildContext(state);
    const pc = ind.constructionPointCost;
    const ranked = BUILDING_IDS.filter((id) => {
      const def = BUILDINGS[id];
      return def.buildableBy.includes('private') && def.sector !== 'public' && def.sector !== 'informal' && resourceRoom(state, ctx, w.stateId, id) >= 1;
    })
      .map((id) => ({ id, r: expectedReturn(state, ctx, w.stateId, id, pc) + rng.next() * 0.02 }))
      .sort((a, b) => b.r - a.r)
      .slice(0, 4);
    for (let i = 0; i < attract && ranked.length > 0; i++) queueProject(state, w.stateId, ranked[i % ranked.length]!.id, 'private', 'market', pc);
  }
  const name = type.name;
  if (w.player) {
    const gov = state.government;
    if (gov) gov.approval = clamp(gov.approval + 1 + impact, 0, 100);
    addHistory(state, { kind: 'reform', title: `Inaugurou: ${name}`, description: `${STATES[w.stateId].name} — R$ ${w.cost.toLocaleString('pt-BR')} bi, ${w.permanentJobs.toLocaleString('pt-BR')} empregos permanentes.`, importance: impact >= 2 ? 2 : 1, sentiment: 1, tags: [type.issue] });
    pushAlert(state, { kind: 'work_done', severity: 'info', title: 'Obra inaugurada', message: `${name} em ${STATES[w.stateId].name}.${attract > 0 ? ` ${attract} empresa(s) começam a se instalar.` : ''}`, link: 'industria' });
  }
  publishNews(state, { headline: `${w.sponsor} inaugura ${name.toLowerCase()} em ${STATES[w.stateId].name}`, category: 'government', sentiment: w.player ? 1 : 0, importance: w.player ? 2 : 1 });
}

/** Governos NPC (prefeituras, estados, União) também tocam obras pelo país. */
function npcWorks(state: GameState, rng: Rng): void {
  const list = works(state);
  const active = list.filter((w) => !w.player && w.status !== 'done').length;
  if (active >= W.maxNpcWorks) return;
  const scope = playerWorksScope(state);
  const gov = state.government;
  const playerLevel = gov?.branch === 'executive' ? gov.jurisdiction.level : null;
  const playerState = (gov?.jurisdiction.stateId as StateId | undefined) ?? null;
  const tries: { level: OfficeLevel; chance: number }[] = [
    { level: 'federal', chance: 0.25 },
    { level: 'estadual', chance: 0.6 },
    { level: 'municipal', chance: 0.5 },
  ];
  for (const t of tries) {
    if (rng.next() > t.chance) continue;
    const stateId = rng.pick([...STATE_IDS]);
    // A esfera do próprio jogador é ele quem decide.
    if (scope && playerLevel === t.level && (t.level === 'federal' || playerState === stateId)) continue;
    const types = PUBLIC_WORK_TYPES.filter((x) => x.levels.includes(t.level));
    const type = rng.pick(types);
    const size = rng.pick(['small', 'small', 'medium', 'medium', 'large'] as WorkSize[]);
    list.push(makeWork(state, type, size, t.level, stateId, false));
  }
}

/**
 * Tick mensal: avança as obras, paga as do jogador, para as obras sem verba, inaugura as prontas,
 * atualiza os empregos de obra por estado e cria obras dos governos NPC.
 */
export function processPublicWorksMonth(state: GameState): void {
  if (!state.industry) return;
  const rng = new Rng(hashSeed(state.meta.seed, 'works', state.date));
  const list = works(state);
  const b = state.government?.budget;
  const revenue = b ? b.revenueTaxes + b.revenueOther : 0;
  const broke = !!b && b.balance < W.stallBalance * revenue;
  const jobs = {} as Record<StateId, number>;
  for (const w of list) {
    if (w.status === 'done') continue;
    if (w.player && broke) {
      if (w.status !== 'stalled') {
        w.status = 'stalled';
        publishNews(state, { headline: `Falta de verba paralisa obra de ${getWorkType(w.typeId)?.name.toLowerCase() ?? 'infraestrutura'}`, category: 'government', sentiment: -1, importance: 1 });
      }
      continue;
    }
    w.status = 'running';
    if (w.player && b) b.balance -= w.cost / w.months;
    // Só as obras do jogador mexem no emprego: as dos governos NPC já fazem parte do "normal".
    if (w.player) jobs[w.stateId] = (jobs[w.stateId] ?? 0) + w.tempJobs;
    w.monthsLeft -= 1;
    if (w.monthsLeft <= 0) inaugurate(state, w, rng);
  }
  // Fábricas e empresas que o jogador mandou construir também empregam durante a obra.
  const gdpScale = state.industry.gdpScale || 1;
  for (const p of state.industry.queue) {
    if (p.origin !== 'player') continue;
    jobs[p.stateId] = (jobs[p.stateId] ?? 0) + Math.round(p.estimatedCost * gdpScale * W.jobsPerBiYear * 0.25);
  }
  state.industry.worksJobs = jobs;
  npcWorks(state, rng);
  // Mantém só as inaugurações recentes.
  const done = list.filter((w) => w.status === 'done');
  if (done.length > W.keepDone) {
    const cut = new Set(done.slice(0, done.length - W.keepDone).map((w) => w.id));
    state.industry.works = list.filter((w) => !cut.has(w.id));
  }
}

/** Efeito das obras sobre os desempregados de um estado (pessoas a menos desempregadas). */
export function worksUnemploymentRelief(state: GameState, stateId: StateId): number {
  const ind = state.industry;
  const direct = (ind.worksJobs?.[stateId] ?? 0) + (ind.worksPermanent?.[stateId] ?? 0);
  return direct * (1 + W.localMultiplier) * (1 - W.informalShare);
}

export interface WorkView {
  id: string;
  name: string;
  icon: string;
  size: string;
  sponsor: string;
  stateId: StateId;
  stateName: string;
  player: boolean;
  status: PublicWork['status'];
  progress: number;
  monthsLeft: number;
  cost: number;
  tempJobs: number;
  permanentJobs: number;
  level: OfficeLevel;
  doneOn: IsoDate | null;
}

function view(w: PublicWork): WorkView {
  const type = getWorkType(w.typeId);
  return {
    id: w.id,
    name: type?.name ?? w.typeId,
    icon: type?.icon ?? 'construction',
    size: WORK_SIZES[w.size].name,
    sponsor: w.sponsor,
    stateId: w.stateId,
    stateName: STATES[w.stateId].name,
    player: w.player,
    status: w.status,
    progress: clamp(1 - w.monthsLeft / Math.max(1, w.months), 0, 1),
    monthsLeft: Math.max(0, w.monthsLeft),
    cost: w.cost,
    tempJobs: w.tempJobs,
    permanentJobs: w.permanentJobs,
    level: w.level,
    doneOn: w.doneOn ?? null,
  };
}

/** Obras separadas por escopo: as do jogador, as da cidade/estado dele e as do país. */
export function worksOverview(state: GameState): {
  mine: WorkView[];
  local: WorkView[];
  national: WorkView[];
  done: WorkView[];
  scopeLabel: string;
  annualCommitment: number;
  maxCommitment: number;
} {
  const list = works(state);
  const gov = state.government;
  const stateId = (gov?.jurisdiction.stateId as StateId | undefined) ?? null;
  const level = gov?.jurisdiction.level ?? 'federal';
  const active = list.filter((w) => w.status !== 'done');
  const b = gov?.budget;
  return {
    mine: active.filter((w) => w.player).map(view),
    local: stateId ? active.filter((w) => !w.player && w.stateId === stateId).map(view) : [],
    national: active.filter((w) => !w.player).map(view),
    done: list.filter((w) => w.status === 'done').slice(-20).reverse().map(view),
    scopeLabel: !stateId || level === 'federal' ? 'Brasil' : level === 'municipal' ? cityOf(stateId, gov?.jurisdiction.cityId).name : STATES[stateId].name,
    annualCommitment: playerWorksAnnualCost(state),
    maxCommitment: b ? (b.revenueTaxes + b.revenueOther) * W.maxCommitment : 0,
  };
}

/** Empregos gerados por obras num estado agora (diretos na obra + permanentes já inaugurados). */
export function worksJobsIn(state: GameState, stateId: StateId): { temp: number; permanent: number } {
  return { temp: state.industry.worksJobs?.[stateId] ?? 0, permanent: state.industry.worksPermanent?.[stateId] ?? 0 };
}

/** Meses até a próxima inauguração do jogador (para o painel). */
export function nextInauguration(state: GameState): number | null {
  const mine = works(state).filter((w) => w.player && w.status !== 'done');
  if (mine.length === 0) return null;
  return Math.min(...mine.map((w) => w.monthsLeft));
}

