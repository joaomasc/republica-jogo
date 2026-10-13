/**
 * GATILHOS TEMÁTICOS DOS EVENTOS — por que um evento saiu agora.
 *
 * Cada evento sorteável sem condição própria é ligado a um tema (saúde, educação, segurança,
 * cidade, trabalho, economia, clima, integridade, ruas; e, na campanha, rivais, posição nas
 * pesquisas, militância, mídia, partido). O tema lê o estado do jogo e dá um nível de "tensão"
 * de 0 (tudo bem) a 1 (crise), com uma frase que explica o porquê:
 *
 * - evento negativo: chance × 3^(2·tensão − 1) — de 1/3 (tudo bem) a 3× (crise);
 * - evento positivo: o inverso (oportunidades aparecem quando as coisas vão bem);
 * - com tensão muito baixa, o evento negativo nem entra no sorteio (e vice-versa).
 *
 * Evento sem tema é IMPREVISTO: sai por sorteio e a interface diz isso com todas as letras.
 */
import { BUDGET_INFO, serviceQuality } from '../economy/budget';
import type { BudgetCategory } from '../economy/types';
import type { IssueId } from '../ideology/issues';
import { latestPoll } from '../election/polls';
import { OTHERS_KEY } from '../election/voterModel';
import type { InterestGroupId } from '../politics/types';
import type { GameState } from '../simulation/state';
import { groupRadicalismOf, sphereOf } from './conditions';
import type { EventDefinition } from './types';

export type DriverId =
  | 'health'
  | 'education'
  | 'security'
  | 'city'
  | 'labor'
  | 'economy'
  | 'rain'
  | 'drought'
  | 'environment'
  | 'integrity'
  | 'unrest'
  | 'rivals'
  | 'standing'
  | 'base'
  | 'media'
  | 'party';

export interface DriverReading {
  /** 0 = tudo bem … 1 = crise. */
  stress: number;
  /** Frase curta com o dado que explica ("Saúde: serviço 12% abaixo do padrão"). */
  cause: string;
}

/** Imprevistos de fato, mesmo que o nome lembre um tema (festa, saúde do candidato, rotina). */
const NONE =
  /escola_samba|marcha_prefeitos|marcha_jesus|health_scare|governador_rival|prefeito_capital_rival/;

/** Regras de associação (a primeira que casa com o id vence). */
const RULES: [RegExp, DriverId][] = [
  [/lei_seca/, 'security'],
  [/mao_de_obra|mao_obra|tarifa_aco|energia_preco/, 'economy'],
  [/crise_poderes/, 'unrest'],
  [/greve|sindicato|paralisa|caminhoneiros|garis|strike/, 'labor'],
  [
    /propina|corrup|escandal|scandal|investigat|investiga|operacao|preso|dossie|vaza|lobby|lobista|fantasma|verba_gabinete|emenda_ong|primo_|amigo_|construtora|audio_vazado|imovel_nao_declarado|foto_investigado|servidor_corrupto|pgr|tcu|tesoureiro|grilagem|bribe|pedido_emprego|colega_escandalo|etica/,
    'integrity',
  ],
  [
    /fila_upa|farmacia|cirurgia|santa_casa|saude|vacin|_uti|hospital|medico|epidem|sus_colapso|fila_sus|dengue|gripe|alto_custo|catarata|aftosa|remedio/,
    'health',
  ],
  [
    /creche|merenda|escola|ideb|integral|ensino|universidade|enem|alfabetiza|educa|cotas|estagio|aula|tecnica|bolsas|student/,
    'education',
  ],
  [
    /violen|seguranca|guarda|camera|feminic|faccao|faccoes|milicia|letalidade|rebeliao|presidio|roubo|crime|policia|_pm|chacina|ataque_escola|delegacia|drogas|antifaccao|armas|_glo|cracolandia|vigilancia|jovem_morto|policial|retomada|conflito/,
    'security',
  ],
  [
    /chuva|enchente|flood|granizo|deslizamento|alagamento|tragedia_morro|erosao|serra_chuvas/,
    'rain',
  ],
  [/seca|estiagem|queimada|incendio|calor|hidrica|cantareira|agua_|_agua/, 'drought'],
  [
    /barragem|oleo_litoral|desmatamento|garimpo|rio_poluido|lixao|po_preto|peixes|botos|rio_doce/,
    'environment',
  ],
  [
    /buraco|bueiro|calcada|iluminacao|mato_|lixo|reciclag|cemiterio|banheiro|pombo|patrimonio|bairro_esquecido|telhado|rodoviaria|ponte|rodovia|estrada|pedagio|saneamento|esgoto|onibus|brt|tarifa|ciclovia|patinete|passe_livre|metro|(^|_)obra|viaduto|apagao|energia|internet|wifi|transporte|motos/,
    'city',
  ],
  [
    /fabrica|desemprego|fecha|montadora|automaker|investment|commodity|harvest|safra|crise|dolar|inflacao|juros|gasolina|combustivel|fuel|preco|tarifa_aco|embargo|china_soja|bancos|calote|aluguel|frigorifico|startup|comercio|shopping|iptu|refis|icms|guerra_fiscal|divida|royalties|emprestimo|mao_de_obra|mao_obra|fome|pobreza|turismo|boom|global_crisis|polo|calcados|textil|usina/,
    'economy',
  ],
  [/protest|manifesta|ocupacao|marcha|esplanada|galerias|desabafa|comite_pichado/, 'unrest'],
  [
    /fake|meme_contra|rival|ataque_pessoal|impugnacao|robos|checagem|old_post|celebridade_critica|ancora_provoca|vaza_estrategia|opponent_scandal|nemesis/,
    'rivals',
  ],
  [
    /donor|doador|jantar|adesao|celebrity|celebridade_local|instituto_amigo|alliance|coligacao|endorsement|lideranca|carta_empresarios|frente_agro|central_sindical|bispo|poder_religioso|community_leaders|convite|vice_convite|aliado/,
    'standing',
  ],
  [/volunteer|militan|carreata|jingle|comicio|showmicio|cabos|santinho|grafica/, 'base'],
  [
    /viral|prime_time|live_|dancinha|meme_favoravel|podcast|radio|artigo|tv_|entrevista|corte_viraliza|discurso|redes|lacrar|ranking|documentario/,
    'media',
  ],
];

