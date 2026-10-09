import { diffMonths } from '../core/date';
import { clamp, round } from '../core/math';
import { STATE_IDS } from '../core/types';
import { BUILDINGS } from '../economy/industry/buildings.data';
import { GOODS } from '../economy/industry/goods.data';
import {
  BUILDING_IDS,
  GOOD_CATEGORIES,
  GOOD_IDS,
  SECTOR_IDS,
  type SectorId,
} from '../economy/industry/types';
import { federalOption } from '../laws/federal';
import type { GameState } from '../simulation/state';
import { existingBuilding, sliceValue } from './assets';
import { ExecutiveConstants as C } from './constants';
import { DECREE_LIST } from './decrees.data';
import {
  decreeBlockReason,
  decreeLegalRisk,
  decreeTargetLabel,
  decreeValueLabel,
  isFederalExecutive,
} from './executive';
import { GOOD_CATEGORY_LABELS, SECTOR_LABELS, stateLabel } from './labels';
import type { DecreeKind, DecreeTarget } from './types';

export interface DecreeTargetOption {
  /** Valor a enviar em `exec/decree` (`target`). */
  id: string;
  label: string;
  detail?: string;
}

/** Um ato do Executivo como a interface o apresenta. */
export interface DecreeOptionView {
  kind: DecreeKind;
  name: string;
  description: string;
  icon: string;
  targetKind: DecreeTarget;
  /** Alvos válidos (vazio para atos sem alvo). */
  targets: DecreeTargetOption[];
  /** Faixa do valor (null se o ato não tem valor). `default` já considera o contexto (ex.: Selic atual). */
  value: { min: number; max: number; step: number; default: number; unit: string } | null;
  cost: number;
  durationMonths: number | null;
  /** Risco jurídico base (chance mensal de suspensão pelo STF). */
  legalRisk: number;
  instant: boolean;
  /** O ato pode ser usado agora (papel, lei, alvos disponíveis, limite). */
  available: boolean;
  /** Capital político suficiente. */
  affordable: boolean;
  /** Motivo da indisponibilidade ou do custo proibitivo. */
  reason?: string;
  /** Decretos ativos deste tipo. */
  activeCount: number;
}

export interface ActiveDecreeView {
  id: string;
  kind: DecreeKind;
  name: string;
  icon: string;
  label: string;
  targetLabel: string;
  valueLabel: string;
  issuedOn: string;
  expiresOn: string | null;
  /** Meses restantes (null = até revogar). */
  monthsLeft: number | null;
  suspended: boolean;
  /** Chance mensal de suspensão pelo STF agora (0..1). */
  legalRisk: number;
  riskLabel: 'nenhum' | 'baixo' | 'médio' | 'alto';
}

export interface PlanSectorView {
  sector: SectorId;
  label: string;
  /** Peso normalizado (soma 1) entre os setores com peso. */
  weight: number;
  plannable: boolean;
}

export interface PlanView {
  /** Há plano de investimento estatal definido. */
  defined: boolean;
  /** As leis vigentes fazem o fundo estatal construir seguindo o plano. */
  followedByLaws: boolean;
  since: string | null;
  sectors: PlanSectorView[];
  /** Fundo do plano (R$ bi). */
  statePool: number;
}

export function decreeRiskLabel(risk: number): ActiveDecreeView['riskLabel'] {
  if (risk <= 0) return 'nenhum';
  return risk >= 0.1 ? 'alto' : risk >= 0.03 ? 'médio' : 'baixo';
}

function targetsFor(state: GameState, kind: DecreeKind, target: DecreeTarget): DecreeTargetOption[] {
  switch (target) {
    case 'none':
      return [];
    case 'good':
      return GOOD_IDS.filter((g) => kind !== 'export_ban' || GOODS[g].tradeable).map((g) => ({
        id: g,
        label: GOODS[g].name,
        detail: GOOD_CATEGORY_LABELS[GOODS[g].category],
      }));
    case 'category': {
      const list: DecreeTargetOption[] = GOOD_CATEGORIES.map((c) => ({
        id: c,
        label: GOOD_CATEGORY_LABELS[c],
      }));
      return kind === 'tariff' ? [{ id: 'all', label: 'Todas as categorias' }, ...list] : list;
    }
    case 'sector':
      return SECTOR_IDS.filter((s) => s !== 'public' && s !== 'informal').map((s) => ({
        id: s,
        label: SECTOR_LABELS[s],
      }));
    case 'building_state': {
      const owner = kind === 'expropriation' ? 'private' : 'state';
      const rows: (DecreeTargetOption & { value: number })[] = [];
      for (const stateId of STATE_IDS) {
        for (const buildingId of BUILDING_IDS) {
          const sector = BUILDINGS[buildingId].sector;
          if (sector === 'public' || sector === 'informal') continue;
          const bs = existingBuilding(state, stateId, buildingId);
          if (!bs || bs.ownership[owner] < C.minSlice) continue;
          const value = sliceValue(state, stateId, buildingId, owner);
          rows.push({
            id: `${stateId}:${buildingId}`,
            label: `${BUILDINGS[buildingId].name} em ${stateLabel(stateId)}`,
            detail: `${owner === 'private' ? 'Fatia privada' : 'Fatia estatal'} ${Math.round(bs.ownership[owner] * 100)}% · valor R$ ${round(value, 1).toLocaleString('pt-BR')} bi`,
            value,
          });
        }
      }
      rows.sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
      return rows.slice(0, C.maxBuildingTargets).map(({ id, label, detail }) => ({ id, label, ...(detail ? { detail } : {}) }));
    }
  }
}

