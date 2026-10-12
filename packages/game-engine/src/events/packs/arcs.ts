/**
 * Arcos narrativos: histórias em etapas encadeadas. Cada arco começa num evento sorteável e segue
 * por continuações (`chainOnly`) que guardam as variáveis sorteadas ({pessoa}, {empresa}...).
 * Fonte das ideias: docs/BANCO_DE_CONTEUDO.md, seção 2.
 */
import type { GameState } from '../../simulation/state';
import { nemesisOf } from '../../world/rivals';
import { approvalOf, partyUnity, scandalLevel } from '../conditions';
import {
  ANY, apr, caixa2, CAMP, cap, cash, chain, CLASSE_MEDIA, con, cred, ene, ent, esc, EST, ev, fame, FED, flag, foco,
  gasto, gi, GOV, hist, IDOSOS, inelegivel, JOVENS, LEG, legit, lid, mil, mom, MUN, OFFICE, OPERARIOS, opp, POBRES, radical, rej,
  rel, sat, shock, SUB, uni, unrest, UP, V, viceRisk,
} from '../dsl';
import type { EventDefinition } from '../types';

const fameOf = (s: GameState): number => s.candidates[s.playerId]?.fame ?? 0;
const ageOf = (s: GameState): number => s.candidates[s.playerId]?.age ?? 40;
const cashLow = (s: GameState): boolean => {
  const c = s.campaign;
  return !!c && c.money < 300_000 * c.moneyScale;
};
const daysToVote = (s: GameState): number =>
  s.election ? (Date.parse(s.election.firstRoundDate) - Date.parse(s.date)) / 864e5 : 999;

