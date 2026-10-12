/**
 * Pacote de eventos de campanha.
 * Fonte das ideias: docs/BANCO_DE_CONTEUDO.md, seção 3.
 */
import { OFFICES } from '../../election/offices';
import type { GameState } from '../../simulation/state';
import { partyUnity, playerIsLeading, playerPollShare, scandalLevel } from '../conditions';
import {
  caixa2, CAMP, CAMPO, cash, chain, CLASSE_MEDIA, COMERCIO, con, cred, ene, ent, esc, ev, fame, flag, foco, gi,
  IDOSOS, JOVENS, mil, modifier, mom, MUN, opp, OPERARIOS, POBRES, prep, pres, rej, regm, type EvInput, uni, V,
} from '../dsl';
import type { EventDefinition } from '../types';

/** Evento de campanha. */
const c = (i: Omit<EvInput, 'phases'>): EventDefinition => ev({ ...i, phases: CAMP });

const month = (s: GameState): number => Number(s.date.slice(5, 7));
const day = (s: GameState): number => Number(s.date.slice(8, 10));
const proportional = (s: GameState): boolean =>
  !!s.election && OFFICES[s.election.officeId].system !== 'majoritarian';
const majoritarian = (s: GameState): boolean => !!s.election && !proportional(s);
const fameOf = (s: GameState): number => s.candidates[s.playerId]?.fame ?? 0;
const cashShare = (s: GameState): number => {
  const camp = s.campaign;
  return camp ? camp.money / Math.max(1, 1_000_000 * camp.moneyScale) : 0;
};

