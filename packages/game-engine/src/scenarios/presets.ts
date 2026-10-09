/**
 * Pacotes de leis federais iniciais (categoria → opção), usados por cenários e pelo simulador
 * de governança. Cada pacote representa uma orientação de política econômica.
 */
export const LAW_PRESETS = {
  padrao: {},
  liberal: {
    economic_system: 'econ_laissez_faire',
    taxation: 'tax_low',
    trade: 'trade_open',
    labor: 'labor_flexible',
  },
  desenvolvimentista: {
    economic_system: 'econ_developmental',
    trade: 'trade_isi',
    industrial_policy: 'ind_bndes',
    banking: 'bank_public',
  },
  social_democrata: {
    taxation: 'tax_progressive',
    welfare: 'wel_expanded',
    labor: 'labor_protective',
    minimum_wage: 'mw_high',
  },
  socialista: {
    economic_system: 'econ_cooperative',
    land: 'land_reform',
    labor: 'labor_councils',
  },
  planificado: {
    economic_system: 'econ_planned',
    banking: 'bank_nationalized',
    resources: 'res_monopoly',
  },
} as const satisfies Record<string, Record<string, string>>;

export type LawPresetId = keyof typeof LAW_PRESETS;