/** Todos os atos do Executivo com disponibilidade (e motivo), alvos válidos, faixa de valor e custo. */
export function decreeOptions(state: GameState): DecreeOptionView[] {
  const gov = state.government;
  const capital = gov?.politicalCapital ?? 0;
  return DECREE_LIST.map((def) => {
    const targets = targetsFor(state, def.kind, def.target);
    const activeCount = state.executive.decrees.filter((d) => d.kind === def.kind).length;
    let blocked: string | undefined = decreeBlockReason(state, def) ?? undefined;
    if (
      !blocked &&
      !def.instant &&
      def.kind !== 'selic' &&
      state.executive.decrees.length >= C.maxActiveDecrees
    )
      blocked = `Limite de ${C.maxActiveDecrees} decretos ativos atingido.`;
    if (!blocked && def.target === 'building_state' && targets.length === 0)
      blocked =
        def.kind === 'expropriation'
          ? 'Não há fatia privada relevante a desapropriar.'
          : 'Não há fatia estatal relevante a privatizar.';
    const affordable = capital >= def.politicalCost;
    const reason =
      blocked ??
      (affordable ? undefined : `Capital político insuficiente (custa ${def.politicalCost}).`);
    let value: DecreeOptionView['value'] = null;
    if (def.value) {
      value = { ...def.value };
      if (def.kind === 'selic')
        value.default = clamp(
          round(Math.round(state.economy.interestRate / def.value.step) * def.value.step, 4),
          def.value.min,
          def.value.max,
        );
    }
    const view: DecreeOptionView = {
      kind: def.kind,
      name: def.name,
      description: def.description,
      icon: def.icon,
      targetKind: def.target,
      targets,
      value,
      cost: def.politicalCost,
      durationMonths: def.durationMonths,
      legalRisk: def.legalRisk,
      instant: !!def.instant,
      available: blocked === undefined,
      affordable,
      activeCount,
    };
    if (reason) view.reason = reason;
    return view;
  });
}

/** Decretos em vigor (e suspensos) com rótulos, prazo e risco jurídico. */
export function activeDecreesView(state: GameState): ActiveDecreeView[] {
  return state.executive.decrees.map((d) => {
    const risk = isFederalExecutive(state) ? decreeLegalRisk(state, d) : 0;
    return {
      id: d.id,
      kind: d.kind,
      name: DECREE_LIST.find((x) => x.kind === d.kind)?.name ?? d.kind,
      icon: DECREE_LIST.find((x) => x.kind === d.kind)?.icon ?? 'scroll',
      label: d.label,
      targetLabel: decreeTargetLabel(d.kind, d.target),
      valueLabel: decreeValueLabel(d.kind, d.value),
      issuedOn: d.issuedOn,
      expiresOn: d.expiresOn,
      monthsLeft: d.expiresOn ? Math.max(0, diffMonths(state.date, d.expiresOn)) : null,
      suspended: d.suspended,
      legalRisk: risk,
      riskLabel: decreeRiskLabel(risk),
    };
  });
}

/** Plano de investimento estatal (pesos por setor normalizados). */
export function planView(state: GameState): PlanView {
  const plan = state.executive.plan;
  const raw = plan?.weights ?? {};
  const total = SECTOR_IDS.reduce((acc, s) => acc + Math.max(0, raw[s] ?? 0), 0);
  const system = federalOption(state, 'economic_system');
  const industrial = federalOption(state, 'industrial_policy');
  return {
    defined: plan !== null,
    followedByLaws:
      system === 'econ_developmental' || system === 'econ_planned' || industrial === 'ind_national_plan',
    since: plan?.since ?? null,
    sectors: SECTOR_IDS.map((sector) => ({
      sector,
      label: SECTOR_LABELS[sector],
      weight: total > 0 ? Math.max(0, raw[sector] ?? 0) / total : 0,
      plannable: sector !== 'informal',
    })),
    statePool: state.industry.statePool,
  };
}