export const CAMPAIGN_EVENTS: EventDefinition[] = [
  // ─── Rua e corpo a corpo ───
  c({ id: 'camp_comicio_vazio', cat: 'media', w: 4, cd: 20, ctx: ['unit'], neg: true,
    title: 'Comício esvaziado em {unitName}', text: 'Meia dúzia de pessoas apareceu. A imprensa fotografou as cadeiras vazias.',
    opts: [
      ['Discursar mesmo assim', [con(2, 'context'), ent(-3)]],
      ['Cancelar e culpar o tempo', [cred(-2)]],
      ['Virar uma conversa na praça', [pres(8), ene(-10)]],
    ] }),
  c({ id: 'camp_chuva_comicio', cat: 'media', w: 3, cd: 25, ctx: ['unit'],
    title: 'Temporal no comício', text: 'Uma chuva forte caiu bem na hora do seu discurso em {unitName}.',
    opts: [
      ['Discursar na chuva', [ent(6), con(3, 'context'), chain('camp_chuva_viral', 2, 0.3), ene(-6)]],
      ['Adiar o comício', [cash(-20_000)]],
    ] }),
  c({ id: 'camp_chuva_viral', cat: 'media', w: 0, chainOnly: true,
    title: 'Discurso na chuva viraliza', text: 'O vídeo de {playerName} encharcado e discursando virou símbolo da campanha.',
    opts: [['Aproveitar o momento', [con(5), mom('all', 2), ent(4)]]] }),
  c({ id: 'camp_carreata_travada', cat: 'media', w: 3, cd: 25, ctx: ['unit'],
    title: 'Carreata trava o trânsito', text: 'Motoristas buzinam irritados com sua carreata em {unitName}.',
    opts: [
      ['Desviar para os bairros', [pres(6), ene(-5)]],
      ['Seguir o trajeto', [rej(1), mom(CLASSE_MEDIA, -1)]],
    ] }),
  c({ id: 'camp_pastel_feira', cat: 'opportunity', w: 4, cd: 20,
    title: 'Pastel na feira', text: 'Feirantes oferecem pastel e caldo de cana.',
    opts: [
      ['Comer e conversar com calma', [mom(['merchants'], 3.5), ene(-5)]],
      ['Foto rápida e seguir', [con(2)]],
    ] }),
  c({ id: 'camp_morador_desabafa', cat: 'opportunity', w: 4, cd: 20, ctx: ['unit'],
    title: 'Morador desabafa', text: 'Num bairro pobre de {unitName}, um morador para você e conta a sua história.',
    opts: [
      ['Ouvir por 20 minutos', [mom(['unemployed'], 4.5), ene(-8), pres(4)]],
      ['Prometer resolver', [mom(['unemployed'], 2.5), cred(-1)]],
    ] }),
  c({ id: 'camp_crianca_colo', cat: 'opportunity', w: 3, cd: 25,
    title: 'Criança no colo', text: 'Uma mãe pede uma foto sua com o bebê.',
    opts: [
      ['Tirar a foto', [con(3)]],
      ['Evitar', []],
    ] }),
  c({ id: 'camp_estadio', cat: 'media', w: 3, cd: 30,
    title: 'Visita ao estádio', text: 'Você foi convidado para ver um clássico local.',
    opts: [
      ['Ir e acenar para a torcida', [con(4), rej(1), chain('camp_vaias', 1, 0.4)]],
      ['Não ir', []],
    ] }),
  c({ id: 'camp_vaias', cat: 'media', w: 0, chainOnly: true, neg: true,
    title: 'Vaias no estádio', text: 'A torcida vaiou {playerName} no telão.',
    opts: [
      ['Acenar sorrindo', [rej(1), con(2)]],
      ['Sair antes do fim', [ent(-2)]],
    ] }),
  c({ id: 'camp_benzedeira', cat: 'opportunity', w: 2, cd: 40,
    title: 'Benzedeira oferece bênção', text: 'No interior, uma benzedeira respeitada oferece uma bênção.',
    opts: [
      ['Aceitar a bênção', [mom(IDOSOS, 3.5)]],
      ['Recusar educadamente', []],
    ] }),
  c({ id: 'camp_motoboys', cat: 'opportunity', w: 3, cd: 30,
    title: 'Encontro com entregadores', text: 'Motoboys e entregadores de aplicativo querem falar com você.',
    opts: [
      ['Reunião com eles', [mom(['workers'], 4.5), foco('jobs', 5), ene(-5)]],
      ['Mandar um assessor', [mom(['workers'], 1.5)]],
    ] }),
  c({ id: 'camp_pneu_furado', cat: 'media', w: 2, cd: 40,
    title: 'Pneu furado na estrada', text: 'O carro da caravana furou o pneu no meio do nada.',
    opts: [
      ['Trocar você mesmo e filmar', [con(3), chain('camp_pneu_viral', 2, 0.2)]],
      ['Esperar o socorro', [ene(-5)]],
    ] }),
  c({ id: 'camp_pneu_viral', cat: 'media', w: 0, chainOnly: true,
    title: 'Vídeo do pneu viraliza', text: '"Gente como a gente": o vídeo de {playerName} trocando o pneu tem milhões de visualizações.',
    opts: [['Agradecer', [con(5), mom(POBRES, 2)]]] }),
  c({ id: 'camp_caramelo', cat: 'media', w: 2, cd: 60,
    title: 'Vira-lata caramelo segue a caravana', text: 'Um cachorro caramelo adotou a sua equipe.',
    opts: [
      ['Adotar o cachorro na frente das câmeras', [con(4), ent(2), ene(-6)]],
      ['Entregar a uma ONG', [cred(1), ene(-6)]],
    ] }),
  c({ id: 'camp_mercado_municipal', cat: 'opportunity', w: 3, cd: 30, scope: MUN,
    title: 'Café no mercado municipal', text: 'Os comerciantes do mercado convidam para um café.',
    opts: [
      ['Café com os comerciantes', [gi('commerce', 5), mom(['merchants'], 2.5), ene(-6)]],
      ['Discurso rápido', [con(2), ene(-6)]],
    ] }),
  c({ id: 'camp_portao_fabrica', cat: 'opportunity', w: 3, cd: 30,
    title: 'Sindicato fecha o portão', text: 'O sindicato não deixou você entrar na fábrica.',
    opts: [
      ['Falar no portão, na troca de turno', [mom(OPERARIOS, 2.5), gi('unions', -3)]],
      ['Ir embora', []],
    ] }),
  c({ id: 'camp_escola_abandonada', cat: 'opportunity', w: 3, cd: 30,
    title: 'Escola abandonada', text: 'Na caminhada você encontra uma escola com o telhado caindo.',
    opts: [
      ['Denunciar o abandono', [foco('education', 8), opp('leader', { rejection: 1 }), ene(-6)]],
      ['Seguir em silêncio', []],
    ] }),
  c({ id: 'camp_onibus_lotado', cat: 'media', w: 3, cd: 30,
    title: 'Ônibus lotado na hora do rush', text: 'A equipe sugere andar de ônibus e filmar.',
    opts: [
      ['Pegar o ônibus', [con(4), mom(['workers'], 2.5), chain('camp_onibus_forcado', 2, 0.15), ene(-6)]],
      ['Não fazer', []],
    ] }),
  c({ id: 'camp_onibus_forcado', cat: 'media', w: 0, chainOnly: true, neg: true,
    title: '"Teatro no ônibus", dizem as redes', text: 'Internautas acharam a cena forçada.',
    opts: [['Rir de si mesmo', [rej(1)]]] }),
  c({ id: 'camp_ribeirinhos', cat: 'opportunity', w: 3, cd: 40, regions: ['norte'],
    title: 'Comunidades ribeirinhas', text: 'Lideranças de comunidades ribeirinhas convidam para uma visita de barco.',
    opts: [
      ['Viagem de barco de dois dias', [pres(12, 'random'), ene(-25), mom(POBRES, 2.5)]],
      ['Live com as lideranças', [pres(5, 'random')]],
    ] }),
  c({ id: 'camp_assentamento', cat: 'opportunity', w: 2, cd: 40,
    title: 'Convite de um assentamento', text: 'Agricultores de um assentamento querem ouvir suas propostas.',
    opts: [
      ['Visitar', [mom(CAMPO, 4.5), gi('agribusiness', -3), gi('social_movements', 3)]],
      ['Não ir', []],
    ] }),
  c({ id: 'camp_universidade', cat: 'opportunity', w: 3, cd: 30,
    title: 'Debate na universidade', text: 'O centro acadêmico convida para um debate aberto.',
    opts: [
      ['Debate aberto', [mom(['students'], 5.5), chain('camp_vaia_universidade', 1, 0.25), ene(-6)]],
      ['Palestra fechada', [mom(['students'], 2.5), ene(-6)]],
    ] }),
  c({ id: 'camp_vaia_universidade', cat: 'media', w: 0, chainOnly: true, neg: true,
    title: 'Estudantes vaiam no debate', text: 'Um grupo interrompeu sua fala com gritos.',
    opts: [
      ['Pedir para continuar com calma', [cred(1), rej(1)]],
      ['Bater boca', [rej(2), ent(2)]],
    ] }),
  c({ id: 'camp_moradores_rua', cat: 'opportunity', w: 2, cd: 40,
    title: 'População de rua no centro', text: 'A população de rua cresceu e a sua equipe evita a região.',
    opts: [
      ['Visitar com uma proposta', [foco('welfare', 6), mom(POBRES, 2.5), ene(-6)]],
      ['Evitar a região', []],
    ] }),

  // ─── Mídia e redes ───
  c({ id: 'camp_meme_favoravel', cat: 'media', w: 3, cd: 25,
    title: 'Meme favorável', text: 'Um meme simpático sobre você se espalha pelas redes.',
    opts: [
      ['Repostar', [con(5), mom(JOVENS, 3.5), ene(-6)]],
      ['Ignorar', [con(2)]],
    ] }),
  c({ id: 'camp_meme_contra', cat: 'media', w: 3, cd: 25, neg: true,
    title: 'Meme contra você', text: 'Uma gafe sua virou piada nacional.',
    opts: [
      ['Rir de si mesmo', [rej(-1), con(3), ene(-6)]],
      ['Mandar remover', [rej(1), con(4), modifier('meme_streisand', 'Meme em alta', 12, [rej(0.06)])]],
    ] }),
  c({ id: 'camp_live_recorde', cat: 'media', w: 3, cd: 25,
    title: 'Live com audiência recorde', text: 'A live de ontem bateu recorde. A equipe quer outra mais longa.',
    opts: [
      ['Live de três horas', [con(4), ene(-15), mom(JOVENS, 2)]],
      ['Live curta', [con(2)]],
    ] }),
  c({ id: 'camp_podcast', cat: 'media', w: 3, cd: 30,
    cond: (s) => fameOf(s) < 60,
    title: 'Convite de um podcast famoso', text: 'Três horas de conversa sem cortes, para milhões de ouvintes.',
    opts: [
      ['Ir', [con(7), chain('camp_podcast_pergunta', 1, 0.4)]],
      ['Recusar', []],
    ] }),
  c({ id: 'camp_podcast_pergunta', cat: 'media', w: 0, chainOnly: true,
    title: 'Pergunta difícil no podcast', text: 'O apresentador lembrou uma contradição sua do passado.',
    opts: [
      ['Admitir que mudou de opinião', [cred(2), rej(-1), ene(-6)]],
      ['Negar a contradição', [rej(2), cred(-2)]],
    ] }),
  c({ id: 'camp_dancinha', cat: 'media', w: 3, cd: 40,
    title: 'Dancinha nas redes', text: 'Um jovem da equipe sugere entrar numa trend de dança.',
    opts: [
      ['Dançar', [mom(['students'], 4.5), cred(-2)]],
      ['Recusar', []],
    ] }),
  c({ id: 'camp_ancora_provoca', cat: 'media', w: 3, cd: 30,
    title: 'Âncora provoca ao vivo', text: 'O apresentador insinua que sua campanha mente.',
    opts: [
      ['Manter a calma', [cred(2)]],
      ['Responder à altura', [ent(5), rej(2)]],
    ] }),
  c({ id: 'camp_robos', cat: 'media', w: 3, cd: 40,
    title: 'Exército de robôs nas redes', text: 'Perfis falsos atacam você em massa. A agência oferece contra-atacar com robôs.',
    opts: [
      ['Denunciar os perfis falsos', [cred(2), ene(-6)]],
      ['Contratar robôs também', [con(4), chain('camp_tse_robos', 20, 0.3), ene(-6)]],
    ] }),
  c({ id: 'camp_tse_robos', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'TSE investiga disparos em massa', text: 'A Justiça Eleitoral rastreou os robôs até a sua agência.',
    opts: [
      ['Demitir a agência', [esc(8), cred(-2)]],
      ['Negar', [esc(15), rej(2)]],
    ] }),
  c({ id: 'camp_audio_vazado', cat: 'scandal', w: 2, cd: 40, neg: true,
    title: 'Áudio de grupo da campanha vaza', text: 'Um áudio de coordenadores fazendo piada com eleitores vazou.',
    opts: [
      ['Pedir desculpas', [rej(1)]],
      ['Negar a autenticidade', [chain('camp_audio_pericia', 10, 0.5)]],
    ] }),
  c({ id: 'camp_audio_pericia', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Perícia confirma o áudio', text: 'O áudio é verdadeiro, diz a perícia.',
    opts: [['Admitir o erro', [esc(5), rej(2)]]] }),
  c({ id: 'camp_radio_comunitaria', cat: 'opportunity', w: 3, cd: 30,
    title: 'Rádio comunitária', text: 'Uma rádio comunitária oferece um programa semanal.',
    opts: [
      ['Aceitar', [pres(7, 'random'), mom(IDOSOS, 3.5), ene(-6)]],
      ['Não', []],
    ] }),
  c({ id: 'camp_checagem', cat: 'media', w: 3, cd: 30,
    title: 'Agência de checagem contesta seu número', text: 'O número que você usou num discurso está errado.',
    opts: [
      ['Corrigir publicamente', [cred(2)]],
      ['Insistir no número', [cred(-4), ent(1)]],
    ] }),
  c({ id: 'camp_documentario', cat: 'opportunity', w: 1, cd: 60,
    cond: (s) => fameOf(s) >= 50,
    title: 'Proposta de documentário', text: 'Um diretor quer filmar os bastidores da campanha.',
    opts: [
      ['Liberar os bastidores', [con(6), chain('camp_documentario_cena', 30, 0.2)]],
      ['Negar', []],
    ] }),
  c({ id: 'camp_documentario_cena', cat: 'media', w: 0, chainOnly: true, neg: true,
    title: 'Trailer mostra cena ruim', text: 'O trailer do documentário mostra você irritado com um assessor.',
    opts: [['Explicar o contexto', [rej(2)]]] }),
  c({ id: 'camp_celebridade_critica', cat: 'media', w: 2, cd: 40,
    title: 'Celebridade critica você', text: 'Um artista famoso postou críticas à sua campanha.',
    opts: [
      ['Responder', [ent(3), rej(1)]],
      ['Convidar para uma conversa', [chain('camp_celebridade_vira', 7, 0.4)]],
    ] }),
  c({ id: 'camp_celebridade_vira', cat: 'opportunity', w: 0, chainOnly: true,
    title: 'Celebridade muda de opinião', text: 'Depois da conversa, o artista declarou voto em você.',
    opts: [['Agradecer publicamente', [con(5), mom(JOVENS, 2.5)]]] }),
  c({ id: 'camp_comida_regional', cat: 'media', w: 2, cd: 30, ctx: ['unit'],
    title: 'Prato típico nas redes', text: 'A trend do momento é comer o prato típico de {unitName}.',
    opts: [
      ['Postar comendo', [regm(2), con(2, 'context'), ene(-6)]],
      ['Não', []],
    ] }),

  // ─── Pesquisas ───
  c({ id: 'camp_empate_tecnico', cat: 'politics', w: 3, cd: 30,
    cond: (s) => majoritarian(s) && playerPollShare(s) > 15 && !playerIsLeading(s),
    title: 'Empate técnico', text: 'A nova pesquisa mostra empate técnico com o líder.',
    opts: [
      ['Explorar o "voto útil"', [mom('all', 2), rej(1)]],
      ['Manter o tom', [cred(1)]],
    ] }),
  c({ id: 'camp_queda_brusca', cat: 'politics', w: 2, cd: 40, neg: true,
    cond: (s) => playerPollShare(s) > 8,
    title: 'Queda nas pesquisas', text: 'Você perdeu pontos importantes em uma semana.',
    opts: [
      ['Trocar o marqueteiro', [cash(-80_000), chain('camp_novo_marqueteiro', 7)]],
      ['Manter a estratégia', [ent(-5)]],
    ] }),
  c({ id: 'camp_novo_marqueteiro', cat: 'media', w: 0, chainOnly: true,
    title: 'Novo marqueteiro muda o tom', text: 'A campanha ganhou nova cara na TV.',
    opts: [['Aprovar a nova linha', [mom('all', 2), con(3)]]] }),
  c({ id: 'camp_instituto_amigo', cat: 'scandal', w: 2, cd: 40,
    title: 'Instituto oferece pesquisa "boa"', text: 'Um instituto simpático oferece uma pesquisa favorável.',
    opts: [
      ['Recusar', [cred(1)]],
      ['Divulgar', [mom('all', 1.5), chain('camp_pesquisa_contestada', 10, 0.5), ene(-6)]],
    ] }),
  c({ id: 'camp_pesquisa_contestada', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Pesquisa divulgada é contestada', text: 'Adversários provam que a metodologia era viciada.',
    opts: [['Retirar a peça', [cred(-3), rej(1)]]] }),
  c({ id: 'camp_lideranca_folgada', cat: 'politics', w: 2, cd: 40,
    cond: (s) => majoritarian(s) && playerIsLeading(s) && playerPollShare(s) > 35,
    title: 'Liderança folgada', text: 'A equipe sugere faltar aos próximos debates para não correr riscos.',
    opts: [
      ['Manter o ritmo', [cred(1)]],
      ['Faltar aos debates', [rej(1), ene(10)]],
    ] }),
  c({ id: 'camp_indecisos', cat: 'politics', w: 2, cd: 40,
    title: 'Indecisos em alta', text: 'Um terço dos eleitores ainda não escolheu candidato.',
    opts: [
      ['Campanha de propostas', [foco('jobs', 5), cred(1), ene(-6)]],
      ['Campanha de ataques', [opp('leader', { rejection: 2 }), rej(1)]],
    ] }),
  c({ id: 'camp_segmento', cat: 'politics', w: 2, cd: 40,
    title: 'Pesquisa por segmento', text: 'O estatístico da campanha achou um segmento volátil.',
    opts: [
      ['Mirar o segmento mais volátil', [mom(CLASSE_MEDIA, 4.5), ene(-6)]],
      ['Reforçar a base', [ent(3), ene(-6)]],
    ] }),

  // ─── Dinheiro ───
  c({ id: 'camp_doador_misterioso', cat: 'scandal', w: 3, cd: 40,
    cond: (s) => cashShare(s) < 0.3,
    title: 'Doador misterioso', text: 'Um intermediário oferece dinheiro "de um amigo que prefere não aparecer".',
    opts: [
      ['Aceitar e declarar', [cash(150_000), esc(2)]],
      ['Recusar', [cred(1)]],
      ['Aceitar por fora', [caixa2(300_000), esc(6), chain('camp_caixa_dois', 30, 0.4)]],
    ] }),
  c({ id: 'camp_caixa_dois', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Investigação de caixa dois', text: 'A polícia rastreia o dinheiro não declarado da campanha.',
    opts: [
      ['Culpar o tesoureiro', [esc(10), uni(-5)]],
      ['Assumir e retificar as contas', [esc(6), cred(-3), cash(-100_000)]],
    ] }),
  c({ id: 'camp_vaquinha', cat: 'opportunity', w: 3, cd: 30,
    cond: (s) => (s.campaign?.enthusiasm ?? 0) >= 55,
    title: 'Vaquinha da militância', text: 'A militância empolgada quer fazer uma vaquinha.',
    opts: [
      ['Lançar a vaquinha', [cash(120_000), ent(2), ene(-6)]],
      ['Não', []],
    ] }),
  c({ id: 'camp_jantar_adesao', cat: 'opportunity', w: 3, cd: 30,
    title: 'Jantar de arrecadação', text: 'Empresários organizam um jantar a R$ 5 mil por pessoa.',
    opts: [
      ['Fazer um jantar popular', [cash(30_000), ent(3), ene(-6)]],
      ['Fazer o jantar', [cash(200_000), mom(['workers'], -2), gi('business', 3)]],
    ] }),
  c({ id: 'camp_grafica_cara', cat: 'economy', w: 2, cd: 40,
    title: 'Gráfica cobra o dobro', text: 'A gráfica dobrou o preço dos santinhos na reta final.',
    opts: [
      ['Pagar', [cash(-40_000)]],
      ['Trocar de gráfica', [ene(-5), con(-1)]],
    ] }),
  c({ id: 'camp_multa_tse', cat: 'politics', w: 2, cd: 40, neg: true,
    title: 'Multa por propaganda irregular', text: 'A Justiça Eleitoral multou a campanha por placas irregulares.',
    opts: [
      ['Pagar e corrigir', [cash(-30_000)]],
      ['Recorrer', [chain('camp_recurso_multa', 10)]],
    ] }),
  c({ id: 'camp_recurso_multa', cat: 'politics', w: 0, chainOnly: true,
    title: 'Recurso da multa julgado', text: 'O tribunal decidiu o recurso da sua campanha.',
    opts: [
      ['Aceitar a decisão', [cash(-40_000)]],
      ['Comemorar a vitória parcial', [ent(1)]],
    ] }),
  c({ id: 'camp_prestacao_contas', cat: 'opportunity', w: 2, cd: 50,
    title: 'Prestação de contas parcial', text: 'O prazo da prestação de contas parcial chegou.',
    opts: [
      ['Publicar tudo detalhado', [cred(2)]],
      ['O mínimo legal', []],
    ] }),
  c({ id: 'camp_aviao', cat: 'opportunity', w: 2, cd: 50, cond: majoritarian,
    title: 'Empresário oferece avião', text: 'Um apoiador oferece o jatinho dele para a reta final.',
    opts: [
      ['Aceitar como doação declarada', [ene(20), rej(1)]],
      ['Recusar', [cred(1)]],
    ] }),
  c({ id: 'camp_cabos_aumento', cat: 'economy', w: 2, cd: 40,
    title: 'Cabos eleitorais pedem aumento', text: 'Os cabos eleitorais ameaçam largar as bandeiras.',
    opts: [
      ['Pagar', [cash(-50_000)]],
      ['Negar', [pres(-3, 'random'), mil(-5)]],
    ] }),

  // ─── Equipe ───
  c({ id: 'camp_marqueteiro_estrela', cat: 'opportunity', w: 2, cd: 60,
    cond: (s) => cashShare(s) >= 0.6,
    title: 'Marqueteiro famoso disponível', text: 'O marqueteiro de três campanhas vitoriosas oferece os serviços.',
    opts: [
      ['Contratar', [cash(-300_000), mom('all', 2.5), con(4)]],
      ['Manter o atual', []],
    ] }),
  c({ id: 'camp_coordenador_briga', cat: 'party', w: 2, cd: 40,
    title: 'Coordenador briga com o marqueteiro', text: 'Os dois não se falam mais e a campanha está parada.',
    opts: [
      ['Ficar com o coordenador', [mil(5), con(-1)]],
      ['Ficar com o marqueteiro', [con(3), mil(-5)]],
    ] }),
  c({ id: 'camp_vaza_estrategia', cat: 'party', w: 2, cd: 40,
    title: 'Assessor vaza a estratégia', text: 'O plano da última semana apareceu na coluna de um jornal.',
    opts: [
      ['Demitir o assessor', [uni(2), ent(-1)]],
      ['Usar como contrainformação', [opp('leader', { popMomentum: -1 })]],
    ] }),
  c({ id: 'camp_estagiario', cat: 'media', w: 3, cd: 30,
    title: 'Post errado nas redes oficiais', text: 'Um estagiário postou um link pessoal na conta da campanha.',
    opts: [
      ['Assumir o erro', [con(2)]],
      ['Culpar o estagiário', [rej(1)]],
    ] }),
  c({ id: 'camp_equipe_exausta', cat: 'party', w: 3, cd: 30,
    cond: (s) => (s.campaign?.energy ?? 100) < 25,
    title: 'Equipe exausta', text: 'Coordenadores dormem quatro horas por noite há semanas.',
    opts: [
      ['Folga geral de dois dias', [ene(30), pres(-2, 'random')]],
      ['Seguir em frente', [ene(-5), mil(-5)]],
    ] }),
  c({ id: 'camp_preparador', cat: 'opportunity', w: 2, cd: 40,
    title: 'Preparador de debates exige exclusividade', text: 'O melhor preparador do país só aceita se for exclusivo.',
    opts: [
      ['Aceitar', [prep(0.08), cash(-60_000)]],
      ['Negar', []],
    ] }),
  c({ id: 'camp_dossie', cat: 'scandal', w: 2, cd: 50, ctx: ['opponent'],
    title: 'Ex-assessor de {opponentName} oferece dossiê', text: 'Ele diz ter provas contra o antigo chefe.',
    opts: [
      ['Recusar', [cred(2)]],
      ['Usar o dossiê', [opp('context', { rejection: 4 }), esc(4)]],
    ] }),

  // ─── Partido e alianças ───
  c({ id: 'camp_vice_imposto', cat: 'party', w: 2, cd: 60, cond: majoritarian,
    title: 'Direção do partido impõe vice', text: 'O partido escolheu um vice que você não conhece bem.',
    opts: [
      ['Aceitar', [uni(10)]],
      ['Recusar', [uni(-15), cash(-80_000)]],
    ] }),
  c({ id: 'camp_ex_presidente_partido', cat: 'party', w: 2, cd: 60, neg: true,
    title: 'Ex-dirigente do partido em escândalo', text: 'Um ex-presidente do {playerParty} foi preso.',
    opts: [
      ['Defender o histórico do partido', [esc(3), uni(4)]],
      ['Distanciar-se publicamente', [uni(-5), rej(-1)]],
    ] }),
  c({ id: 'camp_lideranca_nacional', cat: 'party', w: 2, cd: 50,
    title: 'Liderança nacional quer subir no palanque', text: 'Um nome nacional do partido quer fazer comício com você.',
    opts: [
      ['Comício juntos', [con(5), ent(3), rej(1)]],
      ['Recusar a visita', [uni(-5)]],
    ] }),
  c({ id: 'camp_militancia_racha', cat: 'party', w: 2, cd: 40,
    cond: (s) => partyUnity(s) < 45,
    title: 'Militância rachada', text: 'Duas alas da militância brigam por espaço.',
    opts: [
      ['Reunião de reconciliação', [ene(-15), uni(8)]],
      ['Ignorar', [mil(-10)]],
    ] }),
  c({ id: 'camp_puxador_desiste', cat: 'party', w: 2, cd: 60, cond: proportional,
    title: 'Puxador de votos desiste', text: 'O candidato mais votado da chapa desistiu.',
    opts: [
      ['Investir em você como novo puxador', [con(4), cash(-50_000)]],
      ['Buscar outro nome', [uni(-2)]],
    ] }),

  // ─── Adversários ───
  c({ id: 'camp_rival_copia', cat: 'politics', w: 3, cd: 30, ctx: ['opponent'],
    title: '{opponentName} copia sua proposta', text: 'O adversário lançou uma proposta idêntica à sua.',
    opts: [
      ['Denunciar o plágio', [con(3), opp('context', { rejection: 1 }), ene(-6)]],
      ['Elogiar a "adesão"', [cred(1), ene(-6)]],
    ] }),
  c({ id: 'camp_rival_debate_extra', cat: 'politics', w: 2, cd: 40, ctx: ['opponent'],
    title: '{opponentName} desafia para debate extra', text: 'O adversário quer um debate só entre vocês dois.',
    opts: [
      ['Aceitar', [con(4), chain('camp_debate_extra', 5)]],
      ['Recusar', [rej(1)]],
    ] }),
  c({ id: 'camp_debate_extra', cat: 'media', w: 0, chainOnly: true,
    title: 'Debate extra acontece', text: 'O debate foi transmitido pelas redes com audiência alta.',
    opts: [
      ['Focar em propostas', [cred(2), mom('all', 1.5), ene(-6)]],
      ['Partir para o ataque', [opp('random', { rejection: 3 }), rej(1)]],
    ] }),
  c({ id: 'camp_rival_ataque_pessoal', cat: 'media', w: 3, cd: 30, ctx: ['opponent'], neg: true,
    title: '{opponentName} faz ataque pessoal', text: 'O adversário atacou sua família no horário eleitoral.',
    opts: [
      ['Pedir direito de resposta', [chain('camp_direito_resposta', 7, 0.5)]],
      ['Responder no mesmo tom', [ent(4), rej(1)]],
    ] }),
  c({ id: 'camp_direito_resposta', cat: 'politics', w: 0, chainOnly: true,
    title: 'Direito de resposta concedido', text: 'O TSE deu a você tempo no programa do adversário.',
    opts: [['Usar o tempo com elegância', [cred(2), opp('random', { rejection: 2 })]]] }),
  c({ id: 'camp_rival_doente', cat: 'media', w: 1, cd: 60, ctx: ['opponent'],
    title: '{opponentName} é hospitalizado', text: 'O adversário passou mal durante um comício.',
    opts: [
      ['Mensagem de solidariedade', [cred(2)]],
      ['Seguir a agenda normalmente', []],
    ] }),
  c({ id: 'camp_rival_maquina', cat: 'politics', w: 2, cd: 40, ctx: ['opponent'],
    title: '{opponentName} usa a máquina pública', text: 'Obras e programas aparecem na propaganda do adversário.',
    opts: [
      ['Denunciar uso da máquina', [cred(1), opp('context', { rejection: 2 }), ene(-6)]],
      ['Ignorar', []],
    ] }),
  c({ id: 'camp_rival_milionario', cat: 'politics', w: 2, cd: 40, ctx: ['opponent'],
    title: '{opponentName} gasta como milionário', text: 'O adversário encheu a cidade de outdoors e carros de som.',
    opts: [
      ['Discurso contra o dinheiro na política', [mom(['workers'], 2.5), cred(1), ene(-6)]],
      ['Ignorar', []],
    ] }),
  c({ id: 'camp_rival_economista', cat: 'politics', w: 2, cd: 50, cond: majoritarian,
    title: 'Adversário anuncia economista famoso', text: 'O principal rival anunciou um economista renomado.',
    opts: [
      ['Anunciar o seu economista', [cred(3), cash(-20_000)]],
      ['Ironizar', [ent(2)]],
    ] }),
  c({ id: 'camp_pacto_nao_agressao', cat: 'politics', w: 2, cd: 50, ctx: ['opponent'],
    title: '{opponentName} propõe pacto de não agressão', text: 'O adversário quer acabar com os ataques mútuos.',
    opts: [
      ['Aceitar', [rej(-1), opp('context', { rejection: -1 }), flag('pacto_nao_agressao'), ene(-6)]],
      ['Recusar', [ent(2)]],
    ] }),
  c({ id: 'camp_rival_processa', cat: 'politics', w: 2, cd: 40, ctx: ['opponent'],
    title: '{opponentName} processa você', text: 'O adversário pede indenização por uma declaração sua.',
    opts: [
      ['Fazer uma retratação', [rej(-1), ent(-2)]],
      ['Ir até o fim', [cash(-30_000), ent(2)]],
    ] }),

  // ─── Justiça Eleitoral ───
  c({ id: 'camp_impugnacao', cat: 'politics', w: 2, cd: 60, neg: true,
    title: 'Pedido de impugnação da candidatura', text: 'Um adversário pede a impugnação do seu registro.',
    opts: [
      ['Defesa com grandes advogados', [cash(-100_000)]],
      ['Defesa barata', [chain('camp_impugnacao_derrota', 15, 0.35)]],
    ] }),
  c({ id: 'camp_impugnacao_derrota', cat: 'crisis', w: 0, chainOnly: true, neg: true,
    title: 'Liminar suspende sua propaganda', text: 'Enquanto o recurso não é julgado, sua propaganda está suspensa.',
    opts: [['Recorrer com urgência', [cash(-80_000), con(-3), ent(-4)]]] }),
  c({ id: 'camp_poder_religioso', cat: 'politics', w: 2, cd: 40,
    title: 'Pastor oferece o púlpito', text: 'Um pastor quer que você fale no culto de domingo.',
    opts: [
      ['Recusar o púlpito', [gi('religious', -3), cred(1)]],
      ['Aceitar', [gi('religious', 6), mom(['workers'], 1.5), chain('camp_tse_religioso', 15, 0.25), ene(-6)]],
    ] }),
  c({ id: 'camp_tse_religioso', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Abuso de poder religioso', text: 'O Ministério Público Eleitoral abriu investigação.',
    opts: [['Apresentar defesa', [esc(6), cash(-40_000)]]] }),
  c({ id: 'camp_showmicio', cat: 'politics', w: 2, cd: 40,
    title: 'Cantor quer se apresentar no comício', text: 'Showmício é proibido, mas o cantor insiste.',
    opts: [
      ['Show em outro dia, sem discurso', [con(3)]],
      ['Cancelar', []],
    ] }),

  // ─── Grupos sociais e de interesse ───
  c({ id: 'camp_carta_empresarios', cat: 'politics', w: 2, cd: 50,
    title: 'Carta de compromissos dos empresários', text: 'Associações empresariais pedem que você assine compromissos.',
    opts: [
      ['Recusar', [gi('business', -4), mom(['workers'], 1.5)]],
      ['Assinar', [gi('business', 10), mom(['workers'], -2)]],
    ] }),
  c({ id: 'camp_central_sindical', cat: 'politics', w: 2, cd: 50,
    title: 'Central sindical quer compromisso', text: 'As centrais pedem compromisso com a política de salário mínimo.',
    opts: [
      ['Assinar', [gi('unions', 10), gi('business', -3)]],
      ['Recusar', [gi('unions', -5)]],
    ] }),
  c({ id: 'camp_frente_agro', cat: 'politics', w: 2, cd: 50, regions: ['centro_oeste', 'sul', 'norte'],
    title: 'Agenda do agro', text: 'A frente do agronegócio apresenta suas demandas.',
    opts: [
      ['Assinar a agenda', [gi('agribusiness', 10), gi('environmental', -5), mom(CAMPO, 2.5)]],
      ['Apresentar agenda própria', [gi('agribusiness', 2)]],
    ] }),
  c({ id: 'camp_ocupacao_moradia', cat: 'politics', w: 2, cd: 50,
    title: 'Movimento de moradia convida', text: 'Um movimento de sem-teto convida para visitar uma ocupação.',
    opts: [
      ['Visitar', [gi('social_movements', 8), gi('business', -3), mom(POBRES, 2.5)]],
      ['Recusar', [gi('social_movements', -3)]],
    ] }),
  c({ id: 'camp_passe_livre', cat: 'politics', w: 2, cd: 50,
    title: 'Estudantes pedem passe livre', text: 'Estudantes cobram o passe livre no transporte.',
    opts: [
      ['Prometer passe livre', [mom(['students'], 4.5), cred(-1)]],
      ['Prometer meia-passagem ampliada', [mom(['students'], 2.5)]],
    ] }),
  c({ id: 'camp_policiais', cat: 'politics', w: 2, cd: 50,
    title: 'Policiais pedem compromisso', text: 'Associações policiais querem promessa de reajuste.',
    opts: [
      ['Prometer', [gi('security', 6), foco('security', 4), ene(-6)]],
      ['Não prometer', [gi('security', -3)]],
    ] }),
  c({ id: 'camp_ambientalistas', cat: 'politics', w: 2, cd: 50,
    title: 'Carta dos ambientalistas', text: 'ONGs ambientais pedem compromisso com desmatamento zero.',
    opts: [
      ['Assinar', [gi('environmental', 8), gi('agribusiness', -4), mom(JOVENS, 1.5)]],
      ['Não assinar', [gi('environmental', -4)]],
    ] }),
  c({ id: 'camp_creches', cat: 'politics', w: 2, cd: 50,
    title: 'Mães cobram vagas em creches', text: 'Um coletivo de mães entrega um abaixo-assinado.',
    opts: [
      ['Prometer as vagas', [mom(['workers'], 3.5), foco('education', 4), ene(-6)]],
      ['Prometer um estudo', [cred(-1)]],
    ] }),

  // ─── Calendário e regionais ───
  c({ id: 'camp_feriado_7set', cat: 'opportunity', w: 3, cd: 300, cond: (s) => month(s) === 9 && day(s) <= 8,
    title: 'Desfile de 7 de Setembro', text: 'O desfile cívico reúne milhares de pessoas.',
    opts: [
      ['Assistir na arquibancada', [con(3), ene(-6)]],
      ['Aproveitar o feriado para descansar', [ene(20), ene(-6)]],
    ] }),
  c({ id: 'camp_barretos', cat: 'opportunity', w: 4, cd: 300, states: ['SP', 'GO', 'MT', 'MS', 'MG', 'TO'],
    cond: (s) => month(s) === 8,
    title: 'Festa do Peão', text: 'A maior festa do peão do país está acontecendo.',
    opts: [
      ['Ir de chapéu e botina', [mom(CAMPO, 4.5), con(3), ene(-6)]],
      ['Não ir', []],
    ] }),
  c({ id: 'camp_farroupilha', cat: 'opportunity', w: 4, cd: 300, states: ['RS', 'SC'],
    cond: (s) => month(s) === 9 && day(s) >= 10,
    title: 'Semana Farroupilha', text: 'Os CTGs estão em festa e convidam os candidatos.',
    opts: [
      ['Ir pilchado ao acampamento', [mom(CAMPO, 3.5), con(3), pres(4, 'random'), ene(-6)]],
      ['Mandar uma mensagem', []],
    ] }),
  c({ id: 'camp_cirio', cat: 'opportunity', w: 4, cd: 300, states: ['PA'], cond: (s) => month(s) === 10 && day(s) <= 15,
    title: 'Círio de Nazaré', text: 'Milhões de fiéis acompanham a procissão em Belém.',
    opts: [
      ['Acompanhar a procissão', [mom(IDOSOS, 4.5), gi('religious', 4), ene(-10)]],
      ['Mensagem respeitosa', [gi('religious', 1)]],
    ] }),
  c({ id: 'camp_oktoberfest', cat: 'opportunity', w: 3, cd: 300, states: ['SC'], cond: (s) => month(s) === 10,
    title: 'Oktoberfest', text: 'A festa reúne turistas do país inteiro.',
    opts: [
      ['Visitar a festa', [con(3), mom(COMERCIO, 2.5), ene(-6)]],
      ['Não ir', []],
    ] }),
  c({ id: 'camp_onda_calor', cat: 'crisis', w: 2, cd: 40, regions: ['centro_oeste', 'sudeste', 'norte', 'nordeste'],
    title: 'Onda de calor', text: 'Termômetros passam de 40 graus e comícios ficam vazios.',
    opts: [
      ['Distribuir água nos eventos', [con(2), cash(-10_000)]],
      ['Cancelar comícios à tarde', [ene(10), pres(-1, 'random')]],
    ] }),
  c({ id: 'camp_frente_fria', cat: 'opportunity', w: 2, cd: 60, regions: ['sul'],
    title: 'Frente fria', text: 'O frio intenso castiga a população de rua.',
    opts: [
      ['Campanha do agasalho', [cred(2), mom(POBRES, 1.5), ene(-6)]],
      ['Nada', []],
    ] }),
  c({ id: 'camp_queimadas_fumaca', cat: 'crisis', w: 2, cd: 60, regions: ['norte', 'centro_oeste'],
    title: 'Fumaça das queimadas cobre a cidade', text: 'Escolas suspendem aulas por causa da fumaça.',
    opts: [
      ['Proposta de brigadas e fiscalização', [foco('environment', 6), gi('environmental', 3), ene(-6)]],
      ['Silêncio', [gi('environmental', -2)]],
    ] }),
  c({ id: 'camp_seca_promessa', cat: 'crisis', w: 2, cd: 60, regions: ['nordeste'],
    title: 'Seca no sertão', text: 'Cidades do interior estão sem água há semanas.',
    opts: [
      ['Prometer uma adutora', [mom(CAMPO, 3.5), cred(-1)]],
      ['Defender carros-pipa já', [mom(CAMPO, 2.5)]],
    ] }),
  c({ id: 'camp_apagao', cat: 'crisis', w: 2, cd: 60,
    title: 'Apagão na cidade', text: 'Bairros inteiros ficaram sem luz por horas.',
    opts: [
      ['Culpar o governo', [mom('all', 1.5), rej(1)]],
      ['Ajudar a organizar abrigos', [cred(2)]],
    ] }),
  c({ id: 'camp_ataque_faccao', cat: 'crisis', w: 2, cd: 50,
    title: 'Ataques de facção na capital', text: 'Ônibus queimados e comércio fechado.',
    opts: [
      ['Discurso duro', [foco('security', 6), gi('security', 3), ene(-6)]],
      ['Plano de prevenção', [cred(2), foco('security', 3), ene(-6)]],
    ] }),

  // ─── Debates ───
  c({ id: 'camp_cadeira_vazia', cat: 'media', w: 2, cd: 40, ctx: ['opponent'], cond: majoritarian,
    title: '{opponentName} falta ao debate', text: 'A emissora deixou uma cadeira vazia no lugar do adversário.',
    opts: [
      ['Dialogar com a cadeira vazia', [con(4), opp('context', { rejection: 2 }), ene(-6)]],
      ['Ignorar e falar de propostas', [cred(1)]],
    ] }),
  c({ id: 'camp_debate_radio', cat: 'opportunity', w: 2, cd: 40,
    title: 'Debate na rádio do interior', text: 'Uma rádio regional organiza debate com os candidatos.',
    opts: [
      ['Ir', [pres(6, 'random'), con(2), ene(-6)]],
      ['Faltar', []],
    ] }),
  c({ id: 'camp_microfone_aberto', cat: 'media', w: 2, cd: 50, neg: true,
    title: 'Microfone aberto no intervalo', text: 'Um comentário seu no intervalo do debate foi captado.',
    opts: [
      ['Pedir desculpas', [rej(1)]],
      ['Dizer que foi tirado de contexto', [rej(2), ent(1)]],
    ] }),

  // ─── Proporcionais ───
  c({ id: 'camp_dobradinha', cat: 'party', w: 3, cd: 60, cond: proportional,
    title: 'Proposta de dobradinha', text: 'Um candidato do partido propõe fazer campanha casada.',
    opts: [
      ['Fazer a dobradinha', [pres(6, 'random'), cash(-20_000), uni(2)]],
      ['Seguir sozinho', []],
    ] }),
  c({ id: 'camp_reduto', cat: 'politics', w: 3, cd: 60, cond: proportional, ctx: ['unit'],
    title: 'Reduto eleitoral em {unitName}', text: 'Você tem força em {unitName}. Concentrar ou espalhar?',
    opts: [
      ['Concentrar no reduto', [pres(12), ene(-8)]],
      ['Espalhar a campanha', [pres(4, 'random'), con(2), ene(-6)]],
    ] }),
  c({ id: 'camp_lideranca_bairro', cat: 'politics', w: 3, cd: 40, cond: proportional, vars: { pessoa: V.pessoa },
    title: 'Liderança de bairro quer apoiar', text: '{pessoa}, liderança comunitária, oferece apoio e pede ajuda de custo.',
    opts: [
      ['Contratar a liderança', [pres(8, 'random'), cash(-15_000)]],
      ['Não', []],
    ] }),
  c({ id: 'camp_colega_chapa', cat: 'party', w: 2, cd: 50, cond: proportional,
    title: 'Colega de chapa ataca você', text: 'Um candidato do seu partido disputa os mesmos eleitores.',
    opts: [
      ['Ignorar', [cred(1)]],
      ['Responder', [uni(-4), ent(2)]],
    ] }),
  c({ id: 'camp_candidatas_laranja', cat: 'scandal', w: 2, cd: 90, cond: proportional,
    title: 'Candidaturas de fachada na chapa', text: 'Você descobre candidatas laranja na chapa do partido.',
    opts: [
      ['Denunciar', [uni(-15), cred(4)]],
      ['Ficar em silêncio', [esc(3)]],
    ] }),
  c({ id: 'camp_santinho_errado', cat: 'media', w: 2, cd: 60,
    title: 'Santinho com o número errado', text: 'A gráfica imprimiu 100 mil santinhos com um dígito errado.',
    opts: [
      ['Reimprimir tudo', [cash(-30_000)]],
      ['Corrigir à mão com a militância', [rej(1), ene(-5)]],
    ] }),

  // ─── Oportunidades ───
  c({ id: 'camp_entrevista_bancada', cat: 'opportunity', w: 2, cd: 40,
    cond: (s) => fameOf(s) >= 35,
    title: 'Convite para entrevista com bancada de jornalistas', text: 'Um programa tradicional de entrevistas quer você.',
    opts: [
      ['Ir', [con(7), chain('camp_podcast_pergunta', 1, 0.5)]],
      ['Recusar', []],
    ] }),
  c({ id: 'camp_bispo', cat: 'opportunity', w: 2, cd: 50,
    title: 'Encontro com o bispo', text: 'O bispo da diocese aceita receber os candidatos.',
    opts: [
      ['Ir', [gi('religious', 4), mom(IDOSOS, 2.5), ene(-6)]],
      ['Não ir', []],
    ] }),
  c({ id: 'camp_feira_tecnologia', cat: 'opportunity', w: 2, cd: 50,
    title: 'Feira de tecnologia', text: 'Startups apresentam projetos e convidam os candidatos.',
    opts: [
      ['Visitar', [gi('tech', 5), mom(['tech_workers'], 2.5), ene(-6)]],
      ['Não', []],
    ] }),
  c({ id: 'camp_radio_evangelica', cat: 'opportunity', w: 2, cd: 40,
    title: 'Entrevista em rádio evangélica', text: 'A rádio de maior audiência entre evangélicos convida.',
    opts: [
      ['Ir', [gi('religious', 4), mom(['workers'], 2), ene(-6)]],
      ['Não', []],
    ] }),
  c({ id: 'camp_artigo_jornal', cat: 'opportunity', w: 2, cd: 50,
    title: 'Jornal pede artigo de opinião', text: 'O principal jornal quer um artigo seu.',
    opts: [
      ['Escrever', [cred(2), con(3), ene(-6)]],
      ['Não ter tempo', []],
    ] }),
  c({ id: 'camp_vacina_publica', cat: 'opportunity', w: 2, cd: 60,
    title: 'Campanha de vacinação', text: 'A campanha de vacinação está com baixa adesão.',
    opts: [
      ['Tomar a vacina em público', [cred(2), mom(IDOSOS, 1.5), ene(-6)]],
      ['Não', []],
    ] }),
  c({ id: 'camp_celebridade_local', cat: 'opportunity', w: 2, cd: 50, scope: MUN,
    title: 'Ídolo local declara apoio', text: 'Um ex-jogador querido na cidade quer gravar um vídeo com você.',
    opts: [
      ['Aceitar', [con(4), ent(2), ene(-6)]],
      ['Agradecer e recusar', []],
    ] }),

  // ─── Gafes e imprevistos ───
  c({ id: 'camp_nome_cidade', cat: 'media', w: 2, cd: 50, ctx: ['unit'], neg: true,
    title: 'Você errou o nome da cidade', text: 'No palanque em {unitName}, você chamou a cidade pelo nome errado.',
    opts: [
      ['Pedir desculpas com humor', [con(2, 'context')]],
      ['Seguir como se nada fosse', [regm(-2), modifier('meme_cidade', 'Meme em alta', 12, [rej(0.06)])]],
    ] }),
  c({ id: 'camp_preco_pao', cat: 'media', w: 2, cd: 50,
    title: 'Quanto custa o pão?', text: 'O repórter pergunta o preço do pão francês.',
    opts: [
      ['Responder com segurança', [cred(2)], { desc: 'Você faz feira toda semana.' }],
      ['Chutar um valor', [rej(1), con(3), modifier('meme_pao', 'Meme em alta', 12, [rej(0.06)])]],
    ] }),
  c({ id: 'camp_assessor_machista', cat: 'scandal', w: 2, cd: 50, neg: true,
    title: 'Assessor faz comentário machista', text: 'Um assessor da campanha postou um comentário machista.',
    opts: [
      ['Demitir na hora', [cred(1)]],
      ['Defender o assessor', [rej(3), mom(['students'], -2)]],
    ] }),
  c({ id: 'camp_foto_investigado', cat: 'scandal', w: 2, cd: 50, neg: true,
    title: 'Foto com um investigado', text: 'Uma foto sua com um empresário investigado circula.',
    opts: [
      ['Explicar que foi num evento público', [esc(2)]],
      ['Ignorar', [esc(4)]],
    ] }),
  c({ id: 'camp_microfone_desligado', cat: 'media', w: 2, cd: 40,
    title: 'Som do comício cai', text: 'O microfone desligou no meio do discurso.',
    opts: [
      ['Parar o comício', [ent(-1)]],
      ['Discursar no grito', [ent(3), ene(-5)]],
    ] }),
  c({ id: 'camp_multa_carro', cat: 'media', w: 2, cd: 60,
    title: 'Carro da campanha multado', text: 'Uma foto do carro da campanha estacionado em vaga de deficiente viralizou.',
    opts: [
      ['Pagar e pedir desculpas', [cred(1)]],
      ['Ignorar', [rej(1)]],
    ] }),

  // ─── Temas em alta ───
  c({ id: 'camp_crime_barbaro', cat: 'crisis', w: 2, cd: 50,
    title: 'Crime bárbaro domina o noticiário', text: 'Todos os candidatos são cobrados sobre segurança.',
    opts: [
      ['Discurso de prevenção', [foco('security', 4), cred(2), ene(-6)]],
      ['Discurso duro', [foco('security', 8), gi('security', 3), rej(1)]],
    ] }),
  c({ id: 'camp_fila_sus', cat: 'crisis', w: 2, cd: 50,
    title: 'Fila no SUS vira manchete', text: 'Reportagem mostra pacientes esperando meses por exames.',
    opts: [
      ['Lançar um plano de saúde detalhado', [foco('healthcare', 8), cred(1), ene(-6)]],
      ['Atacar o governo atual', [foco('healthcare', 4), opp('leader', { rejection: 1 }), ene(-6)]],
    ] }),
  c({ id: 'camp_gasolina_alta', cat: 'economy', w: 2, cd: 50,
    title: 'Gasolina sobe de novo', text: 'O preço da gasolina subiu pela terceira vez no mês.',
    opts: [
      ['Explicar as causas', [foco('inflation', 3), cred(1), ene(-6)]],
      ['Prometer reduzir impostos', [foco('inflation', 6), mom(CLASSE_MEDIA, 2.5), cred(-1)]],
    ] }),
  c({ id: 'camp_desemprego_pauta', cat: 'economy', w: 2, cd: 50,
    title: 'Desemprego domina a pauta', text: 'Uma grande fábrica fechou e demitiu mil pessoas.',
    opts: [
      ['Plano de requalificação', [foco('jobs', 6), cred(1), ene(-6)]],
      ['Prometer reabrir a fábrica', [mom(OPERARIOS, 3.5), cred(-2)]],
    ] }),

  // ─── Mais eventos ───
  c({ id: 'camp_comite_pichado', cat: 'crisis', w: 2, cd: 40,
    title: 'Comitê pichado', text: 'O comitê amanheceu pichado com ofensas.',
    opts: [
      ['Pintar de novo e filmar', [ent(2), con(2), ene(-6)]],
      ['Registrar ocorrência', [cred(1), ene(-6)]],
    ] }),
  c({ id: 'camp_jingle', cat: 'opportunity', w: 3, cd: 50,
    title: 'Jingle grudento', text: 'O marqueteiro tem um jingle que gruda na cabeça.',
    opts: [
      ['Investir no jingle', [con(4), cash(-30_000)]],
      ['Manter o atual', []],
    ] }),
  c({ id: 'camp_mae_vitima', cat: 'opportunity', w: 2, cd: 50,
    title: 'Mãe de vítima cobra os candidatos', text: 'A mãe de um jovem assassinado pede para ser ouvida.',
    opts: [
      ['Receber a família', [cred(3), foco('security', 3), ene(-6)]],
      ['Mandar uma nota', []],
    ] }),
  c({ id: 'camp_idoso_emociona', cat: 'media', w: 2, cd: 50,
    title: 'Idoso emociona no comício', text: 'Um senhor de 90 anos subiu ao palco para declarar voto em você.',
    opts: [['Abraçar e agradecer', [con(3), mom(IDOSOS, 2.5)]]] }),
  c({ id: 'camp_indigenas', cat: 'politics', w: 2, cd: 60, regions: ['norte', 'centro_oeste'],
    title: 'Indígenas pedem demarcação', text: 'Lideranças indígenas querem seu compromisso.',
    opts: [
      ['Assumir o compromisso', [gi('social_movements', 5), gi('agribusiness', -4)]],
      ['Não se comprometer', [gi('social_movements', -3)]],
    ] }),
  c({ id: 'camp_pescadores', cat: 'politics', w: 2, cd: 60, regions: ['nordeste', 'norte', 'sul'],
    title: 'Pescadores pedem seguro-defeso', text: 'Colônias de pescadores reclamam do atraso do seguro.',
    opts: [
      ['Compromisso com o seguro-defeso', [mom(['workers'], 2.5), pres(4, 'random'), ene(-6)]],
      ['Não', []],
    ] }),
  c({ id: 'camp_garimpeiros', cat: 'politics', w: 2, cd: 60, states: ['PA', 'RR', 'AM', 'MT', 'RO', 'AP'],
    title: 'Garimpeiros querem legalização', text: 'Associações de garimpeiros prometem votos em troca de apoio.',
    opts: [
      ['Prometer legalizar', [mom(['workers'], 2.5), gi('environmental', -10)]],
      ['Recusar', [gi('environmental', 3)]],
    ] }),
  c({ id: 'camp_taxistas_apps', cat: 'politics', w: 2, cd: 60, scope: MUN,
    title: 'Taxistas contra aplicativos', text: 'Taxistas fazem buzinaço contra os aplicativos.',
    opts: [
      ['Defender a liberdade de mercado', [mom(JOVENS, 2.5), gi('tech', 2), ene(-6)]],
      ['Regular os aplicativos', [mom(['workers'], 1.5), mom(JOVENS, -2)]],
    ] }),
  c({ id: 'camp_parada_lgbt', cat: 'politics', w: 2, cd: 300,
    title: 'Convite para a Parada', text: 'Organizadores convidam os candidatos para a Parada da diversidade.',
    opts: [
      ['Participar', [mom(JOVENS, 3.5), gi('religious', -4)]],
      ['Não ir', []],
    ] }),
  c({ id: 'camp_marcha_jesus', cat: 'politics', w: 2, cd: 300,
    title: 'Convite para a Marcha para Jesus', text: 'Igrejas evangélicas convidam os candidatos.',
    opts: [
      ['Participar', [gi('religious', 6), mom(JOVENS, -1)]],
      ['Não ir', []],
    ] }),
  c({ id: 'camp_policial_morto', cat: 'crisis', w: 2, cd: 60,
    title: 'Policial morto em serviço', text: 'Um policial foi morto numa operação.',
    opts: [
      ['Ir ao velório', [gi('security', 4), foco('security', 3), ene(-6)]],
      ['Nota de pesar', []],
    ] }),
  c({ id: 'camp_granizo', cat: 'crisis', w: 2, cd: 60, regions: ['sul', 'sudeste', 'centro_oeste'],
    title: 'Chuva de granizo destrói lavouras', text: 'Produtores perderam a safra inteira.',
    opts: [
      ['Visitar os agricultores', [mom(CAMPO, 3.5), ene(-8)]],
      ['Mandar a equipe', [mom(CAMPO, 1.5)]],
    ] }),
  c({ id: 'camp_promessa_antiga', cat: 'politics', w: 2, cd: 60,
    cond: (s) => s.career.offices.length > 0,
    title: 'Cobrança de promessa antiga', text: 'Um repórter lembra uma promessa sua de outra eleição.',
    opts: [
      ['Explicar o que foi feito', [cred(1)]],
      ['Mudar de assunto', [rej(1)]],
    ] }),
  c({ id: 'camp_imovel_nao_declarado', cat: 'scandal', w: 1, cd: 90, neg: true,
    title: 'Imóvel fora da declaração de bens', text: 'Um jornal achou um apartamento seu que não está na declaração.',
    opts: [
      ['Corrigir a declaração', [esc(3)]],
      ['Negar', [esc(8), chain('camp_imovel_prova', 10, 0.5)]],
    ] }),
  c({ id: 'camp_imovel_prova', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Escritura do imóvel aparece', text: 'O jornal publicou a escritura em seu nome.',
    opts: [['Admitir o erro', [esc(6), rej(2), cred(-3)]]] }),
  c({ id: 'camp_espontanea', cat: 'politics', w: 2, cd: 60,
    cond: (s) => playerIsLeading(s),
    title: 'Mais lembrado na espontânea', text: 'Você é o nome mais citado sem lista de candidatos.',
    opts: [['Comemorar com a equipe', [mom('all', 1.5), ent(3)]]] }),
  c({ id: 'camp_jovens_titulo', cat: 'opportunity', w: 2, cd: 300,
    title: 'Jovens sem título de eleitor', text: 'Muitos jovens de 16 e 17 anos ainda não tiraram o título.',
    opts: [
      ['Campanha pelo título de eleitor', [mom(['students'], 3.5), cred(1), ene(-6)]],
      ['Não', []],
    ] }),
  c({ id: 'camp_escandalo_partido_rival', cat: 'politics', w: 2, cd: 50, ctx: ['opponent'],
    cond: (s) => scandalLevel(s) < 20,
    title: 'Escândalo atinge {opponentName}', text: 'Uma reportagem liga o adversário a contratos suspeitos.',
    opts: [
      ['Explorar o escândalo', [opp('context', { rejection: 4, popMomentum: -1 }), rej(1)]],
      ['Silêncio elegante', [cred(2)]],
    ] }),
  c({ id: 'camp_vespera', cat: 'politics', w: 3, cd: 300,
    cond: (s) => !!s.election && Date.parse(s.election.firstRoundDate) - Date.parse(s.date) <= 3 * 864e5,
    title: 'Véspera da eleição', text: 'Último dia de campanha nas ruas.',
    opts: [
      ['Grande carreata final', [ent(5), ene(-10)]],
      ['Entrevistas e descanso', [con(3), ene(10), ene(-6)]],
    ] }),
  c({ id: 'camp_fame_entrevista_fofoca', cat: 'media', w: 1, cd: 60,
    cond: (s) => fameOf(s) >= 40,
    title: 'Revista de celebridades', text: 'Uma revista quer você e a família na capa.',
    opts: [
      ['Aceitar a capa', [con(5), cred(-1), fame(2)]],
      ['Recusar', []],
    ] }),
];
