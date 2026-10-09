import { SECTOR_LABELS, GOOD_CATEGORY_LABELS } from '../executive/labels';
import { BUILDINGS } from '../economy/industry/buildings.data';
import { GOODS } from '../economy/industry/goods.data';
import type { BuildingId, EconomyModifiers, GoodCategory, GoodId, SectorId } from '../economy/industry/types';
import { POP_TYPES, type PopTypeId } from '../population/popTypes';

/**
 * Descrição legível dos modificadores econômicos de uma lei ou decreto (para cartas da interface).
 * `tone`: `good` para quem produz/cresce, `bad` para custo/restrição, `neutral` para mudanças de regra.
 */
export interface ModifierLine {
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  /** Cadeia de efeitos: o que essa mudança provoca no resto da economia e da política. */
  why: string;
}

const pp = (v: number) => `${v > 0 ? '+' : '−'}${(Math.round(Math.abs(v) * 1000) / 10).toLocaleString('pt-BR')} p.p.`;
const pctMult = (v: number) => `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`;
const share = (v: number) => `${(Math.round(v * 1000) / 10).toLocaleString('pt-BR')}%`;

/** O que cada tipo de modificador provoca no jogo (texto dos tooltips "o que isso causa"). */
export const MODIFIER_WHY: Partial<Record<keyof EconomyModifiers, string>> = {
  reinvestment:
    'Mais lucro volta para o fundo de investimento privado → mais fábricas e obras → mais empregos no futuro. Menos lucro vira dividendo para os empresários.',
  privateInvestmentMult:
    'Muda quanto os empresários investem → afeta o ritmo de novas fábricas, o emprego e o crescimento nos próximos anos.',
  banPrivateInvestment:
    'Empresários param de abrir negócios → só o Estado constrói. O crescimento passa a depender do fundo estatal e do plano nacional.',
  banStateIndustry: 'O governo não pode mandar construir fábricas, só obras públicas → a industrialização fica nas mãos do mercado.',
  stateConstructionDiscount: 'Obras do governo custam menos → o fundo estatal e as suas ordens de construção rendem mais.',
  nationalizationRate:
    'Empresas privadas passam ao Estado aos poucos → o lucro vai para o Tesouro e para o fundo estatal; empresários perdem renda e se irritam; o investimento privado encolhe.',
  cooperativizationRate:
    'Empresas viram cooperativas → o lucro passa a ser dividido entre os trabalhadores (sobe a renda deles), empresários perdem patrimônio.',
  privatizationRate:
    'Estatais são vendidas aos poucos → entra dinheiro e investimento privado, o Estado perde lucro e controle sobre o método de produção.',
  newPrivateAsCooperative: 'Novos negócios nascem como cooperativas → aos poucos a economia muda de dono sem expropriar ninguém.',
  foreignInvestmentMult:
    'Muda quanto capital estrangeiro entra → mais fábricas (sobretudo de alta tecnologia) e câmbio mais forte, mas parte do lucro sai do país.',
  expropriationRate:
    'Empresas estrangeiras são tomadas → o Estado ganha ativos, mas o capital estrangeiro foge e o câmbio enfraquece.',
  stateShareFloor: 'O Estado mantém o controle desse setor → o lucro vai para o Tesouro e o governo decide o método de produção.',
  profitSharing: 'Parte do lucro vira renda dos empregados → trabalhadores mais satisfeitos, menos dinheiro para reinvestir.',
  minimumWage:
    'Salários de base sobem → os mais pobres consomem mais (demanda e satisfação sobem), mas os custos das empresas aumentam e negócios de margem baixa contratam menos ou vão para a informalidade.',
  wageMult: 'Todos os salários mudam → renda e consumo das famílias de um lado, custo e margem das empresas do outro.',
  laborFlexibility:
    'Contratar e demitir fica mais fácil (ou difícil) → o emprego reage mais rápido às crises e às oportunidades; sindicatos não gostam da flexibilização.',
  informality: 'Mais gente vai para o trabalho informal → desemprego aberto menor, mas renda, arrecadação e proteção social menores.',
  incomeTax: 'Mexe na renda que sobra para as famílias → consumo e satisfação de um lado, arrecadação do outro.',
  corporateTax: 'Mexe no lucro das empresas → afeta o investimento privado e a arrecadação.',
  consumptionTax: 'Encarece (ou barateia) tudo o que as famílias compram → afeta o consumo, a inflação percebida e a arrecadação.',
  consumptionTaxByCategory: 'Muda o preço final dessa categoria → as famílias compram mais ou menos dela; a arrecadação acompanha.',
  dividendTax: 'Tributa o lucro distribuído → mais arrecadação, empresários menos satisfeitos; estimula reinvestir em vez de distribuir.',
  wealthTax: 'Tributa o patrimônio dos mais ricos → arrecadação maior, empresários insatisfeitos e menos dinheiro para investir.',
  tariff:
    'Importados ficam mais caros → a produção nacional ganha espaço (mais indústria e empregos), mas quem consome e as fábricas que usam insumos importados pagam mais (inflação). Exportadores podem sofrer com o câmbio.',
  tariffByCategory:
    'Protege essa categoria da concorrência externa → produtores nacionais dela ganham; quem compra esses bens (famílias ou fábricas) paga mais caro.',
  exportTax: 'Exportar rende menos → mais produto fica no país (preço interno cai), o agro e a mineração perdem renda, o Tesouro arrecada.',
  tradeOpenness:
    'Muda quanto o país consegue comprar e vender lá fora → mais abertura: preços menores e exportação maior, mas mais concorrência para a indústria nacional.',
  exportBans: 'O bem fica preso no mercado interno → preço interno cai, quem consome ganha, quem produz e exporta perde.',
  productivity: 'Cada trabalhador produz mais → custos menores, margens maiores, preços mais baixos e crescimento.',
  productivityBySector: 'Esse setor produz mais com o mesmo pessoal → fica mais competitivo e atrai investimento.',
  techRate: 'A pesquisa avança mais rápido → libera métodos de produção melhores mais cedo.',
  interestRateOffset: 'Crédito mais barato (ou caro) para investir → muda quantas obras os investidores acham rentáveis.',
  centralBank:
    'Define como os juros reagem: independente persegue a meta de inflação; subordinado ao governo segura juros baixos e tolera mais inflação.',
  creditSubsidy: 'Investir nesse setor fica mais barato → investidores passam a preferi-lo; o custo cai sobre os bancos públicos/Tesouro.',
  priceControls:
    'Preços ficam presos perto do valor-base → inflação controlada, mas quando falta produto aparece escassez em vez de preço alto.',
  frozenGoods: 'Esse bem não sobe de preço → bom para quem compra; se faltar, falta de verdade, e quem produz perde margem.',
  landReform: 'Terras passam a agricultores e cooperativas → agricultores ganham renda e satisfação; latifundiários e agronegócio reagem mal.',
  resourceStateShare: 'O Estado fica com parte da mineração e do petróleo → royalties e lucro para o Tesouro; menos investimento privado no setor.',
  resourceExpansion: 'Mais (ou menos) terra e recursos podem ser explorados → muda o teto de crescimento do agro e da mineração; ambientalistas reagem.',
  pollutionPenalty: 'Indústrias poluentes ficam mais caras → menos poluição, mas siderurgia, química e energia térmica perdem margem.',
  transfers: 'Dinheiro direto para essas famílias → consumo e satisfação delas sobem; custa orçamento.',
  subsidies: 'O governo paga parte dos custos desse setor → ele cresce e emprega mais; custa orçamento.',
  emergency: 'Libera gastos e congelamentos extraordinários → resposta rápida a crises, com custo fiscal e desgaste institucional.',
};