export const ARC_EVENTS: EventDefinition[] = [
  // ════════ Dinheiro e corrupção ════════
  // A Doação Generosa
  ev({ id: 'arc_doacao_1', cat: 'scandal', phases: CAMP, w: 3, once: true, cond: cashLow, vars: { pessoa: V.pessoa, empresa: V.empresa },
    title: 'Uma doação "sem recibo"', text: '{pessoa}, dono da {empresa}, oferece uma doação alta — mas sem recibo.',
    opts: [
      ['Recusar', [cred(2), flag('arc_doacao_recusou')]],
      ['Aceitar e declarar tudo', [cash(200_000), esc(2), chain('arc_doacao_2', 15, 0.4)]],
      ['Aceitar por fora', [caixa2(400_000), esc(8), chain('arc_doacao_2', 15)]],
    ] }),
  ev({ id: 'arc_doacao_2', cat: 'media', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: 'Repórter pergunta sobre {pessoa}', text: 'Uma jornalista quer saber qual é sua relação com o dono da {empresa}.',
    opts: [
      ['Responder com documentos', [cred(1), esc(-2), ene(-6)]],
      ['"Mal conheço"', [esc(4), chain('arc_doacao_3', 60, 0.6)]],
    ] }),
  ev({ id: 'arc_doacao_3', cat: 'scandal', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: 'Polícia Federal faz busca na {empresa}', text: 'Agentes levaram computadores e planilhas de doações.',
    opts: [
      ['"Confio na Justiça"', [esc(4), chain('arc_doacao_4', 120, 0.5)]],
      ['Atacar a operação', [esc(8), rej(2), chain('arc_doacao_4', 120, 0.7)]],
    ] }),
  ev({ id: 'arc_doacao_4', cat: 'scandal', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: '{pessoa} negocia delação', text: 'O empresário promete contar quem recebeu dinheiro por fora.',
    opts: [
      ['Antecipar-se e prestar esclarecimentos', [esc(8), cred(-2), hist('scandal', 'Citado na delação da {empresa}', -1, 3)]],
      ['Negar tudo', [esc(18), cred(-6), hist('scandal', 'Negou elo com a {empresa}', -1, 3)]],
    ] }),

  // Obra Superfaturada
  ev({ id: 'arc_obra_1', cat: 'scandal', phases: GOV, scope: SUB, w: 3, cd: 900, vars: { obra: V.obra, pessoa: V.pessoa },
    title: 'Aditivos de 40% em {obra}', text: 'Um engenheiro alerta que {obra} já recebeu aditivos de 40%.',
    opts: [
      ['Cancelar o aditivo', [cred(3), apr(-1)]],
      ['Seguir com a obra', [chain('arc_obra_2', 90)]],
    ] }),
  ev({ id: 'arc_obra_2', cat: 'politics', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Tribunal de Contas audita {obra}', text: 'O TCE abriu auditoria e pediu os contratos.',
    opts: [
      ['Entregar tudo', [cred(2), chain('arc_obra_3', 90, 0.4)]],
      ['Atrasar a entrega dos documentos', [esc(4), chain('arc_obra_3', 90)]],
    ] }),
  ev({ id: 'arc_obra_3', cat: 'scandal', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'MP pede afastamento do secretário {pessoa}', text: 'O Ministério Público vê indícios de sobrepreço.',
    opts: [
      ['Demitir e colaborar', [cap(-10), cred(6)]],
      ['Defender o secretário', [esc(6), chain('arc_obra_4', 60)]],
    ] }),
  ev({ id: 'arc_obra_4', cat: 'scandal', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: '{pessoa} ameaça "contar tudo"', text: 'O secretário diz que não vai cair sozinho.',
    opts: [
      ['Romper e entregar à Justiça', [esc(8), cred(2)]],
      ['Acomodar o secretário em outro cargo', [esc(16), cred(-5)]],
    ] }),

  // O Primo do Vice
  ev({ id: 'arc_primo_1', cat: 'scandal', phases: GOV, scope: SUB, w: 2, cd: 1200, vars: { empresa: V.empresa },
    title: 'Primo do vice ganha contrato de merenda', text: 'A {empresa}, de um primo do vice, venceu a licitação da merenda.',
    opts: [
      ['Mandar revisar a licitação', [cred(2), cap(-3)]],
      ['Não interferir', [chain('arc_primo_2', 60)]],
    ] }),
  ev({ id: 'arc_primo_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Merenda estragada em escola', text: 'Alunos passaram mal com a comida fornecida pela {empresa}.',
    opts: [
      ['Suspender o contrato', [cred(2), cap(-3)]],
      ['Abrir sindicância e esperar', [apr(-2), chain('arc_primo_3', 30)]],
    ] }),
  ev({ id: 'arc_primo_3', cat: 'politics', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'O vice exige silêncio', text: 'O vice diz que o partido dele deixa a base se o caso andar.',
    opts: [
      ['Romper com o vice', [cap(-8), cred(3)]],
      ['Abafar', [esc(10), cap(3)]],
      ['Denunciar publicamente', [cred(8), cap(-12), fame(2)]],
    ] }),

  // Emenda Pix
  ev({ id: 'arc_emenda_pix_1', cat: 'politics', phases: LEG, scope: FED, w: 3, cd: 900, vars: { pessoa: V.pessoa },
    title: 'Prefeito pede emenda direta', text: 'O prefeito aliado {pessoa} quer a emenda "na conta", sem convênio.',
    opts: [
      ['Emenda com convênio', [apr(1), cred(1), cap(-2)]],
      ['Emenda direta', [apr(2), chain('arc_emenda_pix_2', 90, 0.5), cap(-2)]],
    ] }),
  ev({ id: 'arc_emenda_pix_2', cat: 'scandal', phases: OFFICE, w: 0, chainOnly: true, neg: true,
    title: 'Dinheiro da emenda some', text: 'A obra paga com sua emenda não existe.',
    opts: [
      ['Pedir investigação', [esc(3), cred(1)]],
      ['Ficar em silêncio', [chain('arc_emenda_pix_3', 60)]],
    ] }),
  ev({ id: 'arc_emenda_pix_3', cat: 'scandal', phases: OFFICE, w: 0, chainOnly: true, neg: true,
    title: 'TCU cita seu nome', text: 'O relatório do TCU aponta sua emenda para a cidade de {pessoa}.',
    opts: [['Explicar-se na tribuna', [esc(10), cred(-3)]]] }),

  // O Lobista Simpático
  ev({ id: 'arc_lobista_1', cat: 'scandal', phases: LEG, w: 3, cd: 900, vars: { setor: V.setor },
    title: 'Jantar com lobista do setor de {setor}', text: 'Um lobista simpático convida para um jantar "sem compromisso".',
    opts: [
      ['Recusar', [cred(1)]],
      ['Ir ao jantar', [cap(2), chain('arc_lobista_2', 30), cap(-2)]],
    ] }),
  ev({ id: 'arc_lobista_2', cat: 'scandal', phases: LEG, w: 0, chainOnly: true,
    title: 'Viagem paga ao exterior', text: 'O lobista do setor de {setor} oferece uma "missão técnica" na Europa.',
    opts: [
      ['Recusar a viagem', [cap(-2)]],
      ['Ir e declarar', [rej(2), fame(1)]],
      ['Ir sem declarar', [chain('arc_lobista_3', 60, 0.6)]],
    ] }),
  ev({ id: 'arc_lobista_3', cat: 'scandal', phases: OFFICE, w: 0, chainOnly: true, neg: true,
    title: 'Foto da viagem vaza', text: 'Você aparece num jantar de luxo pago pelo setor de {setor}.',
    opts: [['Devolver o valor e pedir desculpas', [esc(10), cred(-3)]]] }),

  // Venda de Cargo
  ev({ id: 'arc_cargo_1', cat: 'party', phases: GOV, w: 3, cd: 900, vars: { pessoa: V.pessoa },
    title: 'Aliado indica nome de ficha suja', text: 'Um partido da base indica {pessoa}, que responde a processos, para uma pasta.',
    opts: [
      ['Vetar o indicado', [cap(-8), rel('coalition', -4), cred(2)]],
      ['Aceitar e fiscalizar', [cap(4), chain('arc_cargo_2', 60, 0.3)]],
      ['Aceitar sem olhar', [cap(6), chain('arc_cargo_2', 60)]],
    ] }),
  ev({ id: 'arc_cargo_2', cat: 'scandal', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: '{pessoa} nomeia parentes', text: 'O novo secretário encheu a pasta de parentes.',
    opts: [
      ['Exonerar {pessoa}', [cap(-6), cred(2)]],
      ['Pedir que exonere os parentes', [chain('arc_cargo_3', 30, 0.5)]],
    ] }),
  ev({ id: 'arc_cargo_3', cat: 'scandal', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Reportagem nacional sobre a pasta de {pessoa}', text: 'O caso vira manchete em rede nacional.',
    opts: [['Demitir e pedir desculpas', [esc(8), apr(-2), cap(-4)]]] }),

  // Delação Premiada
  ev({ id: 'arc_delacao_1', cat: 'scandal', phases: OFFICE, w: 2, once: true, neg: true,
    cond: (s) => scandalLevel(s) >= 20, vars: { pessoa: V.pessoa },
    title: 'Ex-aliado preso negocia delação', text: '{pessoa}, preso há meses, negocia acordo com a Justiça.',
    opts: [
      ['Preparar a defesa', [cred(1), chain('arc_delacao_2', 90)]],
      ['Atacar o delator', [rej(1), chain('arc_delacao_2', 90)]],
    ] }),
  ev({ id: 'arc_delacao_2', cat: 'scandal', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: 'Trechos da delação vazam', text: 'Os jornais publicam trechos do depoimento de {pessoa}.',
    opts: [
      ['Responder ponto a ponto', [esc(6), cred(1), chain('arc_delacao_3', 30)]],
      ['Chamar de mentira', [esc(10), chain('arc_delacao_3', 30)]],
    ] }),
  ev({ id: 'arc_delacao_3', cat: 'scandal', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: 'STF homologa a delação', text: 'A delação de {pessoa} foi homologada.',
    opts: [['Aguardar o processo', [esc(8), cred(-3), hist('scandal', 'Citado em delação homologada', -1, 3), chain('jus_segunda_instancia', 540, 0.4)]]] }),

  // ════════ Campanha e mídia ════════
  // O Vídeo Antigo
  ev({ id: 'arc_video_1', cat: 'media', phases: CAMP, w: 3, once: true, neg: true, cond: (s) => fameOf(s) >= 30,
    title: 'Vídeo antigo reaparece', text: 'Um vídeo de dez anos atrás, com uma fala polêmica sua, volta a circular.',
    opts: [
      ['Pedir desculpas', [rej(-1), ent(-3)]],
      ['Contextualizar', [chain('arc_video_2', 3, 0.5)]],
      ['Atacar quem vazou', [ent(3), rej(2), chain('arc_video_2', 3)]],
    ] }),
  ev({ id: 'arc_video_2', cat: 'media', phases: CAMP, w: 0, chainOnly: true, neg: true,
    title: 'O vídeo viraliza', text: 'O vídeo antigo de {playerName} tem milhões de visualizações.',
    opts: [
      ['Gravar resposta sincera', [rej(1), cred(1)]],
      ['Ignorar', [rej(2), chain('arc_video_3', 7, 0.6)]],
    ] }),
  ev({ id: 'arc_video_3', cat: 'media', phases: CAMP, w: 0, chainOnly: true, neg: true,
    title: 'Rival usa o vídeo no horário eleitoral', text: 'O vídeo antigo virou peça de propaganda adversária.',
    opts: [
      ['Pedir direito de resposta', [cash(-20_000), rej(1)]],
      ['Responder com ataque', [ent(3), rej(2), opp('leader', { rejection: 1 })]],
    ] }),

  // Deepfake
  ev({ id: 'arc_deepfake_1', cat: 'media', phases: CAMP, w: 3, once: true, neg: true, cond: (s) => daysToVote(s) <= 20,
    title: 'Áudio falso com sua voz', text: 'Um áudio feito por inteligência artificial com sua voz circula no WhatsApp.',
    opts: [
      ['Ação urgente no TSE', [cash(-50_000), chain('arc_deepfake_2', 3)]],
      ['Campanha de checagem', [con(2), rej(-1), ene(-8)]],
      ['Ignorar', [rej(3)]],
    ] }),
  ev({ id: 'arc_deepfake_2', cat: 'media', phases: CAMP, w: 0, chainOnly: true,
    title: 'Perícia confirma a montagem', text: 'O TSE mandou remover o áudio falso.',
    opts: [['Divulgar o laudo', [rej(-2), cred(2), con(1)]]] }),

  // A Pesquisa Encomendada
  ev({ id: 'arc_pesquisa_1', cat: 'politics', phases: CAMP, w: 2, once: true, neg: true,
    title: 'Instituto desconhecido mostra rival disparando', text: 'Uma pesquisa de um instituto pouco conhecido mostra o rival 15 pontos à frente.',
    opts: [
      ['Pedir impugnação ao TSE', [cash(-20_000), chain('arc_pesquisa_2', 7)]],
      ['Ignorar', [ent(-2), chain('arc_pesquisa_3', 7, 0.6)]],
    ] }),
  ev({ id: 'arc_pesquisa_2', cat: 'politics', phases: CAMP, w: 0, chainOnly: true,
    title: 'TSE vê irregularidade no instituto', text: 'O registro da pesquisa tinha falhas graves.',
    opts: [['Denunciar a manipulação', [cred(3), ent(3)]]] }),
  ev({ id: 'arc_pesquisa_3', cat: 'economy', phases: CAMP, w: 0, chainOnly: true, neg: true,
    title: 'Doadores somem', text: 'O efeito manada da pesquisa secou as doações.',
    opts: [['Apostar na militância', [cash(-50_000), mil(5)]]] }),

  // Debate Pegadinha
  ev({ id: 'arc_debate_1', cat: 'scandal', phases: CAMP, w: 2, once: true,
    cond: (s) => (s.election?.debates ?? []).some((d) => d.status === 'scheduled'),
    title: 'Perguntas do debate vazaram', text: 'Um assessor recebeu as perguntas do próximo debate.',
    opts: [
      ['Recusar e denunciar à emissora', [cred(6)]],
      ['Usar as perguntas', [chain('arc_debate_2', 10, 0.3), flag('arc_debate_usou')]],
    ] }),
  ev({ id: 'arc_debate_2', cat: 'scandal', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: 'Vazamento das perguntas vem a público', text: 'A emissora descobriu que você recebeu as perguntas.',
    opts: [['Pedir desculpas', [esc(12), rej(3)]]] }),

  // Militante Exaltado
  ev({ id: 'arc_militante_1', cat: 'crisis', phases: CAMP, w: 2, once: true, neg: true,
    cond: (s) => (s.campaign?.enthusiasm ?? 0) >= 65,
    title: 'Militante agride apoiador do rival', text: 'Um militante seu agrediu um eleitor adversário num ato.',
    opts: [
      ['Expulsar e condenar', [ent(-6), rej(-1), cred(2)]],
      ['Minimizar', [rej(3), mil(5)]],
    ] }),

  // Biografia Não Autorizada
  ev({ id: 'arc_biografia_1', cat: 'media', phases: ANY, w: 1, once: true, cond: (s) => fameOf(s) >= 50, vars: { pessoa: V.pessoa },
    title: 'Biografia não autorizada', text: 'A jornalista {pessoa} anuncia um livro sobre sua vida.',
    opts: [
      ['Dar entrevista à autora', [cred(1), chain('arc_biografia_2', 60, 0.3)]],
      ['Processar', [fame(3), rej(2)]],
      ['Ignorar', [chain('arc_biografia_2', 60)]],
    ] }),
  ev({ id: 'arc_biografia_2', cat: 'media', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: 'Capítulo sobre sua família vaza', text: 'O livro de {pessoa} expõe brigas familiares.',
    opts: [
      ['Pedir respeito à família', [rej(-1), fame(2), ene(-6)]],
      ['Atacar a autora', [rej(2), fame(3)]],
    ] }),

  // Apoio do Ídolo
  ev({ id: 'arc_idolo_1', cat: 'opportunity', phases: CAMP, w: 2, once: true, vars: { pessoa: V.pessoa },
    title: 'Cantor famoso oferece apoio', text: 'O cantor {pessoa} quer gravar um vídeo e fazer show-comício.',
    opts: [
      ['Aceitar', [con(4), mom(JOVENS, 3), chain('arc_idolo_2', 14, 0.35), ene(-6)]],
      ['Recusar', []],
    ] }),
  ev({ id: 'arc_idolo_2', cat: 'media', phases: CAMP, w: 0, chainOnly: true, neg: true,
    title: '{pessoa} faz declaração polêmica', text: 'O cantor que apoia você ofendeu um grupo nas redes.',
    opts: [
      ['Desvincular-se', [con(-1), cred(1)]],
      ['Defender o cantor', [rej(2), ent(1)]],
    ] }),

  // Hacker da Campanha
  ev({ id: 'arc_hacker_1', cat: 'crisis', phases: CAMP, w: 2, once: true, neg: true,
    title: 'Conta oficial invadida', text: 'Hackers postaram mensagens falsas no perfil da campanha.',
    opts: [
      ['Investir em segurança digital', [cash(-40_000), cred(1)]],
      ['Só recuperar a conta', [chain('arc_hacker_2', 7, 0.5)]],
    ] }),
  ev({ id: 'arc_hacker_2', cat: 'scandal', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: 'Dados de doadores vazam', text: 'A lista de doadores e CPFs foi publicada.',
    opts: [['Notificar os doadores', [esc(5), cash(-30_000)]]] }),

  // ════════ Partido e alianças ════════
  // Ala Rebelde
  ev({ id: 'arc_ala_1', cat: 'party', phases: ANY, w: 2, cd: 900, cond: (s) => partyUnity(s) < 50, vars: { pessoa: V.pessoa },
    title: 'Ala rebelde publica manifesto', text: 'A ala liderada por {pessoa} publica manifesto contra você.',
    opts: [
      ['Incorporar parte das pautas', [uni(6), ent(-2)]],
      ['Ignorar', [chain('arc_ala_2', 60)]],
    ] }),
  ev({ id: 'arc_ala_2', cat: 'party', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: '{pessoa} ameaça candidatura própria', text: 'A ala rebelde diz que terá candidato próprio.',
    opts: [
      ['Acordo com cargo para {pessoa}', [uni(8), cap(-3)]],
      ['Expulsar a ala', [uni(10), mil(-15)]],
    ] }),

  // Coligação Proibida
  ev({ id: 'arc_coligacao_1', cat: 'party', phases: CAMP, w: 2, once: true,
    title: 'Aliado improvável oferece apoio', text: 'Um partido de ideias opostas oferece tempo de TV.',
    opts: [
      ['Aceitar', [con(3), ent(-6), chain('arc_coligacao_2', 14)]],
      ['Recusar', [ent(2)]],
    ] }),
  ev({ id: 'arc_coligacao_2', cat: 'party', phases: ANY, w: 0, chainOnly: true,
    title: 'Aliado improvável exige cargo', text: 'O partido quer uma secretaria se você vencer.',
    opts: [
      ['Prometer a secretaria', [uni(-3), flag('promessa_cargo_aliado')]],
      ['Romper', [con(-2), cred(1)]],
    ] }),

  // A Janela Partidária
  ev({ id: 'arc_janela_1', cat: 'party', phases: LEG, w: 2, cd: 900,
    title: 'Colegas anunciam saída do partido', text: 'Três colegas de bancada vão mudar de partido na janela.',
    opts: [
      ['Segurar com cargos e promessas', [cap(-6), uni(4)]],
      ['Deixar sair', [uni(3), lid(3)]],
    ] }),

  // O Vice Ambicioso (prefeitos e presidentes; governadores têm versão própria)
  ev({ id: 'arc_vice_1', cat: 'politics', phases: GOV, scope: ['municipal', 'federal'], w: 2, cd: 1200, vars: { pessoa: V.vice }, mod: viceRisk,
    title: 'Vice se apresenta como "alternativa"', text: 'O vice {pessoa} dá entrevistas criticando o governo.',
    opts: [
      ['Dar ao vice uma pasta', [cap(-4), flag('vice_neutralizado')]],
      ['Isolar o vice', [chain('arc_vice_2', 90)]],
    ] }),
  ev({ id: 'arc_vice_2', cat: 'politics', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: '{pessoa} articula com a oposição', text: 'O vice foi visto em jantares com líderes da oposição.',
    opts: [
      ['Expor a conspiração', [cred(2), cap(-3)]],
      ['Reaproximar-se do vice', [cap(-5), flag('vice_neutralizado')]],
    ] }),

  // ════════ Governo e gestão ════════
  // A Greve que Cresce
  ev({ id: 'arc_greve_1', cat: 'crisis', phases: GOV, scope: SUB, w: 3, cd: 900, neg: true,
    title: 'Professores fazem assembleia', text: 'A categoria discute entrar em greve.',
    opts: [
      ['Negociar já', [gasto('education', 0.03), gi('civil_servants', 5)]],
      ['Esperar', [chain('arc_greve_2', 30)]],
    ] }),
  ev({ id: 'arc_greve_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Greve parcial', text: 'Metade das escolas parou.',
    opts: [
      ['Negociar com custo maior', [gasto('education', 0.05), gi('civil_servants', 4)]],
      ['Endurecer', [gi('civil_servants', -6), chain('arc_greve_3', 30)]],
    ] }),
  ev({ id: 'arc_greve_3', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Greve geral do funcionalismo', text: 'Saúde, educação e administração param juntas.',
    opts: [
      ['Acordo amplo', [gasto('administration', 0.06), gi('civil_servants', 6), cap(-4)]],
      ['Pedir à Justiça o corte do ponto', [gi('civil_servants', -12), radical('civil_servants', 8), apr(-3)]],
    ] }),

  // Concessão do Saneamento
  ev({ id: 'arc_saneamento_1', cat: 'politics', phases: GOV, scope: SUB, w: 2, cd: 1200,
    title: 'Proposta de concessão do saneamento', text: 'Uma empresa propõe assumir água e esgoto por 35 anos.',
    opts: [
      ['Abrir a concessão', [gi('business', 5), gi('unions', -5), chain('arc_saneamento_2', 120)]],
      ['Manter público e investir', [gasto('infrastructure', 0.06), gi('unions', 3)]],
    ] }),
  ev({ id: 'arc_saneamento_2', cat: 'politics', phases: GOV, w: 0, chainOnly: true,
    title: 'Leilão com um único interessado', text: 'Só uma empresa apareceu no leilão.',
    opts: [
      ['Fechar o contrato', [gasto('infrastructure', -0.05), chain('arc_saneamento_3', 60)]],
      ['Cancelar e refazer o edital', [cap(-3), cred(2)]],
    ] }),
  ev({ id: 'arc_saneamento_3', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Tarifa de água sobe 20%', text: 'A concessionária aplicou o reajuste previsto.',
    opts: [
      ['Criar tarifa social', [gasto('social', 0.02), sat(POBRES, 2)]],
      ['Defender o contrato', [sat(POBRES, -3), apr(-2)]],
    ] }),

  // O Viaduto
  ev({ id: 'arc_viaduto_1', cat: 'opportunity', phases: GOV, scope: MUN, w: 2, cd: 1200,
    title: 'Viaduto pronto antes da eleição', text: 'O viaduto ficou pronto seis meses antes do pleito.',
    opts: [
      ['Inaugurar logo', [apr(4), chain('arc_viaduto_2', 60, 0.35), cap(-3)]],
      ['Esperar o laudo final', [apr(1), cred(2)]],
    ] }),
  ev({ id: 'arc_viaduto_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Rachadura no viaduto novo', text: 'Uma rachadura apareceu no viaduto recém-inaugurado.',
    opts: [
      ['Interditar e responsabilizar a construtora', [apr(-3), cred(1)]],
      ['Dizer que é "normal"', [chain('arc_viaduto_3', 30, 0.5)]],
    ] }),
  ev({ id: 'arc_viaduto_3', cat: 'scandal', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Viaduto é interditado às pressas', text: 'A Defesa Civil interditou o viaduto.',
    opts: [['Assumir o erro', [apr(-6), esc(6), cred(-3)]]] }),

  // Apagão
  ev({ id: 'arc_apagao_1', cat: 'economy', phases: GOV, scope: UP, w: 2, cd: 1200, neg: true,
    title: 'Bandeira vermelha na conta de luz', text: 'Reservatórios baixos encarecem a energia.',
    opts: [
      ['Contratar térmicas caras', [shock('Energia cara', 6, { inflation: 0.3 }), apr(-1)]],
      ['Campanha de economia', [chain('arc_apagao_2', 60, 0.5)]],
    ] }),
  ev({ id: 'arc_apagao_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Apagão regional', text: 'Milhões ficaram sem luz por horas.',
    opts: [
      ['Racionamento planejado', [apr(-5), shock('Racionamento', 4, { growth: -0.4 })]],
      ['Térmicas a qualquer preço', [shock('Energia cara', 6, { inflation: 0.5 }), gasto('industry', 0.03)]],
    ] }),

  // Crise Hídrica
  ev({ id: 'arc_hidrica_1', cat: 'crisis', phases: GOV, scope: EST, w: 2, cd: 1200, neg: true,
    title: 'Pressão da água reduzida à noite', text: 'A companhia reduz a pressão para poupar os reservatórios.',
    opts: [
      ['Campanha de economia com bônus', [gasto('infrastructure', 0.01), sat(CLASSE_MEDIA, 1)]],
      ['Negar a crise', [chain('arc_hidrica_2', 60)]],
    ] }),
  ev({ id: 'arc_hidrica_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Rodízio de água', text: 'Bairros ficam dois dias sem água.',
    opts: [
      ['Obras emergenciais caras', [gasto('infrastructure', 0.06), apr(-1)]],
      ['Manter o rodízio', [apr(-4), chain('arc_hidrica_3', 60, 0.4)]],
    ] }),
  ev({ id: 'arc_hidrica_3', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Saques a caminhões-pipa', text: 'Moradores desesperados saqueiam caminhões.',
    opts: [['Gabinete de crise', [gasto('social', 0.03), apr(-2), unrest(2)]]] }),

  // Contas Rejeitadas
  ev({ id: 'arc_contas_1', cat: 'politics', phases: GOV, scope: MUN, w: 2, cd: 1200, neg: true,
    cond: (s) => (s.government?.budget?.balance ?? 0) < 0,
    title: 'TCE recomenda rejeitar suas contas', text: 'O déficit de dois anos levou o tribunal a recomendar a rejeição.',
    opts: [
      ['Articular a Câmara', [cap(-12)]],
      ['Aceitar o julgamento', [chain('arc_contas_2', 90)]],
    ] }),
  ev({ id: 'arc_contas_2', cat: 'scandal', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Câmara rejeita suas contas', text: 'Com as contas rejeitadas, você pode ficar inelegível.',
    opts: [['Recorrer à Justiça', [esc(8), cred(-3), hist('scandal', 'Contas rejeitadas pela Câmara', -1, 3), inelegivel(8)]]] }),

  // A Universidade Nova
  ev({ id: 'arc_universidade_1', cat: 'opportunity', phases: GOV, scope: UP, w: 2, cd: 1200, vars: { cidade: V.bairro },
    title: 'Cidades disputam um novo campus', text: 'Prefeitos disputam o novo campus universitário.',
    opts: [
      ['Escolher pela técnica', [cred(3), cap(-2), chain('arc_universidade_2', 365)]],
      ['Escolher uma cidade aliada', [cap(5), cred(-2), chain('arc_universidade_2', 365)]],
    ] }),
  ev({ id: 'arc_universidade_2', cat: 'opportunity', phases: GOV, w: 0, chainOnly: true,
    title: 'Campus inaugurado', text: 'O novo campus recebeu os primeiros alunos.',
    opts: [['Inaugurar', [apr(2), sat(JOVENS, 3), hist('event', 'Inaugurou um campus universitário', 1, 2)]]] }),

  // Calote do Estado
  ev({ id: 'arc_calote_1', cat: 'crisis', phases: GOV, scope: MUN, w: 2, cd: 900, neg: true,
    title: 'Estado atrasa repasses da saúde', text: 'Faltam três meses de repasses estaduais.',
    opts: [
      ['Cobrir com recursos próprios', [gasto('health', 0.03)]],
      ['Esperar', [chain('arc_calote_2', 60)]],
    ] }),
  ev({ id: 'arc_calote_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Postos de saúde fecham à tarde', text: 'Sem dinheiro, os postos reduziram o horário.',
    opts: [
      ['Liderar a frente de prefeitos', [fame(3), cap(-2), apr(1)]],
      ['Negociar sozinho com o governador', [cap(-3), gasto('health', -0.01)]],
    ] }),

  // Privatização Polêmica
  ev({ id: 'arc_privatizacao_1', cat: 'politics', phases: GOV, scope: FED, w: 2, cd: 1200,
    title: 'Venda de estatal deficitária', text: 'A equipe econômica propõe vender uma estatal que dá prejuízo.',
    opts: [
      ['Propor a venda', [gi('business', 5), gi('unions', -6), chain('arc_privatizacao_2', 180)]],
      ['Reestruturar a estatal', [cap(-5), gasto('industry', 0.02)]],
    ] }),
  ev({ id: 'arc_privatizacao_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Greve dos empregados da estatal', text: 'Os empregados param contra a venda.',
    opts: [
      ['Manter o cronograma', [gi('unions', -5), chain('arc_privatizacao_3', 60)]],
      ['Suspender a venda', [cap(-6), gi('business', -4)]],
    ] }),
  ev({ id: 'arc_privatizacao_3', cat: 'economy', phases: GOV, w: 0, chainOnly: true,
    title: 'Leilão da estatal', text: 'O leilão teve ágio e caixa extra para o governo.',
    opts: [['Usar o dinheiro para abater dívida', [gasto('administration', -0.06), shock('Privatização', 12, { confidence: 3 })]]] }),

  // ════════ Segurança e crises ════════
  // Milícia no Bairro
  ev({ id: 'arc_milicia_1', cat: 'crisis', phases: GOV, scope: SUB, w: 2, cd: 1200, neg: true, vars: { bairro: V.bairro, pessoa: V.pessoa },
    title: 'Taxa da milícia no {bairro}', text: 'Moradores do {bairro} denunciam cobrança de "segurança".',
    opts: [
      ['Pedir investigação', [cred(2), chain('arc_milicia_2', 60)]],
      ['Ignorar', [chain('arc_milicia_2', 60)]],
    ] }),
  ev({ id: 'arc_milicia_2', cat: 'scandal', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Vereador ligado à milícia pede cargo', text: 'O vereador {pessoa}, influente no {bairro}, quer uma subprefeitura.',
    opts: [
      ['Recusar e denunciar', [cred(4), cap(-4), gi('security', 3)]],
      ['Dar o cargo', [cap(4), chain('arc_milicia_3', 90, 0.6)]],
    ] }),
  ev({ id: 'arc_milicia_3', cat: 'scandal', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: '{pessoa} é preso', text: 'A polícia prendeu o vereador que você nomeou.',
    opts: [['Exonerar e se explicar', [esc(10), cred(-4)]]] }),

  // Chacina
  ev({ id: 'arc_chacina_1', cat: 'crisis', phases: GOV, scope: EST, w: 2, cd: 1200, neg: true,
    title: 'Operação policial deixa 15 mortos', text: 'Moradores e polícia dão versões opostas.',
    opts: [
      ['Afastar o comando e investigar', [gi('security', -6), gi('social_movements', 5), cred(2)]],
      ['Defender a operação', [gi('security', 6), sat(JOVENS, -3), chain('arc_chacina_2', 30, 0.5)]],
    ] }),
  ev({ id: 'arc_chacina_2', cat: 'scandal', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Laudos contradizem a polícia', text: 'Perícia indica execuções.',
    opts: [
      ['Mudar de posição e punir', [cred(1), gi('security', -4)]],
      ['Manter a versão', [esc(6), legit(-2)]],
    ] }),

  // Enchente (qualquer executivo)
  ev({ id: 'arc_enchente_1', cat: 'crisis', phases: GOV, w: 2, cd: 900, neg: true,
    title: 'Alerta máximo da Defesa Civil', text: 'Previsão de chuva extrema para os próximos dias.',
    opts: [
      ['Evacuar áreas de risco já', [gasto('social', 0.02), apr(-1), flag('evacuou_cedo')]],
      ['Esperar para ver', [chain('arc_enchente_2', 3, 0.6)]],
    ] }),
  ev({ id: 'arc_enchente_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Cheia histórica', text: 'A água invadiu bairros que não foram evacuados. Há vítimas.',
    opts: [
      ['Assumir o comando no local', [gasto('social', 0.05), apr(-4), chain('arc_enchente_3', 30)]],
      ['Culpar a previsão do tempo', [apr(-10), cred(-4)]],
    ] }),
  ev({ id: 'arc_enchente_3', cat: 'politics', phases: GOV, w: 0, chainOnly: true,
    title: 'Reconstrução', text: 'Agora é reconstruir casas, pontes e escolas.',
    opts: [
      ['Plano de reconstrução com prazo', [gasto('infrastructure', 0.05), apr(3)]],
      ['Reconstruir aos poucos', [gasto('infrastructure', 0.02)]],
    ] }),

  // Epidemia
  ev({ id: 'arc_epidemia_1', cat: 'crisis', phases: GOV, scope: FED, w: 1, cd: 1500, neg: true,
    title: 'Surto respiratório no exterior', text: 'Um novo vírus se espalha em outros países.',
    opts: [
      ['Controle sanitário nas fronteiras', [shock('Controles sanitários', 3, { growth: -0.2 }), cred(2)]],
      ['Esperar', [chain('arc_epidemia_2', 30)]],
    ] }),
  ev({ id: 'arc_epidemia_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Primeiros casos no Brasil', text: 'O vírus chegou e os casos dobram a cada semana.',
    opts: [
      ['Medidas restritivas e hospitais de campanha', [gasto('health', 0.08), shock('Restrições', 4, { growth: -0.6 })]],
      ['Manter tudo aberto', [chain('arc_epidemia_3', 30)]],
    ] }),
  ev({ id: 'arc_epidemia_3', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Pico da epidemia', text: 'Hospitais lotados e mortes em alta.',
    opts: [['Gabinete de crise', [gasto('health', 0.1), apr(-8), sat(IDOSOS, -4)]]] }),

  // Ataque Hacker ao Governo
  ev({ id: 'arc_hacker_gov_1', cat: 'crisis', phases: GOV, scope: UP, w: 2, cd: 1200, neg: true,
    title: 'Sistemas do governo fora do ar', text: 'Um ataque hacker derrubou o sistema da saúde.',
    opts: [
      ['Equipe de emergência', [gasto('administration', 0.01), chain('arc_hacker_gov_2', 7)]],
      ['Minimizar', [chain('arc_hacker_gov_2', 7)]],
    ] }),
  ev({ id: 'arc_hacker_gov_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Hackers pedem resgate', text: 'Os criminosos pedem criptomoedas para devolver os dados.',
    opts: [
      ['Não pagar e reconstruir', [apr(-2), gasto('administration', 0.02), cred(2)]],
      ['Pagar discretamente', [esc(8)]],
    ] }),

  // ════════ Justiça e instituições ════════
  // STF Derruba Lei
  ev({ id: 'arc_stf_lei_1', cat: 'politics', phases: GOV, w: 2, cd: 900,
    cond: (s) => s.laws.bills.some((b) => b.status === 'passed'),
    title: 'Lei sua é questionada no STF', text: 'Uma ação de inconstitucionalidade contesta uma lei do seu governo.',
    opts: [
      ['Defender a lei no tribunal', [cap(-2), chain('arc_stf_lei_2', 120)]],
      ['Negociar ajustes', [cap(-4), cred(1)]],
    ] }),
  ev({ id: 'arc_stf_lei_2', cat: 'politics', phases: GOV, w: 0, chainOnly: true,
    title: 'Plenário julga a lei', text: 'O STF decidiu sobre a lei do seu governo.',
    opts: [
      ['Comemorar a manutenção', [cap(6), apr(1)]],
      ['Acatar a derrubada', [cap(-6), legit(1)]],
    ] }),

  // Mandado na Madrugada
  ev({ id: 'arc_mandado_1', cat: 'scandal', phases: OFFICE, w: 2, cd: 900, neg: true, cond: (s) => scandalLevel(s) >= 8, vars: { pessoa: V.pessoa },
    title: 'PF na casa de aliado', text: 'A Polícia Federal cumpre mandado na casa de {pessoa}, seu aliado.',
    opts: [
      ['Defender o aliado', [esc(4), uni(2)]],
      ['"Confio na Justiça"', [chain('arc_mandado_2', 7, 0.5)]],
      ['Romper com o aliado', [uni(-4), cred(2)]],
    ] }),
  ev({ id: 'arc_mandado_2', cat: 'scandal', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: '{pessoa} é preso preventivamente', text: 'As imagens da prisão estão em todos os jornais.',
    opts: [['Manter distância', [esc(3), cred(-1)]]] }),

  // Juiz Midiático
  ev({ id: 'arc_juiz_1', cat: 'scandal', phases: OFFICE, w: 1, cd: 1200, cond: (s) => scandalLevel(s) >= 12, vars: { pessoa: V.pessoa },
    title: 'Juiz dá entrevistas sobre seu caso', text: 'O juiz {pessoa} comenta a investigação na TV.',
    opts: [
      ['Pedir a suspeição do juiz', [cred(1), chain('arc_juiz_2', 120)]],
      ['Entrar no jogo da mídia', [fame(2), rej(2), chain('arc_juiz_2', 120)]],
    ] }),
  ev({ id: 'arc_juiz_2', cat: 'politics', phases: ANY, w: 0, chainOnly: true,
    title: 'Juiz {pessoa} anuncia candidatura', text: 'O juiz deixa a toga e entra na política.',
    opts: [['Apontar a motivação política', [esc(-4), cred(2)]]] }),

  // Plebiscito
  ev({ id: 'arc_plebiscito_1', cat: 'politics', phases: GOV, scope: UP, w: 1, cd: 1500,
    title: 'Proposta de plebiscito', text: 'Um tema que divide o eleitorado pode ir a consulta popular.',
    opts: [
      ['Convocar o plebiscito', [cap(-4), chain('arc_plebiscito_2', 120)]],
      ['Decidir no Legislativo', [cap(-2)]],
    ] }),
  ev({ id: 'arc_plebiscito_2', cat: 'politics', phases: GOV, w: 0, chainOnly: true,
    title: 'Resultado do plebiscito', text: 'A população votou.',
    opts: [
      ['Sua posição venceu', [cap(15), legit(3), cap(-3)]],
      ['Sua posição perdeu — acatar', [cap(-10), legit(4), cred(2)]],
    ] }),

  // ════════ Economia e empresas ════════
  // A Fábrica Vai Embora
  ev({ id: 'arc_fabrica_1', cat: 'economy', phases: GOV, scope: SUB, w: 2, cd: 1200, neg: true, vars: { empresa: V.empresa },
    title: '{empresa} ameaça ir embora', text: 'A {empresa} diz que vai mudar a fábrica para outro estado.',
    opts: [
      ['Negociar já', [cap(-2), chain('arc_fabrica_2', 60)]],
      ['Pagar para ver', [chain('arc_fabrica_2', 60)]],
    ] }),
  ev({ id: 'arc_fabrica_2', cat: 'economy', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Estado vizinho cobre a oferta', text: 'O vizinho ofereceu terreno e 15 anos sem impostos à {empresa}.',
    opts: [
      ['Igualar o incentivo', [gasto('industry', 0.04), gi('industry', 5), sat(OPERARIOS, 2)]],
      ['Deixar ir', [sat(OPERARIOS, -4), gi('unions', -4), apr(-2)]],
    ] }),

  // Frigorífico Fechado
  ev({ id: 'arc_frigorifico_1', cat: 'economy', phases: GOV, scope: SUB, w: 2, cd: 1200, neg: true, regions: ['centro_oeste', 'sul', 'norte'],
    title: 'Mercado externo suspende compra de carne', text: 'O frigorífico da região deu férias coletivas.',
    opts: [
      ['Missão comercial', [cap(-2), chain('arc_frigorifico_2', 60, 0.4)]],
      ['Auxílio aos trabalhadores', [gasto('social', 0.02), chain('arc_frigorifico_2', 60, 0.6)]],
    ] }),
  ev({ id: 'arc_frigorifico_2', cat: 'economy', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Frigorífico demite', text: 'Mil trabalhadores foram demitidos.',
    opts: [['Programa de recolocação', [gasto('social', 0.02), sat(OPERARIOS, -2)]]] }),

  // Bolha Imobiliária
  ev({ id: 'arc_aluguel_1', cat: 'economy', phases: GOV, scope: MUN, w: 2, cd: 1200, neg: true,
    title: 'Aluguéis sobem 30%', text: 'Famílias de baixa renda não conseguem pagar o aluguel.',
    opts: [
      ['Programa de moradia popular', [gasto('social', 0.05), sat(POBRES, 3)]],
      ['Esperar o mercado', [chain('arc_aluguel_2', 120)]],
    ] }),
  ev({ id: 'arc_aluguel_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Despejos e ocupações', text: 'Despejadas, famílias ocupam prédios vazios.',
    opts: [
      ['Negociar com os movimentos', [gi('social_movements', 4), gi('business', -3)]],
      ['Reintegração de posse', [gi('social_movements', -6), unrest(2)]],
    ] }),

  // Startup Unicórnio
  ev({ id: 'arc_startup_1', cat: 'opportunity', phases: GOV, scope: MUN, w: 2, cd: 1500, vars: { empresa: V.empresa },
    title: 'Startup local vale US$ 1 bilhão', text: 'A {empresa}, nascida na universidade local, virou unicórnio.',
    opts: [
      ['Homenagem e parceria', [gi('tech', 4), apr(1), chain('arc_startup_2', 180, 0.5), cap(-3)]],
      ['Seguir normalmente', [chain('arc_startup_2', 180, 0.7)]],
    ] }),
  ev({ id: 'arc_startup_2', cat: 'economy', phases: GOV, w: 0, chainOnly: true,
    title: '{empresa} ameaça mudar a sede', text: 'A empresa recebeu proposta para ir para a capital paulista.',
    opts: [
      ['Parque tecnológico e isenção de ISS', [gasto('science', 0.02), gi('tech', 6), sat(JOVENS, 2)]],
      ['Deixar ir', [gi('tech', -5)]],
    ] }),

  // Calote do Fornecedor
  ev({ id: 'arc_construtora_1', cat: 'crisis', phases: GOV, scope: SUB, w: 2, cd: 1200, neg: true, vars: { obra: V.obra, empresa: V.empresa },
    title: 'Construtora pede recuperação judicial', text: 'A {empresa}, responsável por {obra}, quebrou.',
    opts: [
      ['Assumir a obra com equipe própria', [gasto('infrastructure', 0.04), apr(1)]],
      ['Esperar nova licitação', [chain('arc_construtora_2', 180)]],
    ] }),
  ev({ id: 'arc_construtora_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: '{obra} completa seis meses parada', text: 'Moradores fazem protesto na obra abandonada.',
    opts: [['Nova licitação emergencial', [gasto('infrastructure', 0.03), apr(-2)]]] }),

  // Commodity em Alta
  ev({ id: 'arc_commodity_1', cat: 'economy', phases: GOV, scope: EST, w: 2, cd: 1500, regions: ['centro_oeste', 'norte', 'sudeste'],
    title: 'Receita dispara com as commodities', text: 'O preço internacional da principal exportação do estado subiu muito.',
    opts: [
      ['Poupar num fundo', [cred(3), flag('fundo_commodity'), chain('arc_commodity_2', 365), cap(-3)]],
      ['Gastar em obras e salários', [gasto('infrastructure', -0.06), apr(3), chain('arc_commodity_2', 365), cap(-3)]],
    ] }),
  ev({ id: 'arc_commodity_2', cat: 'economy', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Preço da commodity despenca', text: 'A receita extra sumiu de uma vez.',
    opts: [['Ajustar as contas', [shock('Fim do boom', 8, { growth: -0.4 }), apr(-2)]]] }),

  // Porto Privado
  ev({ id: 'arc_porto_1', cat: 'politics', phases: GOV, scope: SUB, w: 2, cd: 1500, vars: { empresa: V.empresa },
    title: 'Porto em área de mangue', text: 'O grupo {empresa} propõe um porto privado sobre um manguezal.',
    opts: [
      ['Aprovar', [gi('business', 5), gi('environmental', -8), chain('arc_porto_2', 180, 0.6)]],
      ['Negar', [gi('environmental', 6), gi('business', -4)]],
    ] }),
  ev({ id: 'arc_porto_2', cat: 'crisis', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Protestos contra o porto', text: 'Pescadores e ambientalistas ocupam a área.',
    opts: [
      ['Exigir compensações', [gi('environmental', 3), cap(-2)]],
      ['Manter a licença', [unrest(2), gi('environmental', -3)]],
    ] }),

  // ════════ Pessoal e família ════════
  // Problema de Saúde
  ev({ id: 'arc_saude_1', cat: 'crisis', phases: ANY, w: 1, once: true, cond: (s) => ageOf(s) >= 60,
    title: 'Exame preocupante', text: 'Um exame de rotina mostrou algo que exige cirurgia.',
    opts: [
      ['Tornar público', [con(2), rej(-1), chain('arc_saude_2', 30), ene(-6)]],
      ['Esconder', [chain('arc_saude_2', 30), flag('saude_escondida')]],
    ] }),
  ev({ id: 'arc_saude_2', cat: 'crisis', phases: ANY, w: 0, chainOnly: true,
    title: 'Cirurgia bem-sucedida', text: 'Os médicos dizem que você se recupera em semanas.',
    opts: [['Voltar ao trabalho aos poucos', [ene(-20), fame(1), apr(1)]]] }),

  // Casamento em Crise
  ev({ id: 'arc_casamento_1', cat: 'media', phases: ANY, w: 1, once: true, cond: (s) => fameOf(s) >= 40,
    title: 'Boatos de separação', text: 'Colunistas falam em crise no seu casamento.',
    opts: [
      ['Nota pública pedindo privacidade', [cred(1)]],
      ['Silêncio', [chain('arc_casamento_2', 60, 0.5)]],
    ] }),
  ev({ id: 'arc_casamento_2', cat: 'media', phases: ANY, w: 0, chainOnly: true,
    title: 'Foto em revista de fofoca', text: 'A revista estampa sua foto saindo de casa com malas.',
    opts: [['Confirmar com serenidade', [fame(2), rej(-1)]]] }),

  // Ameaça de Morte
  ev({ id: 'arc_ameaca_1', cat: 'crisis', phases: OFFICE, w: 1, cd: 1200,
    cond: (s) => (s.events.firedCount.arc_milicia_2 ?? 0) + (s.events.firedCount.est_faccao_onibus ?? 0) > 0,
    title: 'Ameaça de morte', text: 'Você recebeu ameaças anônimas após enfrentar o crime organizado.',
    opts: [
      ['Aceitar escolta', [cred(2), apr(1), cap(-3)]],
      ['Recusar a escolta', [fame(2), chain('arc_ameaca_2', 30, 0.2)]],
    ] }),
  ev({ id: 'arc_ameaca_2', cat: 'crisis', phases: OFFICE, w: 0, chainOnly: true, neg: true,
    title: 'Tentativa de ataque frustrada', text: 'Seguranças impediram um ataque contra você.',
    opts: [['Pedir proteção e seguir firme', [apr(4), fame(4), cred(2)]]] }),

  // Atentado
  ev({ id: 'arc_atentado_1', cat: 'crisis', phases: CAMP, w: 1, once: true, neg: true, cond: (s) => s.nation.unrest > 45,
    title: 'Agressão em comício', text: 'Um homem atacou você no meio da multidão.',
    opts: [
      ['Pedir paz e união', [con(8), rej(-2), ene(-30), mom('all', 2)]],
      ['Acusar os adversários', [con(8), ent(6), rej(2), ene(-30), unrest(3)]],
    ] }),

  // Amigo de Infância
  ev({ id: 'arc_amigo_1', cat: 'politics', phases: GOV, scope: MUN, w: 2, cd: 1500, vars: { pessoa: V.pessoa },
    title: 'Amigo de infância pede emprego', text: '{pessoa}, amigo de infância, pede um cargo na prefeitura.',
    opts: [
      ['Nomear', [esc(2), chain('arc_amigo_2', 30, 0.6)]],
      ['Negar com carinho', [cred(1)]],
    ] }),
  ev({ id: 'arc_amigo_2', cat: 'media', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: '{pessoa} é incompetente', text: 'O amigo nomeado virou piada entre os servidores.',
    opts: [
      ['Exonerar', [cred(1)]],
      ['Manter', [apr(-1), esc(2)]],
    ] }),

  // Diploma
  ev({ id: 'arc_diploma_1', cat: 'media', phases: CAMP, w: 2, once: true,
    title: 'Rival questiona seu diploma', text: 'Um adversário diz que seu diploma não existe.',
    opts: [
      ['Mostrar o diploma', [cred(2), opp('leader', { rejection: 1 }), ene(-6)]],
      ['"Foi um engano no currículo"', [esc(6), rej(2)]],
    ] }),

  // Viagem de Férias
  ev({ id: 'arc_ferias_1', cat: 'media', phases: GOV, w: 2, once: true, neg: true,
    cond: (s) => s.events.pending.some((p) => p.category === 'crisis') || approvalOf(s) < 40,
    title: 'Foto sua na praia em plena crise', text: 'Uma foto sua de férias viralizou enquanto a população sofre.',
    opts: [
      ['Voltar e assumir o erro', [apr(-2), cred(1)]],
      ['Justificar o descanso', [apr(-6)]],
    ] }),

  // ════════ Convenção partidária ════════
  ev({ id: 'arc_convencao_1', cat: 'party', phases: CAMP, w: 6, once: true, vars: { pessoa: V.pessoa },
    cond: (s) => {
      const party = s.parties[s.candidates[s.playerId]?.partyId ?? ''];
      const started = s.election ? (Date.parse(s.date) - Date.parse(s.election.roundStartDate)) / 864e5 : 99;
      return !!party && (party.popularity + party.influence) / 2 >= 45 && started <= 10 && s.election?.round === 1;
    },
    title: 'Rival interno quer a vaga', text: '{pessoa}, nome forte do partido, quer disputar a candidatura na convenção.',
    opts: [
      ['Negociar: cargo ou vice para {pessoa}', [uni(4), cred(-1), flag('acordo_convencao')]],
      ['Disputar no voto dos delegados', [uni(-6), fame(2), ene(-8), chain('arc_convencao_racha', 7, 0.35)]],
    ] }),
  ev({ id: 'arc_convencao_racha', cat: 'party', phases: CAMP, w: 0, chainOnly: true, neg: true,
    title: '{pessoa} ameaça apoiar o adversário', text: 'Derrotado na convenção, o rival interno leva a ala dele para longe da sua campanha.',
    opts: [
      ['Reconciliação com espaço na campanha', [uni(3), cash(-50_000)]],
      ['Seguir sem ele', [mil(-10), uni(-4)]],
    ] }),

  // ════════ Nêmesis (rival recorrente) ════════
  ev({ id: 'arc_nemesis_volta', cat: 'politics', phases: CAMP, w: 6, once: true, ctx: ['opponent'], nemesis: true,
    title: '{opponentName} de novo', text: 'O rival de sempre está na disputa e promete revanche. A imprensa adora o reencontro.',
    opts: [
      ['Provocar na TV: "de novo vai perder"', [ent(5), rej(1), opp('context', { rejection: 2 }), ene(-5)]],
      ['Ignorar e falar de propostas', [cred(2), con(-1)]],
    ] }),
  ev({ id: 'arc_nemesis_dossie', cat: 'scandal', phases: CAMP, w: 4, cd: 30, neg: true, ctx: ['opponent'], nemesis: true,
    title: '{opponentName} prepara um dossiê', text: 'Fontes dizem que o rival encomendou um dossiê sobre o seu passado.',
    opts: [
      ['Antecipar-se e abrir tudo', [cred(2), rej(1), ene(-6)]],
      ['Esperar para ver', [chain('arc_nemesis_dossie_vaza', 7, 0.6)]],
    ] }),
  ev({ id: 'arc_nemesis_dossie_vaza', cat: 'scandal', phases: CAMP, w: 0, chainOnly: true, neg: true,
    title: 'Dossiê do rival chega à imprensa', text: 'O dossiê revela episódios constrangedores do seu passado.',
    opts: [
      ['Desmentir ponto a ponto', [esc(3), cash(-30_000)]],
      ['Contra-atacar com o passado dele', [esc(5), rej(2), opp('context', { rejection: 3 })]],
    ] }),
  ev({ id: 'arc_nemesis_debate', cat: 'media', phases: CAMP, w: 5, once: true, ctx: ['opponent'], nemesis: true,
    cond: (s) => daysToVote(s) <= 12,
    title: 'Debate só entre vocês dois', text: 'Uma emissora propõe um debate exclusivo com {opponentName}: o duelo que todos querem ver.',
    opts: [
      ['Aceitar o duelo', [con(4), opp('context', { knowledge: 3 }), chain('arc_nemesis_duelo', 3), ene(-6)]],
      ['Recusar', [rej(1), ent(-2)]],
    ] }),
  ev({ id: 'arc_nemesis_duelo', cat: 'media', phases: CAMP, w: 0, chainOnly: true,
    title: 'O duelo', text: 'Uma hora de debate com {opponentName}. Quem vencer leva a narrativa da reta final.',
    opts: [
      ['Calma e números', [cred(3), mom('all', 1.5), opp('context', { popMomentum: -1 }), ene(-6)]],
      ['Bater duro', [ent(5), rej(1), opp('context', { rejection: 3, popMomentum: -1 })]],
    ] }),
  ev({ id: 'arc_nemesis_governo', cat: 'politics', phases: OFFICE, w: 3, cd: 400,
    cond: (s) => !!nemesisOf(s), vars: { rival: (_rng, s) => nemesisOf(s)?.candidate.ballotName ?? 'um velho rival' },
    title: '{rival} ataca o seu mandato', text: 'O rival de sempre usa cada deslize seu para se cacifar para a próxima eleição.',
    opts: [
      ['Responder à altura', [apr(1), cred(-1), cap(-2)]],
      ['Ignorar e mostrar resultados', [cred(1)]],
    ] }),

  // ════════ Rivais e personagens ════════
  // Jornalista Obstinado
  ev({ id: 'arc_jornalista_1', cat: 'media', phases: GOV, w: 2, cd: 1500, cond: (s) => scandalLevel(s) >= 6, vars: { pessoa: V.pessoa },
    title: 'Repórter faz pedidos pela Lei de Acesso', text: 'A repórter {pessoa} pede dados de contratos do governo.',
    opts: [
      ['Transparência total', [cred(3), chain('arc_jornalista_2', 90, 0.3)]],
      ['Negar os dados', [esc(4), chain('arc_jornalista_2', 90)]],
    ] }),
  ev({ id: 'arc_jornalista_2', cat: 'media', phases: GOV, w: 0, chainOnly: true, neg: true,
    title: 'Série de reportagens de {pessoa}', text: 'A série expõe falhas em contratos do governo.',
    opts: [
      ['Corrigir os contratos', [cred(2), cap(-2)]],
      ['Atacar a repórter', [esc(6), rej(1), chain('arc_jornalista_3', 120)]],
    ] }),
  ev({ id: 'arc_jornalista_3', cat: 'media', phases: ANY, w: 0, chainOnly: true, neg: true,
    title: 'Série ganha prêmio de jornalismo', text: 'A reportagem de {pessoa} ganhou o principal prêmio do país.',
    opts: [['Reconhecer o trabalho', [cred(1), esc(2)]]] }),

  // A Velha Raposa
  ev({ id: 'arc_raposa_1', cat: 'politics', phases: LEG, w: 2, cd: 1200, vars: { pessoa: V.pessoa },
    title: 'Presidente da Casa engaveta seu projeto', text: 'O veterano {pessoa} segura seu principal projeto.',
    opts: [
      ['Esperar', [chain('arc_raposa_2', 90)]],
      ['Denunciar na imprensa', [fame(2), cap(-4)]],
    ] }),
  ev({ id: 'arc_raposa_2', cat: 'politics', phases: LEG, w: 0, chainOnly: true,
    title: '{pessoa} propõe uma troca', text: 'Seu projeto anda se você votar no projeto dele.',
    opts: [
      ['Aceitar a troca', [cap(6), cred(-2), hist('event', 'Aprovou projeto após acordo com a Mesa', 1, 2)]],
      ['Recusar', [cred(2), cap(-3)]],
    ] }),

  // O Empresário Candidato
  ev({ id: 'arc_empresario_1', cat: 'politics', phases: CAMP, w: 2, once: true, ctx: ['opponent'],
    title: '{opponentName} anuncia gastos recorde', text: 'O rival milionário comprou espaço em todos os veículos.',
    opts: [
      ['Campanha de rua com a militância', [mil(8), ene(-10), mom(POBRES, 1.5)]],
      ['Denunciar abuso econômico', [cred(1), opp('context', { rejection: 2 }), ene(-6)]],
    ] }),

  // O Coach
  ev({ id: 'arc_coach_1', cat: 'politics', phases: CAMP, w: 2, once: true, vars: { pessoa: V.pessoa },
    title: 'Coach cresce com lives', text: 'O coach {pessoa} entrou na disputa e cresce entre jovens.',
    opts: [
      ['Atacar o coach', [ent(3), rej(1), chain('arc_coach_2', 14, 0.5)]],
      ['Ignorar', [chain('arc_coach_2', 14, 0.5)]],
    ] }),
  ev({ id: 'arc_coach_2', cat: 'politics', phases: CAMP, w: 0, chainOnly: true,
    title: '{pessoa} é processado por estelionato', text: 'Ex-alunos acusam o coach de golpe.',
    opts: [['Comentar com moderação', [mom(JOVENS, 2), cred(1)]]] }),

  // O General
  ev({ id: 'arc_general_1', cat: 'politics', phases: CAMP, w: 2, once: true, vars: { pessoa: V.pessoa },
    title: 'General da reserva entra na disputa', text: 'O general {pessoa} defende "ordem acima de tudo".',
    opts: [
      ['Disputar o voto da segurança', [foco('security', 8), gi('security', 3), ene(-6)]],
      ['Defender as instituições', [cred(3), legit(1), ene(-6)]],
    ] }),

  // A Pastora
  ev({ id: 'arc_pastora_1', cat: 'politics', phases: CAMP, w: 2, once: true, neg: true, vars: { pessoa: V.pessoa },
    title: 'Pastora declara apoio ao rival', text: 'A pastora {pessoa}, com milhões de seguidores, apoia seu adversário.',
    opts: [
      ['Buscar outras lideranças religiosas', [gi('religious', 3), ene(-8)]],
      ['Denunciar abuso de poder religioso', [cred(1), gi('religious', -4)]],
    ] }),
];

