/**
 * Pacote de eventos do mandato legislativo (vereador, deputados e senador).
 * Fonte das ideias: docs/BANCO_DE_CONTEUDO.md, seção 7.
 */
import { officeIs } from '../conditions';
import {
  apr, cap, chain, cred, esc, EST, ev, fame, FED, flag, gi, JOVENS, LEG, lid, MUN, rej,
  sat, type EvInput, uni, V,
} from '../dsl';
import type { GameState } from '../../simulation/state';
import type { EventDefinition } from '../types';

/** Evento de mandato legislativo (qualquer Casa). */
const l = (i: Omit<EvInput, 'phases'>): EventDefinition => ev({ ...i, phases: LEG });

const FEDERAL_DEPUTY = (s: GameState): boolean => officeIs('deputado_federal')(s);
const SENATOR = (s: GameState): boolean => officeIs('senador')(s);

export const LEGISLATIVE_EVENTS: EventDefinition[] = [
  // ─── Votações e plenário ───
  l({ id: 'leg_voto_contra_partido', cat: 'party', w: 5, cd: 120,
    title: 'Orientação contra suas bandeiras', text: 'O {playerParty} orienta voto contra uma causa que você defendeu na campanha.',
    opts: [
      ['Votar com a consciência', [lid(-15), cred(4), apr(2)]],
      ['Seguir a orientação', [lid(6), cred(-2)]],
      ['Faltar à sessão', [lid(-5), cred(-1)]],
    ] }),
  l({ id: 'leg_votacao_noturna', cat: 'politics', w: 3, cd: 200,
    title: 'Votação na madrugada', text: 'Um projeto polêmico entrou na pauta às duas da manhã.',
    opts: [
      ['Denunciar a pressa na tribuna', [cred(2), fame(1), lid(-3)]],
      ['Votar com a maioria', [lid(3), cred(-1)]],
    ] }),
  l({ id: 'leg_voto_decisivo', cat: 'politics', w: 3, cd: 300,
    title: 'Seu voto decide', text: 'A votação está empatada e o seu voto vai desempatar.',
    opts: [
      ['Negociar o voto com o Executivo', [cap(10), cred(-2)]],
      ['Votar pelo programa do partido', [lid(5), cred(2), cap(-2)]],
      ['Votar contra o governo', [fame(3), cap(-5)]],
    ] }),
  l({ id: 'leg_projeto_impopular', cat: 'politics', w: 3, cd: 240,
    title: 'Projeto impopular do Executivo', text: 'O Executivo pede seu voto num aumento de imposto.',
    opts: [
      ['Votar a favor', [cap(8), apr(-3)]],
      ['Votar contra', [cap(-8), apr(2)]],
    ] }),
  l({ id: 'leg_obstrucao', cat: 'politics', w: 3, cd: 240,
    title: 'Oposição convoca obstrução', text: 'A oposição quer travar a pauta com obstrução.',
    opts: [
      ['Liderar a obstrução', [fame(3), cap(-4)]],
      ['Não participar', [cap(2)]],
    ] }),
  l({ id: 'leg_discurso_viral', cat: 'media', w: 4, cd: 150,
    title: 'Discurso na tribuna pode viralizar', text: 'O tema do dia está em alta nas redes.',
    opts: [
      ['Discurso inflamado', [fame(4), rej(1), apr(1)]],
      ['Discurso técnico e firme', [cred(2), fame(1), cap(-2)]],
    ] }),
  l({ id: 'leg_projeto_aprovado', cat: 'opportunity', w: 2, cd: 400,
    title: 'Seu projeto vai a plenário', text: 'Depois de meses, um projeto seu entrou na pauta.',
    opts: [
      ['Articular votos com todos os partidos', [cap(-6), cred(4), fame(3)]],
      ['Deixar a votação correr', [chain('leg_projeto_engavetado', 30, 0.5)]],
    ] }),
  l({ id: 'leg_projeto_engavetado', cat: 'politics', w: 0, chainOnly: true, neg: true,
    title: 'Seu projeto foi engavetado', text: 'A presidência da Casa tirou seu projeto da pauta.',
    opts: [
      ['Negociar com a Mesa', [cap(-4)]],
      ['Denunciar publicamente', [fame(2), cap(-3)]],
    ] }),
  l({ id: 'leg_pedido_vista', cat: 'politics', w: 2, cd: 200,
    title: 'Aliados pedem que você peça vista', text: 'Pedir vista atrasaria uma votação que incomoda seus aliados.',
    opts: [
      ['Pedir vista', [cap(4), cred(-1)]],
      ['Votar logo', [cred(1)]],
    ] }),
  l({ id: 'leg_eleicao_mesa', cat: 'party', w: 3, cd: 600,
    title: 'Eleição para a Mesa da Casa', text: 'A votação é secreta. O partido tem candidato, mas o favorito é outro.',
    opts: [
      ['Votar no candidato do partido', [lid(6)]],
      ['Votar no favorito', [cap(6), lid(-6)]],
    ] }),
  l({ id: 'leg_urgencia_popular', cat: 'opportunity', w: 2, cd: 300,
    title: 'Abaixo-assinado popular', text: 'Um projeto popular reuniu milhares de assinaturas.',
    opts: [
      ['Assinar o pedido de urgência', [fame(2), apr(1), cap(-2)]],
      ['Ficar de fora', []],
    ] }),
  l({ id: 'leg_lei_inutil', cat: 'politics', w: 2, cd: 300,
    title: 'Projeto fácil de aprovar', text: 'Assessores sugerem criar uma data comemorativa para mostrar produção.',
    opts: [
      ['Propor', [cred(-1), fame(1)]],
      ['Focar em projetos de verdade', [cred(1)]],
    ] }),
  l({ id: 'leg_reforma_estrutural', cat: 'politics', w: 3, cd: 400,
    title: 'Votação de reforma estrutural', text: 'A reforma divide grupos e eleitores.',
    opts: [
      ['A favor', [gi('business', 5), gi('unions', -5), cap(4)]],
      ['Contra', [gi('unions', 5), gi('business', -5), cap(-4)]],
    ] }),

  // ─── Comissões e relatoria ───
  l({ id: 'leg_relatoria_orcamento', cat: 'opportunity', w: 2, cd: 500,
    title: 'Relatoria do orçamento', text: 'O líder oferece a relatoria do orçamento, com poder sobre emendas.',
    opts: [
      ['Aceitar', [cap(12), esc(3), flag('relator_orcamento')]],
      ['Recusar', [cred(1)]],
    ] }),
  l({ id: 'leg_relator_cpi', cat: 'opportunity', w: 2, cd: 500,
    title: 'Relatoria de CPI', text: 'Você foi indicado para relatar uma CPI barulhenta.',
    opts: [
      ['Relatório duro', [fame(5), cred(3), cap(-6)]],
      ['Relatório brando', [cap(4), cred(-3)]],
    ] }),
  l({ id: 'leg_audiencia_publica', cat: 'opportunity', w: 2, cd: 300,
    title: 'Audiência pública lotada', text: 'Uma audiência sobre um tema polêmico atraiu centenas.',
    opts: [
      ['Ouvir todos os lados', [cred(2)]],
      ['Usar como palanque', [fame(2), rej(1)]],
    ] }),
  l({ id: 'leg_convocacao', cat: 'politics', w: 2, cd: 300,
    title: 'Convocação de secretário ou ministro', text: 'A comissão vai ouvir um auxiliar do Executivo.',
    opts: [
      ['Interrogar duramente', [fame(3), cap(-4)]],
      ['Perguntas protocolares', [cap(2)]],
    ] }),
  l({ id: 'leg_comissao_etica', cat: 'scandal', w: 2, cd: 400,
    title: 'Conselho de Ética julga colega', text: 'Um colega é acusado de quebra de decoro.',
    opts: [
      ['Votar pela cassação', [cred(3), cap(-4)]],
      ['Absolver', [cap(3), cred(-2)]],
    ] }),
  l({ id: 'leg_frente_parlamentar', cat: 'opportunity', w: 2, cd: 500,
    title: 'Frente parlamentar do seu tema', text: 'Colegas sugerem que você lidere uma frente parlamentar.',
    opts: [
      ['Fundar a frente', [fame(3), cap(-2)]],
      ['Apenas assinar', [fame(1)]],
    ] }),
  l({ id: 'leg_missao_exterior', cat: 'opportunity', w: 2, cd: 400,
    title: 'Missão oficial no exterior', text: 'Uma viagem oficial para conhecer políticas públicas lá fora.',
    opts: [
      ['Ir', [fame(2), apr(-1)]],
      ['Recusar e economizar', [cred(1)]],
    ] }),

  // ─── Base eleitoral e emendas ───
  l({ id: 'leg_emenda_prefeito', cat: 'politics', w: 4, cd: 180, vars: { obra: V.obra },
    title: 'Prefeito aliado pede emenda', text: 'Um prefeito do seu reduto pede recursos para {obra}.',
    opts: [
      ['Emenda para posto de saúde', [apr(2), cap(-2)]],
      ['Emenda para asfalto', [apr(1), cap(-1)]],
      ['Não tenho emendas para isso', [apr(-1)]],
    ] }),
  l({ id: 'leg_emenda_ong', cat: 'scandal', w: 2, cd: 400,
    title: 'Aliado pede emenda para ONG suspeita', text: 'A entidade não tem histórico e o pedido vem de um aliado.',
    opts: [
      ['Recusar', [cap(-3), cred(1)]],
      ['Aceitar', [cap(3), esc(6), chain('leg_ong_denuncia', 120, 0.5)]],
    ] }),
  l({ id: 'leg_ong_denuncia', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'ONG da sua emenda é alvo de operação', text: 'A polícia investiga desvio dos recursos da emenda.',
    opts: [
      ['Pedir a apuração rigorosa', [esc(4), cred(-1)]],
      ['Defender a entidade', [esc(10), cred(-4)]],
    ] }),
  l({ id: 'leg_inauguracao_emenda', cat: 'opportunity', w: 3, cd: 200,
    title: 'Inauguração de obra com sua emenda', text: 'A obra paga com sua emenda ficou pronta.',
    opts: [
      ['Ir à inauguração', [apr(2), fame(1), cap(-2)]],
      ['Postar nas redes', [apr(1), cap(-2)]],
    ] }),
  l({ id: 'leg_emendas_atrasadas', cat: 'politics', w: 3, cd: 240,
    title: 'Executivo segura suas emendas', text: 'Suas emendas estão paradas há meses.',
    opts: [
      ['Ameaçar votar contra o governo', [cap(4), fame(1), cap(-2)]],
      ['Esperar', [apr(-1)]],
    ] }),
  l({ id: 'leg_gabinete_itinerante', cat: 'opportunity', w: 3, cd: 240,
    title: 'Gabinete itinerante', text: 'Assessores propõem visitar dez cidades em duas semanas.',
    opts: [
      ['Fazer a caravana', [apr(2), fame(1), cap(-2)]],
      ['Ficar em Brasília/na capital', [cap(1)]],
    ] }),
  l({ id: 'leg_reduto_ameacado', cat: 'politics', w: 2, cd: 400, vars: { pessoa: V.pessoa },
    title: 'Novo nome ameaça seu reduto', text: '{pessoa} começa a circular no seu reduto eleitoral.',
    opts: [
      ['Reforçar a presença no reduto', [apr(1), cap(-2)]],
      ['Atrair o novo nome para o seu grupo', [cap(-3), flag('reduto_aliado')]],
    ] }),
  l({ id: 'leg_pedido_emprego', cat: 'scandal', w: 2, cd: 300,
    title: 'Eleitor pede emprego', text: 'Um cabo eleitoral pede uma indicação para cargo público.',
    opts: [
      ['Indicar', [esc(2), apr(1)]],
      ['Recusar com educação', [apr(-1), cred(1)]],
    ] }),
  l({ id: 'leg_radio_local', cat: 'opportunity', w: 2, cd: 400,
    title: 'Rádio local oferece um programa', text: 'Uma rádio da sua base quer um programa semanal com você.',
    opts: [
      ['Aceitar', [fame(2), apr(1), cap(-2)]],
      ['Recusar', []],
    ] }),

  // ─── Partido e bancada ───
  l({ id: 'leg_vice_lider', cat: 'party', w: 3, cd: 500,
    title: 'Convite para vice-líder', text: 'O líder da bancada quer você como vice-líder.',
    opts: [
      ['Aceitar', [lid(8), cap(4), cap(-2)]],
      ['Recusar', [lid(-2)]],
    ] }),
  l({ id: 'leg_bancada_racha', cat: 'party', w: 3, cd: 400,
    title: 'Bancada racha na escolha do líder', text: 'Dois grupos disputam a liderança do partido.',
    opts: [
      ['Apoiar a ala majoritária', [lid(6), uni(2), cap(-2)]],
      ['Apoiar a ala minoritária', [lid(-6), cap(2)]],
      ['Ficar neutro', [lid(-1)]],
    ] }),
  l({ id: 'leg_convite_secretaria', cat: 'opportunity', w: 2, cd: 600,
    title: 'Convite para o Executivo', text: 'O Executivo oferece uma secretaria/ministério a você.',
    opts: [
      ['Aceitar sem deixar o mandato de vez', [fame(3), cap(6), lid(2), cap(-2)]],
      ['Recusar e manter a independência', [cred(2)]],
    ] }),
  l({ id: 'leg_fundo_partidario', cat: 'party', w: 2, cd: 500,
    title: 'Fundo partidário para a sua reeleição', text: 'A direção promete recursos se você seguir a linha do partido.',
    opts: [
      ['Aceitar o acordo', [lid(8), cred(-1), flag('fundo_garantido')]],
      ['Manter a independência', [lid(-4), cred(1)]],
    ] }),
  l({ id: 'leg_bancada_tematica', cat: 'party', w: 3, cd: 500,
    title: 'Convite de bancada temática', text: 'Uma bancada temática quer seu apoio nas votações.',
    opts: [
      ['Entrar na bancada ruralista', [gi('agribusiness', 6), gi('environmental', -4), cap(3)]],
      ['Entrar na bancada religiosa', [gi('religious', 6), gi('youth', -3), cap(3)]],
      ['Entrar na bancada sindical', [gi('unions', 6), gi('business', -3), cap(3)]],
      ['Não entrar em nenhuma', [cred(1)]],
    ] }),
  l({ id: 'leg_presidencia_casa', cat: 'party', w: 2, cd: 700,
    title: 'Disputa pela presidência da Casa', text: 'Dois candidatos disputam o comando da Casa.',
    opts: [
      ['Apoiar o favorito', [cap(6)]],
      ['Apoiar o azarão', [cap(-6), fame(1), chain('leg_geladeira', 60, 0.6)]],
    ] }),
  l({ id: 'leg_geladeira', cat: 'politics', w: 0, chainOnly: true, neg: true,
    title: 'Você foi para a geladeira', text: 'O presidente eleito da Casa tirou você das comissões.',
    opts: [['Buscar espaço na imprensa', [fame(2), cap(-4)]]] }),
  l({ id: 'leg_colega_escandalo', cat: 'scandal', w: 2, cd: 400,
    title: 'Colega de partido em escândalo', text: 'Um colega da bancada é investigado.',
    opts: [
      ['Defender o colega', [esc(2), lid(4)]],
      ['Pedir o afastamento', [lid(-5), cred(2)]],
    ] }),
  l({ id: 'leg_expulsao', cat: 'party', w: 1, cd: 900, cond: (s) => (s.government?.partyLoyalty ?? 70) < 30,
    title: 'Partido ameaça expulsá-lo', text: 'A direção diz que você vota mais com a oposição do que com o partido.',
    opts: [
      ['Fazer as pazes com a direção', [lid(15), cred(-2)]],
      ['Bater de frente', [lid(-10), fame(3)]],
    ] }),

  // ─── Ética e escândalos ───
  l({ id: 'leg_verba_gabinete', cat: 'scandal', w: 3, cd: 300,
    title: 'Gasto alto com verba de gabinete', text: 'Um jornal mostra gastos altos com combustível no seu gabinete.',
    opts: [
      ['Devolver o dinheiro', [cred(2), apr(1), cap(-2)]],
      ['Justificar', [esc(3)]],
    ] }),
  l({ id: 'leg_assessor_fantasma', cat: 'scandal', w: 2, cd: 600, neg: true, vars: { pessoa: V.pessoa },
    title: 'Denúncia de assessor fantasma', text: 'Reportagem diz que {pessoa}, lotado no seu gabinete, nunca apareceu para trabalhar.',
    opts: [
      ['Exonerar e explicar', [esc(3), cred(1)]],
      ['Negar', [esc(8), chain('leg_rachadinha', 90, 0.4)]],
    ] }),
  l({ id: 'leg_rachadinha', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Investigação de rachadinha no gabinete', text: 'O Ministério Público suspeita de devolução de salários.',
    opts: [
      ['Abrir as contas', [esc(4), cred(1)]],
      ['Atacar os investigadores', [esc(12), rej(3)]],
    ] }),
  l({ id: 'leg_auxilio_moradia', cat: 'politics', w: 2, cd: 600,
    title: 'Auxílio-moradia com casa própria', text: 'Você tem direito ao auxílio, mesmo com casa na capital.',
    opts: [
      ['Recusar o benefício', [cred(3), apr(1)]],
      ['Receber, é legal', [apr(-1)]],
    ] }),
  l({ id: 'leg_briga_plenario', cat: 'media', w: 2, cd: 500,
    title: 'Bate-boca vira empurra-empurra', text: 'Uma discussão com um colega quase terminou em briga.',
    opts: [
      ['Pedir desculpas', [cred(1)]],
      ['Justificar a reação', [rej(2), fame(2)]],
    ] }),
  l({ id: 'leg_foro', cat: 'scandal', w: 1, cd: 900, cond: (s) => (s.candidates[s.playerId]?.scandal ?? 0) >= 10,
    title: 'Investigação e foro privilegiado', text: 'Uma investigação contra você chegou ao tribunal superior.',
    opts: [
      ['Abrir mão do foro', [cred(4), esc(-2), cap(-2)]],
      ['Manter o foro', [cred(-2)]],
    ] }),

  // ─── Mídia e redes ───
  l({ id: 'leg_corte_viraliza', cat: 'media', w: 3, cd: 200,
    title: 'Corte do seu discurso viralizou', text: 'Um trecho de 30 segundos tem milhões de visualizações.',
    opts: [
      ['Aproveitar a onda', [fame(3), rej(1)]],
      ['Explicar o contexto completo', [cred(1), fame(1), cap(-2)]],
    ] }),
  l({ id: 'leg_fake_voto', cat: 'media', w: 3, cd: 200, neg: true,
    title: 'Fake news sobre o seu voto', text: 'Grupos dizem que você votou contra um projeto popular.',
    opts: [
      ['Desmentir com vídeo', [cred(1), apr(1), cap(-2)]],
      ['Ignorar', [apr(-2)]],
    ] }),
  l({ id: 'leg_lacrar', cat: 'media', w: 3, cd: 300,
    title: 'Lacrar ou legislar?', text: 'A equipe de redes quer vídeos polêmicos; a assessoria quer projetos.',
    opts: [
      ['Vídeos polêmicos', [fame(4), cred(-2), rej(2)]],
      ['Focar em projetos', [cred(2)]],
    ] }),
  l({ id: 'leg_podcast', cat: 'media', w: 2, cd: 300,
    title: 'Convite para podcast político', text: 'Um podcast de grande audiência quer três horas de conversa.',
    opts: [
      ['Ir', [fame(3), rej(1)]],
      ['Recusar', []],
    ] }),
  l({ id: 'leg_ranking', cat: 'media', w: 2, cd: 365,
    title: 'Ranking de parlamentares', text: 'Uma ONG publica o ranking de atuação dos parlamentares.',
    opts: [['Divulgar o resultado', [cred(1), fame(1)]]] }),
  l({ id: 'leg_absenteismo', cat: 'media', w: 2, cd: 400, neg: true,
    title: 'Jornal aponta suas faltas', text: 'Você aparece entre os que mais faltaram às sessões.',
    opts: [
      ['Justificar com agenda externa', [cred(-1)]],
      ['Prometer presença total', [apr(1), cap(-1)]],
    ] }),

  // ─── Vereador ───
  l({ id: 'leg_ver_buraco', cat: 'politics', w: 4, cd: 150, scope: MUN, vars: { bairro: V.bairro },
    title: 'Cratera na rua do seu reduto', text: 'Moradores do {bairro} cobram uma solução.',
    opts: [
      ['Indicação ao prefeito', [apr(1)]],
      ['Pressão pública contra a prefeitura', [fame(2), cap(-3)]],
    ] }),
  l({ id: 'leg_ver_plano_diretor', cat: 'politics', w: 2, cd: 600, scope: MUN,
    title: 'Câmara vota o plano diretor', text: 'Construtoras querem prédios mais altos; moradores querem bairros preservados.',
    opts: [
      ['Apoiar mais verticalização', [gi('business', 5), gi('social_movements', -3), cap(3)]],
      ['Defender os moradores', [gi('social_movements', 4), gi('business', -4)]],
    ] }),
  l({ id: 'leg_ver_fogos', cat: 'politics', w: 2, cd: 600, scope: MUN,
    title: 'Projeto proíbe fogos com estampido', text: 'Protetores de animais e autistas apoiam.',
    opts: [
      ['Apoiar', [apr(1), cap(-2)]],
      ['Votar contra', [gi('commerce', 2), cap(-2)]],
    ] }),
  l({ id: 'leg_ver_nome_rua', cat: 'opportunity', w: 2, cd: 300, scope: MUN,
    title: 'Homenagem num nome de rua', text: 'Moradores pedem dar a uma rua o nome de um ídolo local.',
    opts: [['Propor a homenagem', [apr(1), fame(1)]]] }),
  l({ id: 'leg_ver_cpi_transporte', cat: 'politics', w: 2, cd: 600, scope: MUN,
    title: 'CPI do transporte', text: 'Vereadores querem investigar o contrato dos ônibus.',
    opts: [
      ['Assinar a CPI', [fame(3), cap(-4)]],
      ['Não assinar', [cap(2), cred(-1)]],
    ] }),
  l({ id: 'leg_ver_secretaria', cat: 'opportunity', w: 1, cd: 900, scope: MUN,
    title: 'Prefeito oferece uma secretaria', text: 'O prefeito quer você na equipe de governo.',
    opts: [
      ['Aceitar', [cap(6), fame(2), cap(-2)]],
      ['Recusar', [cred(1)]],
    ] }),

  // ─── Deputado estadual ───
  l({ id: 'leg_dep_previdencia', cat: 'politics', w: 2, cd: 600, scope: EST,
    title: 'Governador pede voto na previdência estadual', text: 'Servidores lotam as galerias da Assembleia.',
    opts: [
      ['Votar a favor', [cap(6), gi('civil_servants', -6)]],
      ['Votar contra', [cap(-6), gi('civil_servants', 6)]],
    ] }),
  l({ id: 'leg_dep_hospital', cat: 'opportunity', w: 2, cd: 500, scope: EST,
    title: 'Emenda para o hospital regional', text: 'Sua região espera há anos pelo hospital.',
    opts: [['Destinar a emenda', [apr(2), cap(-2)]]] }),
  l({ id: 'leg_dep_federal', cat: 'opportunity', w: 1, cd: 900, scope: EST,
    title: 'Pré-candidatura a deputado federal', text: 'Lideranças sugerem que você tente Brasília.',
    opts: [
      ['Lançar a pré-candidatura', [fame(2), lid(-2), flag('mira_federal')]],
      ['Ficar na Assembleia', [lid(2)]],
    ] }),

  // ─── Deputado federal e senador ───
  l({ id: 'leg_fed_pec', cat: 'politics', w: 3, cd: 400, scope: FED, cond: FEDERAL_DEPUTY,
    title: 'Votação de PEC', text: 'O governo precisa de 308 votos e conta com o seu.',
    opts: [
      ['Negociar emendas pelo voto', [cap(8), cred(-2)]],
      ['Votar por convicção', [cred(2)]],
    ] }),
  l({ id: 'leg_fed_bancada_estado', cat: 'opportunity', w: 2, cd: 500, scope: FED,
    title: 'Bancada do estado unida', text: 'Os parlamentares do seu estado querem atuar juntos por uma obra.',
    opts: [
      ['Coordenar a bancada', [fame(3), cap(-2)]],
      ['Apoiar sem liderar', [cap(1)]],
    ] }),
  l({ id: 'leg_fed_presidente_camara', cat: 'opportunity', w: 1, cd: 1200, scope: FED, cond: FEDERAL_DEPUTY,
    title: 'Candidatura à presidência da Câmara', text: 'Colegas sugerem que você dispute o comando da Câmara.',
    opts: [
      ['Lançar a candidatura', [fame(5), cap(-8), lid(-4)]],
      ['Apoiar o candidato do partido', [lid(5)]],
    ] }),
  l({ id: 'leg_sen_sabatina', cat: 'politics', w: 2, cd: 500, scope: FED, cond: SENATOR,
    title: 'Sabatina de indicado ao STF', text: 'O Senado vai sabatinar o indicado do presidente.',
    opts: [
      ['Aprovar', [cap(4)]],
      ['Rejeitar', [fame(5), cap(-6)]],
    ] }),
  l({ id: 'leg_sen_suplente', cat: 'party', w: 1, cd: 900, scope: FED, cond: SENATOR, vars: { pessoa: V.pessoa },
    title: 'Suplente ambicioso', text: 'Seu suplente, {pessoa}, articula para assumir a vaga.',
    opts: [
      ['Manter o suplente por perto', [cap(-2)]],
      ['Romper com o suplente', [cap(-1), lid(-2)]],
    ] }),

  // ─── Mais eventos legislativos ───
  l({ id: 'leg_greve_casa', cat: 'politics', w: 2, cd: 400,
    title: 'Servidores em greve na porta da Casa', text: 'Grevistas pedem que os parlamentares os recebam.',
    opts: [
      ['Receber os grevistas', [gi('civil_servants', 4), gi('unions', 2), cap(-2)]],
      ['Não receber', [gi('civil_servants', -3)]],
    ] }),
  l({ id: 'leg_quatro_dias', cat: 'politics', w: 2, cd: 600,
    title: 'Projeto da jornada de quatro dias', text: 'Centrais sindicais pressionam pela aprovação.',
    opts: [
      ['Apoiar', [gi('unions', 6), gi('business', -5), sat(JOVENS, 1)]],
      ['Votar contra', [gi('business', 4), gi('unions', -5)]],
    ] }),
  l({ id: 'leg_anistia_agro', cat: 'politics', w: 2, cd: 600,
    title: 'Anistia de dívidas do agro', text: 'A bancada ruralista quer perdoar dívidas de produtores.',
    opts: [
      ['Apoiar', [gi('agribusiness', 6), cred(-1)]],
      ['Votar contra', [gi('agribusiness', -5), cred(1)]],
    ] }),
  l({ id: 'leg_transparencia', cat: 'opportunity', w: 2, cd: 500,
    title: 'Projeto de transparência', text: 'Você pode propor abrir todos os dados de gastos da Casa.',
    opts: [
      ['Propor', [cred(3), cap(-3)]],
      ['Não mexer nisso', []],
    ] }),
  l({ id: 'leg_tce_vaga', cat: 'politics', w: 1, cd: 900,
    title: 'Vaga no Tribunal de Contas', text: 'A Casa vai indicar um conselheiro.',
    opts: [
      ['Apoiar um técnico', [cred(2)]],
      ['Apoiar o colega veterano', [cap(4), cred(-1)]],
    ] }),
  l({ id: 'leg_galerias', cat: 'crisis', w: 2, cd: 400,
    title: 'Manifestantes ocupam as galerias', text: 'Um protesto interrompe a sessão.',
    opts: [
      ['Dialogar com os manifestantes', [cred(1), gi('social_movements', 3), cap(-2)]],
      ['Pedir a retirada', [gi('social_movements', -3), gi('security', 2)]],
    ] }),
  l({ id: 'leg_premio', cat: 'opportunity', w: 1, cd: 700,
    title: 'Prêmio de melhor parlamentar', text: 'Jornalistas elegeram você entre os destaques do ano.',
    opts: [['Agradecer', [cred(3), fame(2)]]] }),
  l({ id: 'leg_lei_com_nome', cat: 'opportunity', w: 1, cd: 900,
    title: 'Uma lei com seu nome', text: 'A imprensa passou a chamar seu projeto aprovado pelo seu nome.',
    opts: [['Celebrar', [cred(2), fame(3)]]] }),
  l({ id: 'leg_redes_classe_media', cat: 'media', w: 2, cd: 400,
    title: 'Pauta da classe média nas redes', text: 'Um tema de impostos da classe média está em alta.',
    opts: [
      ['Gravar vídeo defendendo isenção', [fame(2), gi('commerce', 2), cap(-2)]],
      ['Ficar fora', []],
    ] }),
];

