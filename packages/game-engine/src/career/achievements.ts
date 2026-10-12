/**
 * CONQUISTAS E LEGADO (bloco 4C).
 *
 * O motor só diz quais conquistas o estado atual satisfaz (função pura); quem guarda as
 * desbloqueadas entre partidas é a interface (perfil local do jogador).
 * Fonte: docs/BANCO_DE_CONTEUDO.md, seção 15.
 */
import { OFFICES, type OfficeId } from '../election/offices';
import { partySize } from '../parties/parties';
import type { GameState } from '../simulation/state';

export type AchievementCategory =
  'campanha' | 'governo' | 'carreira' | 'desafio' | 'curiosidade' | 'catalogo';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  check: (s: GameState) => boolean;
}

const won = (s: GameState) => s.career.elections.filter((e) => e.won);
const majoritarian = (officeId: OfficeId) => OFFICES[officeId].system === 'majoritarian';
const logChose = (s: GameState, eventId: string, label?: string) =>
  s.events.log.some((e) => e.eventId === eventId && (!label || e.choiceLabel === label));
const fired = (s: GameState, eventId: string) => (s.events.firedCount[eventId] ?? 0) > 0;
const historyHas = (s: GameState, text: string) => s.history.some((h) => h.title.includes(text));
const officesHeld = (s: GameState) => new Set(s.career.offices.map((o) => o.officeId));
const playerParty = (s: GameState) => s.parties[s.candidates[s.playerId]?.partyId ?? ''];

