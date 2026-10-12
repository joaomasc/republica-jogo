/**
 * Pacote de eventos do governo estadual (governador).
 * Fonte das ideias: docs/BANCO_DE_CONTEUDO.md, seção 5.
 */
import { approvalOf, deficitIsHigh } from '../conditions';
import {
  apr, cap, chain, CLASSE_MEDIA, cred, esc, EST, ev, flag, gasto, gi, GOV, IDOSOS, JOVENS, legit,
  OPERARIOS, PAIS, POBRES, radical, sat, shock, type EvInput, unrest, V, viceRisk,
} from '../dsl';
import type { EventDefinition } from '../types';

/** Evento estadual: fase de governo, esfera estadual. */
const e = (i: Omit<EvInput, 'phases' | 'scope'>): EventDefinition => ev({ ...i, phases: GOV, scope: EST });

export const STATE_EVENTS: EventDefinition[] = [
  // ─── Segurança pública ───
  e({ id: 'est_greve_pm', cat: 'crisis', w: 5, cd: 400, neg: true,
    title: 'Policiais militares ameaçam greve', text: 'Associações de praças em {stateName} anunciam aquartelamento por reajuste.',
    opts: [
      ['Conceder reajuste', [gasto('security', 0.08), gi('security', 10), apr(1)]],
      ['Pedir a Força Nacional', [cap(-10), gi('security', -8), apr(-1)]],
      ['Punir os líderes do movimento', [gi('security', -12), radical('security', 10), unrest(4)]],
    ] }),
  e({ id: 'est_rebeliao', cat: 'crisis', w: 4, cd: 300, neg: true,
    title: 'Rebelião em presídio superlotado', text: 'Presos fazem agentes reféns num presídio com o dobro da capacidade.',
    opts: [
      ['Negociar a libertação dos reféns', [gi('security', -4), cred(1)]],
      ['Invasão da tropa de choque', [gi('security', 6), chain('est_massacre', 2, 0.35)]],
    ] }),
  e({ id: 'est_massacre', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Invasão do presídio deixa mortos', text: 'A operação terminou com dezenas de mortos. Entidades de direitos humanos denunciam.',
    opts: [
      ['Afastar o comando e abrir inquérito', [gi('security', -6), cred(3), apr(-1)]],
      ['Defender a operação', [gi('security', 6), apr(-3), gi('social_movements', -8)]],
    ] }),
  e({ id: 'est_faccao_onibus', cat: 'crisis', w: 4, cd: 300, neg: true,
    title: 'Facção ataca ônibus na capital', text: 'Ônibus incendiados em retaliação a uma transferência de presos.',
    opts: [
      ['Operação de saturação nos bairros', [gasto('security', 0.04), gi('security', 5), sat(CLASSE_MEDIA, 2)]],
      ['Pedir ajuda federal', [cap(-6), apr(1)]],
      ['Plano de inteligência e asfixia financeira', [gasto('security', 0.03), cred(2), chain('est_faccao_resposta', 40, 0.3)]],
    ] }),
  e({ id: 'est_faccao_resposta', cat: 'crisis', w: 0, chainOnly: true, neg: true,
    title: 'Facção reage com nova onda de ataques', text: 'A asfixia financeira atingiu a facção, que responde com ataques.',
    opts: [
      ['Manter a estratégia', [apr(-2), cred(2), gi('security', 3)]],
      ['Transferir líderes para presídio federal', [cap(-5), apr(1)]],
    ] }),
  e({ id: 'est_cameras_corporais', cat: 'politics', w: 3, cd: 600,
    title: 'Câmeras corporais nos policiais', text: 'Estudos mostram queda na letalidade com câmeras. Policiais resistem.',
    opts: [
      ['Adotar em toda a tropa', [gasto('security', 0.02), gi('security', -6), gi('social_movements', 5), cred(2)]],
      ['Recusar', [gi('security', 5), gi('social_movements', -4)]],
    ] }),
  e({ id: 'est_delegacias', cat: 'politics', w: 3, cd: 500,
    title: 'Delegacias do interior sem delegado', text: 'Metade das delegacias do interior não tem delegado titular.',
    opts: [
      ['Concurso para a Polícia Civil', [gasto('security', 0.03), gi('security', 4), apr(1)]],
      ['Regionalizar o atendimento', [gi('security', -1), apr(-1)]],
    ] }),
  e({ id: 'est_feminicidios', cat: 'crisis', w: 3, cd: 400,
    title: 'Feminicídios batem recorde em {stateName}', text: 'O estado lidera o ranking de feminicídios do país.',
    opts: [
      ['Delegacias da mulher 24 horas', [gasto('security', 0.02), cred(3), apr(1)]],
      ['Campanha publicitária', [gasto('administration', 0.005)]],
    ] }),
  e({ id: 'est_roubo_cargas', cat: 'crisis', w: 3, cd: 400,
    title: 'Roubo de cargas nas rodovias', text: 'Transportadoras ameaçam suspender entregas no estado.',
    opts: [
      ['Força-tarefa nas rodovias', [gasto('security', 0.02), gi('commerce', 4), gi('security', 3)]],
      ['Escolta privada subsidiada', [gasto('security', 0.01), gi('commerce', 2)]],
    ] }),
  e({ id: 'est_novo_presidio', cat: 'politics', w: 3, cd: 600, vars: { cidade: V.bairro },
    title: 'Onde construir o novo presídio?', text: 'O déficit de vagas exige um presídio novo. Nenhum prefeito quer.',
    opts: [
      ['Construir no interior', [gasto('security', 0.05), apr(-1), gi('security', 4)]],
      ['Parceria público-privada', [gi('business', 3), gi('social_movements', -4)]],
      ['Mutirão carcerário para reduzir presos provisórios', [gi('security', -4), gi('social_movements', 4), cred(1)]],
    ] }),
  e({ id: 'est_policial_heroi', cat: 'opportunity', w: 2, cd: 400,
    title: 'Policial salva família em incêndio', text: 'O vídeo do resgate emocionou o estado.',
    opts: [
      ['Homenagem no palácio', [gi('security', 4), apr(1), cap(-3)]],
      ['Nota nas redes', [apr(0.3), cap(-3)]],
    ] }),
  e({ id: 'est_jovem_morto', cat: 'crisis', w: 3, cd: 400, neg: true,
    title: 'Jovem morto em abordagem policial', text: 'Moradores protestam após a morte de um jovem de 17 anos.',
    opts: [
      ['Afastar os policiais e investigar', [gi('social_movements', 6), gi('security', -6), cred(2)]],
      ['Aguardar o inquérito', [gi('social_movements', -4), unrest(2)]],
    ] }),

  // ─── Educação ───
  e({ id: 'est_greve_professores', cat: 'crisis', w: 5, cd: 400, neg: true,
    title: 'Professores da rede estadual em greve', text: 'A rede estadual parou por reajuste e plano de carreira.',
    opts: [
      ['Pagar o piso e reajustar', [gasto('education', 0.08), gi('civil_servants', 10), sat(PAIS, 2)]],
      ['Abrir negociação longa', [cap(-8), chain('est_greve_escala', 45, 0.5)]],
      ['Cortar o ponto', [apr(-3), gi('civil_servants', -12), gi('unions', -6)]],
    ] }),
  e({ id: 'est_greve_escala', cat: 'crisis', w: 0, chainOnly: true, neg: true,
    title: 'Greve da educação chega a dois meses', text: 'Pais perdem a paciência: o ano letivo está em risco.',
    opts: [
      ['Acordo com reajuste parcelado', [gasto('education', 0.04), gi('civil_servants', 4), apr(1)]],
      ['Contratar temporários', [gi('civil_servants', -8), apr(-2), radical('civil_servants', 6)]],
    ] }),
  e({ id: 'est_ocupacao_escolas', cat: 'crisis', w: 3, cd: 600, neg: true,
    title: 'Estudantes ocupam escolas', text: 'Secundaristas ocupam escolas contra o fechamento de turmas.',
    opts: [
      ['Recuar no fechamento', [cap(-6), gi('youth', 6)]],
      ['Pedir reintegração de posse', [gi('youth', -10), sat(JOVENS, -3), gi('security', 2)]],
    ] }),
  e({ id: 'est_universidade_crise', cat: 'crisis', w: 3, cd: 500, neg: true,
    title: 'Universidade estadual sem verba', text: 'A reitoria diz que fecha laboratórios em dois meses.',
    opts: [
      ['Aporte emergencial', [gasto('education', 0.03), gi('youth', 5)]],
      ['Cobrar eficiência da reitoria', [gi('youth', -4), gi('business', 2)]],
    ] }),
  e({ id: 'est_integral', cat: 'opportunity', w: 3, cd: 600,
    title: 'Expansão do ensino médio integral', text: 'Escolas integrais têm notas melhores, mas custam o dobro.',
    opts: [
      ['Expandir para metade da rede', [gasto('education', 0.06), sat(PAIS, 3), cred(2)]],
      ['Expandir só no interior', [gasto('education', 0.03), sat(PAIS, 1)]],
    ] }),
  e({ id: 'est_escola_tecnica', cat: 'opportunity', w: 3, cd: 500,
    title: 'Prefeitos disputam escola técnica', text: 'Cinco cidades disputam a nova escola técnica estadual.',
    opts: [
      ['Cidade-polo com indústria', [gasto('education', 0.02), gi('industry', 4), cred(1)]],
      ['Cidade aliada', [gasto('education', 0.02), cap(4), cred(-1)]],
    ] }),
  e({ id: 'est_celular_aula', cat: 'politics', w: 2, cd: 700,
    title: 'Proibir celular nas escolas?', text: 'Deputados propõem proibir celulares em sala de aula.',
    opts: [
      ['Apoiar a proibição', [sat(PAIS, 2), sat(JOVENS, -1)]],
      ['Uso pedagógico regulado', [gi('tech', 2)]],
    ] }),

  // ─── Saúde ───
  e({ id: 'est_hospital_regional', cat: 'politics', w: 4, cd: 500, vars: { obra: V.obra },
    title: 'Hospital regional parado', text: 'Obra parada há três anos; pacientes viajam 300 km para cirurgias.',
    opts: [
      ['Remanejar verba e retomar', [gasto('health', 0.06), apr(2), sat(IDOSOS, 2)]],
      ['Concluir com organização social', [gasto('health', 0.03), gi('unions', -3), apr(1)]],
      ['Esperar verba federal', [apr(-2)]],
    ] }),
  e({ id: 'est_uti', cat: 'crisis', w: 4, cd: 300, neg: true,
    title: 'Falta de leitos de UTI', text: 'Pacientes morrem na fila por UTI no inverno.',
    opts: [
      ['Abrir 200 leitos', [gasto('health', 0.05), apr(2)]],
      ['Comprar leitos em hospitais privados', [gasto('health', 0.03), apr(1), gi('unions', -2)]],
    ] }),
  e({ id: 'est_alto_custo', cat: 'politics', w: 2, cd: 600,
    title: 'Justiça manda pagar remédios de alto custo', text: 'Decisões judiciais consomem 10% do orçamento da saúde.',
    opts: [
      ['Ampliar a lista oficial', [gasto('health', 0.04), cred(1)]],
      ['Recorrer das decisões', [apr(-1)]],
    ] }),
  e({ id: 'est_medicos_interior', cat: 'politics', w: 3, cd: 500,
    title: 'Interior sem médicos', text: 'Cidades pequenas estão há meses sem médico.',
    opts: [
      ['Bônus para médicos no interior', [gasto('health', 0.02), sat(['farmers'], 3)]],
      ['Telemedicina estadual', [gasto('health', 0.01), gi('tech', 3)]],
    ] }),

  // ─── Estradas e infraestrutura ───
  e({ id: 'est_rodovia_mortal', cat: 'crisis', w: 3, cd: 500, neg: true,
    title: 'Rodovia da morte', text: 'Acidente com ônibus deixa 15 mortos na rodovia estadual mais perigosa.',
    opts: [
      ['Duplicação da rodovia', [gasto('infrastructure', 0.08), apr(2), cred(2)]],
      ['Radares e fiscalização', [gasto('infrastructure', 0.01), apr(-1)]],
    ] }),
  e({ id: 'est_ponte', cat: 'crisis', w: 2, cd: 600, neg: true,
    title: 'Ponte interditada isola cidades', text: 'Rachaduras interditam a ponte principal de uma rodovia estadual.',
    opts: [
      ['Ponte provisória do Exército', [cap(-4), apr(1)]],
      ['Nova ponte, licitação emergencial', [gasto('infrastructure', 0.05), apr(1), chain('est_obra_tce', 180, 0.25)]],
    ] }),
  e({ id: 'est_obra_tce', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Tribunal de Contas vê sobrepreço em obra emergencial', text: 'O TCE aponta preços 40% acima do mercado.',
    opts: [
      ['Revisar o contrato', [cap(-4), cred(2)]],
      ['Defender a urgência', [esc(6)]],
    ] }),
  e({ id: 'est_pedagio', cat: 'politics', w: 3, cd: 600,
    title: 'Concessão de rodovias com pedágio', text: 'A proposta duplica estradas com dinheiro privado, mas cria pedágios.',
    opts: [
      ['Conceder', [gi('business', 5), gi('commerce', -3), gasto('infrastructure', -0.04), chain('est_pedagio_protesto', 90, 0.5)]],
      ['Obras com dinheiro público', [gasto('infrastructure', 0.06), apr(1)]],
    ] }),
  e({ id: 'est_pedagio_protesto', cat: 'crisis', w: 0, chainOnly: true, neg: true,
    title: 'Caminhoneiros bloqueiam praça de pedágio', text: 'Bloqueio de três dias contra a tarifa do pedágio.',
    opts: [
      ['Renegociar a tarifa', [cap(-6), gasto('infrastructure', 0.01), apr(1)]],
      ['Manter o contrato', [apr(-2), unrest(2)]],
    ] }),
  e({ id: 'est_estradas_terra', cat: 'politics', w: 3, cd: 500,
    title: 'Safra atolada em estradas de terra', text: 'Caminhões de grãos atolam e o agro ameaça cobrar.',
    opts: [
      ['Programa de asfalto rural', [gasto('infrastructure', 0.05), gi('agribusiness', 8)]],
      ['Cascalhamento emergencial', [gasto('infrastructure', 0.01), gi('agribusiness', 2)]],
    ] }),
  e({ id: 'est_internet_rural', cat: 'opportunity', w: 2, cd: 600,
    title: 'Internet no campo', text: 'Produtores e escolas rurais pedem sinal de celular.',
    opts: [
      ['Torres 4G com operadoras', [gasto('infrastructure', 0.02), gi('agribusiness', 4), gi('tech', 3)]],
      ['Não agora', []],
    ] }),

  // ─── Finanças ───
  e({ id: 'est_divida_uniao', cat: 'economy', w: 3, cd: 700, neg: true, cond: deficitIsHigh,
    title: 'Dívida com a União estrangula o estado', text: 'As parcelas da dívida consomem 15% da receita.',
    opts: [
      ['Aderir ao regime de recuperação fiscal', [gasto('administration', -0.06), gi('civil_servants', -8), cap(-6)]],
      ['Ir ao STF pedir suspensão', [cap(-3), chain('est_stf_divida', 90)]],
    ] }),
  e({ id: 'est_stf_divida', cat: 'politics', w: 0, chainOnly: true,
    title: 'STF decide sobre a dívida do estado', text: 'O tribunal julgou o pedido de suspensão das parcelas.',
    opts: [
      ['Comemorar a liminar', [gasto('administration', -0.03), apr(2)]],
      ['Negociar com o Tesouro', [cap(-4), gasto('administration', -0.02)]],
    ] }),
  e({ id: 'est_icms_combustivel', cat: 'economy', w: 3, cd: 500,
    title: 'Pressão para baixar o ICMS dos combustíveis', text: 'Caminhoneiros e motoristas culpam o imposto estadual pelo preço da gasolina.',
    opts: [
      ['Reduzir a alíquota', [gasto('administration', 0.04), apr(3), gi('commerce', 3)]],
      ['Manter e explicar', [apr(-2), cred(1)]],
    ] }),
  e({ id: 'est_guerra_fiscal', cat: 'economy', w: 3, cd: 600, neg: true, vars: { empresa: V.empresa },
    title: '{empresa} ameaça ir para o estado vizinho', text: 'O vizinho ofereceu 15 anos sem ICMS.',
    opts: [
      ['Cobrir a oferta', [gasto('industry', 0.04), gi('industry', 5)]],
      ['Ação no STF contra a guerra fiscal', [cap(-3), cred(1)]],
      ['Deixar ir', [sat(OPERARIOS, -3), gi('unions', -3)]],
    ] }),
  e({ id: 'est_previdencia', cat: 'politics', w: 3, cd: 700,
    title: 'Previdência dos servidores quebrada', text: 'O déficit da previdência estadual dobrou em cinco anos.',
    opts: [
      ['Reforma da previdência estadual', [gasto('pensions', -0.06), gi('civil_servants', -12), radical('civil_servants', 6)]],
      ['Aporte do Tesouro', [gasto('pensions', 0.05)]],
    ] }),
  e({ id: 'est_folha_parcelada', cat: 'crisis', w: 3, cd: 400, neg: true, cond: deficitIsHigh,
    title: 'Estado sem dinheiro para a folha', text: 'A Fazenda avisa que só consegue pagar parte dos salários.',
    opts: [
      ['Parcelar os salários', [gi('civil_servants', -14), apr(-4), radical('unions', 8)]],
      ['Vender a participação numa estatal', [gasto('administration', -0.06), gi('unions', -4)]],
    ] }),
  e({ id: 'est_privatizar_saneamento', cat: 'politics', w: 2, cd: 900,
    title: 'Privatizar a companhia de saneamento?', text: 'Metade do estado não tem coleta de esgoto.',
    opts: [
      ['Privatizar com metas', [gasto('infrastructure', -0.05), gi('business', 6), gi('unions', -8), sat(POBRES, -1)]],
      ['Investir com recursos públicos', [gasto('infrastructure', 0.06), gi('unions', 4)]],
    ] }),
  e({ id: 'est_superavit', cat: 'economy', w: 2, cd: 600, cond: (s) => !deficitIsHigh(s),
    title: 'Arrecadação acima do esperado', text: 'A alta das commodities trouxe receita extra.',
    opts: [
      ['Criar um fundo de reserva', [cred(2), flag('est_fundo_reserva')]],
      ['Reajuste para servidores', [gasto('administration', 0.03), gi('civil_servants', 8)]],
      ['Obras em todo o estado', [gasto('infrastructure', 0.04), apr(2)]],
    ] }),

  // ─── Assembleia ───
  e({ id: 'est_emprestimo', cat: 'politics', w: 3, cd: 500,
    title: 'Assembleia trava empréstimo', text: 'Deputados só aprovam o empréstimo para obras se receberem emendas.',
    opts: [
      ['Liberar emendas', [gasto('administration', 0.02), cap(5)]],
      ['Desistir do empréstimo', [apr(-1)]],
    ] }),
  e({ id: 'est_secretariado', cat: 'party', w: 3, cd: 400,
    title: 'Aliados pedem secretarias', text: 'Três partidos da base querem secretarias em troca de votos.',
    opts: [
      ['Entregar as secretarias', [cap(8), cred(-2)]],
      ['Manter o secretariado técnico', [cap(-6), cred(2)]],
    ] }),
  e({ id: 'est_aumento_deputados', cat: 'politics', w: 2, cd: 700,
    title: 'Deputados aumentam verba de gabinete', text: 'A Assembleia aprovou aumento de 30% na verba dos gabinetes.',
    opts: [
      ['Criticar publicamente', [apr(2), cap(-6)]],
      ['Ficar em silêncio', [cap(2)]],
    ] }),

  // ─── Desastres e meio ambiente ───
  e({ id: 'est_enchente', cat: 'crisis', w: 3, cd: 365, neg: true, regions: ['sul', 'sudeste', 'nordeste'],
    title: 'Enchente atinge dezenas de cidades', text: 'Rios transbordam em {stateName}. Milhares estão desabrigados.',
    opts: [
      ['Decretar calamidade e pedir ajuda federal', [gasto('social', 0.06), apr(1), cap(-4)]],
      ['Gabinete de crise no local', [gasto('social', 0.04), apr(3)]],
      ['Gestão à distância', [apr(-5)]],
    ] }),
  e({ id: 'est_seca', cat: 'crisis', w: 3, cd: 365, neg: true, regions: ['nordeste'],
    title: 'Seca severa no sertão', text: 'Açudes secos e gado morrendo no sertão de {stateName}.',
    opts: [
      ['Carros-pipa e auxílio aos agricultores', [gasto('social', 0.04), sat(['farmers'], 4), apr(2)]],
      ['Obras hídricas estruturais', [gasto('infrastructure', 0.08), cred(2)]],
    ] }),
  e({ id: 'est_queimadas', cat: 'crisis', w: 3, cd: 365, neg: true, regions: ['norte', 'centro_oeste'],
    title: 'Queimadas recorde em {stateName}', text: 'A fumaça cobre cidades e fecha aeroportos.',
    opts: [
      ['Brigadas e multas pesadas', [gasto('security', 0.03), gi('environmental', 8), gi('agribusiness', -6)]],
      ['Pedir apoio federal', [cap(-3)]],
      ['Minimizar o problema', [gi('environmental', -10), apr(-2)]],
    ] }),
  e({ id: 'est_barragem', cat: 'crisis', w: 2, cd: 900, neg: true, states: ['MG', 'PA', 'MT', 'GO', 'BA'],
    title: 'Barragem de mineração em risco', text: 'Fiscais apontam risco alto numa barragem de rejeitos em {stateName}.',
    opts: [
      ['Interditar a mina', [gi('industry', -6), gi('environmental', 6), cred(3)]],
      ['Confiar no laudo da mineradora', [gi('industry', 3), chain('est_rompimento', 120, 0.25)]],
    ] }),
  e({ id: 'est_rompimento', cat: 'crisis', w: 0, chainOnly: true, neg: true,
    title: 'Barragem se rompe', text: 'Uma onda de lama atinge comunidades. É a maior tragédia do estado.',
    opts: [
      ['Assumir a crise e processar a mineradora', [apr(-6), cred(2), gi('industry', -8)]],
      ['Culpar a fiscalização federal', [apr(-10), cred(-4)]],
    ] }),
  e({ id: 'est_desmatamento', cat: 'politics', w: 3, cd: 500, regions: ['norte', 'centro_oeste'],
    title: 'Satélite mostra desmatamento em alta', text: 'O desmatamento em {stateName} subiu 40% em um ano.',
    opts: [
      ['Operação com órgãos ambientais', [gi('environmental', 8), gi('agribusiness', -6), cred(2)]],
      ['Questionar os dados', [gi('agribusiness', 4), gi('environmental', -8), cred(-2)]],
    ] }),
  e({ id: 'est_licenciamento', cat: 'politics', w: 3, cd: 500, vars: { empresa: V.empresa },
    title: '{empresa} pede licença ambiental rápida', text: 'Um projeto de R$ 2 bilhões espera a licença há dois anos.',
    opts: [
      ['Acelerar a licença', [gi('industry', 6), gi('environmental', -6)]],
      ['Exigir estudo completo', [gi('environmental', 4), gi('industry', -3)]],
    ] }),
  e({ id: 'est_oleo_litoral', cat: 'crisis', w: 2, cd: 700, neg: true, regions: ['nordeste', 'sudeste'],
    title: 'Manchas de óleo nas praias', text: 'Óleo de origem desconhecida chega ao litoral de {stateName}.',
    opts: [
      ['Mutirão de limpeza com voluntários', [gasto('social', 0.01), apr(1), gi('environmental', 3)]],
      ['Esperar a Marinha', [apr(-2)]],
    ] }),

  // ─── Relações federativas ───
  e({ id: 'est_prefeitos_fila', cat: 'politics', w: 3, cd: 300,
    title: 'Prefeitos fazem fila no palácio', text: 'Dezenas de prefeitos pedem convênios para obras.',
    opts: [
      ['Programa de convênios', [gasto('infrastructure', 0.04), cap(6), apr(1)]],
      ['Priorizar cidades técnicas', [cred(1), cap(-2)]],
    ] }),
  e({ id: 'est_prefeito_capital_rival', cat: 'politics', w: 2, cd: 600,
    title: 'Prefeito da capital vira adversário', text: 'O prefeito da capital ataca o governo e mira sua cadeira.',
    opts: [
      ['Propor parceria pública', [cap(-3), apr(1)]],
      ['Cortar convênios com a capital', [cap(2), apr(-2)]],
    ] }),
  e({ id: 'est_frente_governadores', cat: 'opportunity', w: 2, cd: 500,
    title: 'Frente de governadores', text: 'Governadores se unem para pressionar Brasília por mais recursos.',
    opts: [
      ['Liderar a frente', [cap(4), apr(1), cap(-3)]],
      ['Negociar sozinho com o Planalto', [cap(2), cap(-3)]],
    ] }),

  // ─── Economia e desenvolvimento ───
  e({ id: 'est_montadora', cat: 'opportunity', w: 2, cd: 900, vars: { empresa: V.empresa },
    title: 'Montadora estrangeira quer se instalar', text: 'A empresa exige terreno e 15 anos de isenção de ICMS.',
    opts: [
      ['Aceitar as condições', [gasto('industry', 0.05), gi('industry', 8), sat(OPERARIOS, 3)]],
      ['Contraproposta', [gi('industry', 3), chain('est_montadora_resposta', 60, 1)]],
      ['Recusar', [gi('industry', -3)]],
    ] }),
  e({ id: 'est_montadora_resposta', cat: 'economy', w: 0, chainOnly: true,
    title: 'Montadora responde à contraproposta', text: 'A empresa decidiu sobre a fábrica.',
    opts: [
      ['Fábrica confirmada', [gi('industry', 6), sat(OPERARIOS, 3), apr(2), cap(-3)]],
      ['Empresa vai para outro estado', [apr(-1)]],
    ] }),
  e({ id: 'est_safra_recorde', cat: 'economy', w: 2, cd: 500, regions: ['centro_oeste', 'sul', 'norte'],
    title: 'Safra recorde', text: 'A colheita bateu recorde e a arrecadação cresceu.',
    opts: [['Comemorar com o agro', [gi('agribusiness', 4), apr(1), gasto('administration', -0.02)]]] }),
  e({ id: 'est_geada', cat: 'crisis', w: 2, cd: 500, neg: true, regions: ['sul', 'sudeste'],
    title: 'Geada destrói lavouras', text: 'A geada mais forte em 30 anos atingiu café e milho.',
    opts: [
      ['Linha de crédito emergencial', [gasto('industry', 0.02), gi('agribusiness', 6)]],
      ['Pedir socorro federal', [cap(-2)]],
    ] }),
  e({ id: 'est_polo_tecnologico', cat: 'opportunity', w: 2, cd: 700,
    title: 'Polo tecnológico', text: 'Universidades e startups propõem um parque tecnológico estadual.',
    opts: [
      ['Investir', [gasto('science', 0.04), gi('tech', 8), sat(JOVENS, 2)]],
      ['Isenções fiscais', [gasto('administration', 0.01), gi('tech', 4)]],
    ] }),
  e({ id: 'est_eolicas', cat: 'politics', w: 2, cd: 700, regions: ['nordeste', 'sul'],
    title: 'Parques eólicos e comunidades', text: 'Comunidades reclamam de barulho e terras arrendadas por parques eólicos.',
    opts: [
      ['Exigir contrapartidas sociais', [gi('environmental', 3), gi('industry', -2), cred(1)]],
      ['Acelerar os licenciamentos', [gi('industry', 5), gi('social_movements', -3)]],
    ] }),

  // ─── Gestão ───
  e({ id: 'est_secretario_preso', cat: 'scandal', w: 2, cd: 700, neg: true,
    title: 'Secretário preso em operação', text: 'A polícia prendeu um secretário por desvio em contratos.',
    opts: [
      ['Demitir na hora', [esc(4), cred(2)]],
      ['Defender até o julgamento', [esc(14), cred(-3)]],
    ] }),
  e({ id: 'est_aviao', cat: 'media', w: 2, cd: 700,
    title: 'Jatinho do governo vira polêmica', text: 'A imprensa revela gastos milionários com o avião oficial.',
    opts: [
      ['Vender o avião', [apr(2), cred(2), cap(-3)]],
      ['Justificar o uso', [apr(-1)]],
    ] }),
  e({ id: 'est_viagem_exterior', cat: 'opportunity', w: 2, cd: 500,
    title: 'Missão comercial no exterior', text: 'Empresários convidam para uma missão de atração de investimentos.',
    opts: [
      ['Ir', [gi('business', 4), apr(-1)]],
      ['Mandar o vice', [gi('business', 1)]],
    ] }),
  e({ id: 'est_governo_digital', cat: 'opportunity', w: 2, cd: 700,
    title: 'Governo digital', text: 'Filas no Detran e no Poupatempo irritam a população.',
    opts: [
      ['Investir em serviços online', [gasto('administration', 0.03), sat(JOVENS, 2), apr(1)]],
      ['Depois', []],
    ] }),

  // ─── Servidores ───
  e({ id: 'est_reajuste_geral', cat: 'politics', w: 3, cd: 365,
    title: 'Servidores pedem reposição da inflação', text: 'Os sindicatos dão 30 dias para o reajuste.',
    opts: [
      ['Repor a inflação', [gasto('administration', 0.05), gi('civil_servants', 8)]],
      ['Metade da inflação', [gasto('administration', 0.02), gi('civil_servants', 1)]],
      ['Congelar salários', [gi('civil_servants', -10), radical('civil_servants', 6)]],
    ] }),
  e({ id: 'est_cargos_comissionados', cat: 'politics', w: 2, cd: 600,
    title: 'Corte de cargos comissionados', text: 'A equipe propõe cortar 30% dos cargos de confiança.',
    opts: [
      ['Cortar', [gasto('administration', -0.02), apr(2), cap(-6)]],
      ['Manter', [cap(2)]],
    ] }),

  // ─── Sociedade e cultura ───
  e({ id: 'est_festa_estado', cat: 'opportunity', w: 2, cd: 330,
    title: 'Festa tradicional do estado', text: 'A maior festa popular de {stateName} pede apoio do governo.',
    opts: [
      ['Apoiar', [gasto('administration', 0.01), apr(2), gi('commerce', 3)]],
      ['Apoio simbólico', []],
    ] }),
  e({ id: 'est_indigenas_saude', cat: 'politics', w: 2, cd: 600, regions: ['norte', 'centro_oeste'],
    title: 'Crise de saúde em aldeias', text: 'Desnutrição e malária avançam em terras indígenas.',
    opts: [
      ['Missão de saúde estadual', [gasto('health', 0.02), cred(3), gi('social_movements', 4)]],
      ['Responsabilizar a União', [cred(-1)]],
    ] }),
  e({ id: 'est_migrantes', cat: 'politics', w: 2, cd: 600, states: ['RR', 'AM', 'AC', 'PR', 'SC', 'SP'],
    title: 'Chegada de migrantes', text: 'Abrigos para migrantes estão lotados.',
    opts: [
      ['Centro estadual de acolhimento', [gasto('social', 0.02), gi('social_movements', 4), sat(POBRES, -1)]],
      ['Interiorização com a União', [cap(-2)]],
    ] }),

  // ─── Pressão popular ───
  e({ id: 'est_protesto_palacio', cat: 'crisis', w: 3, cd: 200, neg: true, cond: (s) => approvalOf(s) < 35,
    title: 'Protestos em frente ao palácio', text: 'Milhares pedem a saída do governador.',
    opts: [
      ['Anunciar pacote de medidas', [gasto('social', 0.03), apr(2), cap(-5)]],
      ['Reforçar a segurança do palácio', [apr(-2), unrest(3), legit(-1)]],
    ] }),
  e({ id: 'est_cpi_assembleia', cat: 'scandal', w: 2, cd: 600, neg: true,
    cond: (s) => (s.candidates[s.playerId]?.scandal ?? 0) >= 12,
    title: 'Assembleia instala CPI contra o governo', text: 'A oposição conseguiu as assinaturas para a CPI.',
    opts: [
      ['Controlar a relatoria com a base', [cap(-12), cred(-2)]],
      ['Colaborar com as investigações', [cred(3), cap(-4), esc(-2)]],
    ] }),
  e({ id: 'est_vazamento_detran', cat: 'scandal', w: 2, cd: 700,
    title: 'Dados de milhões vazam do Detran', text: 'Um hacker expôs dados de motoristas do estado.',
    opts: [
      ['Investigação e transparência', [cred(2), gasto('administration', 0.01)]],
      ['Minimizar', [esc(3)]],
    ] }),
  e({ id: 'est_ultimo_ano', cat: 'politics', w: 2, cd: 900,
    cond: (s) => {
      const end = s.government?.endDate;
      return !!end && Date.parse(end) - Date.parse(s.date) < 365 * 864e5;
    },
    title: 'Último ano de governo', text: 'A base cobra um sucessor e a oposição se organiza.',
    opts: [
      ['Lançar um sucessor', [cap(4), apr(1), cap(-3)]],
      ['Disputar a reeleição', [apr(1), cap(-3)]],
    ] }),
  e({ id: 'est_crise_hidrica', cat: 'crisis', w: 2, cd: 700, neg: true, states: ['SP', 'RJ', 'MG', 'DF', 'GO', 'PE', 'CE'],
    title: 'Reservatórios em nível crítico', text: 'A capital de {stateName} pode ter rodízio de água.',
    opts: [
      ['Obras emergenciais de captação', [gasto('infrastructure', 0.06), apr(1)]],
      ['Bônus para quem economizar', [gasto('infrastructure', 0.01), apr(1)]],
      ['Rodízio', [apr(-5), sat(CLASSE_MEDIA, -3)]],
    ] }),
  e({ id: 'est_greve_medicos', cat: 'crisis', w: 2, cd: 500, neg: true,
    title: 'Médicos estaduais em greve', text: 'Hospitais funcionam só com emergência.',
    opts: [
      ['Plano de carreira', [gasto('health', 0.03), gi('civil_servants', 5)]],
      ['Contratar médicos temporários', [gi('civil_servants', -6)]],
    ] }),
  e({ id: 'est_cotas_universidade', cat: 'politics', w: 1, cd: 900,
    title: 'Cotas na universidade estadual', text: 'O programa de cotas completa dez anos e precisa ser renovado.',
    opts: [
      ['Renovar e ampliar', [gi('social_movements', 5), gi('youth', 3), gi('religious', -1)]],
      ['Encerrar', [gi('social_movements', -8), gi('youth', -3)]],
    ] }),
  e({ id: 'est_pacto_alfabetizacao', cat: 'opportunity', w: 2, cd: 700,
    title: 'Pacto pela alfabetização com os prefeitos', text: 'O estado pode apoiar as redes municipais na alfabetização.',
    opts: [
      ['Lançar o pacto', [gasto('education', 0.02), cred(2), cap(3)]],
      ['Não', []],
    ] }),
  e({ id: 'est_ponte_aerea_norte', cat: 'crisis', w: 2, cd: 700, neg: true, states: ['AM', 'PA', 'AC', 'RR', 'AP', 'RO'],
    title: 'Rios secam e isolam cidades', text: 'A seca dos rios deixou comunidades sem comida e remédios.',
    opts: [
      ['Ponte aérea de alimentos', [gasto('social', 0.05), apr(4)]],
      ['Pedir ajuda às Forças Armadas', [cap(-3), apr(1)]],
    ] }),
  e({ id: 'est_energia_preco', cat: 'economy', w: 1, cd: 700,
    title: 'Conta de luz dispara', text: 'A tarifa de energia subiu 20% e o ICMS estadual é apontado.',
    opts: [
      ['Reduzir o ICMS da energia', [gasto('administration', 0.03), apr(2)]],
      ['Manter', [apr(-1)]],
    ] }),
  e({ id: 'est_crime_repercussao', cat: 'crisis', w: 2, cd: 400, neg: true,
    title: 'Crime de repercussão nacional', text: 'Um crime brutal na capital está em todos os telejornais.',
    opts: [
      ['Resposta rápida e coletiva de imprensa', [gasto('security', 0.01), apr(1), gi('security', 2)]],
      ['Aguardar a investigação', [apr(-1)]],
    ] }),
  e({ id: 'est_vice_conspira', cat: 'politics', w: 2, cd: 900, vars: { pessoa: V.vice }, mod: viceRisk,
    title: 'Vice-governador articula com a oposição', text: 'O vice {pessoa} dá entrevistas como "alternativa" ao governo.',
    opts: [
      ['Dar uma secretaria ao vice', [cap(-4), flag('vice_neutralizado')]],
      ['Isolar o vice', [cap(-2), chain('est_vice_rompe', 120, 0.5)]],
    ] }),
  e({ id: 'est_vice_rompe', cat: 'politics', w: 0, chainOnly: true, neg: true, vars: { pessoa: V.vice },
    title: 'Vice rompe com o governo', text: 'O vice-governador anuncia que será candidato contra você.',
    opts: [
      ['Expor os bastidores', [apr(1), cap(-3)]],
      ['Ignorar', [cap(-2)]],
    ] }),
  e({ id: 'est_shock_commodities', cat: 'economy', w: 1, cd: 900, regions: ['centro_oeste', 'norte'],
    title: 'Preço da soja despenca', text: 'O preço internacional caiu 30% e a economia do estado sente.',
    opts: [['Acompanhar o mercado', [shock('Queda das commodities', 6, { growth: -0.5, unemployment: 0.3 }), gi('agribusiness', -3)]]] }),
];
