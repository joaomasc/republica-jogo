/**
 * Justiça Eleitoral e Ficha Limpa: prestação de contas, cassação e inelegibilidade.
 * Fonte: docs/ROADMAP_DINAMISMO.md (blocos 5 e 7) e BANCO_DE_CONTEUDO.md (arcos 2.6).
 */
import {
  ANY, apr, CAMP, cap, CAREER, caixa2, cash, cassar, chain, cred, ene, esc, ev, hist, inelegivel, rel, rep, V,
} from '../dsl';
import type { GamePhase } from '../../simulation/state';
import type { EventDefinition } from '../types';

/** Fases em que processos andam (dentro e fora do cargo). */
const ALL: GamePhase[] = [...ANY, ...CAREER];
const inOffice = (s: { government: unknown }): boolean => !!s.government;
/** Nome e pasta do auxiliar (o motor passa os reais ao disparar). */
const AUXILIAR = { pessoa: V.pessoa, pasta: () => 'administração' };

export const JUSTICE_EVENTS: EventDefinition[] = [
  // ─── Caixa 2 durante a campanha ───
  ev({ id: 'jus_caixa2_oferta', cat: 'scandal', phases: CAMP, w: 3, cd: 40,
    cond: (s) => !!s.campaign && s.campaign.money < 250_000 * s.campaign.moneyScale,
    title: 'Proposta de caixa 2', text: 'Um operador oferece dinheiro vivo para a reta final — sem recibo.',
    opts: [
      ['Recusar e avisar a equipe jurídica', [cred(2), ene(-3)]],
      ['Aceitar por fora', [caixa2(400_000), esc(4)]],
    ] }),

  // ─── Prestação de contas (agendado pelo motor após a eleição) ───
  ev({ id: 'jus_contas', cat: 'scandal', phases: ALL, w: 0, chainOnly: true, neg: true,
    title: 'TSE rejeita sua prestação de contas', text: 'A auditoria encontrou recursos não declarados na campanha.',
    opts: [
      ['Pagar a multa e reconhecer o erro', [esc(8), rep(-3), cred(-2)]],
      ['Recorrer', [esc(4), chain('jus_cassacao', 60, 0.6)]],
    ] }),
  ev({ id: 'jus_cassacao', cat: 'crisis', phases: ALL, w: 0, chainOnly: true, neg: true, cond: inOffice,
    title: 'Ação de cassação por abuso de poder econômico', text: 'O Ministério Público Eleitoral pede a cassação do seu mandato.',
    opts: [
      ['Defesa técnica até o fim', [esc(4), chain('jus_cassado', 90, 0.5)]],
      ['Renunciar para evitar a inelegibilidade', [cassar('Renunciou ao mandato durante processo de cassação'), rep(-6), hist('scandal', 'Renunciou para escapar da cassação', -1, 3)]],
    ] }),
  ev({ id: 'jus_cassado', cat: 'crisis', phases: ALL, w: 0, chainOnly: true, neg: true,
    title: 'TSE cassa o seu mandato', text: 'Por maioria, o tribunal cassou o mandato e declarou a inelegibilidade.',
    opts: [['Acatar a decisão', [cassar('Mandato cassado pelo TSE (abuso de poder econômico)'), inelegivel(8), rep(-10), esc(10)]]] }),

  // ─── Ficha Limpa (condenação em 2ª instância) ───
  ev({ id: 'jus_segunda_instancia', cat: 'crisis', phases: ALL, w: 0, chainOnly: true, neg: true,
    title: 'Condenação em segunda instância', text: 'O tribunal confirmou a condenação. Pela Lei da Ficha Limpa, você fica inelegível.',
    opts: [
      ['Recorrer aos tribunais superiores', [inelegivel(8), rep(-5), chain('jus_stf_absolve', 365, 0.25)]],
      ['Anunciar afastamento da vida pública', [inelegivel(8), rep(-3), cred(2)]],
    ] }),
  ev({ id: 'jus_stf_absolve', cat: 'politics', phases: ALL, w: 0, chainOnly: true,
    title: 'Tribunal superior anula a condenação', text: 'A defesa venceu: a condenação foi anulada e você volta a ser elegível.',
    opts: [['Comemorar com discrição', [{ type: 'ineligible', years: -100 }, rep(4), cred(3)]]] }),

  // ─── Gabinete com personalidades (disparados pelo motor) ───
  ev({ id: 'cab_ministro_escandalo', cat: 'scandal', phases: ['governing'], w: 0, chainOnly: true, neg: true, vars: AUXILIAR,
    title: 'Escândalo na pasta de {pasta}', text: '{pessoa}, responsável pela pasta de {pasta}, é acusado de favorecer empresas.',
    opts: [
      ['Exonerar {pessoa}', [{ type: 'dismissMinister' }, cred(2), cap(-3)]],
      ['Defender o auxiliar', [esc(8), apr(-3)]],
    ] }),
  ev({ id: 'cab_ministro_vaza', cat: 'media', phases: ['governing'], w: 0, chainOnly: true, neg: true, vars: AUXILIAR,
    title: '{pessoa} vaza bastidores do governo', text: 'Insatisfeito, o titular de {pasta} conta à imprensa as brigas internas.',
    opts: [
      ['Exonerar {pessoa}', [{ type: 'dismissMinister' }, cap(-2), rel('context', -5)]],
      ['Enquadrar em reunião reservada', [cap(-1), apr(-1)]],
    ] }),

  // ─── Processos que podem levar à Ficha Limpa ───
  ev({ id: 'jus_improbidade', cat: 'scandal', phases: ALL, w: 2, cd: 900, neg: true,
    cond: (s) => (s.candidates[s.playerId]?.scandal ?? 0) >= 18,
    title: 'Ação de improbidade administrativa', text: 'O Ministério Público abre ação por atos do seu mandato.',
    opts: [
      ['Contratar defesa forte', [cash(-60_000), rep(-1), chain('jus_segunda_instancia', 540, 0.2)]],
      ['Defesa simples', [chain('jus_segunda_instancia', 540, 0.45)]],
    ] }),
];