/** Resultado da eleição atual (concluída) com o jogador vencedor. */
function currentWin(s: GameState): { pct: number; margin: number } | null {
  const el = s.election;
  if (!el || el.status !== 'finished' || !el.outcome?.won) return null;
  const last = el.results[el.results.length - 1];
  if (!last) return null;
  const mine = last.pct[s.playerId] ?? 0;
  const second = Math.max(
    0,
    ...last.ranking.filter((id) => id !== s.playerId).map((id) => last.pct[id] ?? 0),
  );
  return { pct: mine, margin: mine - second };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ─── Campanha ───
  {
    id: 'primeira_vitoria',
    name: 'Primeira vitória',
    description: 'Vencer qualquer eleição.',
    category: 'campanha',
    icon: 'award',
    check: (s) => won(s).length > 0,
  },
  {
    id: 'primeiro_turno',
    name: 'No primeiro turno',
    description: 'Vencer eleição majoritária sem 2º turno.',
    category: 'campanha',
    icon: 'zap',
    check: (s) => won(s).some((e) => majoritarian(e.officeId) && e.round === 1),
  },
  {
    id: 'davi',
    name: 'Davi contra Golias',
    description: 'Vencer eleição majoritária com partido pequeno.',
    category: 'campanha',
    icon: 'swords',
    check: (s) =>
      !!currentWin(s) &&
      majoritarian(s.election!.officeId) &&
      partySize(playerParty(s) ?? null) === 'pequeno',
  },
  {
    id: 'unanimidade',
    name: 'Unanimidade',
    description: 'Mais de 70% dos votos válidos.',
    category: 'campanha',
    icon: 'star',
    check: (s) => won(s).some((e) => e.pct >= 0.7),
  },
  {
    id: 'por_um_fio',
    name: 'Por um fio',
    description: 'Vencer por menos de 0,5 ponto.',
    category: 'campanha',
    icon: 'scale',
    check: (s) => {
      const w = currentWin(s);
      return !!w && majoritarian(s.election!.officeId) && w.margin < 0.005;
    },
  },
  {
    id: 'promessa_nenhuma',
    name: 'Promessa nenhuma',
    description: 'Vencer sem fazer promessas.',
    category: 'campanha',
    icon: 'ban',
    check: (s) => !!currentWin(s) && s.promises.length === 0,
  },
  {
    id: 'estreante',
    name: 'Estreante',
    description: 'Vencer na primeira eleição da carreira.',
    category: 'campanha',
    icon: 'sparkles',
    check: (s) => s.career.elections[0]?.won === true,
  },
  {
    id: 'sobrevivente',
    name: 'Sobrevivente',
    description: 'Vencer com escândalo acima de 30.',
    category: 'campanha',
    icon: 'shield',
    check: (s) => !!currentWin(s) && (s.candidates[s.playerId]?.scandal ?? 0) > 30,
  },
  {
    id: 'rival_derrotado',
    name: 'Rival derrotado',
    description: 'Vencer o mesmo rival três vezes.',
    category: 'campanha',
    icon: 'swords',
    check: (s) => Object.values(s.rivals ?? {}).some((r) => r.memory.lostToPlayer >= 3),
  },
  {
    id: 'revanche',
    name: 'Revanche',
    description: 'Vencer quem já te derrotou.',
    category: 'campanha',
    icon: 'award',
    check: (s) =>
      Object.values(s.rivals ?? {}).some(
        (r) => r.memory.beatPlayer >= 1 && r.memory.lostToPlayer >= 1,
      ),
  },
  {
    id: 'arco_iris',
    name: 'Coalizão arco-íris',
    description: 'Receber 3 apoios no 2º turno.',
    category: 'campanha',
    icon: 'handshake',
    check: (s) => (s.election?.runoffDeals ?? []).filter((d) => d.status === 'player').length >= 3,
  },
  {
    id: 'vice_aliado',
    name: 'Chapa ampla',
    description: 'Disputar com vice de partido aliado.',
    category: 'campanha',
    icon: 'users',
    check: (s) =>
      !!s.campaign?.runningMate &&
      s.campaign.runningMate.partyId !== s.candidates[s.playerId]?.partyId,
  },
  {
    id: 'caixa_limpo',
    name: 'Doador zero',
    description: 'Vencer sem um centavo de caixa 2.',
    category: 'campanha',
    icon: 'piggy-bank',
    check: (s) => !!currentWin(s) && (s.campaign?.undeclared ?? 0) === 0,
  },

  // ─── Governo ───
  {
    id: 'lua_de_mel',
    name: 'Lua de mel eterna',
    description: 'Terminar o 1º ano com aprovação acima de 60%.',
    category: 'governo',
    icon: 'smile',
    check: (s) => {
      const g = s.government;
      return !!g && g.monthsInOffice >= 12 && (g.approvalHistory[12]?.value ?? 0) > 60;
    },
  },
  {
    id: 'fim_popular',
    name: 'Fim de mandato popular',
    description: 'Sair com aprovação acima de 65%.',
    category: 'governo',
    icon: 'party-popper',
    check: (s) => (s.career.lastEvaluation?.approval ?? 0) > 65,
  },
  {
    id: 'obreiro',
    name: 'Obreiro',
    description: 'Inaugurar 10 obras.',
    category: 'governo',
    icon: 'construction',
    check: (s) => s.history.filter((h) => h.title.startsWith('Inaugurou:')).length >= 10,
  },
  {
    id: 'legislador',
    name: 'Legislador',
    description: 'Aprovar 10 leis de sua autoria num mandato.',
    category: 'governo',
    icon: 'gavel',
    check: (s) => (s.government?.billsPassed ?? 0) >= 10,
  },
  {
    id: 'reformista',
    name: 'Reformista',
    description: 'Aprovar uma PEC.',
    category: 'governo',
    icon: 'scroll',
    check: (s) =>
      s.laws.bills.some(
        (b) => b.instrument === 'pec' && b.status === 'passed' && b.authorId !== 'npc',
      ),
  },
  {
    id: 'impeachment_barrado',
    name: 'Impeachment barrado',
    description: 'Sobreviver a um processo de impeachment.',
    category: 'governo',
    icon: 'shield',
    check: (s) => historyHas(s, 'Sobreviveu ao processo de impeachment'),
  },
  {
    id: 'plebiscito',
    name: 'Plebiscito vencido',
    description: 'Vencer um plebiscito.',
    category: 'governo',
    icon: 'vote',
    check: (s) => logChose(s, 'arc_plebiscito_2', 'Sua posição venceu'),
  },
  {
    id: 'reeleito',
    name: 'Reeleito',
    description: 'Vencer a reeleição.',
    category: 'governo',
    icon: 'award',
    check: (s) => s.career.consecutiveTerms >= 2,
  },
  {
    id: 'gabinete_renovado',
    name: 'Governo renovado',
    description: 'Chegar ao 3º ano sem desgaste acumulado acima de 5.',
    category: 'governo',
    icon: 'sparkles',
    check: (s) => {
      const g = s.government;
      return !!g && g.monthsInOffice >= 30 && (g.wear ?? 0) <= 5;
    },
  },
  {
    id: 'aliado_federal',
    name: 'Federalista',
    description: 'Governar alinhado ao governador e ao presidente.',
    category: 'governo',
    icon: 'landmark',
    check: (s) => {
      const g = s.government;
      const pid = s.candidates[s.playerId]?.partyId;
      return (
        !!g &&
        g.jurisdiction.level === 'municipal' &&
        s.landscape.presidentPartyId === pid &&
        s.landscape.governors[g.jurisdiction.stateId as keyof typeof s.landscape.governors] === pid
      );
    },
  },
  {
    id: 'pacificador',
    name: 'Pacificador',
    description: 'Acalmar as ruas com diálogo.',
    category: 'governo',
    icon: 'heart-handshake',
    check: (s) =>
      logChose(s, 'est_protesto_palacio', 'Anunciar pacote de medidas') ||
      logChose(s, 'fed_manifestacao_contra', 'Abrir diálogo'),
  },
  {
    id: 'heroi_enchente',
    name: 'Herói da enchente',
    description: 'Assumir o comando no local de uma cheia.',
    category: 'governo',
    icon: 'droplets',
    check: (s) =>
      logChose(s, 'arc_enchente_2', 'Assumir o comando no local') ||
      logChose(s, 'est_enchente', 'Gabinete de crise no local'),
  },

  // ─── Carreira ───
  {
    id: 'vereador_presidente',
    name: 'De vereador a presidente',
    description: 'Ocupar os dois cargos na mesma carreira.',
    category: 'carreira',
    icon: 'route',
    check: (s) => officesHeld(s).has('vereador') && officesHeld(s).has('presidente'),
  },
  {
    id: 'escada',
    name: 'Escada completa',
    description: 'Vereador, prefeito, deputado, governador, senador e presidente.',
    category: 'carreira',
    icon: 'trending-up',
    check: (s) => {
      const o = officesHeld(s);
      return (
        o.has('vereador') &&
        o.has('prefeito') &&
        (o.has('deputado_estadual') || o.has('deputado_federal')) &&
        o.has('governador') &&
        o.has('senador') &&
        o.has('presidente')
      );
    },
  },
  {
    id: 'fiel',
    name: 'Fiel',
    description: 'Três eleições sem trocar de partido.',
    category: 'carreira',
    icon: 'flag',
    check: (s) => s.career.partyHistory.length === 1 && s.career.elections.length >= 3,
  },
  {
    id: 'camaleao',
    name: 'Camaleão',
    description: 'Vencer por 4 partidos diferentes.',
    category: 'carreira',
    icon: 'arrow-left-right',
    check: (s) => new Set(won(s).map((e) => e.partyId)).size >= 4,
  },
  {
    id: 'veterano',
    name: 'Veterano',
    description: '30 anos de vida pública.',
    category: 'carreira',
    icon: 'hourglass',
    check: (s) => {
      const first = s.career.elections[0]?.year;
      return !!first && Number(s.date.slice(0, 4)) - first >= 30;
    },
  },
  {
    id: 'volta_por_cima',
    name: 'Volta por cima',
    description: 'Vencer depois de ficar inelegível.',
    category: 'carreira',
    icon: 'trending-up',
    check: (s) => {
      const until = s.career.ineligibleUntil ?? 0;
      return until > 0 && won(s).some((e) => e.year > until);
    },
  },
  {
    id: 'aposentado',
    name: 'Aposentado em paz',
    description: 'Aposentar-se com reputação acima de 80.',
    category: 'carreira',
    icon: 'sofa',
    check: (s) => s.career.retired && s.career.reputation > 80,
  },
  {
    id: 'duas_cidades',
    name: 'Prefeito de duas cidades',
    description: 'Governar duas cidades diferentes.',
    category: 'carreira',
    icon: 'building',
    check: (s) =>
      new Set(
        s.career.offices.filter((o) => o.officeId === 'prefeito').map((o) => o.jurisdictionLabel),
      ).size >= 2,
  },
  {
    id: 'dois_estados',
    name: 'Nacionalizado',
    description: 'Governar dois estados diferentes.',
    category: 'carreira',
    icon: 'map',
    check: (s) =>
      new Set(
        s.career.offices.filter((o) => o.officeId === 'governador').map((o) => o.jurisdictionLabel),
      ).size >= 2,
  },
  {
    id: 'senador_vitalicio',
    name: 'Senador vitalício',
    description: 'Três mandatos de senador.',
    category: 'carreira',
    icon: 'landmark',
    check: (s) => s.career.offices.filter((o) => o.officeId === 'senador').length >= 3,
  },
  {
    id: 'sem_idade',
    name: 'Sem idade',
    description: 'Ser eleito depois dos 75.',
    category: 'carreira',
    icon: 'hourglass',
    check: (s) => !!currentWin(s) && (s.candidates[s.playerId]?.age ?? 0) > 75,
  },
  {
    id: 'jovem_prodigio',
    name: 'Jovem prodígio',
    description: 'Eleger-se prefeito antes dos 30.',
    category: 'carreira',
    icon: 'rocket',
    check: (s) =>
      !!currentWin(s) &&
      s.election?.officeId === 'prefeito' &&
      (s.candidates[s.playerId]?.age ?? 99) < 30,
  },
  {
    id: 'todos_cargos',
    name: 'Todos os cargos',
    description: 'Disputar os 7 cargos.',
    category: 'carreira',
    icon: 'layers',
    check: (s) => new Set(s.career.elections.map((e) => e.officeId)).size >= 7,
  },
  {
    id: 'nemesis',
    name: 'Arqui-inimigo',
    description: 'Ganhar um nêmesis.',
    category: 'carreira',
    icon: 'swords',
    check: (s) =>
      Object.values(s.rivals ?? {}).some(
        (r) => r.memory.confrontations >= 2 && r.memory.beatPlayer + r.memory.lostToPlayer >= 2,
      ),
  },
  {
    id: 'comentarista',
    name: 'Na telinha',
    description: 'Virar âncora de TV na entressafra.',
    category: 'carreira',
    icon: 'tv',
    check: (s) => (s.events.flags?.ancora_tv ?? 0) > 0,
  },
  {
    id: 'fundador',
    name: 'Fundador',
    description: 'Fundar o próprio partido.',
    category: 'carreira',
    icon: 'sparkles',
    check: (s) => s.history.some((h) => h.title.startsWith('Funda o ')),
  },

  // ─── Desafios ───
  {
    id: 'simulacao',
    name: 'Modo simulação',
    description: 'Vencer na dificuldade Simulação.',
    category: 'desafio',
    icon: 'gauge',
    check: (s) => !!currentWin(s) && s.settings.difficulty === 'simulation',
  },
  {
    id: 'parodia',
    name: 'Paródia',
    description: 'Vencer no mundo paródia.',
    category: 'desafio',
    icon: 'smile',
    check: (s) => !!currentWin(s) && s.settings.world === 'parody',
  },
  {
    id: 'brasil_real',
    name: 'Brasil real',
    description: 'Vencer no mundo dos partidos reais.',
    category: 'desafio',
    icon: 'flag',
    check: (s) => !!currentWin(s) && s.settings.world === 'real',
  },
  {
    id: 'cassado',
    name: 'Ficha suja',
    description: 'Perder o mandato por cassação.',
    category: 'desafio',
    icon: 'triangle-alert',
    check: (s) => historyHas(s, 'cassado'),
  },

  // ─── Curiosidades ───
  {
    id: 'caramelo',
    name: 'Caramelo',
    description: 'Adotar um cachorro na campanha.',
    category: 'curiosidade',
    icon: 'heart-handshake',
    check: (s) => logChose(s, 'camp_caramelo', 'Adotar o cachorro na frente das câmeras'),
  },
  {
    id: 'chuva',
    name: 'Na chuva',
    description: 'Discursar debaixo de temporal.',
    category: 'curiosidade',
    icon: 'droplets',
    check: (s) => logChose(s, 'camp_chuva_comicio', 'Discursar na chuva'),
  },
  {
    id: 'pastel',
    name: 'Pastel de feira',
    description: 'Comer pastel na feira.',
    category: 'curiosidade',
    icon: 'store',
    check: (s) => logChose(s, 'camp_pastel_feira', 'Comer e conversar com calma'),
  },
  {
    id: 'onibus',
    name: 'Ônibus lotado',
    description: 'Pegar ônibus na hora do rush.',
    category: 'curiosidade',
    icon: 'bus',
    check: (s) => logChose(s, 'camp_onibus_lotado', 'Pegar o ônibus'),
  },
  {
    id: 'meme_vitoria',
    name: 'Meme',
    description: 'Virar meme e ainda vencer.',
    category: 'curiosidade',
    icon: 'smile',
    check: (s) => !!currentWin(s) && (fired(s, 'camp_meme_contra') || fired(s, 'camp_preco_pao')),
  },
  {
    id: 'pneu',
    name: 'Mecânico',
    description: 'Trocar o pneu da caravana.',
    category: 'curiosidade',
    icon: 'truck',
    check: (s) => logChose(s, 'camp_pneu_furado', 'Trocar você mesmo e filmar'),
  },
  {
    id: 'cirio',
    name: 'Romeiro',
    description: 'Acompanhar o Círio de Nazaré.',
    category: 'curiosidade',
    icon: 'hand-heart',
    check: (s) => logChose(s, 'camp_cirio', 'Acompanhar a procissão'),
  },
  {
    id: 'farroupilha',
    name: 'Pilchado',
    description: 'Ir pilchado à Semana Farroupilha.',
    category: 'curiosidade',
    icon: 'flag',
    check: (s) => logChose(s, 'camp_farroupilha', 'Ir pilchado ao acampamento'),
  },
  {
    id: 'duelo',
    name: 'O duelo',
    description: 'Enfrentar o nêmesis num debate só entre vocês.',
    category: 'curiosidade',
    icon: 'mic-vocal',
    check: (s) => fired(s, 'arc_nemesis_duelo'),
  },

  // ─── Catálogo ───
  {
    id: 'colecionador',
    name: 'Colecionador de eventos',
    description: 'Ver 100 eventos diferentes numa partida.',
    category: 'catalogo',
    icon: 'library',
    check: (s) => Object.keys(s.events.firedCount).length >= 100,
  },
  {
    id: 'mestre_arcos',
    name: 'Mestre dos arcos',
    description: 'Chegar ao desfecho de 10 arcos narrativos.',
    category: 'catalogo',
    icon: 'book-open',
    check: (s) =>
      Object.keys(s.events.firedCount).filter(
        (id) => id.startsWith('arc_') && /_(3|4|final|vaza|cassado|duelo)$/.test(id),
      ).length >= 10,
  },
  {
    id: 'gabinete_mensal',
    name: 'Gestor',
    description: 'Tomar 12 decisões no gabinete mensal.',
    category: 'catalogo',
    icon: 'clipboard-check',
    check: (s) => (s.government?.cabinet?.index ?? 0) >= 12,
  },
];

