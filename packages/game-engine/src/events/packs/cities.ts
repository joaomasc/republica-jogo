/**
 * Pacote de ganchos por cidade jogável: um evento próprio para o prefeito de cada cidade-polo.
 * Fonte das ideias: docs/BANCO_DE_CONTEUDO.md, seção 10.
 */
import type { StateId } from '../../core/types';
import { CITY_SEEDS } from '../../map/cities.generated';
import {
  apr, CAMPO, cap, chain, CLASSE_MEDIA, cred, ev, fame, gasto, gi, GOV, IDOSOS, JOVENS, MUN, OPERARIOS,
  type OptInput, POBRES, sat, unrest,
} from '../dsl';
import type { EventCategory, EventDefinition } from '../types';

/** Código IBGE de uma cidade jogável (erro na carga se o nome não existir). */
function cityId(name: string, uf: StateId): string {
  const seed = CITY_SEEDS.find((c) => c.name === name && c.stateId === uf);
  if (!seed) throw new Error(`Cidade jogável não encontrada: ${name} (${uf})`);
  return seed.id;
}

/** Gancho de uma cidade: só para o prefeito dela. */
function h(
  name: string,
  uf: StateId,
  id: string,
  cat: EventCategory,
  title: string,
  text: string,
  opts: OptInput[],
  extra: { neg?: boolean; cd?: number } = {},
): EventDefinition {
  return ev({
    id: `city_${id}`,
    cat,
    title,
    text,
    phases: GOV,
    scope: MUN,
    cities: [cityId(name, uf)],
    w: 4,
    cd: extra.cd ?? 900,
    ...(extra.neg ? { neg: true } : {}),
    opts,
  });
}