/** Tema por categoria quando o id não diz nada. */
const CATEGORY_DRIVER: Partial<Record<EventDefinition['category'], DriverId>> = {
  scandal: 'integrity',
  economy: 'economy',
  party: 'party',
};

const cache = new WeakMap<EventDefinition, DriverId | null>();

/** Tema do evento (null = imprevisto). Eventos com gatilho próprio não usam tema. */
export function driverOf(def: EventDefinition): DriverId | null {
  if (def.chainOnly || def.condition || def.weightModifier) return null;
  const hit = cache.get(def);
  if (hit !== undefined) return hit;
  const id = def.id;
  const rule = NONE.test(id) ? undefined : RULES.find(([re]) => re.test(id));
  const out = rule?.[1] ?? (NONE.test(id) ? null : (CATEGORY_DRIVER[def.category] ?? null));
  cache.set(def, out);
  return out;
}

/** O evento sai por puro sorteio (sem condição, peso dinâmico, calendário ou tema)? */
export function isUnforeseen(def: EventDefinition): boolean {
  return !def.chainOnly && !def.condition && !def.weightModifier && !def.months && !driverOf(def);
}

/* ───────────── Leituras do estado ───────────── */

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const pct = (v: number): string => `${Math.round(v * 100)}%`;

/** Pops da esfera do jogador (UF da eleição ou do mandato; o país inteiro no federal). */
function sphereStateId(s: GameState): string | null {
  return sphereOf(s)?.stateId ?? null;
}

/** Fração dos eleitores (por tamanho) que tem o tema entre os 3 maiores problemas. */
function salience(s: GameState, issue: IssueId): number {
  const uf = sphereStateId(s);
  let num = 0;
  let den = 0;
  for (const pop of Object.values(s.population.pops)) {
    if (uf && pop.stateId !== uf) continue;
    den += pop.size;
    if (pop.problems.includes(issue)) num += pop.size;
  }
  return den > 0 ? num / den : 0.3;
}

/** Tensão de um serviço: qualidade do orçamento (no Executivo) e o quanto o tema incomoda. */
function serviceReading(
  s: GameState,
  name: string,
  category: BudgetCategory,
  issue: IssueId,
): DriverReading {
  const sal = salience(s, issue);
  const salStress = clamp01(sal / 0.6);
  const gov = s.government;
  if (gov?.budget && gov.branch === 'executive') {
    const q = serviceQuality(s, category);
    const qStress = clamp01(0.5 - (q - 1) * 1.6);
    const gap = Math.round((q - 1) * 100);
    const where =
      gap === 0 ? 'no padrão' : `${Math.abs(gap)}% ${gap > 0 ? 'acima' : 'abaixo'} do padrão`;
    return {
      stress: clamp01(0.65 * qStress + 0.35 * salStress),
      cause: `${name}: serviço ${where} (orçamento de ${BUDGET_INFO[category].name.toLowerCase()}); ${pct(sal)} dos eleitores citam o tema`,
    };
  }
  return {
    stress: salStress,
    cause: `${name}: ${pct(sal)} dos eleitores citam o tema entre os maiores problemas`,
  };
}