/** Ids das conquistas que o estado atual satisfaz. */
export function satisfiedAchievements(state: GameState): string[] {
  const out: string[] = [];
  for (const a of ACHIEVEMENTS) {
    try {
      if (a.check(state)) out.push(a.id);
    } catch {
      // Estados parciais (saves antigos) simplesmente não desbloqueiam.
    }
  }
  return out;
}

/**
 * Placar de legado da carreira (0–100): cargos, mandatos, leis, promessas, aprovação e escândalos.
 */
export function legacyScore(state: GameState): {
  score: number;
  parts: { label: string; value: number }[];
} {
  const OFFICE_WEIGHT: Record<OfficeId, number> = {
    vereador: 4,
    prefeito: 8,
    deputado_estadual: 5,
    deputado_federal: 7,
    senador: 10,
    governador: 12,
    presidente: 18,
  };
  const offices = state.career.offices;
  const cargos = Math.min(
    40,
    offices.reduce((a, o) => a + OFFICE_WEIGHT[o.officeId], 0),
  );
  const vitorias = Math.min(15, state.career.elections.filter((e) => e.won).length * 3);
  const evalApproval = state.career.lastEvaluation?.approval ?? 50;
  const aprovacao = Math.max(0, Math.min(20, (evalApproval - 30) / 2));
  const promessas = Math.min(15, (state.career.lastEvaluation?.fulfillmentRate ?? 0.5) * 15);
  const reputacao = Math.min(10, state.career.reputation / 10);
  const escandalo = Math.min(20, (state.candidates[state.playerId]?.scandal ?? 0) / 2);
  const parts = [
    { label: 'Cargos', value: cargos },
    { label: 'Vitórias', value: vitorias },
    { label: 'Aprovação', value: aprovacao },
    { label: 'Promessas', value: promessas },
    { label: 'Reputação', value: reputacao },
    { label: 'Escândalos', value: -escandalo },
  ];
  const score = Math.max(0, Math.min(100, Math.round(parts.reduce((a, p) => a + p.value, 0))));
  return { score, parts: parts.map((p) => ({ ...p, value: Math.round(p.value) })) };
}