export const CITY_EVENTS: EventDefinition[] = [
  // ─── Norte ───
  h('Rio Branco', 'AC', 'rio_branco_cheia', 'crisis', 'Cheia do rio Acre invade bairros', 'Famílias ribeirinhas de {cityName} perderam tudo.', [
    ['Abrigos e auxílio-aluguel', [gasto('social', 0.04), apr(2)]],
    ['Remoção definitiva das margens', [gasto('social', 0.02), sat(POBRES, -3), cred(1)]],
  ], { neg: true }),
  h('Manaus', 'AM', 'manaus_motos', 'economy', 'Fábrica de motos ameaça sair', 'A maior fábrica do Distrito Industrial pode ir embora.', [
    ['Incentivo municipal', [gasto('industry', 0.03), gi('industry', 5), sat(OPERARIOS, 2)]],
    ['Campanha em Brasília pela Zona Franca', [fame(3), cap(-2)]],
  ]),
  h('Macapá', 'AP', 'macapa_apagao', 'crisis', 'Apagão de dias em Macapá', 'Hospitais e comércio funcionam com geradores.', [
    ['Geradores emergenciais da prefeitura', [gasto('infrastructure', 0.03), apr(2)]],
    ['Cobrar a União', [cap(-2), apr(-1)]],
  ], { neg: true }),
  h('Boa Vista', 'RR', 'boa_vista_abrigos', 'crisis', 'Abrigos de imigrantes lotados', 'Venezuelanos dormem nas praças de {cityName}.', [
    ['Interiorização com a União', [cap(-2), gi('social_movements', 4)]],
    ['Abrigo municipal', [gasto('social', 0.03), cred(2), sat(POBRES, -1)]],
  ]),
  h('Palmas', 'TO', 'palmas_onibus', 'politics', 'Bairros afastados sem ônibus', 'Moradores das quadras distantes andam quilômetros até o ponto.', [
    ['Novas linhas', [gasto('infrastructure', 0.02), sat(POBRES, 3)]],
    ['Vans comunitárias', [gasto('infrastructure', 0.01), sat(POBRES, 1)]],
  ]),
  h('Araguaína', 'TO', 'araguaina_carne', 'economy', 'Embargo à carne', 'Um país comprador embargou a carne da região.', [
    ['Missão comercial', [gi('agribusiness', 4), cap(-1)]],
    ['Auxílio aos trabalhadores dos frigoríficos', [gasto('social', 0.02), sat(OPERARIOS, 2)]],
  ]),
  h('Porto Velho', 'RO', 'porto_velho_garimpo', 'crisis', 'Garimpo ilegal no rio Madeira', 'Balsas de garimpo cercam a cidade.', [
    ['Operação com a Polícia Federal', [gi('environmental', 5), cred(2), unrest(1)]],
    ['Cadastrar e legalizar', [gi('environmental', -6), sat(['workers'], 1)]],
  ]),
  h('Ji-Paraná', 'RO', 'ji_parana_serrarias', 'economy', 'Serrarias fechadas pela fiscalização', 'Centenas de trabalhadores estão sem emprego.', [
    ['Requalificação profissional', [gasto('education', 0.01), sat(OPERARIOS, 2)]],
    ['Pedir revisão da fiscalização', [gi('environmental', -3), cap(-1)]],
  ]),
  h('Cacoal', 'RO', 'cacoal_cafe', 'opportunity', 'Selo de origem do café robusta', 'A cooperativa quer um selo de origem para o café de {cityName}.', [
    ['Apoiar o selo', [gi('agribusiness', 4), sat(CAMPO, 2), cap(-3)]],
    ['Deixar com a cooperativa', []],
  ]),
  h('Belém', 'PA', 'belem_cirio', 'opportunity', 'Círio com 2 milhões de pessoas', 'A procissão exige uma operação gigante.', [
    ['Estrutura reforçada', [gasto('health', 0.01), gi('religious', 5), apr(2)]],
    ['Estrutura padrão', [apr(-1)]],
  ], { cd: 330 }),
  h('Marabá', 'PA', 'maraba_conflito', 'crisis', 'Conflito agrário com mortes', 'Trabalhadores sem-terra e seguranças de fazenda se enfrentam.', [
    ['Mediação com o Incra', [cred(2), gi('social_movements', 3), cap(-3)]],
    ['Cobrar a polícia estadual', [gi('security', 2), gi('social_movements', -3)]],
  ], { neg: true }),
  h('Santarém', 'PA', 'santarem_rio', 'crisis', 'Rio Tapajós fica marrom', 'O garimpo rio acima mudou a cor da água.', [
    ['Denunciar nacionalmente', [fame(3), gi('environmental', 5), cap(-3)]],
    ['Monitorar a qualidade da água', [gasto('health', 0.01), cred(1)]],
  ]),
  h('Castanhal', 'PA', 'castanhal_acai', 'opportunity', 'Feira do açaí', 'Produtores querem um selo de qualidade.', [
    ['Selo municipal do açaí', [gi('commerce', 4), sat(CAMPO, 2), cap(-3)]],
    ['Deixar com os produtores', []],
  ]),

  // ─── Nordeste ───
  h('São Luís', 'MA', 'sao_luis_casarao', 'crisis', 'Casarão desaba no centro histórico', 'Um casarão colonial ruiu e assustou os moradores.', [
    ['Restauro com a União', [gasto('administration', 0.02), cred(2), cap(-1)]],
    ['Interditar os imóveis em risco', [sat(POBRES, -2), cred(1)]],
  ], { neg: true }),
  h('Imperatriz', 'MA', 'imperatriz_agua', 'politics', 'Fábrica quer mais água do Tocantins', 'A fábrica de celulose quer ampliar a captação.', [
    ['Autorizar', [gi('industry', 5), sat(OPERARIOS, 2), gi('environmental', -3)]],
    ['Exigir estudo', [gi('environmental', 3), gi('industry', -2)]],
  ]),
  h('Teresina', 'PI', 'teresina_calor', 'crisis', 'Onda de calor de 42 °C', 'Escolas e postos de saúde sofrem com o calor.', [
    ['Arborização emergencial', [gasto('infrastructure', 0.01), apr(2)]],
    ['Climatizar escolas', [gasto('education', 0.02), sat(['workers', 'middle_class'], 2)]],
  ]),
  h('Fortaleza', 'CE', 'fortaleza_onibus', 'crisis', 'Ataques de facção a ônibus', 'Empresas tiram os ônibus de circulação.', [
    ['Pedir a Força Nacional', [cap(-2), apr(1)]],
    ['Guarda municipal nos terminais', [gasto('security', 0.02), gi('security', 2)]],
  ], { neg: true }),
  h('Juazeiro do Norte', 'CE', 'juazeiro_romaria', 'opportunity', 'Romaria de novembro', 'Dois milhões de romeiros chegam à cidade.', [
    ['Estrutura completa', [gasto('health', 0.02), gi('religious', 5), apr(2)]],
    ['Estrutura básica', [gi('religious', -2)]],
  ], { cd: 330 }),
  h('Sobral', 'CE', 'sobral_premio', 'opportunity', 'Prêmio nacional de alfabetização', 'As escolas de {cityName} são as melhores do país.', [
    ['Celebrar com os professores', [cred(4), gi('civil_servants', 3)]],
  ]),
  h('Natal', 'RN', 'natal_agua', 'crisis', 'Falta de água na alta temporada', 'Hotéis e bairros ficam sem água no verão.', [
    ['Caminhões-pipa', [gasto('infrastructure', 0.01), apr(1)]],
    ['Cobrar a companhia estadual', [cap(-1)]],
  ]),
  h('Mossoró', 'RN', 'mossoro_campos', 'economy', 'Estatal vende campos maduros', 'Os campos de petróleo da região serão vendidos.', [
    ['Atrair o comprador', [gi('industry', 4), sat(OPERARIOS, 2), cap(-3)]],
    ['Protestar contra a venda', [gi('unions', 4), fame(1), cap(-3)]],
  ]),
  h('João Pessoa', 'PB', 'joao_pessoa_orla', 'politics', 'Prédios altos na orla', 'Construtoras querem derrubar o limite de altura.', [
    ['Manter o limite', [sat(CLASSE_MEDIA, 2), gi('business', -3)]],
    ['Liberar com contrapartidas', [gi('business', 5), gasto('infrastructure', -0.01), cap(-3)]],
  ]),
  h('Campina Grande', 'PB', 'campina_sao_joao', 'opportunity', 'O Maior São João do Mundo', 'A festa precisa de estrutura e atrações.', [
    ['Festa grande', [gasto('administration', 0.02), apr(4), gi('commerce', 4)]],
    ['Festa enxuta', [apr(-1)]],
  ], { cd: 330 }),
  h('Recife', 'PE', 'recife_morros', 'crisis', 'Morros desabam com a chuva', 'Deslizamentos atingem casas nos morros.', [
    ['Contenção de encostas', [gasto('infrastructure', 0.04), apr(2)]],
    ['Remoção das famílias em risco', [gasto('social', 0.02), sat(POBRES, -2), cred(1)]],
  ], { neg: true }),
  h('Jaboatão dos Guararapes', 'PE', 'jaboatao_orla', 'crisis', 'Erosão destrói a orla de Piedade', 'O mar engoliu calçadões e ameaça prédios.', [
    ['Engorda da praia', [gasto('infrastructure', 0.06), apr(2)]],
    ['Muro de contenção', [gasto('infrastructure', 0.02)]],
  ]),
  h('Caruaru', 'PE', 'caruaru_feira', 'economy', 'Feira da Sulanca perde para o online', 'Os feirantes vendem cada vez menos.', [
    ['Plataforma digital da feira', [gasto('industry', 0.01), gi('commerce', 4)]],
    ['Reforma da feira', [gasto('infrastructure', 0.02), gi('commerce', 2)]],
  ]),
  h('Petrolina', 'PE', 'petrolina_uva', 'economy', 'Tarifa europeia sobre a uva', 'Exportadores de uva perdem o mercado europeu.', [
    ['Buscar novos mercados', [gi('agribusiness', 4), cap(-1)]],
    ['Linha de crédito', [gasto('industry', 0.01), sat(CAMPO, 2)]],
  ]),
  h('Garanhuns', 'PE', 'garanhuns_festival', 'opportunity', 'Festival de Inverno', 'Os artistas mais pedidos são caros.', [
    ['Festival grande', [gasto('administration', 0.01), apr(2), gi('commerce', 3)]],
    ['Festival enxuto', [cred(1)]],
  ], { cd: 330 }),
  h('Maceió', 'AL', 'maceio_afundamento', 'crisis', 'Bairros afundam pela mineração', 'Mais um bairro de {cityName} foi evacuado.', [
    ['Cobrar a mineradora', [fame(3), apr(2), gi('industry', -3)]],
    ['Acordo de indenização', [cap(2), cred(-2)]],
  ], { neg: true }),
  h('Arapiraca', 'AL', 'arapiraca_calcados', 'opportunity', 'Fábrica de calçados quer vir', 'A empresa pede terreno e isenção.', [
    ['Conceder incentivos', [gasto('industry', 0.02), sat(OPERARIOS, 3)]],
    ['Negociar contrapartidas', [gi('industry', 2)]],
  ]),
  h('Aracaju', 'SE', 'aracaju_orla', 'politics', 'Reforma da orla atrasada', 'A construtora pede aditivo.', [
    ['Aprovar o aditivo', [gasto('infrastructure', 0.02), apr(1)]],
    ['Romper o contrato', [cred(2), apr(-1)]],
  ]),
  h('Salvador', 'BA', 'salvador_carnaval', 'crisis', 'Carnaval sem patrocinador', 'A cervejaria que patrocinava a festa desistiu.', [
    ['A prefeitura banca', [gasto('administration', 0.03), apr(2), gi('commerce', 3)]],
    ['Carnaval menor', [apr(-2)]],
    ['Buscar patrocinador às pressas', [cap(-1), chain('city_salvador_patrocinio', 20, 0.6)]],
  ], { cd: 330 }),
  h('Feira de Santana', 'BA', 'feira_caminhoneiros', 'crisis', 'Greve de caminhoneiros trava a cidade', 'O entroncamento rodoviário está bloqueado.', [
    ['Mediar com os caminhoneiros', [cap(-1), apr(1)]],
    ['Pedir desobstrução', [gi('security', 2), apr(-1)]],
  ]),
  h('Vitória da Conquista', 'BA', 'conquista_geada', 'crisis', 'Geada no café', 'Os cafezais do planalto queimaram.', [
    ['Crédito emergencial', [gasto('industry', 0.01), sat(CAMPO, 3)]],
    ['Pedir socorro ao estado', [cap(-1)]],
  ]),
  h('Itabuna', 'BA', 'itabuna_cacau', 'economy', 'Preço do cacau dispara', 'A economia de {cityName} vive um boom.', [
    ['Investir na cadeia do chocolate', [gasto('industry', 0.01), gi('commerce', 3)]],
    ['Comemorar', [apr(1)]],
  ]),
  h('Ilhéus', 'BA', 'ilheus_porto', 'politics', 'Porto Sul em obras', 'O porto promete empregos e preocupa ambientalistas.', [
    ['Apoiar a obra', [sat(OPERARIOS, 2), gi('environmental', -4)]],
    ['Exigir compensações', [gi('environmental', 3)]],
  ]),
  h('Barreiras', 'BA', 'barreiras_outorga', 'politics', 'Disputa por outorga de água', 'Irrigantes e comunidades disputam o rio.', [
    ['Mediar', [cred(2)]],
    ['Defender os irrigantes', [gi('agribusiness', 4), gi('social_movements', -3)]],
  ]),
  h('Eunápolis', 'BA', 'eunapolis_eucalipto', 'politics', 'Celulose amplia o plantio', 'O eucalipto avança sobre pequenas propriedades.', [
    ['Zoneamento municipal', [sat(CAMPO, 2), gi('industry', -2)]],
    ['Liberar', [gi('industry', 4), sat(CAMPO, -2)]],
  ]),

  // ─── Centro-Oeste ───
  h('Brasília', 'DF', 'brasilia_greve', 'crisis', 'Greve de servidores', 'Servidores do DF param por reajuste.', [
    ['Negociar reajuste', [gasto('administration', 0.03), gi('civil_servants', 5)]],
    ['Cortar o ponto', [gi('civil_servants', -6)]],
  ], { neg: true }),
  h('Goiânia', 'GO', 'goiania_agua', 'crisis', 'Crise hídrica', 'Os reservatórios de {cityName} estão no limite.', [
    ['Poços e captação emergencial', [gasto('infrastructure', 0.03), apr(1)]],
    ['Rodízio', [apr(-3)]],
  ], { neg: true }),
  h('Aparecida de Goiânia', 'GO', 'aparecida_esgoto', 'politics', 'Cidade cresce sem saneamento', 'Metade dos bairros não tem esgoto.', [
    ['Grande obra de esgoto', [gasto('infrastructure', 0.06), sat(POBRES, 3)]],
    ['Esperar o estado', [sat(POBRES, -1)]],
  ]),
  h('Anápolis', 'GO', 'anapolis_remedios', 'opportunity', 'Falta de remédios no país', 'Os laboratórios de {cityName} podem produzir mais.', [
    ['Incentivo à produção local', [gi('industry', 4), fame(2), cap(-3)]],
    ['Deixar com o mercado', []],
  ]),
  h('Campo Grande', 'MS', 'campo_grande_rota', 'opportunity', 'Rota bioceânica passa pela cidade', 'Empresas de logística procuram terrenos.', [
    ['Plataforma logística', [gasto('infrastructure', 0.02), gi('commerce', 4)]],
    ['Esperar', []],
  ]),
  h('Dourados', 'MS', 'dourados_retomada', 'crisis', 'Retomada de terra indígena', 'Indígenas ocupam uma fazenda na periferia.', [
    ['Mediação', [cred(2), gi('social_movements', 3), cap(-3)]],
    ['Pedir reintegração', [gi('agribusiness', 4), gi('social_movements', -5)]],
  ], { neg: true }),
  h('Cuiabá', 'MT', 'cuiaba_calor', 'crisis', 'Calor de 44 °C', 'As escolas não aguentam o calor da tarde.', [
    ['Ajustar o horário escolar', [sat(['workers', 'middle_class'], 2)]],
    ['Climatizar escolas', [gasto('education', 0.02), apr(1)]],
  ]),
  h('Rondonópolis', 'MT', 'rondonopolis_terminal', 'opportunity', 'Ferrovia estende a linha', 'Cidades disputam o novo terminal.', [
    ['Disputar o terminal', [cap(-2), gi('agribusiness', 4), sat(OPERARIOS, 1)]],
    ['Não disputar', []],
  ]),
  h('Sinop', 'MT', 'sinop_queimadas', 'crisis', 'Queimadas fecham o aeroporto', 'A fumaça suspendeu os voos.', [
    ['Brigadas municipais', [gasto('security', 0.01), gi('environmental', 3)]],
    ['Esperar a chuva', [apr(-1)]],
  ], { neg: true }),

  // ─── Sudeste ───
  h('Belo Horizonte', 'MG', 'bh_pampulha', 'politics', 'Lagoa da Pampulha poluída', 'O cartão-postal da cidade está tomado por algas.', [
    ['Despoluição completa', [gasto('infrastructure', 0.05), gi('environmental', 4), apr(1)]],
    ['Limpeza superficial', [gasto('infrastructure', 0.01)]],
  ]),
  h('Contagem', 'MG', 'contagem_galpoes', 'economy', 'Galpões industriais vazios', 'Fábricas fecharam e deixaram galpões.', [
    ['Polo logístico', [gi('commerce', 4), sat(OPERARIOS, 2), cap(-3)]],
    ['Esperar novas indústrias', []],
  ]),
  h('Uberlândia', 'MG', 'uberlandia_atacadistas', 'economy', 'Atacadistas ameaçam ir para Goiás', 'Goiás oferece incentivos maiores.', [
    ['Incentivo municipal', [gasto('industry', 0.02), gi('commerce', 4)]],
    ['Deixar ir', [sat(OPERARIOS, -2)]],
  ]),
  h('Juiz de Fora', 'MG', 'juiz_de_fora_greve', 'politics', 'Universidade federal em greve', 'A greve esvazia a cidade universitária.', [
    ['Apoiar os grevistas', [sat(JOVENS, 2), gi('civil_servants', 2), cap(-3)]],
    ['Ficar neutro', []],
  ]),
  h('Montes Claros', 'MG', 'montes_claros_seca', 'crisis', 'Seca e falta de água', 'O norte de Minas enfrenta seca severa.', [
    ['Adutora emergencial', [gasto('infrastructure', 0.04), apr(2)]],
    ['Caminhões-pipa', [gasto('infrastructure', 0.01)]],
  ], { neg: true }),
  h('Ipatinga', 'MG', 'ipatinga_alto_forno', 'economy', 'Alto-forno desligado', 'A siderúrgica desligou um alto-forno e demitiu.', [
    ['Plano de diversificação', [gasto('industry', 0.02), sat(OPERARIOS, 2)]],
    ['Pressionar a empresa', [gi('unions', 3), gi('industry', -2)]],
  ]),
  h('Uberaba', 'MG', 'uberaba_aftosa', 'crisis', 'Suspeita de febre aftosa', 'Um foco suspeito ameaça o rebanho zebu.', [
    ['Barreira sanitária', [gasto('industry', 0.01), gi('agribusiness', 4)]],
    ['Esperar o laudo', [gi('agribusiness', -3)]],
  ]),
  h('Sete Lagoas', 'MG', 'sete_lagoas_cervejaria', 'politics', 'Cervejaria quer mais água', 'A fábrica amplia e quer mais água do aquífero.', [
    ['Liberar com contrapartidas', [gi('industry', 4), gasto('infrastructure', -0.01), cap(-3)]],
    ['Negar', [gi('environmental', 3), gi('industry', -3)]],
  ]),
  h('Pouso Alegre', 'MG', 'pouso_alegre_polo', 'opportunity', 'Polo industrial cresce', 'Indústrias pedem mão de obra qualificada.', [
    ['Mais escolas técnicas', [gasto('education', 0.02), gi('industry', 4)]],
    ['Deixar com o mercado', []],
  ]),
  h('Poços de Caldas', 'MG', 'pocos_turismo', 'economy', 'Turismo em queda', 'As termas atraem cada vez menos visitantes.', [
    ['Festival de inverno', [gasto('administration', 0.01), gi('commerce', 3)]],
    ['Campanha publicitária', [gasto('administration', 0.005)]],
  ]),
  h('Governador Valadares', 'MG', 'valadares_deportados', 'politics', 'Deportações dos EUA', 'Voos de deportados chegam com moradores da cidade.', [
    ['Programa de acolhida', [gasto('social', 0.01), sat(POBRES, 2)]],
    ['Nada específico', []],
  ]),
  h('Divinópolis', 'MG', 'divinopolis_moda', 'economy', 'Confecções perdem para importados', 'Roupas chinesas tomam o mercado.', [
    ['Feira de moda', [gasto('industry', 0.005), gi('commerce', 3)]],
    ['Pedir tarifa ao governo federal', [cap(-1)]],
  ]),
  h('Varginha', 'MG', 'varginha_cafe', 'economy', 'Bolsa de café em alta', 'O preço do café dispara.', [
    ['Comemorar com os produtores', [sat(CAMPO, 2), apr(1)]],
  ]),
  h('Teófilo Otoni', 'MG', 'teofilo_pedras', 'opportunity', 'Feira internacional de pedras', 'Compradores estrangeiros procuram gemas.', [
    ['Apoiar a feira', [gasto('administration', 0.005), gi('commerce', 4)]],
    ['Deixar com a associação', []],
  ]),
  h('Vitória', 'ES', 'vitoria_po_preto', 'politics', 'Pó preto do minério', 'O pó das usinas suja casas e pulmões.', [
    ['Fiscalizar a mineradora', [sat(CLASSE_MEDIA, 2), gi('industry', -3)]],
    ['Acordo de redução gradual', [gi('industry', 1), cred(1), cap(-3)]],
  ]),
  h('Serra', 'ES', 'serra_crescimento', 'politics', 'Crescimento desordenado', 'Loteamentos surgem sem infraestrutura.', [
    ['Novo plano diretor', [cred(2), gi('business', -2)]],
    ['Regularizar o que existe', [sat(POBRES, 2)]],
  ]),
  h('Cachoeiro de Itapemirim', 'ES', 'cachoeiro_pedreira', 'crisis', 'Acidente em pedreira', 'Trabalhadores morreram num desabamento.', [
    ['Fiscalização rigorosa', [cred(2), gi('industry', -2)]],
    ['Apoio às famílias', [gasto('social', 0.005), apr(1)]],
  ], { neg: true }),
  h('Rio de Janeiro', 'RJ', 'rio_milicia', 'crisis', 'Milícia cobra taxa em bairro', 'Moradores pagam "segurança" e gás mais caro.', [
    ['Denunciar e pedir operação', [cred(3), gi('security', 2), chain('city_rio_retaliacao', 30, 0.4), cap(-3)]],
    ['Ocupar o bairro com serviços', [gasto('social', 0.02), sat(POBRES, 2)]],
  ], { neg: true }),
  h('São Gonçalo', 'RJ', 'sao_goncalo_hospital', 'politics', 'Cidade sem hospital municipal', 'Moradores dependem dos hospitais de Niterói.', [
    ['Construir o hospital', [gasto('health', 0.06), apr(2)]],
    ['Convênio com hospitais privados', [gasto('health', 0.02)]],
  ]),
  h('Duque de Caxias', 'RJ', 'caxias_refinaria', 'crisis', 'Vazamento na refinaria', 'Óleo vazou num rio da cidade.', [
    ['Multa pesada', [cred(2), gi('industry', -3)]],
    ['Acordo de reparação', [gasto('administration', -0.01)]],
  ], { neg: true }),
  h('Nova Iguaçu', 'RJ', 'nova_iguacu_enchentes', 'crisis', 'Enchentes recorrentes', 'Toda chuva forte alaga os mesmos bairros.', [
    ['Piscinões', [gasto('infrastructure', 0.05), apr(2)]],
    ['Limpeza dos rios', [gasto('infrastructure', 0.01)]],
  ], { neg: true }),
  h('Campos dos Goytacazes', 'RJ', 'campos_royalties', 'crisis', 'Royalties caem', 'A receita do petróleo despencou.', [
    ['Cortar gastos', [gasto('administration', -0.04), gi('civil_servants', -5)]],
    ['Empréstimo', [gasto('administration', 0.02), cred(-1)]],
  ], { neg: true }),
  h('Macaé', 'RJ', 'macae_plataforma', 'economy', 'Plataforma desativada', 'Empresas de serviços de petróleo demitem.', [
    ['Polo de descomissionamento', [gi('industry', 4), sat(OPERARIOS, 2), cap(-3)]],
    ['Diversificar para o turismo', [gi('commerce', 2), cap(-3)]],
  ]),
  h('Volta Redonda', 'RJ', 'volta_redonda_usina', 'economy', 'Usina vendida a estrangeiros', 'Metalúrgicos temem demissões.', [
    ['Exigir garantias de emprego', [gi('unions', 4), sat(OPERARIOS, 2), cap(-3)]],
    ['Receber bem os compradores', [gi('industry', 4), cap(-3)]],
  ]),
  h('Petrópolis', 'RJ', 'petropolis_tempestade', 'crisis', 'Tempestade de fevereiro', 'Uma chuva histórica derrubou encostas.', [
    ['Gabinete de crise e abrigos', [gasto('social', 0.04), apr(2)]],
    ['Pedir verba federal', [cap(-2)]],
  ], { neg: true }),
  h('Cabo Frio', 'RJ', 'cabo_frio_esgoto', 'politics', 'Esgoto nas praias', 'Praias impróprias na alta temporada.', [
    ['Saneamento', [gasto('infrastructure', 0.04), gi('commerce', 3)]],
    ['Esconder os laudos', [cred(-3)]],
  ]),
  h('São Paulo', 'SP', 'sao_paulo_cracolandia', 'crisis', 'Cracolândia', 'O fluxo de usuários muda de rua a cada operação.', [
    ['Tratamento e moradia primeiro', [gasto('health', 0.02), gi('social_movements', 4)]],
    ['Operação policial', [gi('security', 4), gi('social_movements', -5), apr(1)]],
  ], { neg: true }),
  h('Guarulhos', 'SP', 'guarulhos_apagao', 'crisis', 'Apagão no aeroporto', 'Voos cancelados e passageiros no chão.', [
    ['Cobrar a concessionária', [fame(1), apr(1), cap(-3)]],
    ['Nota técnica', []],
  ]),
  h('Campinas', 'SP', 'campinas_viracopos', 'politics', 'Viracopos expande', 'A expansão exige desapropriar bairros.', [
    ['Apoiar com indenizações justas', [gasto('social', 0.02), gi('business', 3)]],
    ['Defender os moradores', [sat(POBRES, 2), gi('business', -3)]],
  ]),
  h('São Bernardo do Campo', 'SP', 'sbc_montadora', 'crisis', 'Montadora fecha a fábrica', 'Três mil empregos diretos em risco.', [
    ['Incentivo para ficar', [gasto('industry', 0.03), sat(OPERARIOS, 2)]],
    ['Requalificação e nova vocação', [gasto('education', 0.02), gi('unions', 2)]],
  ], { neg: true }),
  h('Santo André', 'SP', 'santo_andre_quimica', 'politics', 'Indústria química sai', 'O terreno ficou contaminado.', [
    ['Requalificação da área', [gasto('infrastructure', 0.03), gi('environmental', 3)]],
    ['Vender o terreno como está', [gasto('administration', -0.01), cred(-1)]],
  ]),
  h('Osasco', 'SP', 'osasco_bancos', 'economy', 'Bancos fecham agências', 'Idosos ficam sem atendimento presencial.', [
    ['Inclusão digital para idosos', [gasto('social', 0.01), sat(IDOSOS, 3)]],
    ['Pressionar os bancos', [fame(1)]],
  ]),
  h('Ribeirão Preto', 'SP', 'ribeirao_queimadas', 'crisis', 'Queimadas em canaviais', 'A fumaça lota as emergências.', [
    ['Fiscalização e multas', [gi('agribusiness', -3), gi('environmental', 3), sat(IDOSOS, 2)]],
    ['Acordo com as usinas', [gi('agribusiness', 2)]],
  ]),
  h('Sorocaba', 'SP', 'sorocaba_turno', 'economy', 'Montadora suspende turno', 'Mil trabalhadores em lay-off.', [
    ['Negociação tripartite', [cap(-1), gi('unions', 3)]],
    ['Esperar o mercado', [sat(OPERARIOS, -2)]],
  ]),
  h('São José dos Campos', 'SP', 'sjc_avioes', 'opportunity', 'Contrato de exportação de aviões', 'A fabricante vendeu dezenas de jatos.', [
    ['Comemorar e pedir escolas técnicas', [gi('industry', 3), apr(1)]],
  ]),
  h('São José do Rio Preto', 'SP', 'rio_preto_dengue', 'crisis', 'Dengue explode', 'Casos triplicaram e hospitais lotaram.', [
    ['Mutirão contra o mosquito', [gasto('health', 0.02), apr(1)]],
    ['Hospital de campanha', [gasto('health', 0.03), apr(2)]],
  ], { neg: true }),
  h('Bauru', 'SP', 'bauru_rodizio', 'crisis', 'Rodízio de água', 'A seca obrigou rodízio em vários bairros.', [
    ['Poços emergenciais', [gasto('infrastructure', 0.02), apr(1)]],
    ['Manter o rodízio', [apr(-2)]],
  ], { neg: true }),
  h('Santos', 'SP', 'santos_navio', 'crisis', 'Navio encalha no canal do porto', 'O porto parou por dois dias.', [
    ['Exigir dragagem emergencial', [cap(-1), gi('commerce', 2)]],
    ['Esperar a autoridade portuária', []],
  ]),
  h('Jundiaí', 'SP', 'jundiai_japi', 'politics', 'Condomínios na Serra do Japi', 'Incorporadoras querem lotear a serra.', [
    ['Proteger a serra', [gi('environmental', 5), gi('business', -3)]],
    ['Liberar com regras', [gi('business', 4), gi('environmental', -4)]],
  ]),
  h('Piracicaba', 'SP', 'piracicaba_peixes', 'crisis', 'Mortandade de peixes no rio', 'Toneladas de peixes mortos boiam no rio.', [
    ['Multar as indústrias', [gi('environmental', 4), gi('industry', -3)]],
    ['Investigar com calma', []],
  ], { neg: true }),
  h('Americana', 'SP', 'americana_textil', 'economy', 'Têxteis fecham as portas', 'O polo têxtil perdeu metade das fábricas.', [
    ['Polo de moda e design', [gasto('industry', 0.01), gi('commerce', 3)]],
    ['Esperar', [sat(OPERARIOS, -2)]],
  ]),
  h('Limeira', 'SP', 'limeira_folheados', 'politics', 'Trabalho informal nas folheações', 'Famílias banham joias em casa, sem proteção.', [
    ['Programa de formalização', [gasto('social', 0.01), sat(['workers'], 2)]],
    ['Fiscalizar', [cred(1), sat(['workers'], -1)]],
  ]),
  h('Franca', 'SP', 'franca_calcados', 'economy', 'Calçados chineses tomam o mercado', 'As fábricas de sapato demitem.', [
    ['Pleitear tarifa em Brasília', [cap(-1), gi('industry', 3)]],
    ['Feira de negócios', [gasto('industry', 0.005), gi('commerce', 2)]],
  ]),
  h('Araraquara', 'SP', 'araraquara_greening', 'crisis', 'Greening nos pomares', 'A doença destrói os laranjais.', [
    ['Programa fitossanitário', [gasto('industry', 0.01), sat(CAMPO, 2)]],
    ['Esperar o estado', [sat(CAMPO, -1)]],
  ]),
  h('São Carlos', 'SP', 'sao_carlos_parque', 'opportunity', 'Parque tecnológico', 'As universidades propõem um parque tecnológico.', [
    ['Criar o parque', [gasto('science', 0.02), gi('tech', 5), sat(JOVENS, 2)]],
    ['Não agora', []],
  ]),
  h('Presidente Prudente', 'SP', 'prudente_ocupacao', 'crisis', 'Ocupação de fazenda no Pontal', 'Sem-terra ocupam uma fazenda improdutiva.', [
    ['Mediação', [cred(2), gi('social_movements', 2), cap(-3)]],
    ['Apoiar a reintegração', [gi('agribusiness', 4), gi('social_movements', -4)]],
  ]),
  h('Marília', 'SP', 'marilia_recall', 'crisis', 'Recall em fábrica de alimentos', 'Lotes contaminados foram recolhidos.', [
    ['Fiscalização sanitária', [cred(2), gi('industry', -1)]],
    ['Deixar com a Anvisa', []],
  ]),
  h('Araçatuba', 'SP', 'aracatuba_usina', 'opportunity', 'Usina de etanol amplia', 'A ampliação promete 500 empregos.', [
    ['Comemorar e oferecer cursos', [sat(OPERARIOS, 2), apr(1)]],
  ]),
  h('Guaratinguetá', 'SP', 'guara_fe', 'opportunity', 'Rota da fé', 'Romeiros de Aparecida passam pela cidade.', [
    ['Criar a Rota da Fé', [gasto('infrastructure', 0.01), gi('religious', 3), gi('commerce', 3)]],
    ['Não', []],
  ]),
  h('Catanduva', 'SP', 'catanduva_queimada', 'crisis', 'Queimada perto de escola', 'Crianças passaram mal com a fumaça.', [
    ['Fiscalizar as usinas', [gi('agribusiness', -2), sat(['workers', 'middle_class'], 2)]],
    ['Nota de alerta', []],
  ]),
  h('Barretos', 'SP', 'barretos_rodeio', 'politics', 'Polêmica sobre rodeios', 'Protetores de animais pedem fim das provas com animais.', [
    ['Manter a festa', [gi('agribusiness', 4), gi('commerce', 3)]],
    ['Regras mais duras de bem-estar animal', [sat(JOVENS, 1), gi('agribusiness', -2)]],
  ]),
  h('Jaú', 'SP', 'jau_calcados', 'economy', 'Polo de calçados femininos perde mercado', 'As vendas caem pelo segundo ano.', [
    ['Feira de negócios', [gasto('industry', 0.005), gi('commerce', 3)]],
    ['Linha de crédito', [gasto('industry', 0.01), sat(OPERARIOS, 1)]],
  ]),

  // ─── Sul ───
  h('Curitiba', 'PR', 'curitiba_brt', 'politics', 'BRT sobrecarregado', 'O sistema que foi modelo vive lotado.', [
    ['Projeto do metrô', [gasto('infrastructure', 0.06), sat(OPERARIOS, 2)]],
    ['Modernizar o BRT', [gasto('infrastructure', 0.02), apr(1)]],
  ]),
  h('Londrina', 'PR', 'londrina_camara', 'scandal', 'Escândalo na Câmara', 'Vereadores são presos por venda de emendas.', [
    ['Apoiar a investigação', [cred(3), cap(-3)]],
    ['Ficar em silêncio', [cred(-2)]],
  ]),
  h('Maringá', 'PR', 'maringa_voos', 'economy', 'Aeroporto perde voos', 'Companhias cortaram rotas.', [
    ['Subsídio a rotas', [gasto('infrastructure', 0.01), gi('business', 3)]],
    ['Deixar com o mercado', []],
  ]),
  h('Cascavel', 'PR', 'cascavel_show_rural', 'opportunity', 'Show Rural bate recorde', 'A feira atraiu meio milhão de visitantes.', [
    ['Celebrar com o agro', [gi('agribusiness', 4), apr(1)]],
  ]),
  h('Ponta Grossa', 'PR', 'ponta_grossa_trem', 'crisis', 'Acidente ferroviário', 'Um trem descarrilou perto de casas.', [
    ['Exigir segurança da concessionária', [fame(1), cred(2), cap(-3)]],
    ['Esperar a perícia', []],
  ], { neg: true }),
  h('Foz do Iguaçu', 'PR', 'foz_comercio', 'economy', 'Crise no Paraguai esvazia o comércio', 'Os sacoleiros sumiram.', [
    ['Turismo de compras e eventos', [gasto('administration', 0.01), gi('commerce', 3)]],
    ['Esperar', [gi('commerce', -2)]],
  ]),
  h('Florianópolis', 'SC', 'floripa_ponte', 'politics', 'Trânsito na ponte', 'A travessia da ilha leva duas horas.', [
    ['Nova ligação', [gasto('infrastructure', 0.06), apr(2)]],
    ['Transporte marítimo', [gasto('infrastructure', 0.02), apr(1)]],
  ]),
  h('Joinville', 'SC', 'joinville_greve', 'crisis', 'Greve de metalúrgicos', 'As maiores fábricas pararam.', [
    ['Mediação', [cap(-1), gi('unions', 2), gi('industry', 1)]],
    ['Neutralidade', []],
  ]),
  h('Blumenau', 'SC', 'blumenau_deslizamento', 'crisis', 'Deslizamento na época da festa', 'A chuva derrubou encostas perto do parque da festa.', [
    ['Suspender parte da festa e ajudar as vítimas', [gasto('social', 0.02), cred(3), gi('commerce', -2)]],
    ['Manter a festa', [gi('commerce', 3), apr(-2)]],
  ], { neg: true }),
  h('Itajaí', 'SC', 'itajai_porto', 'politics', 'Concessão do porto municipal', 'O governo federal quer conceder o porto.', [
    ['Lutar pela gestão municipal', [cap(-2), gi('unions', 3)]],
    ['Aceitar a concessão', [gi('business', 4), gi('unions', -3)]],
  ]),
  h('Chapecó', 'SC', 'chapeco_gripe', 'crisis', 'Gripe aviária na região', 'Um foco ameaça as exportações de frango.', [
    ['Barreira sanitária', [gasto('industry', 0.01), gi('agribusiness', 4)]],
    ['Esperar o laudo', [gi('agribusiness', -3)]],
  ], { neg: true }),
  h('Criciúma', 'SC', 'criciuma_carvao', 'economy', 'Térmica a carvão será desligada', 'Mineiros temem pelo futuro.', [
    ['Transição energética justa', [gasto('industry', 0.02), gi('unions', 3), gi('environmental', 3)]],
    ['Defender a térmica', [gi('unions', 4), gi('environmental', -5)]],
  ]),
  h('Brusque', 'SC', 'brusque_mao_obra', 'economy', 'Falta de mão de obra', 'As têxteis não encontram costureiras.', [
    ['Atrair migrantes', [gi('industry', 4), gasto('social', 0.01)]],
    ['Cursos de costura', [gasto('education', 0.01)]],
  ]),
  h('Tubarão', 'SC', 'tubarao_enchente', 'crisis', 'Enchente do rio Tubarão', 'O rio subiu e alagou o centro.', [
    ['Diques e drenagem', [gasto('infrastructure', 0.04), apr(2)]],
    ['Defesa Civil', [gasto('social', 0.01)]],
  ], { neg: true }),
  h('Lages', 'SC', 'lages_nevasca', 'crisis', 'Nevasca isola distritos', 'Estradas do interior estão bloqueadas.', [
    ['Operação inverno', [gasto('social', 0.01), apr(2)]],
    ['Aguardar o degelo', [apr(-1)]],
  ]),
  h('Caçador', 'SC', 'cacador_madeireiras', 'economy', 'Madeireiras fecham', 'A crise do setor madeireiro chegou à cidade.', [
    ['Requalificação', [gasto('education', 0.01), sat(OPERARIOS, 2)]],
    ['Esperar', [sat(OPERARIOS, -2)]],
  ]),
  h('Joaçaba', 'SC', 'joacaba_carnaval', 'opportunity', 'Carnaval de salão famoso', 'O carnaval da cidade atrai turistas.', [
    ['Apoiar', [gasto('administration', 0.005), gi('commerce', 3), apr(1)]],
    ['Apoio simbólico', []],
  ], { cd: 330 }),
  h('Porto Alegre', 'RS', 'porto_alegre_guaiba', 'crisis', 'Guaíba transborda', 'Comportas falharam e o centro alagou.', [
    ['Reconstrução e novas comportas', [gasto('infrastructure', 0.06), apr(2)]],
    ['Culpar o estado', [cap(-1), apr(-2)]],
  ], { neg: true }),
  h('Caxias do Sul', 'RS', 'caxias_metalurgicas', 'economy', 'Demissões nas metalúrgicas', 'A crise atinge as fábricas da serra.', [
    ['Frente de empregos com as empresas', [gasto('industry', 0.02), sat(OPERARIOS, 2)]],
    ['Programa de exportação', [gi('industry', 3)]],
  ]),
  h('Pelotas', 'RS', 'pelotas_porto', 'opportunity', 'Porto ocioso', 'O porto de Pelotas está quase parado.', [
    ['Revitalização portuária', [gasto('infrastructure', 0.02), gi('commerce', 3)]],
    ['Esperar a União', []],
  ]),
  h('Santa Maria', 'RS', 'santa_maria_greve', 'politics', 'Greve na universidade federal', 'A cidade universitária esvazia.', [
    ['Apoiar os grevistas', [sat(JOVENS, 2), gi('civil_servants', 2), cap(-3)]],
    ['Ficar neutro', []],
  ]),
  h('Passo Fundo', 'RS', 'passo_fundo_hospital', 'crisis', 'Hospital regional lotado', 'Pacientes de cem municípios esperam em corredores.', [
    ['Convênio com o estado para mais leitos', [gasto('health', 0.03), apr(2)]],
    ['Priorizar os moradores', [apr(1), cred(-1)]],
  ]),
  h('Santa Cruz do Sul', 'RS', 'santa_cruz_tabaco', 'politics', 'Tratado antitabagismo', 'Fumicultores temem perder a renda.', [
    ['Defender os fumicultores', [sat(CAMPO, 3), cred(-1)]],
    ['Programa de diversificação', [gasto('industry', 0.01), sat(CAMPO, 1)]],
  ]),
  h('Lajeado', 'RS', 'lajeado_cheia', 'crisis', 'Nova cheia do Taquari', 'O rio sobe de novo e os moradores temem.', [
    ['Retirada preventiva', [gasto('social', 0.02), cred(2), apr(1)]],
    ['Esperar o pico', [apr(-2)]],
  ], { neg: true }),

  // ─── Continuações ───
  ev({ id: 'city_salvador_patrocinio', cat: 'opportunity', w: 0, chainOnly: true, phases: GOV, scope: MUN,
    title: 'Novo patrocinador do carnaval', text: 'Uma empresa de tecnologia topou bancar a festa.',
    opts: [['Fechar o acordo', [apr(2), gi('commerce', 3)]]] }),
  ev({ id: 'city_rio_retaliacao', cat: 'crisis', w: 0, chainOnly: true, neg: true, phases: GOV, scope: MUN,
    title: 'Milícia reage à denúncia', text: 'Ameaças chegam ao gabinete e um agente público foi atacado.',
    opts: [
      ['Pedir proteção e manter a denúncia', [cred(3), apr(1), cap(-3)]],
      ['Recuar', [cred(-4)]],
    ] }),
];
