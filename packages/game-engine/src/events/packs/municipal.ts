/**
 * Pacote de eventos da prefeitura (esfera municipal, prefeito no Executivo).
 * Fonte das ideias: docs/BANCO_DE_CONTEUDO.md, seção 4.
 */
import { approvalOf, deficitIsHigh } from '../conditions';
import {
  apr, cap, chain, CLASSE_MEDIA, cred, esc, ev, flag, gasto, gi, GOV, IDOSOS, JOVENS, MUN, OPERARIOS,
  PAIS, POBRES, radical, rel, sat, type EvInput, unrest, V,
} from '../dsl';
import type { EventDefinition } from '../types';

/** Evento de prefeitura: fase de governo, esfera municipal. */
const m = (i: Omit<EvInput, 'phases' | 'scope'>): EventDefinition => ev({ ...i, phases: GOV, scope: MUN });

export const MUNICIPAL_EVENTS: EventDefinition[] = [
  // ─── Zeladoria e serviços urbanos ───
  m({ id: 'mun_buraco_viral', cat: 'media', w: 6, cd: 120, vars: { bairro: V.bairro },
    title: 'Buraco gigante viraliza', text: 'Um vídeo de um carro engolido por um buraco no {bairro} tem milhões de visualizações. "Cadê o prefeito?", pergunta a legenda.',
    opts: [
      ['Operação tapa-buraco em toda a cidade', [gasto('infrastructure', 0.05), apr(2), sat('all', 1)]],
      ['Consertar só aquele buraco, com câmeras', [gasto('infrastructure', 0.005), apr(0.5)]],
      ['Culpar a gestão anterior', [apr(-1), cred(-2)]],
    ] }),
  m({ id: 'mun_lixo_parado', cat: 'crisis', w: 6, cd: 200, neg: true, vars: { empresa: V.empresa },
    title: 'Coleta de lixo para em {cityName}', text: 'O contrato da {empresa} venceu e o lixo se acumula nas calçadas. Ratos e mau cheiro dominam o noticiário.',
    opts: [
      ['Contrato emergencial (caro)', [gasto('administration', 0.06), apr(1)]],
      ['Garis da prefeitura em hora extra', [gasto('administration', 0.03), gi('civil_servants', 4), apr(0.5)]],
      ['Esperar a nova licitação', [apr(-5), sat('all', -2)]],
    ] }),
  m({ id: 'mun_iluminacao', cat: 'regional', w: 4, cd: 150, vars: { bairro: V.bairro },
    title: 'Bairro às escuras', text: 'Moradores do {bairro} denunciam ruas sem luz há semanas. Os assaltos aumentaram.',
    opts: [
      ['Trocar toda a iluminação por LED', [gasto('infrastructure', 0.03), sat(POBRES, 2), gi('security', 3)]],
      ['Conserto pontual', [gasto('infrastructure', 0.005)]],
    ] }),
  m({ id: 'mun_mato_pracas', cat: 'regional', w: 3, cd: 180,
    title: 'Mato alto nas praças', text: 'Com as chuvas, o mato tomou praças e canteiros de {cityName}.',
    opts: [
      ['Contratar roçada', [gasto('infrastructure', 0.01), apr(0.5)]],
      ['Programa "Adote uma praça" com empresas', [gi('commerce', 4), apr(0.5), cap(-3)]],
    ] }),
  m({ id: 'mun_cemiterio', cat: 'regional', w: 2, cd: 400,
    title: 'Cemitério municipal lotado', text: 'Não há mais vagas no cemitério público. Famílias esperam dias para enterrar parentes.',
    opts: [
      ['Construir crematório público', [gasto('administration', 0.04), gi('religious', -4), apr(1)]],
      ['Ampliar o cemitério', [gasto('infrastructure', 0.03), apr(1)]],
    ] }),
  m({ id: 'mun_calcadas', cat: 'regional', w: 3, cd: 300,
    title: 'Idosos caem em calçadas quebradas', text: 'Reportagem mostra idosos feridos por calçadas destruídas no centro.',
    opts: [
      ['Programa de calçadas acessíveis', [gasto('infrastructure', 0.04), sat(IDOSOS, 3), gi('retirees', 4)]],
      ['Notificar os proprietários', [sat(CLASSE_MEDIA, -1), apr(0.5)]],
    ] }),
  m({ id: 'mun_bueiros', cat: 'crisis', w: 4, cd: 300,
    title: 'Bueiros entupidos antes das chuvas', text: 'A Defesa Civil alerta: os bueiros estão entupidos e o verão está chegando.',
    opts: [
      ['Limpeza preventiva', [gasto('infrastructure', 0.02), flag('mun_bueiros_limpos')]],
      ['Adiar para o ano que vem', [chain('mun_alagamento', 60, 0.6)]],
    ] }),
  m({ id: 'mun_animais', cat: 'politics', w: 3, cd: 300,
    title: 'Protetores cobram política para animais', text: 'Grupos de proteção animal fazem ato na porta da prefeitura.',
    opts: [
      ['Castração gratuita em massa', [gasto('health', 0.01), sat(CLASSE_MEDIA, 2)]],
      ['Hospital veterinário público', [gasto('health', 0.03), sat(CLASSE_MEDIA, 3), apr(1)]],
      ['Não é prioridade agora', [sat(CLASSE_MEDIA, -2)]],
    ] }),

  // ─── Transporte ───
  m({ id: 'mun_tarifa', cat: 'politics', w: 6, cd: 360, neg: true,
    title: 'Empresas de ônibus pedem reajuste', text: 'As concessionárias querem 15% de aumento na tarifa. Estudantes prometem protestos.',
    opts: [
      ['Subsidiar e manter a tarifa', [gasto('infrastructure', 0.06), sat(POBRES, 2), gi('youth', 4)]],
      ['Autorizar o reajuste', [apr(-5), sat(['students', 'workers'], -3), chain('mun_protesto_tarifa', 15, 0.7)]],
      ['Reajuste menor, negociado', [apr(-2), cap(-5)]],
    ] }),
  m({ id: 'mun_protesto_tarifa', cat: 'crisis', w: 0, chainOnly: true, neg: true,
    title: 'Protestos contra a tarifa tomam o centro', text: 'Milhares de estudantes bloqueiam avenidas contra o aumento da passagem.',
    opts: [
      ['Revogar o aumento', [apr(2), cap(-10), gasto('infrastructure', 0.04), gi('youth', 6)]],
      ['Manter e dialogar', [apr(-2), unrest(3)]],
      ['Pedir que a polícia libere as vias', [apr(-3), gi('youth', -8), gi('security', 4)]],
    ] }),
  m({ id: 'mun_greve_onibus', cat: 'crisis', w: 4, cd: 300, neg: true,
    title: 'Greve de motoristas de ônibus', text: 'A empresa atrasou salários e os motoristas cruzaram os braços. A cidade parou.',
    opts: [
      ['Intervir no contrato e pagar os salários', [gasto('infrastructure', 0.03), sat(OPERARIOS, 2), gi('unions', 5)]],
      ['Esperar a Justiça', [apr(-3), sat('all', -1)]],
    ] }),
  m({ id: 'mun_ciclovia', cat: 'politics', w: 3, cd: 400,
    title: 'Ciclovia divide a cidade', text: 'Comerciantes reclamam que a nova ciclovia tirou vagas de estacionamento.',
    opts: [
      ['Manter e ampliar', [sat(JOVENS, 3), sat(['merchants'], -3), gi('environmental', 4)]],
      ['Remover a ciclovia', [sat(['merchants'], 3), sat(JOVENS, -3), gi('environmental', -4)]],
    ] }),
  m({ id: 'mun_apps', cat: 'politics', w: 3, cd: 400,
    title: 'Taxistas protestam contra aplicativos', text: 'Taxistas fazem buzinaço exigindo regras para os aplicativos de transporte.',
    opts: [
      ['Regulamentar com taxa por corrida', [gi('commerce', 2), sat(JOVENS, -2), apr(0.5)]],
      ['Liberar: concorrência é boa', [sat(JOVENS, 2), gi('workers', -3)]],
    ] }),
  m({ id: 'mun_passe_livre', cat: 'politics', w: 3, cd: 500,
    title: 'Campanha pelo passe livre estudantil', text: 'Grêmios estudantis entregam abaixo-assinado com 50 mil assinaturas.',
    opts: [
      ['Aprovar o passe livre', [gasto('education', 0.05), sat(['students'], 5), gi('youth', 8), apr(1)]],
      ['Meia-passagem ampliada', [gasto('education', 0.02), sat(['students'], 2)]],
      ['Não cabe no orçamento', [sat(['students'], -3), gi('youth', -5)]],
    ] }),
  m({ id: 'mun_brt_atrasado', cat: 'economy', w: 3, cd: 400, vars: { empresa: V.empresa },
    title: 'Corredor de ônibus atrasado', text: 'A {empresa} pede aditivo de 30% para terminar o corredor de ônibus.',
    opts: [
      ['Pagar o aditivo', [gasto('infrastructure', 0.05), chain('mun_aditivo_tce', 120, 0.35)]],
      ['Romper o contrato', [apr(-2), cap(-5)]],
    ] }),
  m({ id: 'mun_aditivo_tce', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Tribunal de Contas questiona aditivo', text: 'O TCE abre auditoria sobre o aditivo do corredor de ônibus.',
    opts: [
      ['Colaborar com a auditoria', [cred(2), cap(-5)]],
      ['Contestar o tribunal', [esc(6), cred(-2)]],
    ] }),

  // ─── Saúde ───
  m({ id: 'mun_fila_upa', cat: 'crisis', w: 5, cd: 200, neg: true,
    title: 'Fila de horas na UPA', text: 'No pico do inverno, pacientes esperam até 10 horas por atendimento.',
    opts: [
      ['Mutirão de plantões', [gasto('health', 0.04), sat(['health_workers'], 2), apr(1)]],
      ['Hospital de campanha', [gasto('health', 0.07), apr(2)]],
      ['Pedir ajuda ao governo do estado', [apr(-1)]],
    ] }),
  m({ id: 'mun_dengue', cat: 'crisis', w: 5, cd: 365, neg: true,
    title: 'Surto de dengue em {cityName}', text: 'Os casos de dengue subiram 300% e os postos estão lotados.',
    opts: [
      ['Mutirão contra criadouros', [gasto('health', 0.03), apr(1)]],
      ['Fumacê em toda a cidade', [gasto('health', 0.02), chain('mun_dengue_pico', 30, 0.4)]],
      ['Esperar o fim das chuvas', [apr(-3), chain('mun_dengue_pico', 25, 0.8)]],
    ] }),
  m({ id: 'mun_dengue_pico', cat: 'crisis', w: 0, chainOnly: true, neg: true,
    title: 'Dengue lota hospitais', text: 'A epidemia chega ao pico. A morte de uma criança vira manchete nacional.',
    opts: [
      ['Decretar emergência e abrir tendas', [gasto('health', 0.06), apr(-1)]],
      ['Responsabilizar o estado', [apr(-4), cred(-2)]],
    ] }),
  m({ id: 'mun_farmacia', cat: 'crisis', w: 4, cd: 240, neg: true,
    title: 'Falta remédio na farmácia básica', text: 'O fornecedor atrasou e faltam remédios para pressão e diabetes.',
    opts: [
      ['Compra emergencial', [gasto('health', 0.02), sat(IDOSOS, 1)]],
      ['Esperar a entrega', [apr(-2), sat(IDOSOS, -3)]],
    ] }),
  m({ id: 'mun_cirurgias', cat: 'opportunity', w: 3, cd: 400,
    title: 'Fila de cirurgias passa de dois anos', text: 'Milhares esperam por cirurgias simples. Hospitais privados oferecem parceria.',
    opts: [
      ['Mutirão de cirurgias', [gasto('health', 0.06), apr(4), sat(IDOSOS, 3)]],
      ['Parceria com hospitais privados', [gasto('health', 0.03), apr(2), gi('unions', -3)]],
    ] }),
  m({ id: 'mun_santa_casa', cat: 'crisis', w: 3, cd: 500, neg: true,
    title: 'Santa Casa ameaça fechar', text: 'O hospital filantrópico que atende metade da cidade diz que fecha em 30 dias sem socorro.',
    opts: [
      ['Socorro financeiro', [gasto('health', 0.08), apr(2), gi('religious', 4)]],
      ['Intervenção municipal', [gasto('health', 0.05), cap(-8), apr(1)]],
      ['Deixar fechar', [apr(-6), sat('all', -3)]],
    ] }),
  m({ id: 'mun_saude_mental', cat: 'politics', w: 3, cd: 400,
    title: 'Casos de saúde mental explodem', text: 'Psicólogos da rede alertam para o aumento de depressão e ansiedade entre jovens.',
    opts: [
      ['Abrir um CAPS 24 horas', [gasto('health', 0.03), sat(JOVENS, 2), apr(1)]],
      ['Atendimento online', [gasto('health', 0.01), sat(JOVENS, 1)]],
    ] }),
  m({ id: 'mun_vacinacao', cat: 'politics', w: 3, cd: 365,
    title: 'Vacinação infantil em baixa', text: 'A cobertura vacinal caiu abaixo de 70%. Médicos alertam para o risco de sarampo.',
    opts: [
      ['Vacinação nas escolas', [gasto('health', 0.01), sat(PAIS, 1), cred(1)]],
      ['Campanha publicitária', [gasto('administration', 0.01)]],
    ] }),

  // ─── Educação ───
  m({ id: 'mun_fila_creche', cat: 'politics', w: 5, cd: 365,
    title: '3 mil crianças na fila da creche', text: 'Mães fazem fila de madrugada por vagas. A Defensoria ameaça processar a prefeitura.',
    opts: [
      ['Conveniar creches privadas', [gasto('education', 0.04), sat(PAIS, 3), apr(2)]],
      ['Construir cinco creches', [gasto('education', 0.08), sat(PAIS, 4), apr(1), flag('mun_creches_obra')]],
      ['Pedir prazo à Justiça', [apr(-3), sat(PAIS, -3)]],
    ] }),
  m({ id: 'mun_merenda', cat: 'media', w: 4, cd: 300, neg: true, vars: { empresa: V.empresa },
    title: 'Vídeo de merenda estragada', text: 'Um aluno filmou a merenda servida pela {empresa}: arroz com bichos.',
    opts: [
      ['Trocar o fornecedor', [gasto('education', 0.02), apr(1)]],
      ['Cozinhas próprias nas escolas', [gasto('education', 0.05), sat(PAIS, 3), apr(2)]],
      ['Defender o contrato', [apr(-3), esc(4)]],
    ] }),
  m({ id: 'mun_greve_professores', cat: 'crisis', w: 5, cd: 365, neg: true,
    title: 'Professores municipais entram em greve', text: 'A rede exige o piso nacional. Escolas fechadas há uma semana.',
    opts: [
      ['Pagar o piso', [gasto('education', 0.08), gi('civil_servants', 8), sat(PAIS, 2)]],
      ['Parcelar em dois anos', [gasto('education', 0.03), cap(-5), gi('civil_servants', 2)]],
      ['Cortar o ponto', [apr(-3), gi('civil_servants', -10), gi('unions', -8)]],
    ] }),
  m({ id: 'mun_telhado', cat: 'crisis', w: 3, cd: 400, neg: true, vars: { bairro: V.bairro },
    title: 'Teto de escola desaba', text: 'Parte do telhado de uma escola do {bairro} caiu durante a chuva. Ninguém se feriu por pouco.',
    opts: [
      ['Reforma emergencial e vistoria em todas as escolas', [gasto('education', 0.04), apr(1), cred(2)]],
      ['Reformar só aquela escola', [gasto('education', 0.01), apr(-1)]],
    ] }),
  m({ id: 'mun_civico_militar', cat: 'politics', w: 3, cd: 500,
    title: 'Escolas cívico-militares em debate', text: 'O governo federal oferece verba para escolas cívico-militares. A rede se divide.',
    opts: [
      ['Aderir', [gi('security', 6), gi('religious', 3), gi('youth', -5), sat(PAIS, 1)]],
      ['Recusar', [gi('security', -4), gi('youth', 3)]],
    ] }),
  m({ id: 'mun_tempo_integral', cat: 'opportunity', w: 3, cd: 500,
    title: 'Programa federal de tempo integral', text: 'O MEC oferece verba para ampliar escolas em tempo integral, com contrapartida municipal.',
    opts: [
      ['Aderir com contrapartida', [gasto('education', 0.05), sat(PAIS, 3), apr(1)]],
      ['Não aderir agora', []],
    ] }),
  m({ id: 'mun_ideb', cat: 'politics', w: 3, cd: 600,
    title: 'Nota do ensino fundamental cai', text: 'O índice da educação de {cityName} caiu e ficou abaixo da média do estado.',
    opts: [
      ['Programa de reforço escolar', [gasto('education', 0.03), sat(PAIS, 2)]],
      ['Bônus para professores por desempenho', [gi('civil_servants', -3), gi('business', 3), cred(1)]],
    ] }),

  // ─── Chuvas, clima e Defesa Civil ───
  m({ id: 'mun_alagamento', cat: 'crisis', w: 4, cd: 120, neg: true, vars: { bairro: V.bairro },
    cond: (s) => !(s.events.flags?.mun_bueiros_limpos ?? 0),
    title: 'Alagamento no {bairro}', text: 'Uma chuva de duas horas deixou ruas submersas e carros boiando.',
    opts: [
      ['Bombas e equipes de plantão', [gasto('infrastructure', 0.02), apr(0.5)]],
      ['Obra de drenagem definitiva', [gasto('infrastructure', 0.07), apr(1), flag('mun_bueiros_limpos')]],
      ['Esperar a água baixar', [apr(-3)]],
    ] }),
  m({ id: 'mun_deslizamento', cat: 'crisis', w: 3, cd: 300, neg: true, vars: { bairro: V.bairro },
    title: 'Risco de deslizamento no {bairro}', text: 'A Defesa Civil interditou 200 casas na encosta. Moradores se recusam a sair.',
    opts: [
      ['Evacuar com aluguel social', [gasto('social', 0.05), apr(1), cred(2)]],
      ['Monitorar e esperar', [chain('mun_tragedia_morro', 45, 0.45)]],
    ] }),
  m({ id: 'mun_tragedia_morro', cat: 'crisis', w: 0, chainOnly: true, neg: true,
    title: 'Deslizamento deixa vítimas', text: 'A chuva derrubou casas na encosta interditada. Há mortos e desaparecidos.',
    opts: [
      ['Decretar calamidade e assumir a responsabilidade', [gasto('social', 0.06), apr(-4), cred(2)]],
      ['Culpar os moradores que não saíram', [apr(-9), cred(-5)]],
    ] }),
  m({ id: 'mun_onda_calor', cat: 'crisis', w: 3, cd: 300,
    title: 'Onda de calor de 40 °C', text: 'Termômetros batem recorde. Idosos são internados por desidratação.',
    opts: [
      ['Pontos de hidratação e abrigos climatizados', [gasto('health', 0.01), sat(IDOSOS, 2), apr(1)]],
      ['Plantio emergencial de árvores', [gasto('infrastructure', 0.02), gi('environmental', 4)]],
    ] }),
  m({ id: 'mun_frio', cat: 'crisis', w: 3, cd: 300, regions: ['sul', 'sudeste'],
    title: 'Frio extremo', text: 'A temperatura chega a 2 °C e pessoas em situação de rua correm risco de morte.',
    opts: [
      ['Abrigos emergenciais e cobertores', [gasto('social', 0.02), apr(2)]],
      ['Campanha do agasalho com a sociedade', [apr(1), cred(1), cap(-3)]],
    ] }),
  m({ id: 'mun_granizo', cat: 'crisis', w: 2, cd: 300, vars: { bairro: V.bairro },
    title: 'Chuva de granizo destrói telhados', text: 'O granizo destruiu telhados de centenas de casas no {bairro}.',
    opts: [
      ['Doar telhas e lonas', [gasto('social', 0.02), apr(3)]],
      ['Linha de crédito para reforma', [apr(1)]],
    ] }),
  m({ id: 'mun_seca_reservatorio', cat: 'crisis', w: 3, cd: 365, neg: true, regions: ['nordeste', 'centro_oeste', 'sudeste'],
    title: 'Reservatório da cidade em nível crítico', text: 'A represa que abastece {cityName} está com 15% da capacidade.',
    opts: [
      ['Rodízio de água', [apr(-4), sat('all', -2)]],
      ['Caminhões-pipa nos bairros altos', [gasto('infrastructure', 0.03), apr(-1)]],
      ['Campanha de economia com bônus na conta', [gasto('infrastructure', 0.01), apr(1)]],
    ] }),
  m({ id: 'mun_incendio_favela', cat: 'crisis', w: 2, cd: 400, neg: true, vars: { bairro: V.bairro },
    title: 'Incêndio destrói barracos no {bairro}', text: 'Um incêndio deixou 300 famílias sem casa.',
    opts: [
      ['Aluguel social e reconstrução', [gasto('social', 0.05), apr(2), sat(POBRES, 3)]],
      ['Conjunto habitacional em outro bairro', [gasto('social', 0.08), apr(1), gi('social_movements', -3)]],
    ] }),

  // ─── Câmara Municipal ───
  m({ id: 'mun_orcamento_rejeitado', cat: 'politics', w: 4, cd: 365, neg: true,
    title: 'Câmara ameaça rejeitar o orçamento', text: 'Vereadores querem emendas para suas bases antes de votar o orçamento.',
    opts: [
      ['Liberar as emendas', [gasto('administration', 0.03), cap(5)]],
      ['Negociar com os líderes', [cap(-8)]],
      ['Governar com duodécimo', [apr(-2), cap(-3)]],
    ] }),
  m({ id: 'mun_vereador_cargo', cat: 'party', w: 4, cd: 200, vars: { pessoa: V.pessoa },
    title: 'Vereador da base pede uma secretaria', text: 'O vereador {pessoa} ameaça romper se não indicar o secretário de obras.',
    opts: [
      ['Aceitar a indicação', [cap(6), flag('mun_secretario_politico')]],
      ['Recusar e manter o técnico', [cap(-6), cred(2)]],
    ] }),
  m({ id: 'mun_cpi_municipal', cat: 'scandal', w: 3, cd: 400, neg: true,
    cond: (s) => (s.candidates[s.playerId]?.scandal ?? 0) >= 10,
    title: 'Vereadores querem CPI contra a prefeitura', text: 'A oposição colhe assinaturas para investigar contratos da prefeitura.',
    opts: [
      ['Usar a base para barrar a CPI', [cap(-12), esc(3)]],
      ['Colaborar com a investigação', [cred(3), cap(-4)]],
    ] }),
  m({ id: 'mun_salario_vereadores', cat: 'politics', w: 3, cd: 700,
    title: 'Vereadores aumentam o próprio salário', text: 'A Câmara aprovou reajuste de 40% para os vereadores. A sanção é sua.',
    opts: [
      ['Vetar', [apr(3), cap(-10)]],
      ['Sancionar', [apr(-2), cap(4)]],
    ] }),
  m({ id: 'mun_presidente_camara', cat: 'politics', w: 3, cd: 500, vars: { pessoa: V.pessoa },
    title: 'Presidente da Câmara rompe com você', text: '{pessoa}, presidente da Câmara, anunciou que vai engavetar os projetos da prefeitura.',
    opts: [
      ['Reaproximação com cargos', [cap(-10), flag('mun_camara_acordo')]],
      ['Guerra aberta: ir para as redes', [apr(1), cap(-4)]],
    ] }),

  // ─── Finanças ───
  m({ id: 'mun_iptu', cat: 'economy', w: 4, cd: 700,
    title: 'Planta do IPTU está defasada há 15 anos', text: 'Técnicos da Fazenda dizem que a cidade perde milhões com valores antigos.',
    opts: [
      ['Atualizar os valores', [apr(-4), gi('business', -3), gasto('administration', -0.06)]],
      ['Atualizar só para imóveis de alto padrão', [apr(-1), gasto('administration', -0.03), sat(POBRES, 1)]],
      ['Manter como está', []],
    ] }),
  m({ id: 'mun_folha_atrasada', cat: 'crisis', w: 4, cd: 365, neg: true, cond: deficitIsHigh,
    title: 'Caixa não fecha a folha do mês', text: 'Faltam recursos para pagar os servidores em dia.',
    opts: [
      ['Atrasar fornecedores', [gi('commerce', -4), apr(-1)]],
      ['Atrasar os salários', [gi('civil_servants', -12), apr(-4), radical('civil_servants', 8)]],
      ['Empréstimo de curto prazo', [cap(-5), gasto('administration', 0.02)]],
    ] }),
  m({ id: 'mun_refis', cat: 'economy', w: 3, cd: 600,
    title: 'Proposta de Refis municipal', text: 'A Fazenda propõe desconto de multas para quem pagar dívidas com a prefeitura.',
    opts: [
      ['Lançar o Refis', [gasto('administration', -0.04), gi('commerce', 4), cap(-3)]],
      ['Cobrar na Justiça', [cred(1), cap(-3)]],
    ] }),
  m({ id: 'mun_emprestimo_bird', cat: 'opportunity', w: 2, cd: 900,
    title: 'Banco multilateral oferece empréstimo', text: 'Um banco internacional oferece crédito barato para saneamento, em dólar.',
    opts: [
      ['Contratar para saneamento', [gasto('infrastructure', -0.05), apr(1), flag('mun_divida_dolar'), cap(-3)]],
      ['Recusar o risco cambial', []],
    ] }),

  // ─── Cultura, festas e esporte ───
  m({ id: 'mun_carnaval', cat: 'politics', w: 3, cd: 330,
    title: 'Carnaval sem dinheiro', text: 'Escolas de samba e blocos cobram verba. O caixa está apertado.',
    opts: [
      ['Bancar a festa', [gasto('administration', 0.03), apr(2)]],
      ['Buscar patrocínio privado', [gi('commerce', 3), apr(1), cap(-3)]],
      ['Cancelar o desfile', [apr(-4), gi('commerce', -4)]],
    ] }),
  m({ id: 'mun_sao_joao', cat: 'politics', w: 4, cd: 330, regions: ['nordeste'],
    title: 'São João de {cityName}', text: 'Comerciantes e artistas querem a maior festa junina da região.',
    opts: [
      ['Festa grande com atrações nacionais', [gasto('administration', 0.03), apr(3), gi('commerce', 5)]],
      ['Festa com artistas locais', [gasto('administration', 0.01), apr(1)]],
    ] }),
  m({ id: 'mun_show_caro', cat: 'media', w: 3, cd: 300,
    title: 'Cachê milionário em show gratuito', text: 'O Ministério Público questiona o cachê de um cantor famoso para o aniversário da cidade.',
    opts: [
      ['Manter o show', [apr(1), esc(4), cred(-2)]],
      ['Cancelar e investir em cultura local', [apr(-1), cred(2)]],
    ] }),
  m({ id: 'mun_time_patrocinio', cat: 'politics', w: 2, cd: 500,
    title: 'Time da cidade pede patrocínio', text: 'O clube da cidade, na segunda divisão, pede patrocínio da prefeitura.',
    opts: [
      ['Patrocinar', [gasto('administration', 0.01), apr(1), cred(-1)]],
      ['Recusar', []],
    ] }),
  m({ id: 'mun_patrimonio', cat: 'regional', w: 2, cd: 500,
    title: 'Casarão histórico ameaça desabar', text: 'Um casarão tombado do centro está prestes a cair. O dono quer demolir.',
    opts: [
      ['Desapropriar e restaurar', [gasto('administration', 0.04), cred(2)]],
      ['Liberar a demolição', [gi('business', 3), cred(-2)]],
    ] }),

  // ─── Moradia e urbanismo ───
  m({ id: 'mun_ocupacao_predio', cat: 'politics', w: 4, cd: 365,
    title: 'Prédio abandonado é ocupado', text: 'Um movimento de moradia ocupou um prédio vazio no centro com 150 famílias.',
    opts: [
      ['Negociar retrofit para moradia popular', [gasto('social', 0.06), gi('social_movements', 8), gi('business', -3)]],
      ['Apoiar a reintegração de posse', [gi('social_movements', -10), gi('security', 4), sat(POBRES, -2)]],
    ] }),
  m({ id: 'mun_regularizacao', cat: 'opportunity', w: 3, cd: 500,
    title: 'Mutirão de escrituras', text: 'Cinco mil famílias vivem há décadas sem a escritura das casas.',
    opts: [
      ['Programa de regularização', [gasto('administration', 0.02), apr(4), sat(POBRES, 4)]],
      ['Deixar para depois', []],
    ] }),
  m({ id: 'mun_condominio_verde', cat: 'politics', w: 3, cd: 500, vars: { empresa: V.empresa },
    title: 'Condomínio de luxo em área verde', text: 'A {empresa} quer construir um condomínio numa área de mata nativa.',
    opts: [
      ['Aprovar com contrapartidas', [gi('business', 5), gi('environmental', -8), gasto('administration', -0.02)]],
      ['Negar a licença', [gi('environmental', 6), gi('business', -4)]],
    ] }),
  m({ id: 'mun_plano_diretor', cat: 'politics', w: 3, cd: 900,
    title: 'Revisão do plano diretor', text: 'Incorporadoras querem liberar prédios altos na orla e nos bairros nobres.',
    opts: [
      ['Liberar a verticalização', [gi('business', 6), gasto('administration', -0.02), sat(CLASSE_MEDIA, -2)]],
      ['Manter limites e criar áreas verdes', [gi('environmental', 5), gi('business', -4)]],
      ['Audiências públicas longas', [cap(-4), cred(2)]],
    ] }),

  // ─── Segurança municipal ───
  m({ id: 'mun_guarda_armada', cat: 'politics', w: 3, cd: 600,
    title: 'Guarda municipal armada?', text: 'Após um assalto a uma escola, cresce a pressão para armar a guarda municipal.',
    opts: [
      ['Armar a guarda', [gi('security', 8), gi('youth', -4), gasto('security', 0.03)]],
      ['Mais guardas, sem armas de fogo', [gasto('security', 0.03), apr(1)]],
    ] }),
  m({ id: 'mun_cameras', cat: 'politics', w: 3, cd: 600,
    title: 'Câmeras com reconhecimento facial', text: 'Uma empresa oferece rede de câmeras inteligentes para toda a cidade.',
    opts: [
      ['Instalar', [gasto('security', 0.04), gi('security', 5), gi('youth', -3)]],
      ['Recusar por privacidade', [gi('youth', 2), gi('security', -2)]],
    ] }),
  m({ id: 'mun_feminicidio', cat: 'crisis', w: 3, cd: 400, neg: true,
    title: 'Feminicídio choca a cidade', text: 'Uma mulher foi morta pelo ex-companheiro após cinco boletins de ocorrência.',
    opts: [
      ['Criar a Casa da Mulher', [gasto('social', 0.03), cred(3), apr(1)]],
      ['Nota de pesar', [apr(-1)]],
    ] }),
  m({ id: 'mun_ambulantes', cat: 'politics', w: 3, cd: 365,
    title: 'Ambulantes tomam o centro', text: 'Lojistas reclamam da concorrência dos camelôs nas calçadas.',
    opts: [
      ['Fiscalização dura', [gi('commerce', 5), sat(POBRES, -2)]],
      ['Camelódromo regularizado', [gasto('administration', 0.02), sat(POBRES, 2), gi('commerce', 2)]],
    ] }),

  // ─── Assistência social e economia local ───
  m({ id: 'mun_populacao_rua', cat: 'crisis', w: 4, cd: 365,
    title: 'População de rua dobra', text: 'O número de pessoas vivendo nas ruas dobrou em um ano.',
    opts: [
      ['Centros de acolhida e emprego', [gasto('social', 0.05), apr(1), gi('social_movements', 4)]],
      ['Retirar das áreas centrais', [gi('commerce', 4), gi('social_movements', -8), cred(-2)]],
    ] }),
  m({ id: 'mun_restaurante_popular', cat: 'opportunity', w: 3, cd: 600,
    title: 'Fome nos bairros pobres', text: 'Pesquisa mostra que uma em cada cinco famílias pula refeições.',
    opts: [
      ['Abrir restaurantes populares', [gasto('social', 0.04), apr(2), sat(POBRES, 4)]],
      ['Cestas básicas', [gasto('social', 0.02), sat(POBRES, 2)]],
    ] }),
  m({ id: 'mun_fabrica_fecha', cat: 'economy', w: 3, cd: 600, neg: true, vars: { empresa: V.empresa },
    title: '{empresa} fecha fábrica na cidade', text: 'Mil trabalhadores serão demitidos. O sindicato pede socorro.',
    opts: [
      ['Atrair nova empresa com isenção', [gasto('industry', 0.04), gi('industry', 5)]],
      ['Programa de requalificação', [gasto('social', 0.03), sat(OPERARIOS, 3), gi('unions', 4)]],
    ] }),
  m({ id: 'mun_shopping_isencao', cat: 'economy', w: 3, cd: 500,
    title: 'Shopping pede isenção para se instalar', text: 'Um grupo promete 2 mil empregos se não pagar IPTU por dez anos.',
    opts: [
      ['Conceder a isenção', [gi('business', 5), gi('commerce', -3), sat(['unemployed'], 3)]],
      ['Negociar contrapartidas', [cap(-3), gi('business', 2)]],
      ['Recusar', [gi('commerce', 3)]],
    ] }),

  // ─── Meio ambiente urbano ───
  m({ id: 'mun_lixao', cat: 'politics', w: 3, cd: 700, neg: true,
    title: 'Lixão precisa fechar', text: 'A lei federal manda fechar o lixão. Nenhuma cidade vizinha aceita receber o aterro.',
    opts: [
      ['Consórcio regional de aterro', [gasto('infrastructure', 0.05), gi('environmental', 6), cred(2)]],
      ['Aterro na própria cidade', [gasto('infrastructure', 0.03), apr(-2)]],
      ['Pedir mais prazo', [gi('environmental', -6)]],
    ] }),
  m({ id: 'mun_reciclagem', cat: 'opportunity', w: 2, cd: 500,
    title: 'Catadores pedem apoio', text: 'Cooperativas de catadores pedem galpões e caminhões.',
    opts: [
      ['Apoiar as cooperativas', [gasto('social', 0.01), sat(POBRES, 2), gi('environmental', 4)]],
      ['Coleta seletiva terceirizada', [gasto('infrastructure', 0.02), gi('business', 2)]],
    ] }),
  m({ id: 'mun_rio_poluido', cat: 'politics', w: 3, cd: 700,
    title: 'Rio da cidade é um esgoto a céu aberto', text: 'Reportagem mostra o rio que corta {cityName} morto pela poluição.',
    opts: [
      ['Plano de despoluição de 10 anos', [gasto('infrastructure', 0.06), gi('environmental', 8), cred(2)]],
      ['Multar as indústrias poluidoras', [gi('industry', -5), gi('environmental', 5)]],
    ] }),

  // ─── Relações com estado e União ───
  m({ id: 'mun_governador_rival', cat: 'politics', w: 3, cd: 500,
    title: 'Governador corta convênios', text: 'O governo do estado suspendeu convênios com a prefeitura, alegando "falta de documentos".',
    opts: [
      ['Aproximação política', [cap(-8), flag('mun_aliado_governador')]],
      ['Denunciar perseguição', [apr(2), cap(-2)]],
    ] }),
  m({ id: 'mun_visita_presidente', cat: 'opportunity', w: 2, cd: 600,
    title: 'Presidente vai inaugurar obra federal na cidade', text: 'O Planalto convida você para a inauguração de um conjunto habitacional.',
    opts: [
      ['Subir no palanque', [apr(1), rel('coalition', 4), cap(-3)]],
      ['Mandar um secretário', []],
    ] }),
  m({ id: 'mun_marcha_prefeitos', cat: 'opportunity', w: 2, cd: 365,
    title: 'Marcha dos prefeitos em Brasília', text: 'Prefeitos de todo o país vão a Brasília pedir mais repasses.',
    opts: [
      ['Liderar a comitiva do estado', [cap(4), apr(1), cap(-3)]],
      ['Ficar e governar', []],
    ] }),

  // ─── Gestão ───
  m({ id: 'mun_secretario_demite', cat: 'party', w: 3, cd: 400,
    title: 'Secretário de saúde pede demissão', text: 'O secretário saiu atirando: diz que a pasta não tem recursos.',
    opts: [
      ['Nomear um técnico de fora', [cred(2), cap(-3)]],
      ['Nomear um aliado político', [cap(4), cred(-1)]],
    ] }),
  m({ id: 'mun_servidor_corrupto', cat: 'scandal', w: 3, cd: 400,
    title: 'Fiscal flagrado cobrando propina', text: 'Um fiscal de obras foi filmado recebendo dinheiro de um comerciante.',
    opts: [
      ['Exonerar e denunciar à polícia', [cred(3), apr(1), cap(-3)]],
      ['Abrir sindicância interna', [cred(-1)]],
    ] }),
  m({ id: 'mun_prefeitura_digital', cat: 'opportunity', w: 3, cd: 700,
    title: 'Proposta de prefeitura digital', text: 'Uma equipe propõe colocar todos os serviços no celular.',
    opts: [
      ['Investir', [gasto('administration', 0.03), sat(JOVENS, 3), apr(1)]],
      ['Depois', []],
    ] }),
  m({ id: 'mun_gabinete_itinerante', cat: 'opportunity', w: 3, cd: 200, vars: { bairro: V.bairro },
    title: 'Moradores pedem a sua visita', text: 'Lideranças do {bairro} dizem que nunca viram o prefeito por lá.',
    opts: [
      ['Gabinete itinerante no bairro', [apr(2), sat(POBRES, 2), cap(-3)]],
      ['Mandar um assessor', [apr(-0.5)]],
    ] }),
  m({ id: 'mun_aniversario', cat: 'opportunity', w: 2, cd: 330,
    title: 'Aniversário de {cityName}', text: 'A cidade completa mais um ano. A população espera festa e anúncios.',
    opts: [
      ['Festa com inauguração', [gasto('administration', 0.01), apr(2)]],
      ['Sessão solene discreta', []],
    ] }),
  m({ id: 'mun_ultimo_ano', cat: 'politics', w: 3, cd: 900,
    cond: (s) => {
      const end = s.government?.endDate;
      return !!end && Date.parse(end) - Date.parse(s.date) < 365 * 864e5;
    },
    title: 'Último ano de mandato', text: 'A equipe sugere uma maratona de inaugurações antes da eleição.',
    opts: [
      ['Inaugurações em série', [apr(3), gasto('infrastructure', 0.04), chain('mun_tse_inauguracao', 60, 0.25)]],
      ['Gestão discreta até o fim', [cred(2)]],
    ] }),
  m({ id: 'mun_tse_inauguracao', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Ministério Público vê uso eleitoral das inaugurações', text: 'Promotores pedem apuração de abuso de poder político.',
    opts: [
      ['Suspender as inaugurações', [apr(-1), cred(1)]],
      ['Seguir e contestar', [esc(6)]],
    ] }),

  // ─── Aprovação baixa: pressão da rua ───
  m({ id: 'mun_panelaco', cat: 'crisis', w: 4, cd: 180, neg: true, cond: (s) => approvalOf(s) < 35,
    title: 'Panelaço contra a prefeitura', text: 'Moradores de vários bairros batem panelas contra a gestão.',
    opts: [
      ['Pronunciamento e pacote de medidas', [gasto('administration', 0.02), apr(2), cap(-4)]],
      ['Ignorar', [apr(-1), unrest(2)]],
    ] }),
  m({ id: 'mun_comerciantes_protesto', cat: 'politics', w: 3, cd: 300, vars: { bairro: V.bairro },
    title: 'Comerciantes fecham as portas em protesto', text: 'Lojistas do {bairro} protestam contra a insegurança e os impostos.',
    opts: [
      ['Reduzir taxas para o comércio local', [gasto('administration', 0.02), gi('commerce', 6)]],
      ['Reforçar a guarda no bairro', [gasto('security', 0.02), gi('commerce', 3), gi('security', 2)]],
    ] }),
  m({ id: 'mun_hortas', cat: 'opportunity', w: 2, cd: 600,
    title: 'Hortas comunitárias em terrenos vazios', text: 'Moradores querem transformar terrenos baldios em hortas.',
    opts: [
      ['Programa municipal de hortas', [gasto('social', 0.005), sat(POBRES, 1), gi('environmental', 3)]],
      ['Vender os terrenos', [gasto('administration', -0.01)]],
    ] }),
  m({ id: 'mun_wifi', cat: 'opportunity', w: 2, cd: 600,
    title: 'Internet grátis nas praças', text: 'Uma operadora oferece Wi-Fi gratuito em troca de publicidade.',
    opts: [
      ['Aceitar a parceria', [sat(JOVENS, 2), gi('tech', 3), cap(-3)]],
      ['Rede pública própria', [gasto('infrastructure', 0.01), sat(JOVENS, 3)]],
    ] }),
  m({ id: 'mun_orcamento_participativo', cat: 'politics', w: 2, cd: 900,
    title: 'Orçamento participativo', text: 'Movimentos propõem que os bairros decidam parte dos investimentos.',
    opts: [
      ['Implantar', [sat(POBRES, 2), gi('social_movements', 5), cap(-5)]],
      ['Não', [gi('social_movements', -3)]],
    ] }),
  m({ id: 'mun_bolsa_atleta', cat: 'opportunity', w: 2, cd: 600,
    title: 'Atletas da cidade pedem apoio', text: 'Jovens atletas premiados não têm dinheiro para competir.',
    opts: [
      ['Criar bolsa atleta municipal', [gasto('social', 0.005), sat(JOVENS, 2), apr(1)]],
      ['Buscar patrocinadores', [gi('commerce', 1)]],
    ] }),
  m({ id: 'mun_feira_emprego', cat: 'opportunity', w: 3, cd: 300, cond: (s) => s.economy.unemployment > 8,
    title: 'Desemprego alto: feirão de empregos?', text: 'A secretaria propõe um feirão com empresas da região.',
    opts: [
      ['Organizar o feirão', [gasto('social', 0.005), sat(['unemployed'], 3), apr(1)]],
      ['Frentes de trabalho municipais', [gasto('social', 0.03), sat(['unemployed'], 4), gi('business', -2)]],
    ] }),
  m({ id: 'mun_cozinha_comunitaria', cat: 'opportunity', w: 2, cd: 500, vars: { bairro: V.bairro },
    title: 'Cozinha comunitária no {bairro}', text: 'Mães do bairro alimentam 500 pessoas por dia sem apoio.',
    opts: [
      ['Apoiar com alimentos e estrutura', [gasto('social', 0.005), sat(POBRES, 2), gi('social_movements', 3)]],
      ['Elogiar nas redes', [apr(0.3)]],
    ] }),
  m({ id: 'mun_escola_samba_divida', cat: 'party', w: 2, cd: 330,
    title: 'Escolas de samba ameaçam boicote', text: 'As escolas dizem que não desfilam sem o repasse atrasado.',
    opts: [
      ['Antecipar o repasse', [gasto('administration', 0.01), gi('commerce', 2)]],
      ['Endurecer', [apr(-1)]],
    ] }),
  m({ id: 'mun_aplicativo_fiscal', cat: 'opportunity', w: 2, cd: 600,
    title: 'App para o cidadão denunciar problemas', text: 'Startups locais oferecem um aplicativo de zeladoria.',
    opts: [
      ['Adotar', [gasto('administration', 0.005), sat(JOVENS, 1), gi('tech', 3), cred(1)]],
      ['Não', []],
    ] }),
  m({ id: 'mun_mercado_central', cat: 'regional', w: 2, cd: 600,
    title: 'Mercado municipal decadente', text: 'O velho mercado do centro perde clientes e ameaça fechar.',
    opts: [
      ['Reforma e polo gastronômico', [gasto('infrastructure', 0.03), gi('commerce', 5), apr(1)]],
      ['Conceder à iniciativa privada', [gi('business', 3), gi('commerce', -2)]],
    ] }),
  m({ id: 'mun_turismo', cat: 'economy', w: 2, cd: 500,
    title: 'Turismo em queda', text: 'Hotéis vazios e restaurantes fechando: a cidade perdeu visitantes.',
    opts: [
      ['Campanha de turismo', [gasto('administration', 0.01), gi('commerce', 3)]],
      ['Calendário de eventos', [gasto('administration', 0.02), gi('commerce', 4), apr(1)]],
    ] }),
  m({ id: 'mun_crianca_semaforo', cat: 'politics', w: 2, cd: 500,
    title: 'Crianças trabalham nos semáforos', text: 'Reportagem mostra crianças vendendo balas nos cruzamentos de madrugada.',
    opts: [
      ['Programa de proteção e renda', [gasto('social', 0.02), cred(2)]],
      ['Fiscalização do conselho tutelar', [cred(1)]],
    ] }),
  m({ id: 'mun_banheiros', cat: 'regional', w: 1, cd: 600,
    title: 'Centro sem banheiros públicos', text: 'Turistas e trabalhadores reclamam da falta de banheiros no centro.',
    opts: [
      ['Construir banheiros', [gasto('infrastructure', 0.005), apr(0.5)]],
      ['Parceria com o comércio', [gi('commerce', 1)]],
    ] }),
  m({ id: 'mun_pombos', cat: 'regional', w: 1, cd: 600,
    title: 'Ratos no mercado central', text: 'A vigilância sanitária encontrou ratos no mercado municipal.',
    opts: [
      ['Controle de pragas imediato', [gasto('health', 0.005), apr(0.5)]],
      ['Fechar o mercado para reforma', [gi('commerce', -3), apr(0.5)]],
    ] }),
  m({ id: 'mun_rodoviaria', cat: 'regional', w: 2, cd: 600,
    title: 'Rodoviária degradada', text: 'A porta de entrada da cidade está suja, insegura e com goteiras.',
    opts: [
      ['Reforma completa', [gasto('infrastructure', 0.02), apr(1)]],
      ['Concessão privada', [gi('business', 2)]],
    ] }),
  m({ id: 'mun_comercio_centro', cat: 'economy', w: 2, cd: 600,
    title: 'Centro histórico esvaziado', text: 'Metade das lojas do centro está fechada.',
    opts: [
      ['IPTU zero para quem morar no centro', [gasto('administration', 0.02), gi('commerce', 3), cred(1)]],
      ['Atrair universidades e repartições para o centro', [gasto('administration', 0.02), gi('commerce', 4)]],
    ] }),
  m({ id: 'mun_lei_fogos', cat: 'politics', w: 1, cd: 700,
    title: 'Lei contra fogos com barulho', text: 'Tutores de animais e pais de autistas pedem proibição de fogos ruidosos.',
    opts: [
      ['Sancionar', [sat(CLASSE_MEDIA, 2), gi('commerce', -1)]],
      ['Vetar', [sat(CLASSE_MEDIA, -1)]],
    ] }),
  m({ id: 'mun_metro', cat: 'opportunity', w: 1, cd: 1200,
    cond: (s) => {
      const id = s.government?.jurisdiction.cityId;
      return !id || (s.government?.jurisdiction.stateId !== null && (s.population.totalVoters ?? 0) > 0);
    },
    title: 'Projeto de metrô ou VLT', text: 'Técnicos propõem uma linha de metrô leve. A obra passaria do seu mandato.',
    opts: [
      ['Começar a obra (legado)', [gasto('infrastructure', 0.08), cred(3), apr(-1)]],
      ['Adiar', []],
    ] }),
  m({ id: 'mun_aeroporto_regional', cat: 'economy', w: 2, cd: 600,
    title: 'Aeroporto da cidade perde voos', text: 'A companhia aérea cortou rotas. Empresários reclamam.',
    opts: [
      ['Subsidiar rotas', [gasto('industry', 0.02), gi('business', 4)]],
      ['Não é papel da prefeitura', [gi('business', -2)]],
    ] }),
  m({ id: 'mun_crianca_creche_noturna', cat: 'opportunity', w: 2, cd: 600,
    title: 'Mães pedem creche noturna', text: 'Trabalhadoras do turno da noite não têm onde deixar os filhos.',
    opts: [
      ['Abrir creches noturnas', [gasto('education', 0.02), sat(PAIS, 2), gi('workers', 3)]],
      ['Não', []],
    ] }),
  m({ id: 'mun_sindicato_garis', cat: 'crisis', w: 2, cd: 500, neg: true,
    title: 'Garis ameaçam greve', text: 'O sindicato dos garis quer adicional de insalubridade maior.',
    opts: [
      ['Conceder', [gasto('administration', 0.01), gi('unions', 4)]],
      ['Negar', [chain('mun_lixo_parado', 20, 0.4)]],
    ] }),
  m({ id: 'mun_cracolandia', cat: 'crisis', w: 2, cd: 500, neg: true,
    cond: (s) => (s.population.totalVoters ?? 0) > 1_500_000,
    title: 'Concentração de usuários de drogas no centro', text: 'Comerciantes fecham as portas. O centro está tomado.',
    opts: [
      ['Internação e operação policial', [gi('security', 5), gi('commerce', 4), gi('social_movements', -6)]],
      ['Redução de danos e moradia', [gasto('social', 0.03), gi('social_movements', 5), gi('commerce', -3)]],
    ] }),
  m({ id: 'mun_concurso', cat: 'politics', w: 2, cd: 700,
    title: 'Concurso público para a saúde e a educação', text: 'Faltam profissionais concursados. Temporários cobrem metade das vagas.',
    opts: [
      ['Abrir concurso', [gasto('administration', 0.03), sat(JOVENS, 2), gi('civil_servants', 4)]],
      ['Seguir com temporários', [gi('civil_servants', -2)]],
    ] }),
  m({ id: 'mun_pacote_obras', cat: 'opportunity', w: 3, cd: 300, cond: (s) => approvalOf(s) < 45,
    title: 'Pacote de obras de bairro', text: 'A equipe sugere um pacote de pequenas obras para recuperar a popularidade.',
    opts: [
      ['Lançar o pacote', [gasto('infrastructure', 0.05), apr(3), chain('mun_aditivo_tce', 150, 0.15)]],
      ['Não é hora', []],
    ] }),
  m({ id: 'mun_ponte_rural', cat: 'regional', w: 2, cd: 500,
    title: 'Ponte de madeira cai na zona rural', text: 'Agricultores ficaram isolados com a queda da ponte.',
    opts: [
      ['Ponte de concreto', [gasto('infrastructure', 0.02), sat(['farmers'], 4)]],
      ['Ponte provisória', [gasto('infrastructure', 0.005), sat(['farmers'], 1)]],
    ] }),
  m({ id: 'mun_rodeio', cat: 'politics', w: 2, cd: 365, regions: ['centro_oeste', 'sudeste', 'sul'],
    title: 'Festa de rodeio pede apoio', text: 'A festa do peão quer estrutura da prefeitura. Protetores de animais protestam.',
    opts: [
      ['Apoiar a festa', [gi('agribusiness', 4), sat(['farmers'], 2), sat(CLASSE_MEDIA, -1)]],
      ['Não apoiar', [gi('agribusiness', -3), gi('environmental', 2)]],
    ] }),
  m({ id: 'mun_lixo_reciclavel_venda', cat: 'economy', w: 1, cd: 700, vars: { empresa: V.empresa },
    title: '{empresa} quer comprar o lixo reciclável', text: 'A empresa oferece pagar pelo reciclável da cidade, sem os catadores.',
    opts: [
      ['Aceitar', [gasto('administration', -0.01), sat(POBRES, -2)]],
      ['Manter com as cooperativas', [sat(POBRES, 1)]],
    ] }),
  m({ id: 'mun_pmb_estudo', cat: 'opportunity', w: 1, cd: 900,
    title: 'Universidade propõe estudo da cidade', text: 'A universidade oferece um diagnóstico completo da cidade, de graça.',
    opts: [
      ['Aceitar e publicar', [cred(2), gi('youth', 2), cap(-3)]],
      ['Recusar', []],
    ] }),
  m({ id: 'mun_comercio_noturno', cat: 'politics', w: 1, cd: 600,
    title: 'Bares querem funcionar até mais tarde', text: 'Donos de bares pedem horário estendido; moradores reclamam do barulho.',
    opts: [
      ['Liberar com regras', [gi('commerce', 3), sat(JOVENS, 2), sat(IDOSOS, -1)]],
      ['Manter o horário', [sat(IDOSOS, 1), gi('commerce', -2)]],
    ] }),
  m({ id: 'mun_estagio_jovem', cat: 'opportunity', w: 2, cd: 600,
    title: 'Programa de primeiro emprego', text: 'O desemprego entre jovens passa de 25%.',
    opts: [
      ['Estágios na prefeitura e incentivo a empresas', [gasto('social', 0.02), sat(JOVENS, 3), gi('youth', 4)]],
      ['Cursos profissionalizantes', [gasto('education', 0.01), sat(JOVENS, 1)]],
    ] }),
  m({ id: 'mun_pacto_seguranca', cat: 'politics', w: 2, cd: 600,
    title: 'Pacto de segurança com o estado', text: 'O governo do estado propõe integrar guarda e polícia num centro de comando.',
    opts: [
      ['Assinar', [gasto('security', 0.02), gi('security', 4), apr(1)]],
      ['Não', []],
    ] }),
  m({ id: 'mun_mutirao_catarata', cat: 'opportunity', w: 2, cd: 500,
    title: 'Mutirão de catarata', text: 'Oftalmologistas voluntários oferecem um mutirão de cirurgias.',
    opts: [
      ['Apoiar com estrutura', [gasto('health', 0.005), sat(IDOSOS, 3), apr(1)]],
      ['Não', []],
    ] }),
  m({ id: 'mun_casa_cultura', cat: 'opportunity', w: 1, cd: 700,
    title: 'Artistas pedem casa de cultura na periferia', text: 'Coletivos culturais querem um espaço nos bairros afastados.',
    opts: [
      ['Criar a casa de cultura', [gasto('administration', 0.01), sat(JOVENS, 2), apr(0.5)]],
      ['Não', []],
    ] }),
  m({ id: 'mun_patinetes', cat: 'politics', w: 1, cd: 700,
    title: 'Patinetes elétricos nas calçadas', text: 'Pedestres reclamam de patinetes; jovens adoram.',
    opts: [
      ['Liberar com regras', [sat(JOVENS, 2)]],
      ['Proibir nas calçadas', [sat(IDOSOS, 1), sat(JOVENS, -1)]],
    ] }),
  m({ id: 'mun_vigilancia_comunitaria', cat: 'politics', w: 1, cd: 700, vars: { bairro: V.bairro },
    title: 'Moradores criam vigilância no {bairro}', text: 'Grupos de WhatsApp de vizinhos querem apoio da prefeitura.',
    opts: [
      ['Apoiar e integrar à guarda', [gi('security', 2), apr(0.5), cap(-3)]],
      ['Não se envolver', []],
    ] }),
  m({ id: 'mun_obra_atrasada_vizinho', cat: 'economy', w: 2, cd: 500, vars: { obra: V.obra },
    title: 'Obra da gestão anterior parada', text: 'Você herdou {obra} parado há dois anos.',
    opts: [
      ['Retomar a obra', [gasto('infrastructure', 0.04), apr(1)]],
      ['Auditar antes', [cred(2), chain('mun_aditivo_tce', 90, 0.2)]],
      ['Abandonar', [apr(-1)]],
    ] }),
  m({ id: 'mun_mudanca_clima_plano', cat: 'opportunity', w: 1, cd: 900,
    title: 'Plano de adaptação climática', text: 'Especialistas propõem um plano de 10 anos contra enchentes e calor.',
    opts: [
      ['Aprovar o plano', [gasto('infrastructure', 0.02), gi('environmental', 6), cred(2)]],
      ['Não é prioridade', [gi('environmental', -2)]],
    ] }),
  m({ id: 'mun_greve_saude', cat: 'crisis', w: 2, cd: 500, neg: true,
    title: 'Agentes de saúde em greve', text: 'Agentes comunitários de saúde param por reajuste.',
    opts: [
      ['Reajuste', [gasto('health', 0.02), gi('civil_servants', 4)]],
      ['Negociar', [cap(-3)]],
    ] }),
  m({ id: 'mun_terreno_universidade', cat: 'opportunity', w: 1, cd: 900,
    title: 'Universidade federal quer terreno', text: 'A universidade quer um campus na cidade, se a prefeitura doar o terreno.',
    opts: [
      ['Doar o terreno', [sat(JOVENS, 3), gi('youth', 4), cred(1), cap(-3)]],
      ['Não', []],
    ] }),
  m({ id: 'mun_lei_seca_fiscalizacao', cat: 'politics', w: 1, cd: 700,
    title: 'Acidentes de trânsito em alta', text: 'O número de mortes no trânsito subiu 20%.',
    opts: [
      ['Mais radares e fiscalização', [apr(-1), cred(2)]],
      ['Campanha educativa', [gasto('administration', 0.005)]],
    ] }),
  m({ id: 'mun_bairro_esquecido', cat: 'regional', w: 2, cd: 300, vars: { bairro: V.bairro },
    title: '{bairro} sem asfalto nem esgoto', text: 'Moradores fecham a avenida: "o bairro foi esquecido".',
    opts: [
      ['Obra de urbanização', [gasto('infrastructure', 0.05), sat(POBRES, 4), apr(1)]],
      ['Prometer para o ano que vem', [apr(-1)]],
    ] }),
  m({ id: 'mun_empresa_lixo_propina', cat: 'scandal', w: 2, cd: 600, neg: true, vars: { empresa: V.empresa },
    title: '{empresa} oferece "ajuda" na licitação do lixo', text: 'A empresa sugere um edital sob medida e promete gratidão.',
    opts: [
      ['Edital aberto e transparente', [cred(2)]],
      ['Aceitar o edital sob medida', [esc(4), flag('mun_licitacao_dirigida'), chain('mun_licitacao_justica', 120, 0.6)]],
    ] }),
  m({ id: 'mun_licitacao_justica', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Concorrente derrotada vai à Justiça', text: 'Uma empresa perdedora diz que o edital do lixo foi dirigido. Uma liminar suspende a coleta.',
    opts: [
      ['Anular e refazer a licitação', [cap(-6), apr(-2), cred(1)]],
      ['Recorrer', [esc(8), chain('mun_lixo_parado', 15, 0.6)]],
    ] }),
];
