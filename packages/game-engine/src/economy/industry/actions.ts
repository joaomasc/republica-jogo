import { clamp, round } from '../../core/math';
import type { ActionResult, StateId } from '../../core/types';
import { STATES } from '../../map/states';
import type { GameState } from '../../simulation/state';
import { BUILDINGS } from './buildings.data';
import { methodInfo } from './catalog';
import { IndustryConstants as K } from './constants';
import { buildContext } from './context';
import { methodAllowed, queueProject, resourceRoom } from './simulate';
import { SECTOR_IDS, type BuildingId, type SectorId } from './types';

const fail = (message: string): ActionResult => ({ ok: false, message });

/** Esfera em que o jogador comanda obras e estatais (Executivo), ou `null`. */
function executiveScope(state: GameState): { level: 'federal' | 'estadual' | 'municipal'; stateId: StateId | null } | null {
  const gov = state.government;
  if (!gov || gov.branch !== 'executive' || !gov.budget) return null;
  return { level: gov.jurisdiction.level, stateId: gov.jurisdiction.stateId ?? null };
}

/** Motivo para não poder construir (ou `null`). Usado pela interface e pela ação. */
export function canOrderConstruction(state: GameState, stateId: StateId, buildingId: BuildingId): string | null {
  const scope = executiveScope(state);
  if (!scope) return 'Só o chefe do Executivo manda construir obras públicas.';
  if (scope.level !== 'federal' && scope.stateId !== stateId) return 'Sua esfera só pode investir no próprio estado.';
  const def = BUILDINGS[buildingId];
  if (!def.buildableBy.includes('state')) return 'O Estado não constrói este tipo de edifício.';
  const ctx = buildContext(state);
  if (ctx.M.banStateIndustry && def.sector !== 'public' && def.sector !== 'energy' && buildingId !== 'logistics')
    return 'A lei do sistema econômico proíbe o Estado de abrir empresas neste setor.';
  if (resourceRoom(state, ctx, stateId, buildingId) < 1)
    return `${STATES[stateId].name} não tem mais ${def.resource ? 'recurso natural' : 'espaço'} para este edifício.`;
  if ((state.government?.budget?.spending.industry ?? 0) <= 0)
    return 'O orçamento de investimento e fomento está zerado.';
  return null;
}

/** Custo estimado (R$ bi reais) de 1 nível de obra estatal agora. */
export function stateConstructionCost(state: GameState, buildingId: BuildingId): number {
  const ctx = buildContext(state);
  const discount = clamp(ctx.M.stateConstructionDiscount ?? 0, 0, 0.6);
  return BUILDINGS[buildingId].constructionCost * state.industry.constructionPointCost * (1 - discount) * (state.industry.gdpScale || 1);
}

/** Ordena a construção de `levels` níveis de um edifício num estado (obra estatal). */
export function orderConstruction(state: GameState, stateId: StateId, buildingId: BuildingId, levels: number): ActionResult {
  const reason = canOrderConstruction(state, stateId, buildingId);
  if (reason) return fail(reason);
  const n = Math.round(clamp(levels, K.construction.minOrderLevels, K.construction.maxOrderLevels));
  const ctx = buildContext(state);
  const room = resourceRoom(state, ctx, stateId, buildingId);
  const count = Math.max(1, Math.min(n, Math.floor(room)));
  const pc = state.industry.constructionPointCost;
  for (let i = 0; i < count; i++) queueProject(state, stateId, buildingId, 'state', 'player', pc);
  const unitCost = stateConstructionCost(state, buildingId);
  const monthly = Math.max(1e-6, (state.government?.budget?.spending.industry ?? 0) / 12);
  const months = Math.ceil((unitCost * count) / monthly);
  const def = BUILDINGS[buildingId];
  return {
    ok: true,
    message: `Obra encomendada: ${count} nível(is) de ${def.name} em ${STATES[stateId].name}.`,
    details: [
      `Custo estimado: R$ ${round(unitCost * count, 1).toLocaleString('pt-BR')} bi`,
      `Prazo com o orçamento de investimento atual: ~${months} mês(es)`,
    ],
  };
}

/** Cancela uma obra estatal do jogador (o que não foi gasto volta ao orçamento). */
export function cancelConstruction(state: GameState, projectId: string): ActionResult {
  const p = state.industry.queue.find((q) => q.id === projectId);
  if (!p) return fail('Obra não encontrada.');
  if (p.owner !== 'state' || p.origin !== 'player') return fail('Só é possível cancelar obras encomendadas por você.');
  state.industry.queue = state.industry.queue.filter((q) => q.id !== projectId);
  return { ok: true, message: `Obra de ${BUILDINGS[p.buildingId].name} cancelada.` };
}

/** Troca o método de produção de um edifício num estado (fatias estatais, ou tudo na planificação). */
export function setProductionMethod(state: GameState, stateId: StateId, buildingId: BuildingId, methodId: string): ActionResult {
  const scope = executiveScope(state);
  if (!scope) return fail('Só o Executivo define a operação das estatais.');
  if (scope.level !== 'federal' && scope.stateId !== stateId) return fail('Fora da sua esfera de governo.');
  const bs = state.industry.buildings[stateId][buildingId];
  if (!bs || bs.level <= 0) return fail('Não há este edifício no estado.');
  const planned = buildContext(state).M.banPrivateInvestment === true;
  if (!planned && bs.ownership.state < 0.5) return fail('O Estado só define o método onde é sócio majoritário.');
  const blocked = methodAllowed(state, buildingId, methodId);
  if (blocked) return fail(blocked);
  bs.methodId = methodId;
  const info = methodInfo(buildingId, methodId);
  return { ok: true, message: `${BUILDINGS[buildingId].name} (${STATES[stateId].name}): ${info.method.name}.` };
}

/** Define (ou remove, com `null`) os pesos setoriais do plano de investimento estatal. */
export function setInvestmentPlan(state: GameState, weights: Partial<Record<SectorId, number>> | null): ActionResult {
  const scope = executiveScope(state);
  if (!scope || scope.level !== 'federal') return fail('Só o Executivo federal define o plano nacional de investimentos.');
  if (weights === null) {
    state.executive.plan = null;
    return { ok: true, message: 'Plano de investimentos encerrado: as estatais voltam a decidir sozinhas.' };
  }
  const clean: Partial<Record<SectorId, number>> = {};
  let total = 0;
  for (const s of SECTOR_IDS) {
    const w = Math.max(0, weights[s] ?? 0);
    if (w > 0 && s !== 'public' && s !== 'informal') {
      clean[s] = w;
      total += w;
    }
  }
  if (total <= 0) return fail('Dê peso a pelo menos um setor.');
  for (const s of Object.keys(clean) as SectorId[]) clean[s] = round((clean[s] ?? 0) / total, 3);
  state.executive.plan = { weights: clean, since: state.date };
  return { ok: true, message: 'Plano nacional de investimentos atualizado.' };
}
