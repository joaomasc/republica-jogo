/**
 * Pacote de eventos regionais: seis por UF, para prefeitos e governadores do estado.
 * Fonte das ideias: docs/BANCO_DE_CONTEUDO.md, seção 9.
 */
import type { StateId } from '../../core/types';
import {
  apr, CAMPO, cap, chain, CLASSE_MEDIA, cred, esc, ev, fame, gasto, gi, GOV, IDOSOS, JOVENS, OPERARIOS, POBRES,
  type OptInput, sat, SUB, unrest,
} from '../dsl';
import type { EventCategory, EventDefinition } from '../types';


/** Evento regional de uma UF (fase de governo, prefeito ou governador). */
function r(
  uf: StateId,
  id: string,
  cat: EventCategory,
  title: string,
  text: string,
  opts: OptInput[],
  extra: { w?: number; cd?: number; neg?: boolean } = {},
): EventDefinition {
  return ev({
    id: `reg_${uf.toLowerCase()}_${id}`,
    cat,
    title,
    text,
    phases: GOV,
    scope: SUB,
    states: [uf],
    w: extra.w ?? 3,
    cd: extra.cd ?? 720,
    ...(extra.neg ? { neg: true } : {}),
    opts,
  });
}


export const REGIONAL_EVENTS: EventDefinition[] = [
  // ─── AC ───
  r('AC', 'cheia', 'crisis', 'Cheia do rio Acre', 'O rio invadiu bairros e isolou comunidades.', [
    ['Abrigos e auxílio às famílias', [gasto('social', 0.04), apr(2)]],
    ['Pedir ponte aérea à União', [cap(-3), apr(1)]],
  ], { neg: true }),
  r('AC', 'imigrantes', 'politics', 'Rota de imigrantes na fronteira', 'Haitianos e africanos chegam pela fronteira com o Peru.', [
    ['Abrigo e encaminhamento', [gasto('social', 0.02), gi('social_movements', 4)]],
    ['Cobrar o governo federal', [cap(-2)]],
  ]),
  r('AC', 'pacifico', 'opportunity', 'Rodovia do Pacífico', 'Exportadores querem usar a estrada até os portos peruanos.', [
    ['Apoiar o corredor de exportação', [gi('agribusiness', 5), gi('commerce', 3), cap(-3)]],
    ['Priorizar estradas internas', [gasto('infrastructure', 0.02), apr(1)]],
  ]),
  r('AC', 'borracha', 'economy', 'Seringueiros cobram preço da borracha', 'O preço não cobre o custo da extração.', [
    ['Subsídio à borracha nativa', [gasto('industry', 0.01), gi('social_movements', 4), gi('environmental', 3)]],
    ['Apoiar outras atividades', [gi('social_movements', -2)]],
  ]),
  r('AC', 'br364', 'politics', 'Desmatamento na BR-364', 'Fiscais e produtores se enfrentam às margens da rodovia.', [
    ['Apoiar a fiscalização', [gi('environmental', 6), gi('agribusiness', -5)]],
    ['Defender os produtores', [gi('agribusiness', 5), gi('environmental', -6)]],
  ]),
  r('AC', 'fumaca', 'crisis', 'Fumaça fecha o aeroporto', 'As queimadas cobriram Rio Branco de fumaça.', [
    ['Brigadas e atendimento respiratório', [gasto('health', 0.02), apr(1)]],
    ['Esperar a chuva', [apr(-2), sat(IDOSOS, -2)]],
  ], { neg: true }),

  // ─── AL ───
  r('AL', 'salgema', 'crisis', 'Bairros afundam em Maceió', 'A mineração de sal-gema fez o solo ceder e milhares saíram de casa.', [
    ['Cobrar indenização da mineradora', [fame(2), gi('industry', -4), apr(2)]],
    ['Negociar acordo discreto', [cap(3), cred(-2)]],
  ], { neg: true }),
  r('AL', 'mundau', 'crisis', 'Lagoa Mundaú poluída', 'Pescadores de sururu estão sem renda.', [
    ['Plano de despoluição', [gasto('infrastructure', 0.03), sat(POBRES, 2)]],
    ['Auxílio aos pescadores', [gasto('social', 0.01), apr(1)]],
  ]),
  r('AL', 'usinas', 'economy', 'Usinas fecham no interior', 'Duas usinas de açúcar demitem centenas.', [
    ['Programa de requalificação', [gasto('education', 0.01), sat(OPERARIOS, 2)]],
    ['Buscar um comprador para as usinas', [cap(-2), gi('agribusiness', 3)]],
  ]),
  r('AL', 'maragogi', 'opportunity', 'Turismo em Maragogi bate recorde', 'Faltam esgoto e água nas praias mais procuradas.', [
    ['Saneamento no litoral', [gasto('infrastructure', 0.03), gi('commerce', 4)]],
    ['Taxa de turismo', [gi('commerce', -2), gasto('infrastructure', -0.01)]],
  ]),
  r('AL', 'sertao', 'crisis', 'Violência no sertão', 'Assaltos a bancos e mortes assustam o interior.', [
    ['Reforço policial', [gasto('security', 0.02), gi('security', 4)]],
    ['Pedir ajuda federal', [cap(-2)]],
  ], { neg: true }),
  r('AL', 'seca', 'crisis', 'Seca no sertão do São Francisco', 'Produtores perderam o rebanho.', [
    ['Carros-pipa e crédito', [gasto('social', 0.02), sat(CAMPO, 3)]],
    ['Esperar o inverno', [sat(CAMPO, -3)]],
  ], { neg: true }),

  // ─── AM ───
  r('AM', 'seca_rios', 'crisis', 'Seca histórica dos rios', 'Barcos encalham e cidades ficam sem comida.', [
    ['Ponte aérea de alimentos', [gasto('social', 0.05), apr(3)]],
    ['Pedir socorro à União', [cap(-3), apr(1)]],
  ], { neg: true }),
  r('AM', 'zona_franca', 'economy', 'Zona Franca ameaçada', 'A reforma tributária pode tirar as vantagens da Zona Franca.', [
    ['Liderar a defesa em Brasília', [fame(3), gi('industry', 6), cap(-2)]],
    ['Preparar a diversificação', [gi('tech', 3), gi('industry', -2)]],
  ]),
  r('AM', 'garimpo', 'crisis', 'Garimpo no Rio Negro', 'Balsas de garimpo contaminam o rio.', [
    ['Operação com a Polícia Federal', [gi('environmental', 6), cred(2), cap(-3)]],
    ['Fazer vista grossa', [gi('environmental', -8), esc(3)]],
  ]),
  r('AM', 'botos', 'crisis', 'Botos morrem no lago', 'A água quente matou botos e peixes.', [
    ['Força-tarefa com cientistas', [gasto('science', 0.01), gi('environmental', 4)]],
    ['Nota de pesar', [gi('environmental', -2)]],
  ]),
  r('AM', 'parintins', 'opportunity', 'Festival de Parintins', 'Os bois Garantido e Caprichoso pedem verba e estrutura.', [
    ['Patrocínio generoso', [gasto('administration', 0.01), apr(2), gi('commerce', 3)]],
    ['Apoio simbólico', [apr(-1)]],
  ], { cd: 330 }),
  r('AM', 'faccoes_rios', 'crisis', 'Facções disputam os rios', 'Piratas e facções atacam barcos de passageiros.', [
    ['Base fluvial de polícia', [gasto('security', 0.03), gi('security', 4)]],
    ['Pedir a Marinha', [cap(-2)]],
  ], { neg: true }),

  // ─── AP ───
  r('AP', 'margem_equatorial', 'politics', 'Petróleo na margem equatorial', 'A licença para perfurar divide o estado.', [
    ['Apoiar a exploração', [gi('industry', 5), gi('environmental', -8), apr(1)]],
    ['Exigir estudos rigorosos', [gi('environmental', 5), gi('industry', -3)]],
  ]),
  r('AP', 'apagao', 'crisis', 'Apagão de semanas', 'Uma subestação pegou fogo e o estado ficou no escuro.', [
    ['Geradores emergenciais', [gasto('infrastructure', 0.04), apr(1)]],
    ['Cobrar a União e a concessionária', [cap(-3), apr(-1)]],
  ], { neg: true, cd: 900 }),
  r('AP', 'ponte_guiana', 'opportunity', 'Ponte para a Guiana Francesa', 'Comerciantes querem aproveitar a fronteira com a Europa.', [
    ['Zona de comércio na fronteira', [gi('commerce', 5), gasto('infrastructure', 0.01)]],
    ['Controle migratório mais duro', [gi('security', 3)]],
  ]),
  r('AP', 'manganes', 'politics', 'Passivo da mineração de manganês', 'A mina abandonada deixou rejeitos e desemprego.', [
    ['Processar a mineradora', [cred(2), gi('industry', -3)]],
    ['Buscar nova empresa', [gi('industry', 3)]],
  ]),
  r('AP', 'erosao', 'crisis', 'Erosão no litoral', 'A ressaca destrói casas na beira do rio-mar.', [
    ['Contenção da orla', [gasto('infrastructure', 0.03), apr(1)]],
    ['Realocar famílias', [gasto('social', 0.02), sat(POBRES, -1)]],
  ]),
  r('AP', 'isolamento', 'politics', 'Sem estrada para o resto do país', 'O Amapá segue sem ligação rodoviária.', [
    ['Campanha pela BR-156', [fame(2), cap(-2)]],
    ['Investir no porto', [gasto('infrastructure', 0.02), gi('commerce', 2)]],
  ]),

  // ─── BA ───
  r('BA', 'letalidade', 'crisis', 'Operações policiais letais', 'Operações em bairros de Salvador deixam mortos.', [
    ['Câmeras e controle externo', [gi('security', -5), gi('social_movements', 5), cred(2)]],
    ['Apoiar a polícia', [gi('security', 5), gi('social_movements', -6)]],
  ], { neg: true }),
  r('BA', 'agua_oeste', 'politics', 'Disputa pela água no oeste baiano', 'Pivôs de irrigação secam rios das comunidades.', [
    ['Limitar outorgas', [gi('agribusiness', -5), gi('social_movements', 4)]],
    ['Liberar mais outorgas', [gi('agribusiness', 6), gi('environmental', -4)]],
  ]),
  r('BA', 'carnaval', 'opportunity', 'Carnaval de Salvador', 'Blocos e trios pedem apoio; a segurança preocupa.', [
    ['Carnaval grande e seguro', [gasto('security', 0.02), apr(2), gi('commerce', 4)]],
    ['Carnaval enxuto', [apr(-1)]],
  ], { cd: 330 }),
  r('BA', 'cacau', 'economy', 'Cacau volta a valer ouro', 'O preço do cacau disparou no sul da Bahia.', [
    ['Programa de renovação das lavouras', [gasto('industry', 0.01), sat(CAMPO, 3)]],
    ['Comemorar', [apr(1)]],
  ]),
  r('BA', 'seca', 'crisis', 'Seca no sertão baiano', 'Açudes vazios e gado morrendo.', [
    ['Carros-pipa e cisternas', [gasto('social', 0.03), sat(CAMPO, 3)]],
    ['Obras hídricas', [gasto('infrastructure', 0.04), cred(1)]],
  ], { neg: true }),
  r('BA', 'litoral_norte', 'politics', 'Especulação no litoral norte', 'Resorts avançam sobre áreas de comunidades tradicionais.', [
    ['Proteger as comunidades', [gi('social_movements', 4), gi('business', -3)]],
    ['Liberar os empreendimentos', [gi('business', 5), gi('environmental', -4)]],
  ]),

  // ─── CE ───
  r('CE', 'hidrogenio', 'opportunity', 'Hub de hidrogênio verde no Pecém', 'Investidores europeus querem produzir hidrogênio verde.', [
    ['Incentivos e licença rápida', [gi('industry', 6), gi('tech', 3), gi('environmental', 2), cap(-3)]],
    ['Exigir conteúdo local', [gi('unions', 3), gi('industry', 2), cap(-3)]],
  ]),
  r('CE', 'faccoes', 'crisis', 'Facções controlam bairros', 'Moradores são expulsos de casa por facções.', [
    ['Ocupação policial permanente', [gasto('security', 0.03), gi('security', 5)]],
    ['Programa social nos bairros', [gasto('social', 0.02), gi('social_movements', 3)]],
  ], { neg: true }),
  r('CE', 'castanhao', 'opportunity', 'Transposição chega ao Castanhão', 'A água do São Francisco chegou ao maior açude do estado.', [
    ['Inauguração com festa', [apr(2)]],
    ['Distribuir a água pelo interior', [gasto('infrastructure', 0.02), sat(CAMPO, 2)]],
  ]),
  r('CE', 'eolicas', 'politics', 'Eólicas mudam a paisagem', 'Comunidades de pescadores reclamam dos parques eólicos.', [
    ['Contrapartidas para as comunidades', [gi('social_movements', 3), gi('industry', -1)]],
    ['Liberar mais parques', [gi('industry', 4), gi('environmental', 1), cap(-3)]],
  ]),
  r('CE', 'juazeiro', 'opportunity', 'Romaria em Juazeiro do Norte', 'Milhares de romeiros chegam para a romaria.', [
    ['Estrutura para os romeiros', [gasto('health', 0.01), gi('religious', 4), apr(1)]],
    ['Deixar com a prefeitura', [gi('religious', -2)]],
  ], { cd: 330 }),
  r('CE', 'seca', 'crisis', 'Seca prolongada no sertão central', 'Cinco anos de chuva abaixo da média.', [
    ['Programa de cisternas', [gasto('social', 0.02), sat(CAMPO, 3)]],
    ['Pedir socorro federal', [cap(-2)]],
  ], { neg: true }),

  // ─── DF ───
  r('DF', 'greve', 'crisis', 'Greve de servidores distritais', 'Professores e médicos do DF param.', [
    ['Reajuste parcelado', [gasto('administration', 0.03), gi('civil_servants', 6)]],
    ['Cortar o ponto', [gi('civil_servants', -8)]],
  ], { neg: true }),
  r('DF', 'entorno', 'politics', 'O Entorno pressiona Brasília', 'Moradores das cidades goianas lotam hospitais do DF.', [
    ['Consórcio com Goiás', [cap(-2), gasto('health', 0.02), cred(1)]],
    ['Priorizar moradores do DF', [apr(1), cred(-1)]],
  ]),
  r('DF', 'incendios', 'crisis', 'Incêndios no cerrado', 'A seca de agosto espalha fogo pelo Parque Nacional.', [
    ['Brigadas e aviões', [gasto('security', 0.02), gi('environmental', 4)]],
    ['Esperar os bombeiros federais', [apr(-1)]],
  ], { neg: true }),
  r('DF', 'esplanada', 'crisis', 'Manifestação na Esplanada', 'Um grande protesto nacional exige esquema de segurança.', [
    ['Esquema de diálogo e segurança', [gasto('security', 0.01), cred(1)]],
    ['Reprimir excessos com força', [gi('security', 3), unrest(2)]],
  ]),
  r('DF', 'metro', 'politics', 'Metrô sem expansão', 'A expansão do metrô está parada há anos.', [
    ['Retomar a obra', [gasto('infrastructure', 0.06), sat(OPERARIOS, 2)]],
    ['Ônibus elétricos', [gasto('infrastructure', 0.02), gi('environmental', 2)]],
  ]),
  r('DF', 'grilagem', 'scandal', 'Grilagem de terras públicas', 'Condomínios irregulares avançam sobre áreas públicas.', [
    ['Derrubar as construções', [cred(3), apr(-1)]],
    ['Regularizar mediante pagamento', [gasto('administration', -0.01), cred(-2)]],
  ]),

  // ─── ES ───
  r('ES', 'rio_doce', 'politics', 'Acordo de reparação do Rio Doce', 'A mineradora propõe um acordo bilionário.', [
    ['Exigir mais para os atingidos', [fame(2), gi('social_movements', 4), cap(-2)]],
    ['Aceitar e investir logo', [gasto('infrastructure', -0.03), apr(1), cap(-3)]],
  ]),
  r('ES', 'portos', 'opportunity', 'Expansão dos portos de Vitória', 'Exportadores de minério querem ampliar os portos.', [
    ['Apoiar a ampliação', [gi('industry', 5), gi('environmental', -2)]],
    ['Condicionar a compensações', [gi('environmental', 2), gi('industry', 1), cap(-3)]],
  ]),
  r('ES', 'petroleo', 'economy', 'Petróleo no litoral sul', 'Novos campos de gás trazem royalties.', [
    ['Fundo de royalties para educação', [gasto('education', -0.02), cred(2), cap(-3)]],
    ['Usar no custeio', [gasto('administration', -0.03), cap(-3)]],
  ]),
  r('ES', 'conilon', 'economy', 'Café conilon dispara', 'O preço internacional bateu recorde.', [
    ['Comemorar com os produtores', [sat(CAMPO, 2), apr(1)]],
  ]),
  r('ES', 'marmore', 'politics', 'Mármore e granito em Cachoeiro', 'Acidentes em pedreiras preocupam.', [
    ['Fiscalização rigorosa', [cred(2), gi('industry', -2)]],
    ['Incentivo às exportações', [gi('industry', 3)]],
  ]),
  r('ES', 'serra_chuvas', 'crisis', 'Deslizamentos na serra capixaba', 'Chuvas fortes derrubam encostas.', [
    ['Defesa Civil e abrigos', [gasto('social', 0.02), apr(1)]],
    ['Pedir verba federal', [cap(-2)]],
  ], { neg: true }),

  // ─── GO ───
  r('GO', 'seguranca', 'politics', 'Segurança dura vira vitrine', 'A queda dos homicídios é usada como propaganda.', [
    ['Ampliar o modelo', [gasto('security', 0.02), gi('security', 5)]],
    ['Equilibrar com prevenção', [gasto('social', 0.01), cred(1)]],
  ]),
  r('GO', 'safra', 'economy', 'Soja e milho batem recordes', 'A safra goiana foi a maior da história.', [
    ['Investir em armazéns', [gasto('infrastructure', 0.02), gi('agribusiness', 4)]],
    ['Comemorar', [apr(1)]],
  ]),
  r('GO', 'anapolis', 'opportunity', 'Polo farmacêutico de Anápolis', 'Laboratórios querem ampliar a produção.', [
    ['Incentivo fiscal', [gasto('industry', 0.02), gi('industry', 5)]],
    ['Parceria com universidades', [gasto('science', 0.01), gi('tech', 3)]],
  ]),
  r('GO', 'agua', 'crisis', 'Crise hídrica em Goiânia', 'Os reservatórios estão no limite.', [
    ['Obras de captação', [gasto('infrastructure', 0.04), apr(1)]],
    ['Rodízio', [apr(-3), sat(CLASSE_MEDIA, -2)]],
  ], { neg: true }),
  r('GO', 'divino', 'opportunity', 'Festa do Divino em Pirenópolis', 'As cavalhadas atraem turistas.', [
    ['Apoiar a festa', [gasto('administration', 0.005), gi('religious', 3), gi('commerce', 2)]],
    ['Apoio simbólico', []],
  ], { cd: 330 }),
  r('GO', 'terra', 'crisis', 'Conflito por terra na fronteira agrícola', 'Fazendeiros e posseiros entram em confronto.', [
    ['Mediação com o Incra', [cred(2), gi('social_movements', 2), cap(-3)]],
    ['Reintegração de posse', [gi('agribusiness', 4), gi('social_movements', -5)]],
  ], { neg: true }),

  // ─── MA ───
  r('MA', 'alcantara', 'opportunity', 'Base de Alcântara', 'Um acordo internacional quer lançar foguetes da base.', [
    ['Apoiar com compensações aos quilombolas', [gi('tech', 4), gi('social_movements', 2), fame(2), cap(-3)]],
    ['Apoiar sem condições', [gi('tech', 5), gi('social_movements', -6)]],
  ]),
  r('MA', 'pobreza', 'crisis', 'Pobreza extrema no interior', 'Relatório mostra cidades com renda entre as menores do país.', [
    ['Programa de renda e saneamento', [gasto('social', 0.04), sat(POBRES, 4)]],
    ['Atrair empresas', [gi('business', 3)]],
  ]),
  r('MA', 'itaqui', 'opportunity', 'Porto do Itaqui', 'Exportadores de grãos e minério querem ampliar o porto.', [
    ['Ampliar', [gi('agribusiness', 5), gi('industry', 3), gasto('infrastructure', 0.02)]],
    ['Esperar a União', [cap(-1)]],
  ]),
  r('MA', 'desmatamento', 'politics', 'Desmatamento na Amazônia maranhense', 'A floresta restante está sob pressão.', [
    ['Fiscalização estadual', [gi('environmental', 5), gi('agribusiness', -4)]],
    ['Liberar o manejo', [gi('agribusiness', 4), gi('environmental', -5)]],
  ]),
  r('MA', 'lencois', 'opportunity', 'Turismo nos Lençóis Maranhenses', 'O parque virou destino internacional.', [
    ['Infraestrutura com limite de visitantes', [gasto('infrastructure', 0.02), gi('environmental', 3), gi('commerce', 3)]],
    ['Liberar resorts', [gi('commerce', 5), gi('environmental', -4)]],
  ]),
  r('MA', 'quilombolas', 'politics', 'Conflito com quilombolas por terra', 'Comunidades quilombolas denunciam ameaças.', [
    ['Titular as terras', [gi('social_movements', 6), gi('agribusiness', -3)]],
    ['Comissão para estudar', [gi('social_movements', -2)]],
  ]),

  // ─── MG ───
  r('MG', 'barragens', 'crisis', 'Barragens em risco', 'Sirenes de alerta tocam em cidades mineradoras.', [
    ['Evacuar e interditar', [gi('industry', -5), cred(3), apr(1)]],
    ['Confiar nos laudos', [gi('industry', 3), chain('est_rompimento', 120, 0.15)]],
  ], { neg: true }),
  r('MG', 'divida', 'economy', 'Dívida mineira com a União', 'Minas é o estado mais endividado do país.', [
    ['Aderir ao regime de recuperação', [gi('civil_servants', -6), cap(-3)]],
    ['Negociar com o Congresso', [cap(-4)]],
  ]),
  r('MG', 'cafe_geada', 'crisis', 'Geada no café sul-mineiro', 'Os cafezais queimaram na geada.', [
    ['Crédito emergencial', [gasto('industry', 0.02), sat(CAMPO, 3)]],
    ['Pedir socorro federal', [cap(-2)]],
  ], { neg: true }),
  r('MG', 'norte_seca', 'crisis', 'Seca no norte de Minas', 'Municípios decretam emergência.', [
    ['Carros-pipa e poços', [gasto('social', 0.02), sat(CAMPO, 2)]],
    ['Adutora regional', [gasto('infrastructure', 0.05), cred(1)]],
  ], { neg: true }),
  r('MG', 'ouro_preto', 'politics', 'Patrimônio de Ouro Preto em risco', 'Casarões coloniais ameaçam desabar.', [
    ['Plano de restauro', [gasto('administration', 0.01), cred(2)]],
    ['Esperar o Iphan', [cred(-1)]],
  ]),
  r('MG', 'municipios', 'politics', '853 municípios disputam verbas', 'Prefeitos de todo o estado pedem convênios.', [
    ['Critério técnico de distribuição', [cred(2), cap(-2)]],
    ['Priorizar aliados', [cap(5), cred(-2)]],
  ]),

  // ─── MS ───
  r('MS', 'pantanal', 'crisis', 'Pantanal em chamas', 'O fogo consome o bioma e mata animais.', [
    ['Brigadas e aviões', [gasto('security', 0.03), gi('environmental', 6)]],
    ['Culpar a seca', [gi('environmental', -6)]],
  ], { neg: true }),
  r('MS', 'dourados', 'crisis', 'Conflito indígena em Dourados', 'Retomadas de terra geram confrontos.', [
    ['Mediação', [cred(2), gi('social_movements', 3), cap(-3)]],
    ['Apoiar os fazendeiros', [gi('agribusiness', 5), gi('social_movements', -6)]],
  ], { neg: true }),
  r('MS', 'fronteira', 'politics', 'Contrabando na fronteira seca', 'Cigarros e armas cruzam a fronteira com o Paraguai.', [
    ['Operação integrada', [gasto('security', 0.02), gi('security', 4)]],
    ['Cobrar a União', [cap(-1)]],
  ]),
  r('MS', 'celulose', 'opportunity', 'Celulose transforma Três Lagoas', 'Nova fábrica de celulose quer se instalar.', [
    ['Incentivos', [gi('industry', 6), sat(OPERARIOS, 2), gi('environmental', -2)]],
    ['Exigir compensação ambiental', [gi('environmental', 3), gi('industry', 2), cap(-3)]],
  ]),
  r('MS', 'bioceanica', 'opportunity', 'Rota bioceânica', 'A estrada até o Chile passa pelo estado.', [
    ['Plataforma logística', [gasto('infrastructure', 0.03), gi('commerce', 4)]],
    ['Esperar as obras', []],
  ]),
  r('MS', 'pecuaria', 'politics', 'Certificação ambiental da carne', 'Compradores europeus exigem rastreio.', [
    ['Rastreabilidade estadual', [gi('agribusiness', -2), gi('environmental', 4), cred(1)]],
    ['Resistir à exigência', [gi('agribusiness', 3)]],
  ]),

  // ─── MT ───
  r('MT', 'ferrovia', 'opportunity', 'Ferrovia da soja chega ao norte', 'O trilho promete baratear o frete.', [
    ['Apoiar a ferrovia', [gi('agribusiness', 6), gi('environmental', -2)]],
    ['Exigir estudo indígena', [gi('social_movements', 3), gi('agribusiness', -2)]],
  ]),
  r('MT', 'moratoria', 'politics', 'Moratória da soja em debate', 'O agro quer acabar com o pacto contra soja de desmatamento.', [
    ['Defender a moratória', [gi('environmental', 6), gi('agribusiness', -6)]],
    ['Apoiar o fim', [gi('agribusiness', 6), gi('environmental', -8)]],
  ]),
  r('MT', 'queimadas', 'crisis', 'Queimadas no Pantanal e na Amazônia', 'Focos de calor batem recorde.', [
    ['Brigadas e multas', [gasto('security', 0.02), gi('environmental', 5), gi('agribusiness', -3)]],
    ['Minimizar', [gi('environmental', -6)]],
  ], { neg: true }),
  r('MT', 'br163', 'crisis', 'BR-163 esburacada na safra', 'Filas de caminhões de 50 km.', [
    ['Operação tapa-buraco', [gasto('infrastructure', 0.03), gi('agribusiness', 4)]],
    ['Cobrar a concessionária', [cap(-1)]],
  ]),
  r('MT', 'garimpo', 'politics', 'Garimpo em terras indígenas', 'Lideranças denunciam invasões.', [
    ['Operação de retirada', [gi('social_movements', 5), cred(2), cap(-3)]],
    ['Silêncio', [gi('social_movements', -4)]],
  ]),
  r('MT', 'calor', 'crisis', 'Calor recorde em Cuiabá', 'Os termômetros passam de 44 °C.', [
    ['Ajustar o horário das escolas', [sat(['workers', 'middle_class'], 1), apr(1), cap(-3)]],
    ['Distribuir água e abrir abrigos', [gasto('social', 0.01), sat(IDOSOS, 2)]],
  ]),

  // ─── PA ───
  r('PA', 'garimpo', 'crisis', 'Garimpo em terra indígena', 'Crianças com mercúrio no sangue.', [
    ['Operação conjunta', [gi('social_movements', 5), gi('environmental', 5), cred(2), cap(-3)]],
    ['Silêncio', [gi('environmental', -6)]],
  ], { neg: true }),
  r('PA', 'cop', 'opportunity', 'Legado da conferência do clima', 'Belém recebeu líderes mundiais e quer manter as obras.', [
    ['Manter as obras e o turismo', [gasto('infrastructure', 0.02), fame(2), gi('commerce', 3)]],
    ['Redirecionar para saneamento', [gasto('infrastructure', 0.02), sat(POBRES, 2)]],
  ]),
  r('PA', 'carajas', 'economy', 'Mineração em Carajás', 'A mineradora quer ampliar a extração.', [
    ['Apoiar com royalties maiores', [gi('industry', 3), gasto('administration', -0.02), cap(-3)]],
    ['Exigir compensações sociais', [gi('social_movements', 3), gi('industry', -2)]],
  ]),
  r('PA', 'divisao', 'politics', 'Plebiscito pela divisão do Pará', 'Movimentos querem criar os estados de Carajás e Tapajós.', [
    ['Ser contra a divisão', [apr(1), cap(-2)]],
    ['Apoiar o plebiscito', [cap(2), apr(-1)]],
  ]),
  r('PA', 'hidreletricas', 'politics', 'Hidrelétricas e ribeirinhos', 'Ribeirinhos atingidos cobram indenização.', [
    ['Mediar indenizações', [gi('social_movements', 4), cred(1), cap(-3)]],
    ['Defender a usina', [gi('industry', 3), gi('social_movements', -4)]],
  ]),
  r('PA', 'cirio', 'opportunity', 'Círio de Nazaré', 'Dois milhões de pessoas na procissão.', [
    ['Estrutura reforçada', [gasto('health', 0.01), gi('religious', 5), apr(2)]],
    ['Estrutura padrão', [gi('religious', -1)]],
  ], { cd: 330 }),

  // ─── PB ───
  r('PB', 'transposicao', 'opportunity', 'Transposição do São Francisco', 'A água chega ao Cariri paraibano.', [
    ['Ramais para as cidades', [gasto('infrastructure', 0.03), sat(CAMPO, 3)]],
    ['Inauguração simbólica', [apr(1)]],
  ]),
  r('PB', 'sao_joao', 'opportunity', 'São João de Campina Grande', 'O Maior São João do Mundo pede apoio.', [
    ['Patrocínio forte', [gasto('administration', 0.01), apr(3), gi('commerce', 4)]],
    ['Apoio modesto', []],
  ], { cd: 330 }),
  r('PB', 'tecnologia', 'opportunity', 'Polo de tecnologia em Campina', 'Startups da universidade crescem.', [
    ['Parque tecnológico', [gasto('science', 0.02), gi('tech', 5), sat(JOVENS, 2)]],
    ['Isenção de impostos', [gi('tech', 3)]],
  ]),
  r('PB', 'cariri', 'crisis', 'Seca no Cariri', 'Uma das regiões mais secas do país sofre de novo.', [
    ['Cisternas e carros-pipa', [gasto('social', 0.02), sat(CAMPO, 3)]],
    ['Esperar a transposição', [sat(CAMPO, -2)]],
  ], { neg: true }),
  r('PB', 'orla', 'politics', 'Prédios altos na orla de João Pessoa', 'Construtoras querem derrubar o limite de altura.', [
    ['Manter o limite', [apr(1), gi('business', -3)]],
    ['Liberar', [gi('business', 5), apr(-2)]],
  ]),
  r('PB', 'solar', 'opportunity', 'Energia solar no sertão', 'Usinas solares procuram terras no sertão.', [
    ['Incentivar com contrapartidas', [gi('industry', 3), sat(CAMPO, 2), gi('environmental', 2), cap(-3)]],
    ['Liberar sem condições', [gi('industry', 4), cap(-3)]],
  ]),

  // ─── PE ───
  r('PE', 'chuvas', 'crisis', 'Chuvas matam no Grande Recife', 'Deslizamentos atingem morros da região metropolitana.', [
    ['Gabinete de crise e abrigos', [gasto('social', 0.03), apr(2)]],
    ['Pedir ajuda federal', [cap(-2), apr(-1)]],
  ], { neg: true }),
  r('PE', 'suape', 'opportunity', 'Porto de Suape e refinaria', 'A refinaria quer concluir o segundo trem.', [
    ['Apoiar a obra', [gi('industry', 5), sat(OPERARIOS, 2), cap(-3)]],
    ['Exigir garantias ambientais', [gi('environmental', 3), gi('industry', 1), cap(-3)]],
  ]),
  r('PE', 'petrolina', 'economy', 'Fruticultura irrigada em Petrolina', 'Uvas e mangas do Vale ganham mercado.', [
    ['Apoiar exportações', [gi('agribusiness', 4), gi('commerce', 2), cap(-3)]],
    ['Comemorar', [apr(1)]],
  ]),
  r('PE', 'caruaru', 'opportunity', 'São João de Caruaru', 'A festa precisa de patrocínio.', [
    ['Patrocínio forte', [gasto('administration', 0.01), apr(2), gi('commerce', 3)]],
    ['Apoio modesto', []],
  ], { cd: 330 }),
  r('PE', 'carnaval', 'opportunity', 'Carnaval de Olinda e Recife', 'O frevo e o maracatu pedem apoio.', [
    ['Investir no carnaval', [gasto('administration', 0.01), apr(2), gi('commerce', 4)]],
    ['Carnaval enxuto', [apr(-1)]],
  ], { cd: 330 }),
  r('PE', 'jaboatao', 'crisis', 'Violência em Jaboatão', 'Homicídios disparam na região metropolitana.', [
    ['Reforço policial', [gasto('security', 0.02), gi('security', 3)]],
    ['Programa de prevenção', [gasto('social', 0.01), cred(1)]],
  ], { neg: true }),

  // ─── PI ───
  r('PI', 'renovaveis', 'opportunity', 'Eólicas e solares transformam o sertão', 'O Piauí virou potência em energia limpa.', [
    ['Atrair mais parques', [gi('industry', 4), gi('environmental', 2), cap(-3)]],
    ['Exigir renda para os donos das terras', [sat(CAMPO, 3), gi('industry', -1)]],
  ]),
  r('PI', 'calor', 'crisis', 'Calor extremo em Teresina', 'A cidade passa de 42 °C.', [
    ['Arborização emergencial', [gasto('infrastructure', 0.01), apr(1)]],
    ['Distribuir água', [gasto('social', 0.005)]],
  ]),
  r('PI', 'cerrado', 'politics', 'Cerrado vira fronteira da soja', 'A soja avança sobre o cerrado piauiense.', [
    ['Apoiar com infraestrutura', [gi('agribusiness', 6), gi('environmental', -4)]],
    ['Zoneamento ambiental', [gi('environmental', 4), gi('agribusiness', -3)]],
  ]),
  r('PI', 'pobreza', 'crisis', 'Pobreza rural', 'Famílias do interior vivem com menos de R$ 200 por mês.', [
    ['Programa de renda rural', [gasto('social', 0.03), sat(POBRES, 3)]],
    ['Cursos de capacitação', [gasto('education', 0.01)]],
  ]),
  r('PI', 'delta', 'opportunity', 'Turismo no Delta do Parnaíba', 'O delta atrai turistas estrangeiros.', [
    ['Infraestrutura turística', [gasto('infrastructure', 0.02), gi('commerce', 4)]],
    ['Esperar investidores', []],
  ]),
  r('PI', 'seca', 'crisis', 'Seca no Piauí', 'Os rios temporários não voltaram.', [
    ['Poços e cisternas', [gasto('social', 0.02), sat(CAMPO, 2)]],
    ['Pedir socorro federal', [cap(-2)]],
  ], { neg: true }),

  // ─── PR ───
  r('PR', 'pedagios', 'crisis', 'Protestos contra os novos pedágios', 'Caminhoneiros bloqueiam praças de pedágio.', [
    ['Renegociar as tarifas', [cap(-3), apr(2)]],
    ['Defender os contratos', [gi('business', 3), apr(-2)]],
  ], { neg: true }),
  r('PR', 'itaipu', 'economy', 'Royalties de Itaipu', 'Os municípios lindeiros pedem mais royalties.', [
    ['Apoiar os municípios', [cap(2), apr(1), cap(-3)]],
    ['Investir em projetos regionais', [gasto('infrastructure', -0.01), cred(1), cap(-3)]],
  ]),
  r('PR', 'geada', 'crisis', 'Geada destrói a safra', 'Milho e trigo queimados pelo frio.', [
    ['Crédito emergencial', [gasto('industry', 0.02), sat(CAMPO, 3)]],
    ['Seguro rural', [gi('agribusiness', 2)]],
  ], { neg: true }),
  r('PR', 'ferrovia', 'opportunity', 'Ferrovia Paranaguá–oeste', 'O agro quer a nova ferrovia até o porto.', [
    ['Apoiar a concessão', [gi('agribusiness', 6), gi('business', 3), cap(-3)]],
    ['Obra pública', [gasto('infrastructure', 0.05), gi('agribusiness', 4)]],
  ]),
  r('PR', 'triplice', 'politics', 'Contrabando na tríplice fronteira', 'Cigarros e eletrônicos entram pelo Paraguai.', [
    ['Operação integrada', [gasto('security', 0.02), gi('commerce', 2)]],
    ['Cobrar a Receita Federal', [cap(-1)]],
  ]),
  r('PR', 'professores', 'crisis', 'Professores em greve', 'A rede de ensino parou por reajuste.', [
    ['Negociar reajuste', [gasto('education', 0.03), gi('civil_servants', 5)]],
    ['Cortar o ponto', [gi('civil_servants', -8), apr(-1)]],
  ], { neg: true }),

  // ─── RJ ───
  r('RJ', 'milicias', 'crisis', 'Milícias e tráfico', 'Grupos armados controlam metade da região metropolitana.', [
    ['Força-tarefa com inteligência', [gasto('security', 0.03), cred(2), gi('security', 3)]],
    ['Operações de confronto', [gi('security', 5), gi('social_movements', -5), apr(1)]],
  ], { neg: true }),
  r('RJ', 'recuperacao', 'economy', 'Regime de recuperação fiscal', 'O estado está preso ao acordo com a União.', [
    ['Cumprir as metas', [gi('civil_servants', -5), cred(2)]],
    ['Pedir revisão do acordo', [cap(-3)]],
  ]),
  r('RJ', 'royalties', 'economy', 'Royalties do petróleo', 'O STF pode mudar a divisão dos royalties.', [
    ['Mobilizar a bancada', [cap(-2), fame(2)]],
    ['Preparar plano B', [cred(1)]],
  ]),
  r('RJ', 'serra', 'crisis', 'Deslizamentos na serra', 'Tempestade derruba encostas na região serrana.', [
    ['Gabinete de crise', [gasto('social', 0.03), apr(2)]],
    ['Pedir ajuda federal', [cap(-2)]],
  ], { neg: true }),
  r('RJ', 'carnaval', 'opportunity', 'Carnaval do Rio', 'As escolas de samba pedem mais verba.', [
    ['Ampliar o apoio', [gasto('administration', 0.01), apr(2), gi('commerce', 4)]],
    ['Cortar a subvenção', [apr(-2), gi('religious', 2)]],
  ], { cd: 330 }),
  r('RJ', 'guanabara', 'politics', 'Baía de Guanabara poluída', 'A baía recebe esgoto de milhões de pessoas.', [
    ['Plano de despoluição', [gasto('infrastructure', 0.05), gi('environmental', 5)]],
    ['Adiar', [gi('environmental', -3)]],
  ]),

  // ─── RN ───
  r('RN', 'faccoes', 'crisis', 'Ataques de facção a ônibus', 'Ataques coordenados paralisam o estado.', [
    ['Pedir a Força Nacional', [cap(-2), gi('security', 3)]],
    ['Isolar os líderes nos presídios', [gasto('security', 0.02), gi('security', 4)]],
  ], { neg: true }),
  r('RN', 'eolicas', 'opportunity', 'Energia eólica no litoral', 'O estado lidera a geração eólica.', [
    ['Atrair fábrica de aerogeradores', [gi('industry', 5), sat(OPERARIOS, 2), cap(-3)]],
    ['Taxar os parques', [gasto('administration', -0.01), gi('industry', -2)]],
  ]),
  r('RN', 'mossoro', 'economy', 'Sal e petróleo em Mossoró', 'A estatal vende campos maduros.', [
    ['Atrair o comprador com incentivos', [gi('industry', 4), sat(OPERARIOS, 2), cap(-3)]],
    ['Esperar', [sat(OPERARIOS, -1)]],
  ]),
  r('RN', 'turismo', 'opportunity', 'Turismo em Natal e Pipa', 'Temporada recorde de turistas.', [
    ['Promoção internacional', [gasto('administration', 0.01), gi('commerce', 4)]],
    ['Comemorar', [apr(1)]],
  ]),
  r('RN', 'serido', 'crisis', 'Seca no Seridó', 'Açudes secos e rebanho perdido.', [
    ['Carros-pipa e crédito', [gasto('social', 0.02), sat(CAMPO, 3)]],
    ['Pedir socorro federal', [cap(-2)]],
  ], { neg: true }),
  r('RN', 'agua_natal', 'crisis', 'Falta de água em Natal', 'Bairros ficam dias sem água.', [
    ['Obras emergenciais', [gasto('infrastructure', 0.03), apr(1)]],
    ['Rodízio', [apr(-3)]],
  ], { neg: true }),

  // ─── RO ───
  r('RO', 'br364', 'politics', 'BR-364 e desmatamento', 'A rodovia é rota de desmatamento.', [
    ['Fiscalização', [gi('environmental', 5), gi('agribusiness', -4)]],
    ['Apoiar os produtores', [gi('agribusiness', 5), gi('environmental', -5)]],
  ]),
  r('RO', 'madeira', 'politics', 'Hidrelétricas do Madeira', 'Ribeirinhos ainda esperam compensações.', [
    ['Cobrar as usinas', [gi('social_movements', 4), cred(1), cap(-3)]],
    ['Deixar com a União', [cap(-1)]],
  ]),
  r('RO', 'garimpo', 'crisis', 'Garimpo no rio Madeira', 'Centenas de balsas tomam o rio.', [
    ['Operação com a PF', [gi('environmental', 6), cred(2), unrest(1)]],
    ['Tolerar', [gi('environmental', -6), esc(2)]],
  ], { neg: true }),
  r('RO', 'queimadas', 'crisis', 'Queimadas em Rondônia', 'Porto Velho fica coberta de fumaça.', [
    ['Brigadas', [gasto('security', 0.02), gi('environmental', 4)]],
    ['Esperar a chuva', [apr(-2)]],
  ], { neg: true }),
  r('RO', 'terras_indigenas', 'politics', 'Agro e terras indígenas', 'Invasões em terras indígenas aumentam.', [
    ['Proteger as terras', [gi('social_movements', 5), gi('agribusiness', -3)]],
    ['Defender a regularização dos ocupantes', [gi('agribusiness', 5), gi('social_movements', -6)]],
  ]),
  r('RO', 'bolivianos', 'politics', 'Imigração boliviana', 'Bolivianos chegam em busca de trabalho.', [
    ['Programa de acolhida', [gasto('social', 0.01), gi('social_movements', 3)]],
    ['Fiscalizar o trabalho irregular', [gi('unions', 2)]],
  ]),

  // ─── RR ───
  r('RR', 'venezuelanos', 'crisis', 'Imigração venezuelana', 'Milhares de venezuelanos chegam a Boa Vista.', [
    ['Acolhida e interiorização', [gasto('social', 0.02), gi('social_movements', 4), cap(-1)]],
    ['Pedir o fechamento da fronteira', [apr(2), cred(-3)]],
  ], { neg: true }),
  r('RR', 'yanomami', 'crisis', 'Garimpo na terra Yanomami', 'Crise humanitária com desnutrição e malária.', [
    ['Apoiar a retirada dos garimpeiros', [gi('social_movements', 6), cred(3), apr(-1)]],
    ['Defender os garimpeiros', [apr(1), gi('environmental', -8), cred(-3)]],
  ], { neg: true }),
  r('RR', 'apagao', 'crisis', 'Apagão em Roraima', 'O estado, isolado do sistema elétrico, ficou sem luz.', [
    ['Térmicas emergenciais', [gasto('infrastructure', 0.03), apr(1)]],
    ['Cobrar o linhão', [cap(-2)]],
  ], { neg: true }),
  r('RR', 'linhao', 'politics', 'Linhão de Tucuruí', 'A linha de transmissão atravessa terra indígena.', [
    ['Negociar com os indígenas', [cred(2), gi('social_movements', 3), cap(-3)]],
    ['Pressionar pela obra já', [apr(1), gi('social_movements', -4)]],
  ]),
  r('RR', 'guiana', 'politics', 'Tensão na fronteira com a Guiana', 'A disputa entre Venezuela e Guiana preocupa.', [
    ['Pedir reforço militar', [gi('security', 4), cap(-3)]],
    ['Comércio com a Guiana', [gi('commerce', 3), cap(-3)]],
  ]),
  r('RR', 'lavrado', 'politics', 'Agro avança no lavrado', 'Soja e arroz ocupam o lavrado de Roraima.', [
    ['Apoiar o agro', [gi('agribusiness', 5), gi('environmental', -3)]],
    ['Zoneamento', [gi('environmental', 3)]],
  ]),

  // ─── RS ───
  r('RS', 'enchentes', 'crisis', 'Enchente no Vale do Taquari e no Guaíba', 'Rios sobem e cidades inteiras ficam submersas.', [
    ['Gabinete de crise e reconstrução', [gasto('social', 0.06), apr(3)]],
    ['Pedir socorro federal', [cap(-3), apr(1)]],
  ], { neg: true, cd: 900 }),
  r('RS', 'divida', 'economy', 'Dívida gaúcha com a União', 'O estado quer renegociar após as enchentes.', [
    ['Campanha pela suspensão', [cap(-3), fame(2)]],
    ['Aceitar a renegociação proposta', [gi('civil_servants', -3), cred(1)]],
  ]),
  r('RS', 'estiagem', 'crisis', 'Estiagem destrói a safra', 'Soja e milho secam nas lavouras.', [
    ['Crédito emergencial', [gasto('industry', 0.02), sat(CAMPO, 3)]],
    ['Programa de irrigação', [gasto('infrastructure', 0.04), gi('agribusiness', 4)]],
  ], { neg: true }),
  r('RS', 'metalmecanica', 'economy', 'Indústria metalmecânica da serra', 'Encomendas caem e as fábricas reduzem turnos.', [
    ['Linha de crédito para a indústria', [gasto('industry', 0.02), gi('industry', 4)]],
    ['Programa de exportação', [gi('industry', 2), gi('commerce', 2), cap(-3)]],
  ]),
  r('RS', 'tabaco', 'politics', 'Tabaco em Santa Cruz', 'O tratado antitabagismo ameaça os produtores.', [
    ['Defender os fumicultores', [sat(CAMPO, 3), cred(-1)]],
    ['Programa de diversificação', [gasto('industry', 0.01), sat(CAMPO, 1)]],
  ]),
  r('RS', 'fronteira', 'politics', 'Fronteira com Uruguai e Argentina', 'O câmbio esvazia o comércio na fronteira.', [
    ['Free shops e incentivo ao comércio', [gi('commerce', 4)]],
    ['Fiscalizar o contrabando', [gi('security', 2), gi('commerce', -2)]],
  ]),

  // ─── SC ───
  r('SC', 'enchentes', 'crisis', 'Enchente no Vale do Itajaí', 'O rio Itajaí-Açu transborda.', [
    ['Defesa Civil e abrigos', [gasto('social', 0.03), apr(2)]],
    ['Obras de contenção', [gasto('infrastructure', 0.04), cred(1)]],
  ], { neg: true }),
  r('SC', 'mao_de_obra', 'economy', 'Pleno emprego e falta de mão de obra', 'Fábricas não encontram trabalhadores.', [
    ['Atrair migrantes', [gi('industry', 5), gi('social_movements', 2), cap(-3)]],
    ['Escolas técnicas', [gasto('education', 0.02), gi('industry', 3)]],
  ]),
  r('SC', 'itajai', 'opportunity', 'Porto de Itajaí', 'A concessão do porto está em debate.', [
    ['Conceder', [gi('business', 5), gi('unions', -3)]],
    ['Gestão pública', [gi('unions', 3), gasto('infrastructure', 0.02)]],
  ]),
  r('SC', 'agroindustria', 'economy', 'Agroindústria do oeste', 'Frigoríficos querem exportar mais.', [
    ['Barreira sanitária reforçada', [gasto('industry', 0.01), gi('agribusiness', 4)]],
    ['Missão comercial', [gi('agribusiness', 3), gi('commerce', 2), cap(-3)]],
  ]),
  r('SC', 'oktoberfest', 'opportunity', 'Oktoberfest de Blumenau', 'A festa pede apoio para a próxima edição.', [
    ['Apoiar', [gasto('administration', 0.005), apr(1), gi('commerce', 3)]],
    ['Apoio simbólico', []],
  ], { cd: 330 }),
  r('SC', 'turismo', 'politics', 'Turismo em Florianópolis e Balneário', 'Prédios e trânsito tomam a orla.', [
    ['Limitar construções', [gi('environmental', 3), gi('business', -3)]],
    ['Liberar e cobrar contrapartidas', [gi('business', 4), gasto('infrastructure', -0.01), cap(-3)]],
  ]),

  // ─── SE ───
  r('SE', 'gas', 'opportunity', 'Gás em águas profundas', 'Novos campos de gás prometem empregos.', [
    ['Atrair indústria do gás', [gi('industry', 5), sat(OPERARIOS, 2), cap(-3)]],
    ['Fundo de royalties', [cred(2), cap(-3)]],
  ]),
  r('SE', 'seca', 'crisis', 'Seca no sertão sergipano', 'O sertão está há meses sem chuva.', [
    ['Carros-pipa', [gasto('social', 0.02), sat(CAMPO, 2)]],
    ['Pedir socorro federal', [cap(-2)]],
  ], { neg: true }),
  r('SE', 'foz', 'crisis', 'Rio São Francisco perde força na foz', 'O mar avança sobre o rio e a água fica salgada.', [
    ['Cobrar vazão mínima', [cap(-2), gi('environmental', 3)]],
    ['Dessalinizadores', [gasto('infrastructure', 0.02)]],
  ]),
  r('SE', 'turismo', 'opportunity', 'Turismo em Aracaju', 'A orla atrai turistas do país.', [
    ['Promoção turística', [gasto('administration', 0.005), gi('commerce', 3)]],
    ['Comemorar', [apr(1)]],
  ]),
  r('SE', 'violencia', 'crisis', 'Violência urbana em Aracaju', 'Assaltos e homicídios aumentam.', [
    ['Reforço policial', [gasto('security', 0.02), gi('security', 3)]],
    ['Iluminação e prevenção', [gasto('infrastructure', 0.01), cred(1)]],
  ], { neg: true }),
  r('SE', 'citros', 'economy', 'Citricultura no sul do estado', 'Pragas atacam os laranjais.', [
    ['Programa fitossanitário', [gasto('industry', 0.01), sat(CAMPO, 2)]],
    ['Esperar a Embrapa', []],
  ]),

  // ─── SP ───
  r('SP', 'cantareira', 'crisis', 'Crise hídrica na Cantareira', 'O sistema está abaixo de 20%.', [
    ['Obras de interligação', [gasto('infrastructure', 0.05), apr(1)]],
    ['Bônus para quem economizar', [gasto('infrastructure', 0.01), apr(1)]],
    ['Rodízio', [apr(-4), sat(CLASSE_MEDIA, -3)]],
  ], { neg: true, cd: 900 }),
  r('SP', 'saneamento', 'politics', 'Privatização do saneamento', 'A companhia de saneamento pode ser vendida.', [
    ['Apoiar a privatização', [gi('business', 5), gi('unions', -6)]],
    ['Ser contra', [gi('unions', 5), gi('business', -4)]],
  ]),
  r('SP', 'abc', 'economy', 'Indústria deixa o ABC', 'Montadoras reduzem a produção no ABC.', [
    ['Plano de reindustrialização', [gasto('industry', 0.03), sat(OPERARIOS, 2), gi('unions', 3)]],
    ['Polo de serviços', [gi('tech', 3), gi('unions', -2)]],
  ]),
  r('SP', 'agro_interior', 'economy', 'Cana e laranja no interior', 'O agro paulista pede apoio contra pragas.', [
    ['Programa fitossanitário', [gasto('industry', 0.01), gi('agribusiness', 4)]],
    ['Deixar com o setor', [gi('agribusiness', -1)]],
  ]),
  r('SP', 'santos', 'opportunity', 'Porto de Santos', 'O túnel Santos–Guarujá e a dragagem estão em debate.', [
    ['Apoiar o túnel', [gasto('infrastructure', 0.04), gi('commerce', 4)]],
    ['Priorizar a dragagem', [gasto('infrastructure', 0.02), gi('business', 3)]],
  ]),
  r('SP', 'cracolandia', 'crisis', 'Cracolândia no centro da capital', 'O fluxo de usuários se espalha pelo centro.', [
    ['Tratamento e moradia', [gasto('health', 0.02), gi('social_movements', 4), cred(1)]],
    ['Operação policial', [gi('security', 4), gi('social_movements', -5), apr(1)]],
  ], { neg: true }),

  // ─── TO ───
  r('TO', 'matopiba', 'politics', 'Matopiba: fronteira agrícola', 'A soja avança sobre o cerrado tocantinense.', [
    ['Apoiar com estradas', [gi('agribusiness', 6), gi('environmental', -3), gasto('infrastructure', 0.02)]],
    ['Zoneamento ambiental', [gi('environmental', 4), gi('agribusiness', -3)]],
  ]),
  r('TO', 'agua', 'crisis', 'Crise hídrica no rio Tocantins', 'A seca baixa o rio e afeta a irrigação.', [
    ['Regras de uso da água', [gi('agribusiness', -3), cred(2)]],
    ['Liberar a irrigação', [gi('agribusiness', 4), gi('environmental', -3)]],
  ], { neg: true }),
  r('TO', 'bananal', 'politics', 'Ilha do Bananal', 'Indígenas e turismo disputam a maior ilha fluvial do mundo.', [
    ['Turismo de base comunitária', [gi('social_movements', 3), gi('commerce', 2), cap(-3)]],
    ['Liberar fazendas no entorno', [gi('agribusiness', 4), gi('social_movements', -4)]],
  ]),
  r('TO', 'norte_sul', 'opportunity', 'Ferrovia Norte-Sul', 'Terminais de carga disputam cidades.', [
    ['Plataforma logística', [gasto('infrastructure', 0.02), gi('agribusiness', 4)]],
    ['Esperar a concessionária', []],
  ]),
  r('TO', 'pecuaria', 'economy', 'Pecuária em Araguaína', 'Frigoríficos querem ampliar abates.', [
    ['Apoiar a ampliação', [gi('agribusiness', 4), sat(OPERARIOS, 1), cap(-3)]],
    ['Exigir rastreio', [gi('environmental', 2), gi('agribusiness', -1)]],
  ]),
  r('TO', 'palmas', 'politics', 'Palmas cresce desordenada', 'A capital planejada tem bairros distantes sem serviços.', [
    ['Plano de adensamento', [gi('business', 2), cred(1), cap(-3)]],
    ['Levar serviços aos bairros', [gasto('infrastructure', 0.02), sat(POBRES, 2)]],
  ]),
];