export function describeModifiers(m: EconomyModifiers | undefined): ModifierLine[] {
  if (!m) return [];
  const out: ModifierLine[] = [];
  let cur: keyof EconomyModifiers = 'productivity';
  const k = (key: keyof EconomyModifiers) => {
    cur = key;
    return true;
  };
  const add = (text: string, tone: ModifierLine['tone']) => out.push({ text, tone, why: MODIFIER_WHY[cur] ?? '' });
  // Propriedade e investimento
  if (k('reinvestment') && m.reinvestment) add(`Reinvestimento do lucro ${pp(m.reinvestment)}`, m.reinvestment > 0 ? 'good' : 'bad');
  if (k('privateInvestmentMult') && m.privateInvestmentMult && m.privateInvestmentMult !== 1)
    add(`Investimento privado ${pctMult(m.privateInvestmentMult)}`, m.privateInvestmentMult > 1 ? 'good' : 'bad');
  if (k('banPrivateInvestment') && m.banPrivateInvestment) add('Proíbe novos investimentos privados', 'bad');
  if (k('banStateIndustry') && m.banStateIndustry) add('Estado não pode abrir indústrias', 'neutral');
  if (k('stateConstructionDiscount') && m.stateConstructionDiscount) add(`Obras estatais ${Math.round(m.stateConstructionDiscount * 100)}% mais baratas`, 'good');
  if (k('nationalizationRate') && m.nationalizationRate) add(`Estatiza ${share(m.nationalizationRate)} da propriedade privada por mês`, 'neutral');
  if (k('cooperativizationRate') && m.cooperativizationRate) add(`Converte ${share(m.cooperativizationRate)} das empresas em cooperativas por mês`, 'neutral');
  if (k('privatizationRate') && m.privatizationRate) add(`Privatiza ${share(m.privatizationRate)} das estatais por mês`, 'neutral');
  if (k('newPrivateAsCooperative') && m.newPrivateAsCooperative) add('Novas empresas nascem como cooperativas', 'neutral');
  if (k('foreignInvestmentMult') && m.foreignInvestmentMult !== undefined && m.foreignInvestmentMult !== 1)
    add(`Capital estrangeiro ${pctMult(m.foreignInvestmentMult)}`, m.foreignInvestmentMult > 1 ? 'good' : 'bad');
  if (k('expropriationRate') && m.expropriationRate) add(`Expropria ${share(m.expropriationRate)} do capital estrangeiro por mês`, 'bad');
  k('stateShareFloor');
  for (const [b, v] of Object.entries(m.stateShareFloor ?? {}))
    if (v) add(`Estado com ao menos ${Math.round(v * 100)}% de ${BUILDINGS[b as BuildingId]?.name ?? b}`, 'neutral');
  if (k('profitSharing') && m.profitSharing) add(`Trabalhadores recebem ${Math.round(m.profitSharing * 100)}% do lucro`, 'neutral');
  // Trabalho
  if (k('minimumWage') && m.minimumWage) add(`Salário mínimo em ${Math.round(m.minimumWage * 100)}% do salário de referência`, 'neutral');
  if (k('wageMult') && m.wageMult && m.wageMult !== 1) add(`Salários ${pctMult(m.wageMult)}`, m.wageMult > 1 ? 'good' : 'bad');
  if (k('laborFlexibility') && m.laborFlexibility && m.laborFlexibility !== 1)
    add(`Contratação e demissão ${m.laborFlexibility > 1 ? 'mais rápidas' : 'mais lentas'} (${pctMult(m.laborFlexibility)})`, 'neutral');
  if (k('informality') && m.informality) add(`Informalidade ${m.informality > 0 ? 'maior' : 'menor'}`, m.informality > 0 ? 'bad' : 'good');
  // Tributos
  if (k('incomeTax') && m.incomeTax) add(`Imposto de renda ${pp(m.incomeTax)}`, m.incomeTax > 0 ? 'bad' : 'good');
  if (k('corporateTax') && m.corporateTax) add(`Imposto sobre lucros ${pp(m.corporateTax)}`, m.corporateTax > 0 ? 'bad' : 'good');
  if (k('consumptionTax') && m.consumptionTax) add(`Impostos sobre consumo ${pp(m.consumptionTax)}`, m.consumptionTax > 0 ? 'bad' : 'good');
  k('consumptionTaxByCategory');
  for (const [c, v] of Object.entries(m.consumptionTaxByCategory ?? {}))
    if (v) add(`Imposto sobre ${GOOD_CATEGORY_LABELS[c as GoodCategory] ?? c} ${pp(v)}`, v > 0 ? 'bad' : 'good');
  if (k('dividendTax') && m.dividendTax) add(`Imposto sobre dividendos ${pp(m.dividendTax)}`, m.dividendTax > 0 ? 'bad' : 'good');
  if (k('wealthTax') && m.wealthTax) add(`Imposto sobre grandes fortunas (${share(m.wealthTax)})`, 'neutral');
  // Comércio
  if (k('tariff') && m.tariff) add(`Tarifa de importação ${pp(m.tariff)}`, 'neutral');
  k('tariffByCategory');
  for (const [c, v] of Object.entries(m.tariffByCategory ?? {}))
    if (v) add(`Tarifa sobre ${GOOD_CATEGORY_LABELS[c as GoodCategory] ?? c} ${pp(v)}`, 'neutral');
  if (k('exportTax') && m.exportTax) add(`Imposto de exportação ${pp(m.exportTax)}`, m.exportTax > 0 ? 'bad' : 'good');
  if (k('tradeOpenness') && m.tradeOpenness !== undefined && m.tradeOpenness !== 1)
    add(`Capacidade de comércio exterior ${pctMult(m.tradeOpenness)}`, m.tradeOpenness > 1 ? 'good' : 'bad');
  if (k('exportBans') && m.exportBans?.length) add(`Exportação proibida: ${m.exportBans.map((g) => GOODS[g as GoodId]?.name ?? g).join(', ')}`, 'bad');
  // Produtividade
  if (k('productivity') && m.productivity) add(`Produtividade ${m.productivity > 0 ? '+' : '−'}${Math.round(Math.abs(m.productivity) * 100)}%`, m.productivity > 0 ? 'good' : 'bad');
  k('productivityBySector');
  for (const [s, v] of Object.entries(m.productivityBySector ?? {}))
    if (v) add(`Produtividade em ${SECTOR_LABELS[s as SectorId] ?? s} ${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`, v > 0 ? 'good' : 'bad');
  if (k('techRate') && m.techRate && m.techRate !== 1) add(`Pesquisa tecnológica ${pctMult(m.techRate)}`, m.techRate > 1 ? 'good' : 'bad');
  // Moeda e crédito
  if (k('interestRateOffset') && m.interestRateOffset) add(`Crédito para investir ${m.interestRateOffset < 0 ? 'mais barato' : 'mais caro'} (${pp(m.interestRateOffset / 100)})`, m.interestRateOffset < 0 ? 'good' : 'bad');
  if (k('centralBank') && m.centralBank)
    add(
      m.centralBank === 'independent' ? 'Banco Central independente (meta de inflação)' : m.centralBank === 'dual' ? 'Banco Central com duplo mandato' : 'Banco Central subordinado ao governo',
      'neutral',
    );
  k('creditSubsidy');
  for (const [s, v] of Object.entries(m.creditSubsidy ?? {}))
    if (v) add(`Crédito subsidiado para ${SECTOR_LABELS[s as SectorId] ?? s}`, 'good');
  if (k('priceControls') && m.priceControls) add('Controle geral de preços (risco de escassez)', 'neutral');
  if (k('frozenGoods') && m.frozenGoods?.length) add(`Preços congelados: ${m.frozenGoods.map((g) => GOODS[g as GoodId]?.name ?? g).join(', ')}`, 'neutral');
  // Terra e recursos
  if (k('landReform') && m.landReform) add(`Reforma agrária (intensidade ${Math.round(m.landReform * 100)}%)`, 'neutral');
  if (k('resourceStateShare') && m.resourceStateShare) add(`Estado com ${Math.round(m.resourceStateShare * 100)}% da extração mineral`, 'neutral');
  if (k('resourceExpansion') && m.resourceExpansion && m.resourceExpansion !== 1)
    add(`Fronteira agrícola e extrativa ${pctMult(m.resourceExpansion)}`, m.resourceExpansion > 1 ? 'good' : 'bad');
  if (k('pollutionPenalty') && m.pollutionPenalty) add(`Custo ambiental para indústrias poluentes ${m.pollutionPenalty > 0 ? '+' : '−'}${Math.round(Math.abs(m.pollutionPenalty) * 100)}%`, m.pollutionPenalty > 0 ? 'bad' : 'good');
  // Transferências
  k('transfers');
  for (const [p, v] of Object.entries(m.transfers ?? {}))
    if (v) add(`Transferência de R$ ${Math.round(v)}/mês para ${POP_TYPES[p as PopTypeId]?.plural ?? p}`, 'good');
  k('subsidies');
  for (const [s, v] of Object.entries(m.subsidies ?? {}))
    if (v) add(`Subsídio de R$ ${Math.round(v)} bi/ano para ${SECTOR_LABELS[s as SectorId] ?? s}`, 'good');
  if (k('emergency') && m.emergency) add('Estado de calamidade', 'bad');
  return out;
}