function economyReading(s: GameState): DriverReading {
  const e = s.economy;
  const uf = sphereStateId(s);
  const unemployment =
    (uf ? s.regions[uf as keyof typeof s.regions]?.unemployment : null) ?? e.unemployment;
  const stress = clamp01(
    0.5 + (unemployment - 9) / 10 + (e.inflation - 4.5) / 12 - (e.growth - 2) / 8,
  );
  const f = (v: number) => v.toFixed(1).replace('.', ',');
  return {
    stress,
    cause: `Economia: desemprego ${f(unemployment)}%, inflação ${f(e.inflation)}%, PIB ${f(e.growth)}%`,
  };
}

function laborReading(s: GameState): DriverReading {
  const groups: InterestGroupId[] = ['unions', 'civil_servants'];
  let worst = { stress: 0, name: '', rad: 0, approval: 50 };
  for (const id of groups) {
    const g = s.interestGroups[id];
    if (!g) continue;
    const rad = groupRadicalismOf(s, id);
    const stress = clamp01(0.25 + rad / 150 + (50 - g.approval) / 80);
    if (stress > worst.stress) worst = { stress, name: g.name, rad, approval: g.approval };
  }
  return {
    stress: worst.stress,
    cause: `Trabalho: ${worst.name || 'sindicatos'} com aprovação ${Math.round(worst.approval)} e radicalismo ${Math.round(worst.rad)}`,
  };
}

function seasonReading(s: GameState, kind: 'rain' | 'drought'): DriverReading {
  const month = Number(s.date.slice(5, 7));
  const rain = [11, 12, 1, 2, 3, 4].includes(month);
  const dry = [7, 8, 9, 10].includes(month);
  if (kind === 'rain')
    return {
      stress: rain ? 0.85 : 0.2,
      cause: rain ? 'Clima: estação de chuvas' : 'Clima: fora da estação de chuvas',
    };
  return {
    stress: dry ? 0.85 : 0.3,
    cause: dry ? 'Clima: estação seca' : 'Clima: fora da estação seca',
  };
}

function integrityReading(s: GameState): DriverReading {
  const scandal = s.candidates[s.playerId]?.scandal ?? 0;
  const ministers = s.government?.ministers ?? [];
  const hidden =
    ministers.length > 0
      ? ministers.reduce((a, m) => a + (m.hiddenScandal ?? 0), 0) / ministers.length
      : 0;
  const undeclared = (s.campaign?.undeclared ?? 0) > 0;
  const stress = clamp01(0.25 + scandal / 40 + hidden / 120 + (undeclared ? 0.2 : 0));
  const parts = [`escândalo ${Math.round(scandal)}`];
  if (ministers.length > 0)
    parts.push(`equipe com histórico ${hidden >= 20 ? 'suspeito' : 'limpo'}`);
  if (undeclared) parts.push('dinheiro por fora na campanha');
  return { stress, cause: `Integridade: ${parts.join(', ')}` };
}

function unrestReading(s: GameState): DriverReading {
  const n = s.nation;
  return {
    stress: clamp01(0.2 + n.unrest / 100 + (50 - n.legitimacy) / 150),
    cause: `Ruas: inquietação ${Math.round(n.unrest)}, legitimidade ${Math.round(n.legitimacy)}`,
  };
}

function rivalsReading(s: GameState): DriverReading {
  const e = s.election;
  if (!e || s.phase !== 'campaign') {
    // No mandato, a oposição se anima quando o governo vai mal.
    const approval = s.government?.approval ?? 50;
    return {
      stress: clamp01(0.5 + (50 - approval) / 50),
      cause: `Oposição: aprovação do seu mandato em ${Math.round(approval)}%`,
    };
  }
  const attackers = e.candidateIds.filter(
    (id) => id !== s.playerId && e.participants[id]?.tactic?.targetId === s.playerId,
  ).length;
  const poll = latestPoll(s);
  const ranked = poll
    ? Object.entries(poll.total.shares)
        .filter(([id]) => id !== OTHERS_KEY)
        .sort((a, b) => b[1] - a[1])
    : [];
  const leading = ranked[0]?.[0] === s.playerId;
  const stress = clamp01(0.3 + 0.2 * attackers + (leading ? 0.3 : 0));
  return {
    stress,
    cause: `Adversários: ${leading ? 'você lidera as pesquisas' : 'você não lidera'}${attackers ? `, ${attackers} rival(is) mirando você` : ''}`,
  };
}

