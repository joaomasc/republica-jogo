import type {
  BuildingId,
  EconomyModifiers,
  GoodCategory,
  GoodId,
  SectorId,
} from '../economy/industry/types';
import type { PopTypeId } from '../population/popTypes';
import type { GameState } from '../simulation/state';
import { federalLaws, localLaws } from './federal';
import { getLawOption } from './laws.data';
import type { LawsState } from './types';

/** Campos que se MULTIPLICAM (o neutro é 1). */
const MULT_KEYS = [
  'privateInvestmentMult',
  'foreignInvestmentMult',
  'tradeOpenness',
  'laborFlexibility',
  'wageMult',
  'techRate',
  'resourceExpansion',
] as const;

/** Campos que se SOMAM (o neutro é 0). */
const SUM_KEYS = [
  'reinvestment',
  'stateConstructionDiscount',
  'nationalizationRate',
  'cooperativizationRate',
  'privatizationRate',
  'expropriationRate',
  'profitSharing',
  'informality',
  'incomeTax',
  'corporateTax',
  'consumptionTax',
  'dividendTax',
  'wealthTax',
  'tariff',
  'exportTax',
  'productivity',
  'interestRateOffset',
  'landReform',
  'resourceStateShare',
  'pollutionPenalty',
] as const;

const BOOL_KEYS = [
  'banPrivateInvestment',
  'banStateIndustry',
  'newPrivateAsCooperative',
  'priceControls',
  'emergency',
] as const;

type SumRecordKey =
  | 'consumptionTaxByCategory'
  | 'tariffByCategory'
  | 'productivityBySector'
  | 'creditSubsidy'
  | 'transfers'
  | 'subsidies';

const SUM_RECORD_KEYS: SumRecordKey[] = [
  'consumptionTaxByCategory',
  'tariffByCategory',
  'productivityBySector',
  'creditSubsidy',
  'transfers',
  'subsidies',
];

function addRecord(
  target: Partial<Record<string, number>>,
  source: Partial<Record<string, number>>,
  weight: number,
): void {
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined) continue;
    target[k] = (target[k] ?? 0) + v * weight;
  }
}

/**
 * Acumula `source` em `target` com a força `strength` (0..1). Regras:
 * somas ponderadas; multiplicadores interpolados (1 + (v−1)·força); piso salarial pelo maior valor;
 * booleanos por OU (valem a partir de força 0,5); `stateShareFloor` pelo maior valor por chave;
 * `centralBank` é sobrescrito; listas (`exportBans`, `frozenGoods`) são unidas.
 */
export function mergeModifiers(
  target: EconomyModifiers,
  source: EconomyModifiers,
  strength = 1,
): EconomyModifiers {
  const s = Math.max(0, Math.min(1, strength));
  for (const key of SUM_KEYS) {
    const v = source[key];
    if (v !== undefined) target[key] = (target[key] ?? 0) + v * s;
  }
  for (const key of MULT_KEYS) {
    const v = source[key];
    if (v !== undefined) target[key] = (target[key] ?? 1) * (1 + (v - 1) * s);
  }
  for (const key of BOOL_KEYS) {
    if (source[key] && s >= 0.5) target[key] = true;
  }
  if (source.minimumWage !== undefined)
    target.minimumWage = Math.max(
      target.minimumWage ?? 0,
      source.minimumWage * (0.7 + 0.3 * s),
    );
  for (const key of SUM_RECORD_KEYS) {
    const rec = source[key];
    if (!rec) continue;
    const out = (target[key] ?? {}) as Partial<Record<string, number>>;
    addRecord(out, rec as Partial<Record<string, number>>, s);
    (target as Record<SumRecordKey, unknown>)[key] = out;
  }
  if (source.stateShareFloor) {
    const out: Partial<Record<BuildingId, number>> = { ...(target.stateShareFloor ?? {}) };
    for (const [k, v] of Object.entries(source.stateShareFloor) as [BuildingId, number][])
      out[k] = Math.max(out[k] ?? 0, v * s);
    target.stateShareFloor = out;
  }
  if (source.centralBank) target.centralBank = source.centralBank;
  if (source.exportBans?.length)
    target.exportBans = [...new Set([...(target.exportBans ?? []), ...source.exportBans])];
  if (source.frozenGoods?.length)
    target.frozenGoods = [...new Set([...(target.frozenGoods ?? []), ...source.frozenGoods])];
  return target;
}

function lawbookModifiers(book: LawsState): EconomyModifiers {
  const out: EconomyModifiers = {};
  for (const [categoryId, optionId] of Object.entries(book.enacted)) {
    const option = getLawOption(categoryId, optionId);
    if (!option?.modifiers) continue;
    mergeModifiers(out, option.modifiers, book.strength[categoryId] ?? 1);
  }
  return out;
}

/** Modificadores dos decretos ativos (não suspensos) do Executivo federal. */
export function decreeModifiers(state: GameState): EconomyModifiers {
  const out: EconomyModifiers = {};
  for (const d of state.executive.decrees) {
    if (d.suspended) continue;
    const value = d.value ?? 0;
    switch (d.kind) {
      case 'tariff':
        if (d.target === 'all' || d.target === null) mergeModifiers(out, { tariff: value });
        else
          mergeModifiers(out, {
            tariffByCategory: { [d.target as GoodCategory]: value },
          });
        break;
      case 'ipi':
        mergeModifiers(out, {
          consumptionTaxByCategory: { [d.target as GoodCategory]: value },
        });
        break;
      case 'export_ban':
        if (d.target) mergeModifiers(out, { exportBans: [d.target as GoodId] });
        break;
      case 'price_freeze':
        if (d.target) mergeModifiers(out, { frozenGoods: [d.target as GoodId] });
        break;
      case 'subsidy':
        if (d.target) mergeModifiers(out, { subsidies: { [d.target as SectorId]: value } });
        break;
      case 'credit_line':
        if (d.target) mergeModifiers(out, { creditSubsidy: { [d.target as SectorId]: value } });
        break;
      case 'emergency':
        mergeModifiers(out, { emergency: true });
        break;
      default:
        // selic: lido diretamente por `state.executive.selicTarget`;
        // expropriação/privatização: atos instantâneos, sem efeito contínuo.
        break;
    }
  }
  return out;
}

/**
 * Modificadores econômicos vigentes.
 * - `national`: leis FEDERAIS + decretos federais (valem para o país inteiro);
 * - `local`: leis da esfera subnacional do jogador (aplicadas só ao estado governado, com peso menor).
 */
export function aggregateEconomyModifiers(
  state: GameState,
  scope: 'national' | 'local' = 'national',
): EconomyModifiers {
  if (scope === 'local') {
    const book = localLaws(state);
    return book ? lawbookModifiers(book) : {};
  }
  const out = lawbookModifiers(federalLaws(state));
  return mergeModifiers(out, decreeModifiers(state));
}

/** Transferência mensal por pessoa (R$) para um tipo de Pop, somando leis e decretos. */
export function transferFor(mods: EconomyModifiers, typeId: PopTypeId): number {
  return mods.transfers?.[typeId] ?? 0;
}
