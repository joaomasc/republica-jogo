/**
 * Pacote de eventos de entressafra (fora do cargo), ligados à ocupação escolhida.
 * Fonte das ideias: docs/BANCO_DE_CONTEUDO.md, seção 8.
 */
import type { OccupationId } from '../../career/occupations';
import type { GameState } from '../../simulation/state';
import {
  CAREER, chain, cred, esc, ev, fame, flag, hist, ideo, partyPop, rep, type EvInput, uni, V,
} from '../dsl';
import type { EventDefinition } from '../types';

/** Evento de entressafra (fase de carreira). */
const k = (i: Omit<EvInput, 'phases'>): EventDefinition => ev({ ...i, phases: CAREER });
const occ = (id: OccupationId) => (s: GameState): boolean => s.career.occupation === id;
const ageOf = (s: GameState): number => s.candidates[s.playerId]?.age ?? 40;

export const CAREER_EVENTS: EventDefinition[] = [
  // ─── Secretário ───
  k({ id: 'car_sec_crise', cat: 'politics', w: 6, cd: 300, cond: occ('secretario'),
    title: 'Crise na sua secretaria', text: 'Um contrato da sua pasta está sob suspeita.',
    opts: [
      ['Abrir as contas e trocar a equipe', [cred(2), rep(1), fame(1), rep(-1)]],
      ['Blindar a equipe', [esc(5), rep(-1)]],
    ] }),
  k({ id: 'car_sec_vitrine', cat: 'opportunity', w: 6, cd: 300, cond: occ('secretario'),
    title: 'Programa da sua pasta vira vitrine', text: 'O governador elogia seu programa em rede estadual.',
    opts: [
      ['Aparecer ao lado do governador', [fame(3), rep(1), uni(-1)]],
      ['Dividir o mérito com a equipe', [cred(2), rep(1), rep(-1)]],
    ] }),
  k({ id: 'car_sec_demissao', cat: 'party', w: 4, cd: 500, cond: occ('secretario'),
    title: 'Governador pede sua cabeça', text: 'O aliado quer outro nome na sua pasta para agradar a base.',
    opts: [
      ['Sair com discurso de independência', [fame(2), cred(1), flag('saiu_secretaria'), rep(-1)]],
      ['Engolir e ficar em outra pasta', [rep(-1), uni(1)]],
    ] }),

  // ─── Comentarista ───
  k({ id: 'car_tv_polemica', cat: 'media', w: 6, cd: 200, cond: occ('comentarista'),
    title: 'Opinião polêmica no ar', text: 'Seu comentário sobre um tema quente viralizou.',
    opts: [
      ['Defender a opinião', [fame(3), cred(-1), rep(-1)]],
      ['Moderar e explicar', [cred(1), fame(1), rep(-1)]],
    ] }),
  k({ id: 'car_tv_ancora', cat: 'opportunity', w: 3, once: true, cond: occ('comentarista'),
    title: 'Convite para ser âncora', text: 'A emissora oferece um programa só seu no horário nobre.',
    opts: [
      ['Aceitar o programa', [fame(6), cred(-1), flag('ancora_tv')]],
      ['Recusar: a política é o foco', [cred(1), rep(1)]],
    ] }),
  k({ id: 'car_tv_debate', cat: 'media', w: 5, cd: 300, cond: occ('comentarista'),
    title: 'Bate-boca ao vivo com outro comentarista', text: 'O clima esquentou no programa e virou meme.',
    opts: [
      ['Pedir desculpas no ar', [cred(1), fame(1), rep(-1)]],
      ['Dobrar a aposta', [fame(3), rep(-1)]],
    ] }),

  // ─── Presidente do partido ───
  k({ id: 'car_pres_candidatos', cat: 'party', w: 6, cd: 300, cond: occ('presidente_partido'),
    title: 'Hora de escolher candidatos', text: 'A eleição se aproxima e o partido precisa de nomes.',
    opts: [
      ['Apostar em nomes competitivos', [partyPop(3), uni(-3), rep(1)]],
      ['Privilegiar aliados leais', [uni(5), partyPop(-1)]],
    ] }),
  k({ id: 'car_pres_fusao', cat: 'party', w: 3, cd: 700, cond: occ('presidente_partido'),
    title: 'Proposta de fusão', text: 'Um partido menor propõe fusão para ganhar tempo de TV.',
    opts: [
      ['Aceitar a fusão', [partyPop(3), uni(-6)]],
      ['Recusar', [uni(2)]],
    ] }),
  k({ id: 'car_pres_tesoureiro', cat: 'scandal', w: 3, cd: 700, neg: true, cond: occ('presidente_partido'),
    title: 'Tesoureiro do partido investigado', text: 'A polícia investiga as contas do partido que você preside.',
    opts: [
      ['Afastar o tesoureiro e abrir as contas', [esc(3), cred(2), uni(-2)]],
      ['Defender o tesoureiro', [esc(8), uni(2)]],
    ] }),
  k({ id: 'car_pres_ala', cat: 'party', w: 4, cd: 400, cond: occ('presidente_partido'),
    title: 'Ala rebelde quer sua cadeira', text: 'Uma ala do partido articula para tirar você da presidência.',
    opts: [
      ['Negociar espaço com a ala', [uni(4), rep(-1)]],
      ['Enfrentar na convenção', [uni(-3), fame(2), rep(1)]],
    ] }),

  // ─── Consultor ───
  k({ id: 'car_cons_cliente', cat: 'scandal', w: 6, cd: 300, cond: occ('consultor'),
    title: 'Cliente polêmico', text: 'Uma empresa investigada quer contratar sua consultoria.',
    opts: [
      ['Recusar', [cred(1), rep(1)]],
      ['Aceitar', [esc(6), rep(-1), chain('car_cons_vaza', 120, 0.4)]],
    ] }),
  k({ id: 'car_cons_vaza', cat: 'scandal', w: 0, chainOnly: true, neg: true,
    title: 'Contrato de consultoria vaza', text: 'A imprensa revela quanto a empresa investigada pagou a você.',
    opts: [['Explicar o trabalho feito', [esc(8), cred(-3), rep(-2)]]] }),
  k({ id: 'car_cons_palestra', cat: 'opportunity', w: 5, cd: 300, cond: occ('consultor'),
    title: 'Palestra paga por banco', text: 'Um banco oferece um cachê alto por uma palestra.',
    opts: [
      ['Fazer a palestra', [rep(1), cred(-1)]],
      ['Recusar e fazer palestra gratuita numa universidade', [cred(2), fame(-1)]],
    ] }),

  // ─── ONG ───
  k({ id: 'car_ong_doacao', cat: 'opportunity', w: 5, cd: 300, cond: occ('ong'),
    title: 'Doação internacional para seu projeto', text: 'Uma fundação estrangeira quer financiar a ONG.',
    opts: [
      ['Aceitar com transparência total', [cred(2), rep(1), fame(1), rep(-1)]],
      ['Recusar para evitar críticas', [cred(-1)]],
    ] }),
  k({ id: 'car_ong_premio', cat: 'opportunity', w: 4, cd: 500, cond: occ('ong'),
    title: 'Projeto premiado', text: 'O programa da sua ONG ganhou um prêmio nacional.',
    opts: [['Receber o prêmio', [cred(4), fame(2), rep(2), hist('event', 'Projeto social premiado', 1, 2)]]] }),
  k({ id: 'car_ong_crise', cat: 'scandal', w: 3, cd: 500, neg: true, cond: occ('ong'),
    title: 'Funcionário desvia dinheiro da ONG', text: 'A auditoria encontrou desvio de um coordenador.',
    opts: [
      ['Denunciar à polícia e ressarcir', [cred(1), esc(1)]],
      ['Resolver internamente', [esc(5), rep(-1)]],
    ] }),

  // ─── Professor ───
  k({ id: 'car_prof_livro', cat: 'opportunity', w: 5, cd: 400, cond: occ('professor'),
    title: 'Livro acadêmico publicado', text: 'Sua pesquisa sobre políticas públicas foi publicada.',
    opts: [['Lançar o livro', [cred(3), rep(1), fame(1)]]] }),
  k({ id: 'car_prof_protesto', cat: 'politics', w: 4, cd: 400, cond: occ('professor'),
    title: 'Alunos protestam contra você', text: 'Um grupo de alunos pede sua saída por divergência política.',
    opts: [
      ['Propor um debate aberto', [cred(2), fame(1), rep(-1)]],
      ['Pedir segurança e seguir as aulas', [cred(-1)]],
    ] }),
  k({ id: 'car_prof_orientando', cat: 'opportunity', w: 3, cd: 600, cond: occ('professor'), vars: { pessoa: V.pessoa },
    title: 'Ex-aluno quer entrar na política', text: '{pessoa}, seu ex-orientando, pede apoio para ser candidato.',
    opts: [
      ['Apadrinhar o pupilo', [rep(1), uni(1), flag('pupilo'), rep(-1)]],
      ['Aconselhar a esperar', []],
    ] }),

  // ─── Profissão ───
  k({ id: 'car_prof_caso', cat: 'opportunity', w: 5, cd: 400, cond: occ('profissao'),
    title: 'Caso de repercussão no trabalho', text: 'Um caso do seu trabalho chamou a atenção da imprensa.',
    opts: [
      ['Assumir a frente do caso', [fame(3), cred(1), rep(-1)]],
      ['Ficar nos bastidores', [cred(1)]],
    ] }),
  k({ id: 'car_prof_saudade', cat: 'politics', w: 4, cd: 400, cond: occ('profissao'),
    title: 'Saudade da política', text: 'Antigos eleitores param você na rua pedindo a volta.',
    opts: [
      ['Começar a ouvir lideranças', [rep(1), fame(1), uni(1), rep(-1)]],
      ['Seguir longe por ora', [cred(1)]],
    ] }),

  // ─── Livro ───
  k({ id: 'car_livro_revelacoes', cat: 'media', w: 6, cd: 400, cond: occ('livro'),
    title: 'Editora quer revelações nos bastidores', text: 'O editor diz que o livro só vende com histórias de ex-aliados.',
    opts: [
      ['Contar tudo', [fame(5), uni(-4), rep(-1), flag('livro_revelacoes')]],
      ['Versão leve', [fame(2), cred(1), rep(-1)]],
    ] }),
  k({ id: 'car_livro_sucesso', cat: 'opportunity', w: 4, cd: 500, cond: occ('livro'),
    title: 'Livro entra na lista dos mais vendidos', text: 'A turnê de lançamento lota livrarias.',
    opts: [['Fazer a turnê pelo país', [fame(4), rep(1)]]] }),

  // ─── Influenciador ───
  k({ id: 'car_infl_apostas', cat: 'scandal', w: 6, cd: 300, cond: occ('influenciador'),
    title: 'Patrocínio de site de apostas', text: 'Uma casa de apostas oferece um contrato milionário.',
    opts: [
      ['Aceitar', [fame(2), cred(-5), rep(-2)]],
      ['Recusar publicamente', [cred(2), fame(1)]],
    ] }),
  k({ id: 'car_infl_live', cat: 'media', w: 5, cd: 300, cond: occ('influenciador'),
    title: 'Live com um milhão de pessoas', text: 'Sua live sobre política bateu recorde.',
    opts: [
      ['Conteúdo de propostas', [fame(3), cred(1), rep(-1)]],
      ['Conteúdo de lacração', [fame(5), cred(-2)]],
    ] }),
  k({ id: 'car_infl_reality', cat: 'opportunity', w: 2, once: true, cond: occ('influenciador'),
    title: 'Convite para reality show', text: 'Um reality de celebridades quer você no elenco.',
    opts: [
      ['Aceitar', [fame(8), cred(-4), rep(-2)]],
      ['Recusar', [cred(1)]],
    ] }),

  // ─── Cargo internacional ───
  k({ id: 'car_int_crise', cat: 'opportunity', w: 5, cd: 400, cond: occ('internacional'),
    title: 'Crise global no seu organismo', text: 'Você lidera a resposta a uma crise humanitária.',
    opts: [
      ['Liderar a missão', [fame(3), cred(3), rep(1), rep(-1)]],
      ['Delegar e ficar no gabinete', [cred(1), rep(-1)]],
    ] }),
  k({ id: 'car_int_distancia', cat: 'politics', w: 4, cd: 400, cond: occ('internacional'),
    title: '"Esqueceu o Brasil"', text: 'Adversários dizem que você abandonou seus eleitores.',
    opts: [
      ['Visitar a base nas férias', [rep(1), fame(1), cred(-1)]],
      ['Ignorar', [fame(-2)]],
    ] }),

  // ─── Gerais (qualquer ocupação) ───
  k({ id: 'car_convite_partido', cat: 'party', w: 3, cd: 700,
    title: 'Outro partido quer você', text: 'Um partido oferece legenda e fundo para a próxima eleição.',
    opts: [
      ['Ouvir a proposta', [uni(-3), rep(1)]],
      ['Recusar e reafirmar lealdade', [uni(4)]],
    ] }),
  k({ id: 'car_espontanea', cat: 'politics', w: 3, cd: 500,
    title: 'Você aparece na pesquisa espontânea', text: 'Mesmo fora do cargo, eleitores lembram do seu nome.',
    opts: [['Comemorar com discrição', [fame(2), rep(1)]]] }),
  k({ id: 'car_ex_rival', cat: 'politics', w: 3, cd: 700, vars: { pessoa: V.pessoa },
    title: 'Ex-rival propõe reconciliação', text: '{pessoa}, que enfrentou você na última eleição, quer conversar.',
    opts: [
      ['Aceitar o café e a aliança futura', [rep(1), uni(-1), flag('aliado_ex_rival')]],
      ['Recusar', [uni(1)]],
    ] }),
  k({ id: 'car_aliado_ajuda', cat: 'party', w: 3, cd: 500,
    title: 'Velho aliado pede ajuda na campanha dele', text: 'Um aliado de longa data disputa uma eleição e pede seu apoio.',
    opts: [
      ['Subir no palanque', [fame(2), uni(2), rep(1), rep(-1)]],
      ['Apoio discreto', [uni(1), rep(-1)]],
    ] }),
  k({ id: 'car_processo', cat: 'scandal', w: 3, cd: 700, cond: (s) => (s.candidates[s.playerId]?.scandal ?? 0) >= 10,
    title: 'Processo antigo vai a julgamento', text: 'Um processo da época do mandato será julgado.',
    opts: [
      ['Contratar a melhor defesa', [esc(-3), rep(-1)]],
      ['Confiar na Justiça', [chain('car_processo_resultado', 120)]],
    ] }),
  k({ id: 'car_processo_resultado', cat: 'scandal', w: 0, chainOnly: true,
    title: 'Sai a sentença', text: 'O tribunal julgou o seu processo.',
    opts: [
      ['Absolvido: comemorar', [esc(-6), cred(3), rep(2), rep(-1)]],
      ['Condenado: recorrer', [esc(6), cred(-3), rep(-2), chain('jus_segunda_instancia', 365, 0.5)]],
    ] }),
  k({ id: 'car_estudos', cat: 'opportunity', w: 3, cd: 700,
    title: 'Curso no exterior', text: 'Uma universidade estrangeira oferece uma bolsa de um semestre.',
    opts: [
      ['Ir estudar', [cred(2), fame(-2), rep(1)]],
      ['Ficar perto da base', [fame(1)]],
    ] }),
  k({ id: 'car_oratoria', cat: 'opportunity', w: 3, cd: 700,
    title: 'Curso de oratória e mídia', text: 'Um preparador de candidatos oferece treinamento intensivo.',
    opts: [
      ['Fazer o curso', [{ type: 'attribute', attribute: 'oratory', delta: 3 }, { type: 'attribute', attribute: 'communication', delta: 2 }, rep(-1)]],
      ['Não precisa', []],
    ] }),
  k({ id: 'car_saude', cat: 'crisis', w: 2, cd: 900, cond: (s) => ageOf(s) >= 60,
    title: 'Check-up preocupante', text: 'Os médicos recomendam reduzir o ritmo.',
    opts: [
      ['Cuidar da saúde e contar ao público', [fame(1), cred(1), rep(1), rep(-1)]],
      ['Esconder e seguir', [flag('saude_escondida')]],
    ] }),
  k({ id: 'car_familia', cat: 'politics', w: 2, cd: 900,
    title: 'Família pede que você saia da política', text: 'Em casa, o pedido é para encerrar a vida pública.',
    opts: [
      ['Prometer desacelerar', [rep(-1), cred(1)]],
      ['Explicar que ainda há o que fazer', [fame(1)]],
    ] }),
  k({ id: 'car_movimento', cat: 'opportunity', w: 3, cd: 700,
    title: 'Movimento social convida você para liderar', text: 'Um movimento quer você como porta-voz.',
    opts: [
      ['Aceitar', [fame(2), rep(1), ideo({ economy: -3 }), rep(-1)]],
      ['Recusar', []],
    ] }),
  k({ id: 'car_associacao', cat: 'opportunity', w: 3, cd: 700,
    title: 'Associação empresarial convida você', text: 'Empresários querem você presidindo a associação.',
    opts: [
      ['Aceitar', [fame(2), rep(1), ideo({ economy: 3 }), rep(-1)]],
      ['Recusar', []],
    ] }),
  k({ id: 'car_documentario', cat: 'media', w: 2, cd: 900, cond: (s) => (s.candidates[s.playerId]?.fame ?? 0) >= 40,
    title: 'Documentário sobre sua carreira', text: 'Um serviço de streaming quer contar sua trajetória.',
    opts: [
      ['Participar', [fame(4), rep(1), rep(-1)]],
      ['Não autorizar', []],
    ] }),
  k({ id: 'car_pre_debate', cat: 'opportunity', w: 3, cd: 400,
    cond: (s) => {
      const y = Number(s.date.slice(0, 4));
      return y % 2 === 1;
    },
    title: 'Debate de pré-candidatos', text: 'Uma universidade reúne os possíveis candidatos do próximo ano.',
    opts: [
      ['Ir ao debate', [fame(3), cred(1), rep(1), rep(-1)]],
      ['Ainda não', []],
    ] }),
  k({ id: 'car_pesquisa_competitiva', cat: 'politics', w: 3, cd: 500,
    cond: (s) => s.career.reputation >= 55,
    title: 'Pesquisa mostra você competitivo', text: 'Seu nome aparece bem nas sondagens para a próxima eleição.',
    opts: [['Começar a montar a equipe', [uni(3), fame(1), rep(1)]]] }),
  k({ id: 'car_vice_convite', cat: 'party', w: 2, cd: 700,
    title: 'Convite para ser vice', text: 'Um aliado quer você como vice na próxima chapa majoritária.',
    opts: [
      ['Aceitar conversar', [rep(1), uni(2), flag('convite_vice'), rep(-1)]],
      ['Preferir encabeçar a própria chapa', [fame(1), rep(-1)]],
    ] }),
  k({ id: 'car_polemica_antiga', cat: 'media', w: 2, cd: 900, neg: true,
    title: 'Polêmica antiga ressurge', text: 'Um vídeo seu de anos atrás voltou a circular.',
    opts: [
      ['Pedir desculpas', [cred(1), fame(1), rep(-1)]],
      ['Dizer que mudou de opinião', [rep(-1)]],
    ] }),
  k({ id: 'car_fundacao', cat: 'opportunity', w: 2, once: true, cond: (s) => s.career.offices.length >= 2,
    title: 'Fundação com o seu nome', text: 'Ex-assessores propõem uma fundação para o seu legado.',
    opts: [
      ['Criar a fundação', [cred(2), rep(2), hist('event', 'Criou uma fundação com seu nome', 1, 2), rep(-1)]],
      ['Não agora', []],
    ] }),
];
