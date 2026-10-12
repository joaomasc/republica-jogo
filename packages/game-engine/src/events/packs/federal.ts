/**
 * Pacote de eventos da Presidência.
 * Fonte das ideias: docs/BANCO_DE_CONTEUDO.md, seção 6.
 */
import { approvalOf, deficitIsHigh } from '../conditions';
import {
  apr, cap, chain, CLASSE_MEDIA, cred, esc, ev, fame, FED, flag, gasto, gi, GOV, IDOSOS, JOVENS, legit,
  OPERARIOS, POBRES, radical, rel, sat, shock, type EvInput, unrest, V,
} from '../dsl';
import type { EventDefinition } from '../types';

/** Evento federal: fase de governo, esfera federal. */
const f = (i: Omit<EvInput, 'phases' | 'scope'>): EventDefinition => ev({ ...i, phases: GOV, scope: FED });

export const FEDERAL_EVENTS: EventDefinition[] = [
  // ─── Economia e mercado ───
  f({ id: 'fed_dolar_dispara', cat: 'economy', w: 4, cd: 400, neg: true,
    title: 'Dólar dispara', text: 'O mercado teme pelo risco fiscal e o real derrete.',
    opts: [
      ['Anunciar corte de gastos', [shock('Ajuste anunciado', 6, { confidence: 3, growth: -0.2 }), gi('civil_servants', -6)]],
      ['Culpar os especuladores', [shock('Desconfiança do mercado', 6, { inflation: 0.4, confidence: -3 }), apr(1)]],
      ['Banco Central vende reservas', [shock('Intervenção cambial', 3, { inflation: -0.2, confidence: 1 })]],
    ] }),
  f({ id: 'fed_inflacao_alimentos', cat: 'economy', w: 4, cd: 365, neg: true,
    title: 'Inflação de alimentos', text: 'Arroz, feijão e carne sobem acima da inflação.',
    opts: [
      ['Zerar imposto de importação de alimentos', [shock('Alimentos importados', 6, { inflation: -0.4 }), gi('agribusiness', -6)]],
      ['Recompor estoques reguladores', [gasto('social', 0.03), shock('Estoques públicos', 6, { inflation: -0.2 })]],
      ['Esperar a próxima safra', [apr(-2), sat(POBRES, -2)]],
    ] }),
  f({ id: 'fed_juros_altos', cat: 'economy', w: 3, cd: 400,
    title: 'Banco Central sobe os juros', text: 'A Selic vai a 15% e o comércio reclama.',
    opts: [
      ['Pressionar o BC publicamente', [cred(-3), shock('Ruído com o BC', 4, { confidence: -3, inflation: 0.2 }), apr(1)]],
      ['Respeitar a autonomia', [shock('Juros altos', 8, { growth: -0.4, inflation: -0.3 }), cred(2)]],
    ] }),
  f({ id: 'fed_regra_fiscal', cat: 'economy', w: 3, cd: 500, cond: deficitIsHigh,
    title: 'Regra fiscal em xeque', text: 'O gasto vai estourar a meta do ano.',
    opts: [
      ['Mudar a meta', [shock('Meta fiscal alterada', 8, { confidence: -4 }), cap(-3)]],
      ['Contingenciar ministérios', [gasto('administration', -0.05), gi('civil_servants', -5), apr(-1)]],
    ] }),
  f({ id: 'fed_reforma_tributaria', cat: 'politics', w: 3, cd: 900,
    title: 'Reforma tributária', text: 'A PEC unifica cinco impostos sobre consumo num só.',
    opts: [
      ['Defender a reforma ampla', [cap(-12), gi('industry', 8), gi('commerce', -4), shock('Simplificação tributária', 18, { growth: 0.3, confidence: 2 })]],
      ['Fatiar em etapas', [cap(-5), gi('industry', 3)]],
      ['Deixar para o próximo governo', [gi('industry', -4)]],
    ] }),
  f({ id: 'fed_gasolina', cat: 'economy', w: 4, cd: 365,
    title: 'Gasolina cara e a estatal do petróleo', text: 'O petróleo subiu lá fora e a estatal quer repassar.',
    opts: [
      ['Segurar o preço', [shock('Preço represado', 6, { inflation: -0.3, confidence: -2 }), gi('business', -4)]],
      ['Paridade internacional', [apr(-3), shock('Combustível caro', 4, { inflation: 0.4 }), gi('business', 3)]],
      ['Fundo de estabilização', [gasto('industry', 0.04), apr(1)]],
    ] }),
  f({ id: 'fed_rating_rebaixado', cat: 'economy', w: 2, cd: 600, neg: true, cond: deficitIsHigh,
    title: 'Agência rebaixa a nota do Brasil', text: 'O país perde o grau de investimento.',
    opts: [['Lamentar e prometer ajuste', [shock('Rebaixamento', 12, { confidence: -4, growth: -0.3 }), cred(-1)]]] }),
  f({ id: 'fed_rating_elevado', cat: 'economy', w: 2, cd: 600, cond: (s) => !deficitIsHigh(s),
    title: 'Agência eleva a nota do Brasil', text: 'O resultado fiscal melhorou a avaliação do país.',
    opts: [['Comemorar', [shock('Grau de investimento', 12, { confidence: 4, growth: 0.2 }), cred(2)]]] }),
  f({ id: 'fed_recessao', cat: 'economy', w: 3, cd: 600, neg: true,
    cond: (s) => s.economy.growth < 0,
    title: 'Recessão técnica', text: 'Dois trimestres seguidos de queda no PIB.',
    opts: [
      ['Pacote de estímulo', [gasto('infrastructure', 0.06), shock('Estímulo fiscal', 8, { growth: 0.6, inflation: 0.3 })]],
      ['Austeridade', [shock('Ajuste recessivo', 8, { unemployment: 0.4, confidence: 2 }), apr(-2)]],
    ] }),
  f({ id: 'fed_pib_surpreende', cat: 'economy', w: 2, cd: 500,
    cond: (s) => s.economy.growth > 2.5,
    title: 'PIB surpreende', text: 'O crescimento ficou acima de todas as projeções.',
    opts: [['Comemorar o resultado', [apr(3), shock('Otimismo', 6, { confidence: 3 })]]] }),
  f({ id: 'fed_desemprego', cat: 'crisis', w: 3, cd: 500, neg: true,
    cond: (s) => s.economy.unemployment > 10,
    title: 'Desemprego recorde', text: 'Filas de emprego dão a volta no quarteirão.',
    opts: [
      ['Programa de obras públicas', [gasto('infrastructure', 0.08), shock('Frentes de trabalho', 10, { unemployment: -0.5 })]],
      ['Desoneração da folha', [gasto('administration', 0.04), gi('industry', 6), shock('Desoneração', 10, { unemployment: -0.3 })]],
    ] }),
  f({ id: 'fed_salario_minimo', cat: 'economy', w: 4, cd: 330,
    title: 'Reajuste do salário mínimo', text: 'O governo precisa definir o novo mínimo.',
    opts: [
      ['Ganho real', [sat(POBRES, 3), sat(IDOSOS, 2), gasto('pensions', 0.04), gi('unions', 5)]],
      ['Só a inflação', [sat(POBRES, -1), gi('business', 3)]],
    ] }),
  f({ id: 'fed_bolsa_social', cat: 'politics', w: 3, cd: 500,
    title: 'Programa de renda em debate', text: 'O programa de transferência de renda precisa de definição.',
    opts: [
      ['Ampliar o benefício', [gasto('social', 0.08), sat(POBRES, 5), gi('business', -3)]],
      ['Revisar o cadastro', [gasto('social', -0.03), sat(POBRES, -3), cred(1)]],
    ] }),
  f({ id: 'fed_plano_safra', cat: 'economy', w: 3, cd: 330,
    title: 'Plano Safra', text: 'O agro pede crédito com juros subsidiados.',
    opts: [
      ['Plano generoso', [gasto('industry', 0.04), gi('agribusiness', 8)]],
      ['Priorizar a agricultura familiar', [gasto('industry', 0.02), gi('social_movements', 5), gi('agribusiness', -3)]],
    ] }),
  f({ id: 'fed_bancos_medios', cat: 'crisis', w: 2, cd: 900, neg: true,
    title: 'Banco médio quebra', text: 'Correntistas fazem fila e o pânico ameaça outros bancos.',
    opts: [
      ['Socorro com fundo garantidor', [gasto('administration', 0.03), shock('Socorro bancário', 4, { confidence: 2 }), apr(-1)]],
      ['Deixar quebrar', [shock('Crise bancária', 6, { confidence: -5, growth: -0.4 })]],
    ] }),
  f({ id: 'fed_supersalarios', cat: 'politics', w: 3, cd: 600,
    title: 'Supersalários no funcionalismo', text: 'Juízes e procuradores ganham acima do teto com penduricalhos.',
    opts: [
      ['Lei contra penduricalhos', [apr(3), gi('civil_servants', -6), cap(-4)]],
      ['Não comprar essa briga', [cap(2)]],
    ] }),
  f({ id: 'fed_divida_90', cat: 'economy', w: 2, cd: 700, neg: true, cond: (s) => s.economy.debt > 85,
    title: 'Dívida pública passa de 90% do PIB', text: 'Economistas alertam para risco de insolvência.',
    opts: [
      ['Pacote fiscal duro', [cap(-8), gasto('administration', -0.05), shock('Ajuste fiscal', 10, { confidence: 3, growth: -0.2 })]],
      ['Minimizar o alerta', [shock('Risco fiscal', 8, { confidence: -3 })]],
    ] }),
  f({ id: 'fed_isencao_ir', cat: 'politics', w: 3, cd: 700,
    title: 'Isenção do IR até 5 mil', text: 'A classe média pressiona pela correção da tabela.',
    opts: [
      ['Aprovar com compensação nos super-ricos', [sat(CLASSE_MEDIA, 4), gi('business', -5), cap(-6)]],
      ['Aprovar sem compensação', [sat(CLASSE_MEDIA, 4), gasto('administration', 0.05)]],
      ['Adiar', [sat(CLASSE_MEDIA, -2)]],
    ] }),
  f({ id: 'fed_desoneracao', cat: 'economy', w: 2, cd: 700,
    title: 'Desoneração da folha vence', text: '17 setores pedem a prorrogação do benefício.',
    opts: [
      ['Prorrogar', [gasto('administration', 0.03), gi('industry', 5), gi('commerce', 3)]],
      ['Deixar acabar', [gi('industry', -6), cred(1)]],
    ] }),
  f({ id: 'fed_blusinhas', cat: 'economy', w: 2, cd: 700,
    title: 'Taxação das compras internacionais', text: 'A indústria nacional pede imposto sobre compras em sites estrangeiros.',
    opts: [
      ['Taxar', [gi('industry', 6), sat(JOVENS, -3)]],
      ['Isentar', [gi('industry', -5), sat(JOVENS, 2)]],
    ] }),
  f({ id: 'fed_grandes_fortunas', cat: 'politics', w: 2, cd: 900,
    title: 'Imposto sobre grandes fortunas', text: 'A base de esquerda propõe taxar fortunas acima de R$ 10 milhões.',
    opts: [
      ['Propor', [gi('business', -8), sat(POBRES, 2), cap(-5), shock('Fuga de capitais leve', 6, { confidence: -2 })]],
      ['Recusar', [gi('business', 3), gi('social_movements', -4)]],
    ] }),

  // ─── Comércio exterior ───
  f({ id: 'fed_tarifa_aco', cat: 'economy', w: 2, cd: 600, neg: true,
    title: 'EUA taxam o aço brasileiro', text: 'Uma tarifa de 25% atinge as siderúrgicas.',
    opts: [
      ['Retaliar', [gi('industry', -2), apr(2), shock('Guerra comercial', 6, { growth: -0.2 })]],
      ['Negociar cotas', [gi('industry', 3), cap(-2)]],
    ] }),
  f({ id: 'fed_mercosul_ue', cat: 'politics', w: 2, cd: 900,
    title: 'Acordo Mercosul–União Europeia', text: 'O acordo está pronto para ratificação.',
    opts: [
      ['Ratificar', [gi('agribusiness', 8), gi('industry', -5), shock('Abertura comercial', 18, { growth: 0.3 })]],
      ['Exigir mudanças', [gi('industry', 3), gi('agribusiness', -4)]],
    ] }),
  f({ id: 'fed_china_soja', cat: 'economy', w: 2, cd: 600, neg: true,
    title: 'China compra menos soja', text: 'A desaceleração chinesa derruba as exportações.',
    opts: [['Buscar novos mercados', [gi('agribusiness', -4), shock('Exportações em queda', 8, { growth: -0.3 })]]] }),
  f({ id: 'fed_argentina', cat: 'politics', w: 2, cd: 700,
    title: 'Crise na Argentina', text: 'O vizinho pede socorro financeiro.',
    opts: [
      ['Crédito do BNDES para exportações', [gi('industry', 3), apr(-1)]],
      ['Proteger os exportadores e esperar', [gi('industry', -2)]],
    ] }),
  f({ id: 'fed_embargo_europeu', cat: 'economy', w: 2, cd: 700, neg: true,
    title: 'Europa barra produtos de áreas desmatadas', text: 'A nova lei europeia exige rastreio da carne e da soja.',
    opts: [
      ['Rastreabilidade obrigatória', [gi('agribusiness', -6), gi('environmental', 6), cred(2)]],
      ['Contestar na OMC', [gi('agribusiness', 4), gi('environmental', -4)]],
    ] }),
  f({ id: 'fed_missao_asia', cat: 'opportunity', w: 2, cd: 500,
    title: 'Missão comercial na Ásia', text: 'Empresários convidam para uma viagem de negócios.',
    opts: [
      ['Viajar com a comitiva', [fame(3), gi('business', 4), apr(-1)]],
      ['Mandar o chanceler', [gi('business', 1)]],
    ] }),

  // ─── Congresso e coalizão ───
  f({ id: 'fed_centrao_ministerios', cat: 'party', w: 4, cd: 365,
    title: 'Centrão cobra ministérios', text: 'O bloco quer três ministérios em troca de votos.',
    opts: [
      ['Entregar os ministérios', [rel('coalition', 8), cap(12), cred(-3)]],
      ['Oferecer cargos de segundo escalão', [cap(4), rel('coalition', 2), cap(-3)]],
      ['Recusar', [cap(-10), cred(2)]],
    ] }),
  f({ id: 'fed_presidente_camara', cat: 'politics', w: 3, cd: 500, vars: { pessoa: V.pessoa },
    title: 'Presidente da Câmara engaveta a pauta', text: '{pessoa}, presidente da Câmara, segura os projetos do governo.',
    opts: [
      ['Negociar', [cap(-6), rel('coalition', 3)]],
      ['Ir para a rua', [apr(2), cap(-8), unrest(2)]],
    ] }),
  f({ id: 'fed_emendas', cat: 'politics', w: 4, cd: 300,
    title: 'Congresso cobra emendas', text: 'Deputados ameaçam travar votações sem a liberação das emendas.',
    opts: [
      ['Liberar as emendas', [gasto('administration', 0.04), cap(8)]],
      ['Segurar', [cap(-8), chain('fed_rebeliao_base', 30, 0.4)]],
    ] }),
  f({ id: 'fed_rebeliao_base', cat: 'crisis', w: 0, chainOnly: true, neg: true,
    title: 'Base se rebela no plenário', text: 'O governo perde uma votação importante.',
    opts: [
      ['Reunião no palácio', [cap(-6), rel('coalition', 4)]],
      ['Ameaçar demitir indicados', [cap(-3), rel('coalition', -6)]],
    ] }),
  f({ id: 'fed_fundo_eleitoral', cat: 'politics', w: 2, cd: 700,
    title: 'Congresso aumenta o fundo eleitoral', text: 'O fundo para campanhas passa de R$ 5 bilhões.',
    opts: [
      ['Vetar o aumento', [apr(3), cap(-8), rel('coalition', -4)]],
      ['Sancionar', [apr(-3), cap(4)]],
    ] }),
  f({ id: 'fed_mp_caduca', cat: 'politics', w: 2, cd: 400,
    title: 'Medida provisória caduca', text: 'O Congresso deixou a MP perder a validade.',
    opts: [['Reenviar como projeto de lei', [cap(-5)]]] }),
  f({ id: 'fed_senado_rejeita', cat: 'politics', w: 1, cd: 700,
    title: 'Senado rejeita indicado do governo', text: 'Derrota rara: o indicado para uma agência foi rejeitado.',
    opts: [['Indicar outro nome', [cap(-8)]]] }),
  f({ id: 'fed_voto_impresso', cat: 'politics', w: 2, cd: 900,
    title: 'Voto impresso volta à pauta', text: 'Deputados propõem PEC do voto impresso.',
    opts: [
      ['Apoiar', [legit(-3), gi('religious', 3)]],
      ['Defender a urna eletrônica', [legit(2), cred(1), cap(-3)]],
    ] }),
  f({ id: 'fed_orcamento_secreto', cat: 'politics', w: 2, cd: 700,
    title: 'Emendas sem transparência', text: 'Jornais revelam emendas distribuídas sem identificar o autor.',
    opts: [
      ['Acabar com elas', [cred(3), rel('coalition', -6), cap(-6)]],
      ['Manter', [cap(4), esc(4)]],
    ] }),
  f({ id: 'fed_reforma_politica', cat: 'politics', w: 1, cd: 900,
    title: 'Reforma política', text: 'Juristas propõem voto distrital misto.',
    opts: [
      ['Propor a reforma', [cap(-6), cred(2)]],
      ['Não mexer', []],
    ] }),

  // ─── Judiciário e controle ───
  f({ id: 'fed_stf_suspende', cat: 'politics', w: 3, cd: 500,
    title: 'STF suspende decreto do governo', text: 'Uma liminar considerou o decreto inconstitucional.',
    opts: [
      ['Acatar e recorrer', [legit(2), cap(-2)]],
      ['Atacar o tribunal', [legit(-5), apr(1), gi('religious', 2)]],
    ] }),
  f({ id: 'fed_vaga_stf', cat: 'politics', w: 2, cd: 900,
    title: 'Vaga no Supremo', text: 'Um ministro se aposentou e a indicação é sua.',
    opts: [
      ['Jurista técnico respeitado', [cred(3), legit(2), cap(-3)]],
      ['Aliado fiel', [cap(4), cred(-3)]],
      ['Nome indicado pela bancada religiosa', [gi('religious', 8), gi('social_movements', -5)]],
    ] }),
  f({ id: 'fed_pgr_ministro', cat: 'scandal', w: 2, cd: 600, neg: true,
    title: 'PGR denuncia ministro', text: 'O procurador-geral denunciou um ministro por corrupção.',
    opts: [
      ['Demitir', [cap(-4), cred(2)]],
      ['Manter até o julgamento', [esc(8), cred(-2)]],
    ] }),
  f({ id: 'fed_tcu', cat: 'politics', w: 2, cd: 500,
    title: 'TCU aponta irregularidade em programa', text: 'Auditores encontram pagamentos indevidos.',
    opts: [
      ['Corrigir e punir', [cred(2), gasto('administration', -0.01), cap(-3)]],
      ['Contestar o relatório', [esc(3)]],
    ] }),
  f({ id: 'fed_pf_operacao', cat: 'scandal', w: 2, cd: 700, neg: true,
    title: 'PF faz operação num ministério', text: 'Agentes cumprem mandados em gabinetes do governo.',
    opts: [
      ['Apoiar a investigação', [cred(3), esc(3), rel('coalition', -3)]],
      ['Trocar o diretor da PF', [legit(-4), esc(8), cred(-4)]],
    ] }),
  f({ id: 'fed_indulto', cat: 'politics', w: 2, cd: 330,
    title: 'Indulto de Natal', text: 'Todo fim de ano o presidente decide sobre o indulto.',
    opts: [
      ['Indulto amplo', [gi('security', -4), gi('social_movements', 3)]],
      ['Indulto restrito', [gi('security', 2)]],
    ] }),
  f({ id: 'fed_marco_temporal', cat: 'politics', w: 2, cd: 900,
    title: 'Marco temporal das terras indígenas', text: 'O Congresso aprova o marco temporal.',
    opts: [
      ['Vetar', [gi('agribusiness', -8), gi('social_movements', 6), gi('environmental', 5)]],
      ['Sancionar', [gi('agribusiness', 8), gi('social_movements', -8), gi('environmental', -6)]],
    ] }),

  // ─── Relações exteriores ───
  f({ id: 'fed_g20', cat: 'opportunity', w: 2, cd: 500,
    title: 'Cúpula do G20', text: 'Líderes mundiais se reúnem e o Brasil tem espaço para propor.',
    opts: [
      ['Propor taxação global de super-ricos', [fame(4), gi('business', -4), gi('social_movements', 3)]],
      ['Agenda de atração de investimentos', [fame(2), gi('business', 4), cap(-3)]],
    ] }),
  f({ id: 'fed_guerra_distante', cat: 'politics', w: 2, cd: 700,
    title: 'Guerra em outro continente', text: 'Os aliados pedem posição do Brasil.',
    opts: [
      ['Neutralidade e defesa da paz', [cred(1)]],
      ['Condenar o agressor', [fame(2), gi('business', -1)]],
    ] }),
  f({ id: 'fed_repatriacao', cat: 'crisis', w: 2, cd: 700,
    title: 'Brasileiros em zona de guerra', text: 'Centenas de brasileiros pedem para voltar.',
    opts: [
      ['Aviões da FAB', [gasto('security', 0.01), apr(3)]],
      ['Orientar pelos consulados', [apr(-2)]],
    ] }),
  f({ id: 'fed_fundo_amazonia', cat: 'opportunity', w: 2, cd: 700,
    title: 'Doadores querem retomar o Fundo Amazônia', text: 'Noruega e Alemanha oferecem recursos para preservação.',
    opts: [
      ['Aceitar com metas', [gasto('science', -0.02), gi('environmental', 6), gi('agribusiness', -3)]],
      ['Recusar condicionantes', [gi('agribusiness', 3), gi('environmental', -5)]],
    ] }),
  f({ id: 'fed_embaixador', cat: 'politics', w: 1, cd: 900,
    title: 'Embaixador brasileiro expulso', text: 'Um país expulsou nosso embaixador após críticas.',
    opts: [
      ['Retaliar', [apr(1), cap(-3)]],
      ['Diálogo diplomático', [cred(1), cap(-3)]],
    ] }),
  f({ id: 'fed_fronteira_drogas', cat: 'politics', w: 2, cd: 600,
    title: 'Cocaína entra pela fronteira', text: 'Apreensões recordes na fronteira com países andinos.',
    opts: [
      ['Cooperação militar regional', [gasto('security', 0.02), gi('security', 4)]],
      ['Mais Polícia Federal na fronteira', [gasto('security', 0.01), gi('security', 2)]],
    ] }),
  f({ id: 'fed_megaevento', cat: 'opportunity', w: 1, cd: 1200,
    title: 'Candidatura para sediar uma Olimpíada', text: 'O comitê olímpico propõe uma candidatura brasileira.',
    opts: [
      ['Apoiar', [fame(4), gasto('infrastructure', 0.05), flag('fed_olimpiada')]],
      ['Recusar', [cred(1)]],
    ] }),

  // ─── Social, saúde e educação ───
  f({ id: 'fed_vacina_nacional', cat: 'opportunity', w: 2, cd: 700,
    title: 'Vacina nacional', text: 'Um instituto público desenvolveu uma vacina e precisa de verba.',
    opts: [
      ['Investir', [gasto('science', 0.04), cred(3)]],
      ['Comprar vacinas importadas', [gasto('health', 0.02)]],
    ] }),
  f({ id: 'fed_sus_colapso', cat: 'crisis', w: 3, cd: 500, neg: true,
    title: 'SUS em colapso', text: 'Hospitais federais sem insumos e filas de cirurgia.',
    opts: [
      ['Aumentar o piso da saúde', [gasto('health', 0.08), apr(2), sat('all', 1)]],
      ['Mutirão de cirurgias', [gasto('health', 0.03), apr(1)]],
    ] }),
  f({ id: 'fed_enem_vaza', cat: 'scandal', w: 2, cd: 900, neg: true,
    title: 'Prova do Enem vaza', text: 'Questões circularam nas redes na véspera.',
    opts: [
      ['Cancelar e refazer', [gasto('education', 0.01), cred(2), sat(JOVENS, -1)]],
      ['Manter a prova', [cred(-4), sat(JOVENS, -3)]],
    ] }),
  f({ id: 'fed_universidades_greve', cat: 'crisis', w: 3, cd: 500, neg: true,
    title: 'Universidades federais em greve', text: 'Professores e técnicos param por reajuste.',
    opts: [
      ['Reajuste em duas parcelas', [gasto('education', 0.03), gi('civil_servants', 6), gi('youth', 3)]],
      ['Endurecer', [gi('civil_servants', -8), gi('youth', -5)]],
    ] }),
  f({ id: 'fed_casas_populares', cat: 'opportunity', w: 3, cd: 700,
    title: 'Programa de casas populares', text: 'Construtoras e movimentos de moradia pedem a retomada.',
    opts: [
      ['Relançar o programa', [gasto('social', 0.06), sat(POBRES, 4), gi('industry', 4)]],
      ['Versão reduzida', [gasto('social', 0.02), sat(POBRES, 1)]],
    ] }),
  f({ id: 'fed_fome', cat: 'crisis', w: 2, cd: 700, neg: true,
    title: 'Fome volta ao mapa', text: 'Relatório da ONU mostra milhões em insegurança alimentar.',
    opts: [
      ['Programa emergencial de alimentos', [gasto('social', 0.04), apr(2), sat(POBRES, 3)]],
      ['Contestar os números', [cred(-3), sat(POBRES, -2)]],
    ] }),
  f({ id: 'fed_fila_inss', cat: 'crisis', w: 3, cd: 500, neg: true,
    title: 'Fila do INSS passa de 2 milhões', text: 'Aposentados esperam meses por benefícios.',
    opts: [
      ['Mutirão com servidores extras', [gasto('pensions', 0.02), sat(IDOSOS, 3)]],
      ['Automatizar com inteligência artificial', [gasto('administration', 0.01), gi('tech', 3), sat(IDOSOS, 1)]],
    ] }),
  f({ id: 'fed_censo', cat: 'politics', w: 1, cd: 900,
    title: 'Censo sem verba', text: 'O IBGE diz que não consegue fazer o Censo.',
    opts: [
      ['Liberar os recursos', [gasto('science', 0.01), cred(2)]],
      ['Adiar', [cred(-2)]],
    ] }),
  f({ id: 'fed_medicos_interior', cat: 'politics', w: 2, cd: 700,
    title: 'Médicos para o interior', text: 'Mil cidades estão sem médico na atenção básica.',
    opts: [
      ['Relançar o programa com estrangeiros', [gasto('health', 0.02), sat(['farmers'], 3), gi('civil_servants', -2)]],
      ['Bolsas para médicos brasileiros', [gasto('health', 0.03), sat(['farmers'], 2)]],
    ] }),
  f({ id: 'fed_farmacia_popular', cat: 'opportunity', w: 2, cd: 600,
    title: 'Farmácia popular', text: 'Proposta de remédios gratuitos para hipertensão e diabetes.',
    opts: [
      ['Ampliar', [gasto('health', 0.02), sat(IDOSOS, 3)]],
      ['Manter como está', []],
    ] }),
  f({ id: 'fed_concurso_unificado', cat: 'opportunity', w: 2, cd: 700,
    title: 'Concurso nacional unificado', text: 'Uma prova única para vagas em vários órgãos federais.',
    opts: [
      ['Realizar', [gasto('administration', 0.01), sat(JOVENS, 3)]],
      ['Não agora', []],
    ] }),

  // ─── Segurança e defesa ───
  f({ id: 'fed_lei_antifaccao', cat: 'politics', w: 3, cd: 700,
    title: 'Lei antifacção', text: 'Facções dominam presídios e territórios em vários estados.',
    opts: [
      ['Lei dura com penas maiores', [gi('security', 8), gi('social_movements', -4)]],
      ['Foco em inteligência e lavagem de dinheiro', [gasto('security', 0.02), gi('security', 3), cred(2)]],
    ] }),
  f({ id: 'fed_militares_reajuste', cat: 'politics', w: 2, cd: 600,
    title: 'Militares pedem reajuste', text: 'Comandantes das Forças Armadas pedem recomposição salarial.',
    opts: [
      ['Conceder', [gasto('security', 0.03), gi('security', 6)]],
      ['Adiar', [gi('security', -5)]],
    ] }),
  f({ id: 'fed_general_critica', cat: 'crisis', w: 2, cd: 900, neg: true, vars: { pessoa: V.pessoa },
    title: 'General critica o governo', text: 'O general {pessoa} critica publicamente uma decisão do governo.',
    opts: [
      ['Exonerar o general', [legit(3), gi('security', -6)]],
      ['Ignorar', [legit(-3), cred(-2)]],
    ] }),
  f({ id: 'fed_glo', cat: 'crisis', w: 2, cd: 500, neg: true,
    title: 'Governador pede tropas federais', text: 'Um estado pede Garantia da Lei e da Ordem após ataques.',
    opts: [
      ['Enviar as tropas', [gasto('security', 0.02), gi('security', 5), apr(1)]],
      ['Mandar a Força Nacional', [gasto('security', 0.01), gi('security', 2)]],
    ] }),
  f({ id: 'fed_decreto_armas', cat: 'politics', w: 2, cd: 900,
    title: 'Decreto de armas', text: 'Atiradores e colecionadores pressionam por novas regras.',
    opts: [
      ['Flexibilizar', [gi('security', 6), sat(JOVENS, -2), gi('religious', 2)]],
      ['Restringir', [gi('security', -6), sat(JOVENS, 2), cred(1)]],
    ] }),
  f({ id: 'fed_cacas', cat: 'politics', w: 1, cd: 1200,
    title: 'Compra de caças', text: 'A Aeronáutica pede a segunda leva de caças.',
    opts: [
      ['Comprar', [gasto('security', 0.05), gi('security', 4), gi('industry', 2)]],
      ['Adiar', [gi('security', -3)]],
    ] }),
  f({ id: 'fed_pf_sem_verba', cat: 'politics', w: 2, cd: 600,
    title: 'Polícia Federal sem verba', text: 'Operações são suspensas por falta de dinheiro para diárias.',
    opts: [
      ['Recompor o orçamento', [gasto('security', 0.01), cred(2)]],
      ['Manter o corte', [cred(-2)]],
    ] }),

  // ─── Energia e meio ambiente ───
  f({ id: 'fed_foz_amazonas', cat: 'politics', w: 2, cd: 900,
    title: 'Petróleo na Foz do Amazonas', text: 'A estatal pede licença para perfurar perto da foz do rio.',
    opts: [
      ['Autorizar', [gi('environmental', -12), gi('industry', 6), shock('Nova fronteira do petróleo', 24, { growth: 0.2 })]],
      ['Negar', [gi('environmental', 8), gi('industry', -5)]],
    ] }),
  f({ id: 'fed_ferrovia', cat: 'opportunity', w: 2, cd: 900,
    title: 'Ferrovia para escoar a safra', text: 'Investidores propõem uma ferrovia do Centro-Oeste aos portos.',
    opts: [
      ['Concessão', [gi('agribusiness', 6), gi('business', 4), gi('environmental', -2)]],
      ['Obra pública', [gasto('infrastructure', 0.08), gi('agribusiness', 5)]],
    ] }),
  f({ id: 'fed_desmatamento', cat: 'crisis', w: 3, cd: 500, neg: true,
    title: 'Desmatamento recorde na Amazônia', text: 'Satélites mostram a maior derrubada em uma década.',
    opts: [
      ['Grande operação federal', [gasto('security', 0.02), gi('environmental', 8), gi('agribusiness', -5), fame(2)]],
      ['Culpar governos anteriores', [gi('environmental', -6), cred(-2)]],
    ] }),
  f({ id: 'fed_garimpo', cat: 'crisis', w: 2, cd: 700, neg: true,
    title: 'Garimpo ilegal em terra indígena', text: 'Imagens mostram crianças desnutridas e rios contaminados.',
    opts: [
      ['Operação de retirada', [gasto('security', 0.02), cred(3), gi('social_movements', 5)]],
      ['Negociar com garimpeiros', [cred(-3), gi('environmental', -6)]],
    ] }),
  f({ id: 'fed_biocombustivel', cat: 'economy', w: 2, cd: 700,
    title: 'Mistura de etanol na gasolina', text: 'Usineiros pedem aumentar a mistura para 30%.',
    opts: [
      ['Aumentar a mistura', [gi('agribusiness', 6), gi('environmental', 3), cap(-3)]],
      ['Manter', [gi('agribusiness', -2)]],
    ] }),
  f({ id: 'fed_nuclear', cat: 'politics', w: 1, cd: 1200,
    title: 'Usina nuclear parada', text: 'A obra está parada há anos e custa caro mantê-la.',
    opts: [
      ['Retomar a obra', [gasto('industry', 0.05), gi('environmental', -4)]],
      ['Abandonar', [cred(-1)]],
    ] }),

  // ─── Tecnologia e mídia ───
  f({ id: 'fed_regular_redes', cat: 'politics', w: 3, cd: 700,
    title: 'Regulação das redes sociais', text: 'Um projeto responsabiliza plataformas por conteúdo criminoso.',
    opts: [
      ['Apoiar a lei', [gi('tech', -6), legit(2), gi('religious', -2)]],
      ['Autorregulação das plataformas', [gi('tech', 4), legit(-1)]],
    ] }),
  f({ id: 'fed_ia', cat: 'politics', w: 2, cd: 700,
    title: 'Marco legal da inteligência artificial', text: 'Sindicatos temem perda de empregos; empresas temem burocracia.',
    opts: [
      ['Regulação com proteção ao trabalhador', [gi('unions', 5), gi('tech', -4)]],
      ['Regulação leve', [gi('tech', 6), gi('unions', -3)]],
    ] }),
  f({ id: 'fed_apostas', cat: 'politics', w: 3, cd: 600,
    title: 'Apostas online viram epidemia', text: 'Famílias endividadas com apostas esportivas.',
    opts: [
      ['Regular duramente', [gi('religious', 5), gasto('administration', 0.01), cred(2)]],
      ['Tributar pesado', [gasto('administration', -0.02), gi('religious', 2), cap(-3)]],
      ['Deixar o mercado como está', [gi('religious', -5), sat(POBRES, -1)]],
    ] }),
  f({ id: 'fed_vazamento_dados', cat: 'scandal', w: 2, cd: 700,
    title: 'Vazamento de dados do governo', text: 'Dados de milhões de cidadãos foram expostos.',
    opts: [
      ['Investigação e transparência', [cred(2), gasto('administration', 0.01)]],
      ['Minimizar', [esc(4)]],
    ] }),
  f({ id: 'fed_jornalista', cat: 'media', w: 2, cd: 600,
    title: 'Jornalista agredido em protesto', text: 'Um repórter foi agredido por manifestantes.',
    opts: [
      ['Condenar com veemência', [cred(2)]],
      ['Ficar em silêncio', [cred(-2)]],
    ] }),

  // ─── Política nacional ───
  f({ id: 'fed_ministros_brigam', cat: 'party', w: 3, cd: 400,
    title: 'Ministros brigam em público', text: 'Dois ministros trocam acusações pela imprensa.',
    opts: [
      ['Demitir os dois', [cap(-4), cred(2)]],
      ['Chamar ao palácio e enquadrar', [cap(-1)]],
    ] }),
  f({ id: 'fed_gafe_ministro', cat: 'media', w: 3, cd: 400,
    title: 'Ministro faz declaração desastrosa', text: 'A fala do ministro viralizou e revoltou o país.',
    opts: [
      ['Demitir', [cap(-4), apr(1)]],
      ['Manter', [apr(-2)]],
    ] }),
  f({ id: 'fed_aliado_candidato', cat: 'party', w: 2, cd: 700,
    title: 'Partido aliado lança candidato próprio', text: 'Um aliado da base quer disputar a Presidência.',
    opts: [
      ['Negociar a vice', [cap(-4), rel('coalition', 4)]],
      ['Romper com o aliado', [rel('coalition', -6)]],
    ] }),
  f({ id: 'fed_manifestacao_contra', cat: 'crisis', w: 3, cd: 300, neg: true, cond: (s) => approvalOf(s) < 40,
    title: 'Manifestações contra o governo', text: 'Milhares nas ruas de várias capitais pedem mudanças.',
    opts: [
      ['Abrir diálogo', [cap(-4), apr(1)]],
      ['Ignorar', [legit(-3), unrest(3)]],
    ] }),
  f({ id: 'fed_manifestacao_favor', cat: 'opportunity', w: 2, cd: 400, cond: (s) => approvalOf(s) > 50,
    title: 'Manifestação a favor do governo', text: 'A base convoca um ato de apoio na Esplanada.',
    opts: [
      ['Discursar no ato', [apr(1), unrest(1), gi('social_movements', 3)]],
      ['Agradecer à distância', [cred(1)]],
    ] }),
  f({ id: 'fed_panelaco', cat: 'media', w: 2, cd: 300, cond: (s) => approvalOf(s) < 45,
    title: 'Panelaço durante pronunciamento', text: 'Bairros de classe média batem panelas durante seu discurso.',
    opts: [['Seguir em frente', [apr(-1), sat(CLASSE_MEDIA, -1)]]] }),
  f({ id: 'fed_fake_presidente', cat: 'media', w: 3, cd: 300, neg: true,
    title: 'Fake news sobre o presidente', text: 'Um vídeo manipulado com sua voz circula nos grupos.',
    opts: [
      ['Desmentir em rede nacional', [apr(1), cap(-2)]],
      ['Acionar a Justiça', [cred(1)]],
    ] }),

  // ─── Mais eventos ───
  f({ id: 'fed_copa', cat: 'opportunity', w: 1, cd: 1400,
    title: 'Seleção na final da Copa', text: 'O país inteiro para para assistir.',
    opts: [
      ['Assistir com o povo num telão', [apr(1), fame(2), cap(-3)]],
      ['Assistir no palácio', []],
    ] }),
  f({ id: 'fed_ouro_olimpico', cat: 'opportunity', w: 1, cd: 1000,
    title: 'Atleta brasileiro ganha ouro', text: 'Uma atleta de origem humilde virou heroína nacional.',
    opts: [
      ['Receber no palácio', [apr(1)]],
      ['Lançar programa de esporte de base', [gasto('education', 0.01), sat(JOVENS, 2)]],
    ] }),
  f({ id: 'fed_desastre_aereo', cat: 'crisis', w: 1, cd: 900, neg: true,
    title: 'Desastre aéreo', text: 'Um avião caiu com 150 passageiros.',
    opts: [
      ['Visitar as famílias e decretar luto', [cred(2)]],
      ['Nota oficial', [cred(-1)]],
    ] }),
  f({ id: 'fed_ataque_escola', cat: 'crisis', w: 1, cd: 900, neg: true,
    title: 'Ataque a uma escola', text: 'Um ataque deixou vítimas e chocou o país.',
    opts: [
      ['Plano nacional de segurança escolar', [gasto('education', 0.02), cred(2), sat(['workers', 'middle_class'], 1)]],
      ['Endurecer penas', [gi('security', 4)]],
    ] }),
  f({ id: 'fed_ajuda_humanitaria', cat: 'opportunity', w: 1, cd: 900,
    title: 'Terremoto num país vizinho', text: 'Milhares de mortos e um pedido de ajuda.',
    opts: [
      ['Enviar bombeiros e mantimentos', [gasto('security', 0.01), fame(3), cred(1)]],
      ['Nota de solidariedade', []],
    ] }),
  f({ id: 'fed_programa_espacial', cat: 'opportunity', w: 1, cd: 1200,
    title: 'Programa espacial', text: 'A agência espacial quer lançar um satélite nacional.',
    opts: [
      ['Investir', [gasto('science', 0.03), fame(3), gi('tech', 3)]],
      ['Adiar', []],
    ] }),
  f({ id: 'fed_terras_raras', cat: 'politics', w: 1, cd: 1200,
    title: 'Descoberta de terras raras', text: 'Geólogos encontram grande reserva de minerais críticos.',
    opts: [
      ['Estatal de minerais críticos', [gi('business', -4), gi('unions', 3), shock('Minerais críticos', 24, { growth: 0.2 })]],
      ['Leilão para empresas privadas', [gi('business', 5), shock('Minerais críticos', 24, { growth: 0.2 }), cap(-3)]],
    ] }),
  f({ id: 'fed_transposicao', cat: 'opportunity', w: 2, cd: 900,
    title: 'Ampliação da transposição', text: 'O semiárido pede novos ramais de água.',
    opts: [
      ['Ampliar', [gasto('infrastructure', 0.06), sat(['farmers'], 3), apr(1)]],
      ['Concluir os ramais atuais', [gasto('infrastructure', 0.02)]],
    ] }),
  f({ id: 'fed_carnaval_critica', cat: 'media', w: 1, cd: 330,
    title: 'Escola de samba satiriza o governo', text: 'O desfile campeão tem um carro alegórico com sua caricatura.',
    opts: [
      ['Rir junto', [apr(1), fame(1), cap(-3)]],
      ['Reagir com críticas', [apr(-2), fame(2)]],
    ] }),
  f({ id: 'fed_indigenas', cat: 'politics', w: 2, cd: 330,
    title: 'Acampamento indígena em Brasília', text: 'Milhares de indígenas acampam pela demarcação de terras.',
    opts: [
      ['Receber as lideranças', [gi('social_movements', 5), gi('agribusiness', -3)]],
      ['Não receber', [gi('social_movements', -5)]],
    ] }),
  f({ id: 'fed_marcha_prefeitos', cat: 'politics', w: 3, cd: 330,
    title: 'Marcha dos prefeitos', text: 'Prefeitos de todo o país pedem mais repasses.',
    opts: [
      ['Aumentar o fundo dos municípios', [gasto('administration', 0.03), cap(5)]],
      ['Prometer estudar', [cap(-2)]],
    ] }),
  f({ id: 'fed_greve_federal', cat: 'crisis', w: 3, cd: 400, neg: true,
    title: 'Greve dos servidores federais', text: 'Agências e universidades param por reajuste.',
    opts: [
      ['Reajuste parcelado', [gasto('administration', 0.03), gi('civil_servants', 6)]],
      ['Cortar o ponto', [gi('civil_servants', -8), radical('civil_servants', 5)]],
    ] }),
  f({ id: 'fed_cannabis', cat: 'politics', w: 1, cd: 900,
    title: 'Cannabis medicinal', text: 'Famílias pedem acesso mais barato a remédios de cannabis.',
    opts: [
      ['Liberar o cultivo para fins medicinais', [gi('religious', -5), sat(JOVENS, 2), cred(1)]],
      ['Manter as regras atuais', [gi('religious', 2)]],
    ] }),
  f({ id: 'fed_ensino_domiciliar', cat: 'politics', w: 1, cd: 900,
    title: 'Ensino domiciliar', text: 'A bancada religiosa quer regulamentar a educação em casa.',
    opts: [
      ['Regulamentar', [gi('religious', 6), gi('civil_servants', -3)]],
      ['Vetar', [gi('religious', -5)]],
    ] }),
  f({ id: 'fed_fim_reeleicao', cat: 'politics', w: 1, cd: 1200,
    title: 'Proposta de fim da reeleição', text: 'O Congresso quer acabar com a reeleição.',
    opts: [
      ['Apoiar', [cred(3), cap(-3)]],
      ['Ser contra', [cred(-1)]],
    ] }),
  f({ id: 'fed_crise_poderes', cat: 'crisis', w: 1, cd: 900, neg: true,
    title: 'Supremo e Congresso em guerra', text: 'O Congresso aprova PEC para limitar decisões do STF.',
    opts: [
      ['Mediar o conflito', [legit(3), cap(-4)]],
      ['Apoiar o Congresso', [legit(-3), cap(4)]],
    ] }),
  f({ id: 'fed_intervencao_militar', cat: 'crisis', w: 1, cd: 1200, neg: true, cond: (s) => s.nation.unrest > 50,
    title: 'Manifestantes pedem intervenção militar', text: 'Acampamentos em frente a quartéis pedem golpe.',
    opts: [
      ['Rechaçar e responsabilizar', [legit(6), unrest(-2), cap(-3)]],
      ['Tolerar', [legit(-8), unrest(4)]],
    ] }),
  f({ id: 'fed_nobel', cat: 'opportunity', w: 1, cd: 1400,
    title: 'Cientista brasileira ganha prêmio internacional', text: 'Uma pesquisadora de universidade pública foi premiada.',
    opts: [
      ['Anunciar mais bolsas de pesquisa', [gasto('science', 0.02), cred(2), sat(JOVENS, 1)]],
      ['Homenagem no palácio', [cred(1)]],
    ] }),
  f({ id: 'fed_corte_bolsas', cat: 'politics', w: 2, cd: 600,
    title: 'Corte em bolsas de pesquisa', text: 'A equipe econômica quer cortar bolsas de pós-graduação.',
    opts: [
      ['Manter as bolsas', [gasto('science', 0.02), gi('youth', 3)]],
      ['Cortar', [gasto('science', -0.02), gi('youth', -6)]],
    ] }),
  f({ id: 'fed_portos', cat: 'economy', w: 2, cd: 500,
    title: 'Fila de navios nos portos', text: 'A safra recorde congestiona os portos.',
    opts: [
      ['Investimento emergencial', [gasto('infrastructure', 0.03), gi('agribusiness', 5)]],
      ['Novas concessões', [gi('business', 4), gi('agribusiness', 2), cap(-3)]],
    ] }),
  f({ id: 'fed_caminhoneiros_diesel', cat: 'crisis', w: 2, cd: 700, neg: true,
    title: 'Caminhoneiros ameaçam parar por diesel', text: 'O diesel subiu 15% em dois meses.',
    opts: [
      ['Subsidiar o diesel', [gasto('industry', 0.04), apr(1)]],
      ['Endurecer contra bloqueios', [chain('fed_greve_caminhoneiros', 15, 0.5), gi('security', 2)]],
    ] }),
  f({ id: 'fed_greve_caminhoneiros', cat: 'crisis', w: 0, chainOnly: true, neg: true,
    title: 'Caminhoneiros param o país', text: 'Postos sem combustível e supermercados sem comida.',
    opts: [
      ['Ceder ao subsídio', [gasto('industry', 0.05), cap(-6)]],
      ['Usar as Forças Armadas', [legit(-3), shock('Desabastecimento', 2, { growth: -0.4, inflation: 0.4 }), apr(-3)]],
    ] }),
  f({ id: 'fed_ultimo_ano', cat: 'politics', w: 2, cd: 900,
    cond: (s) => {
      const end = s.government?.endDate;
      return !!end && Date.parse(end) - Date.parse(s.date) < 365 * 864e5;
    },
    title: 'Último ano de mandato', text: 'A sucessão domina Brasília.',
    opts: [
      ['Lançar um candidato do partido', [cap(4), rel('coalition', -2)]],
      ['Buscar a reeleição', [apr(1)]],
      ['Apoiar um aliado de outro partido', [rel('coalition', 6), cap(-2)]],
    ] }),
  f({ id: 'fed_turismo', cat: 'economy', w: 1, cd: 700,
    title: 'Turismo internacional bate recorde', text: 'O câmbio atraiu turistas estrangeiros.',
    opts: [['Comemorar', [gi('commerce', 3), apr(1)]]] }),
  f({ id: 'fed_emigracao', cat: 'economy', w: 1, cd: 700, neg: true, cond: (s) => s.economy.unemployment > 9,
    title: 'Jovens emigram em massa', text: 'Filas nos consulados para vistos de trabalho.',
    opts: [['Lamentar', [sat(JOVENS, -2), apr(-1)]]] }),
  f({ id: 'fed_super_ricos_operarios', cat: 'politics', w: 1, cd: 900,
    title: 'Jornada de quatro dias', text: 'Centrais sindicais propõem a semana de quatro dias.',
    opts: [
      ['Apoiar um projeto-piloto', [gi('unions', 6), gi('business', -5), sat(OPERARIOS, 2)]],
      ['Ser contra', [gi('unions', -5), gi('business', 3)]],
    ] }),
];