function standingReading(s: GameState): DriverReading {
  const poll = latestPoll(s);
  if (!poll) return { stress: 0.5, cause: 'Sem pesquisa ainda' };
  const mine = poll.total.shares[s.playerId] ?? 0;
  const best = Math.max(
    ...Object.entries(poll.total.shares)
      .filter(([id]) => id !== OTHERS_KEY)
      .map(([, v]) => v),
    0.01,
  );
  const x = clamp01(mine / best);
  return {
    stress: 1 - x,
    cause: `Viabilidade: ${pct(mine)} na última pesquisa (${x >= 0.999 ? 'na liderança' : `${pct(x)} do líder`})`,
  };
}

function baseReading(s: GameState): DriverReading {
  const enthusiasm = s.campaign?.enthusiasm ?? 50;
  return {
    stress: 1 - enthusiasm / 100,
    cause: `Militância: entusiasmo ${Math.round(enthusiasm)}`,
  };
}

function mediaReading(s: GameState): DriverReading {
  const fame = s.candidates[s.playerId]?.fame ?? 30;
  return { stress: 1 - fame / 100, cause: `Mídia: fama ${Math.round(fame)}` };
}

function partyReading(s: GameState): DriverReading {
  const party = s.parties[s.candidates[s.playerId]?.partyId ?? ''];
  const unity = party?.unity ?? 60;
  return {
    stress: clamp01(0.5 + (60 - unity) / 60),
    cause: `Partido: unidade ${Math.round(unity)}`,
  };
}

function read(s: GameState, id: DriverId): DriverReading {
  switch (id) {
    case 'health':
      return serviceReading(s, 'Saúde', 'health', 'healthcare');
    case 'education':
      return serviceReading(s, 'Educação', 'education', 'education');
    case 'security':
      return serviceReading(s, 'Segurança', 'security', 'security');
    case 'city':
      return serviceReading(s, 'Cidade e transporte', 'infrastructure', 'infrastructure');
    case 'environment':
      return {
        stress: clamp01(salience(s, 'environment') / 0.6),
        cause: `Meio ambiente: ${pct(salience(s, 'environment'))} dos eleitores citam o tema`,
      };
    case 'labor':
      return laborReading(s);
    case 'economy':
      return economyReading(s);
    case 'rain':
    case 'drought':
      return seasonReading(s, id);
    case 'integrity':
      return integrityReading(s);
    case 'unrest':
      return unrestReading(s);
    case 'rivals':
      return rivalsReading(s);
    case 'standing':
      return standingReading(s);
    case 'base':
      return baseReading(s);
    case 'media':
      return mediaReading(s);
    case 'party':
      return partyReading(s);
  }
}

/** Leituras memorizadas durante um sorteio (o estado não muda no meio dele). */
export class DriverReader {
  private readonly memo = new Map<DriverId, DriverReading>();
  constructor(private readonly state: GameState) {}
  get(id: DriverId): DriverReading {
    let r = this.memo.get(id);
    if (!r) {
      r = read(this.state, id);
      this.memo.set(id, r);
    }
    return r;
  }
}

export interface DriverEffect {
  driver: DriverId;
  /** Multiplicador da chance (1 = normal). */
  mult: number;
  /** Fora do sorteio (negativo sem tensão, ou positivo em plena crise). */
  blocked: boolean;
  reading: DriverReading;
}

/** Efeito do tema na chance do evento. */
export function driverEffect(def: EventDefinition, reader: DriverReader): DriverEffect | null {
  const driver = driverOf(def);
  if (!driver) return null;
  const reading = reader.get(driver);
  const x = def.negative ? reading.stress : 1 - reading.stress;
  return {
    driver,
    mult: 3 ** (2 * x - 1),
    blocked: x < 0.12,
    reading,
  };
}

/** Frase "por que agora?" para o jogador. */
export function describeCause(effect: DriverEffect): string {
  const m = effect.mult;
  const odds =
    m >= 1.15
      ? `chance ${m.toFixed(1).replace('.', ',')}× maior que o normal`
      : m <= 0.87
        ? `chance ${(1 / m).toFixed(1).replace('.', ',')}× menor que o normal`
        : 'chance normal';
  return `${effect.reading.cause} — ${odds}.`;
}
