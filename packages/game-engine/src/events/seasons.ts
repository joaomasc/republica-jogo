/**
 * Calendário dos eventos (bloco 9 — território vivo): estações e festas.
 * Evento listado aqui só pode sair nos meses indicados (1 = janeiro).
 * Chuvas de verão no Sudeste, inverno chuvoso no litoral nordestino, seca e queimadas no
 * Centro-Oeste e Norte de julho a outubro, frio no Sul, Carnaval, São João, Círio...
 */
const SUMMER_RAIN = [12, 1, 2, 3];
const DRY_SEASON = [7, 8, 9, 10];
const WINTER = [5, 6, 7, 8];
const HEAT = [9, 10, 11, 12, 1, 2, 3];
const CARNIVAL = [1, 2];
const SAO_JOAO = [5, 6];

/** Eventos anuais por natureza (podem voltar todo ano no mandato, respeitando a própria recarga). */
export const ANNUAL_EVENTS = new Set<string>([
  'fed_salario_minimo',
  'fed_plano_safra',
  'fed_indulto',
  'fed_marcha_prefeitos',
  'fed_indigenas',
  'est_reajuste_geral',
  'est_festa_estado',
  'mun_aniversario',
  'leg_ranking',
  'servants_strike',
]);

export const EVENT_MONTHS: Record<string, number[]> = {
  // Chuvas e enchentes
  mun_alagamento: [11, ...SUMMER_RAIN, 4],
  mun_deslizamento: [...SUMMER_RAIN, 4],
  mun_tragedia_morro: [...SUMMER_RAIN, 4],
  mun_dengue: [1, 2, 3, 4, 5],
  mun_dengue_pico: [2, 3, 4, 5, 6],
  est_enchente: [11, ...SUMMER_RAIN, 4, 5],
  reg_rs_enchentes: [4, 5, 6, 9, 10],
  reg_sc_enchentes: [9, 10, 11, 12, 1],
  reg_pe_chuvas: [4, 5, 6, 7],
  reg_rj_serra: SUMMER_RAIN,
  reg_es_serra_chuvas: SUMMER_RAIN,
  reg_ac_cheia: [1, 2, 3, 4],
  city_rio_branco_cheia: [1, 2, 3, 4],
  city_petropolis_tempestade: [1, 2, 3],
  city_recife_morros: [4, 5, 6, 7],
  city_nova_iguacu_enchentes: SUMMER_RAIN,
  city_tubarao_enchente: [9, 10, 11, 12, 1],
  city_porto_alegre_guaiba: [4, 5, 6, 9, 10],
  city_lajeado_cheia: [4, 5, 6, 9, 10],
  city_rio_preto_dengue: [1, 2, 3, 4, 5],
  arc_enchente_1: [11, ...SUMMER_RAIN, 4, 5],
  // Seca, estiagem e queimadas
  est_seca: [7, 8, 9, 10, 11, 12],
  mun_seca_reservatorio: [7, 8, 9, 10, 11],
  est_queimadas: DRY_SEASON,
  reg_mt_queimadas: DRY_SEASON,
  reg_ms_pantanal: DRY_SEASON,
  reg_ro_queimadas: DRY_SEASON,
  reg_ac_fumaca: DRY_SEASON,
  reg_df_incendios: DRY_SEASON,
  city_sinop_queimadas: DRY_SEASON,
  city_ribeirao_queimadas: [5, 6, 7, 8, 9],
  city_catanduva_queimada: [5, 6, 7, 8, 9],
  reg_am_seca_rios: [8, 9, 10, 11],
  est_ponte_aerea_norte: [8, 9, 10, 11],
  camp_queimadas_fumaca: DRY_SEASON,
  // Frio e geada
  mun_frio: WINTER,
  est_geada: [6, 7, 8],
  reg_pr_geada: [6, 7, 8],
  reg_mg_cafe_geada: [6, 7, 8],
  city_lages_nevasca: [6, 7, 8],
  city_conquista_geada: [6, 7, 8],
  // Calor
  mun_onda_calor: HEAT,
  reg_pi_calor: [8, 9, 10, 11],
  reg_mt_calor: [8, 9, 10, 11],
  city_teresina_calor: [8, 9, 10, 11],
  city_cuiaba_calor: [8, 9, 10, 11],
  // Festas
  mun_carnaval: CARNIVAL,
  reg_ba_carnaval: CARNIVAL,
  reg_pe_carnaval: CARNIVAL,
  reg_rj_carnaval: CARNIVAL,
  city_salvador_carnaval: [12, 1],
  city_joacaba_carnaval: CARNIVAL,
  fed_carnaval_critica: [2, 3],
  mun_sao_joao: SAO_JOAO,
  reg_pb_sao_joao: SAO_JOAO,
  reg_pe_caruaru: SAO_JOAO,
  city_campina_sao_joao: SAO_JOAO,
  reg_am_parintins: [5, 6],
  reg_go_divino: [4, 5],
  reg_pa_cirio: [9, 10],
  city_belem_cirio: [9, 10],
  reg_ce_juazeiro: [10, 11],
  city_juazeiro_romaria: [10, 11],
  reg_sc_oktoberfest: [9, 10],
  city_garanhuns_festival: [6, 7],
  fed_copa: [6, 7],
  // Safra
  est_safra_recorde: [3, 4, 5, 6],
  reg_go_safra: [3, 4, 5, 6],
  fed_portos: [3, 4, 5, 6, 7],
  reg_mt_br163: [2, 3, 4, 5],
};
