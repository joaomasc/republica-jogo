import { describe, expect, it } from 'vitest';
import { startGame, type GameState, type OfficeId, type StateId } from '../src/index';
import { eligibleEventIds, fireEvent } from '../src/events/events';
import { EVENT_DEFINITIONS, getEventDefinition } from '../src/events/events.data';
import { CITY_SEEDS } from '../src/map/cities.generated';
import { defaultConfig } from './helpers';
import type { Effect, EventDefinition } from '../src/events/types';

/** Eventos só de continuação disparados direto pelo código (não por `chain`). */
const FIRED_BY_CODE = new Set([
  'group_protest',
  'jus_contas',
  'cab_ministro_escandalo',
  'cab_ministro_vaza',
]);

const BASE_VARS = new Set([
  'playerName',
  'playerParty',
  'unitName',
  'stateName',
  'cityName',
  'opponentName',
  'groupName',
  'partyName',
  'issueName',
]);

function chainsOf(def: EventDefinition): string[] {
  const out: string[] = [];
  const walk = (effects: Effect[]) => {
    for (const e of effects) {
      if (e.type === 'chain') out.push(e.eventId);
      if (e.type === 'modifier') walk(e.daily);
    }
  };
  for (const o of def.options) walk(o.effects);
  return out;
}

function templateVars(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
}

describe('Catálogo de eventos (integridade)', () => {
  const ids = EVENT_DEFINITIONS.map((e) => e.id);
  const byId = new Map(EVENT_DEFINITIONS.map((e) => [e.id, e]));
  const chainVars = new Set<string>();
  for (const e of EVENT_DEFINITIONS) {
    for (const k of Object.keys(e.vars ?? {})) chainVars.add(k);
    for (const o of e.options)
      for (const fx of o.effects)
        if (fx.type === 'chain') for (const k of Object.keys(fx.vars ?? {})) chainVars.add(k);
  }

  it('ids únicos', () => {
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dup).toEqual([]);
  });

  it('toda continuação aponta para um evento existente, e todo evento só de continuação é alcançável', () => {
    const targets = new Set(EVENT_DEFINITIONS.flatMap(chainsOf));
    const broken = [...targets].filter((t) => !byId.has(t));
    expect(broken).toEqual([]);
    const orphans = EVENT_DEFINITIONS.filter(
      (e) => e.chainOnly && !targets.has(e.id) && !FIRED_BY_CODE.has(e.id),
    ).map((e) => e.id);
    expect(orphans).toEqual([]);
  });

  it('eventos têm opções com texto, e eventos sorteáveis têm peso', () => {
    for (const e of EVENT_DEFINITIONS) {
      expect(e.options.length, e.id).toBeGreaterThan(0);
      for (const o of e.options)
        expect(o.label.trim().length, `${e.id}/${o.id}`).toBeGreaterThan(0);
      if (!e.chainOnly) expect(e.weight, e.id).toBeGreaterThan(0);
      expect(e.phases.length, e.id).toBeGreaterThan(0);
    }
  });

  it('textos só usam variáveis conhecidas', () => {
    const allowed = new Set([...BASE_VARS, ...chainVars]);
    const bad: string[] = [];
    for (const e of EVENT_DEFINITIONS) {
      const texts = [
        e.title,
        e.description,
        ...e.options.map((o) => o.label),
        ...e.options.map((o) => o.description ?? ''),
      ];
      for (const v of texts.flatMap(templateVars)) if (!allowed.has(v)) bad.push(`${e.id}:{${v}}`);
    }
    expect(bad).toEqual([]);
  });

  it('variáveis próprias do evento estão declaradas (ou vêm de uma continuação)', () => {
    const missing: string[] = [];
    for (const e of EVENT_DEFINITIONS) {
      const own = new Set([...BASE_VARS, ...Object.keys(e.vars ?? {})]);
      const texts = [e.title, e.description, ...e.options.map((o) => o.label)];
      for (const v of texts.flatMap(templateVars))
        if (!own.has(v) && !e.chainOnly) missing.push(`${e.id}:{${v}}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('Eventos por esfera e território', () => {
  const RIO_BRANCO = CITY_SEEDS.find((c) => c.name === 'Rio Branco')!.id;
  const CAXIAS = CITY_SEEDS.find((c) => c.name === 'Caxias do Sul')!.id;

  function inOffice(officeId: OfficeId, stateId: StateId, cityId?: string): GameState {
    const base = defaultConfig(7, officeId, stateId);
    return startGame({
      ...base,
      startInOffice: true,
      office: { ...base.office, ...(cityId ? { cityId } : {}) },
    });
  }
  const has = (ids: string[], prefix: string) => ids.some((id) => id.startsWith(prefix));

  it('prefeito vê eventos municipais, da sua UF e da sua cidade — e nada de outra esfera', () => {
    const s = inOffice('prefeito', 'RS', CAXIAS);
    expect(s.phase).toBe('governing');
    const ids = eligibleEventIds(s);
    expect(has(ids, 'mun_')).toBe(true);
    expect(has(ids, 'reg_rs_')).toBe(true);
    expect(ids).toContain('city_caxias_metalurgicas');
    expect(has(ids, 'city_porto_alegre')).toBe(false);
    expect(has(ids, 'reg_sp_')).toBe(false);
    expect(has(ids, 'est_')).toBe(false);
    expect(has(ids, 'fed_')).toBe(false);
  });

  it('governador vê eventos estaduais e da sua UF, mas não ganchos de cidade nem federais', () => {
    const ids = eligibleEventIds(inOffice('governador', 'AM'));
    expect(has(ids, 'est_')).toBe(true);
    expect(has(ids, 'reg_am_')).toBe(true);
    expect(has(ids, 'reg_rs_')).toBe(false);
    expect(has(ids, 'city_')).toBe(false);
    expect(has(ids, 'mun_')).toBe(false);
    expect(has(ids, 'fed_')).toBe(false);
    // Filtro por região: enchente estadual só no Sul/Sudeste/Nordeste.
    expect(ids).not.toContain('est_enchente');
  });

  it('presidente vê eventos federais e nenhum evento local', () => {
    const ids = eligibleEventIds(inOffice('presidente', 'SP'));
    expect(has(ids, 'fed_')).toBe(true);
    for (const p of ['mun_', 'est_', 'reg_', 'city_']) expect(has(ids, p), p).toBe(false);
  });

  it('o texto do gancho usa o nome da cidade do jogador', () => {
    const s = inOffice('prefeito', 'AC', RIO_BRANCO);
    const pending = fireEvent(s, getEventDefinition('city_rio_branco_cheia')!);
    expect(pending?.description).toContain('Rio Branco');
  });

  it('variáveis sorteadas aparecem no texto e se mantêm na continuação', () => {
    const s = inOffice('governador', 'BA');
    const pending = fireEvent(s, getEventDefinition('est_vice_conspira')!)!;
    const name = pending.context.extra?.pessoa;
    expect(name && pending.description.includes(name)).toBe(true);
    const next = fireEvent(s, getEventDefinition('est_vice_rompe')!, pending.context)!;
    expect(next.context.extra?.pessoa).toBe(name);
  });
});

describe('Dilemas (pacotes de conteúdo)', () => {
  /** +1 ganho, -1 custo, 0 neutro. */
  const sign = (e: Effect): number => {
    switch (e.type) {
      case 'rejection':
      case 'scandal':
      case 'wear':
      case 'unrest':
      case 'radicalism':
        return e.delta > 0 ? -1 : 1;
      case 'budgetSpend':
        return e.share > 0 ? -1 : 1;
      case 'money':
        return e.amount < 0 ? -1 : 1;
      case 'militants':
        return e.pct < 0 ? -1 : 1;
      case 'opponent':
        return 1;
      case 'economyShock':
        return (e.growth ?? 0) - (e.inflation ?? 0) - (e.unemployment ?? 0) >= 0 ? 1 : -1;
      case 'chain':
      case 'flag':
      case 'news':
      case 'history':
      case 'interview':
      case 'modifier':
        return 0;
      default:
        return 'delta' in e && typeof e.delta === 'number' ? Math.sign(e.delta) : 0;
    }
  };
  const PASSIVE =
    /^(Ignorar|Recusar|Não|Nada|Comemorar|Agradecer|Ficar|Esperar|Manter|Seguir|Deixar|Apoio simbólico)/i;
  const PACK = /^(mun|est|fed|leg|camp|reg|city|arc|car)_/;

  it('nenhuma opção ativa dá só ganhos (2+) sem custo algum', () => {
    const dominant: string[] = [];
    for (const def of EVENT_DEFINITIONS) {
      if (!PACK.test(def.id) || def.options.length < 2) continue;
      for (const o of def.options) {
        const s = o.effects.map(sign);
        const gains = s.filter((x) => x > 0).length;
        const costs = s.filter((x) => x < 0).length;
        if (gains >= 2 && costs === 0 && !o.requirement && !PASSIVE.test(o.label))
          dominant.push(`${def.id}/${o.id}`);
      }
    }
    expect(dominant).toEqual([]);
  });
});

describe('Calendário dos eventos', () => {
  it('todo evento com calendário existe e tem meses válidos', async () => {
    const { EVENT_MONTHS } = await import('../src/events/seasons');
    const ids = new Set(EVENT_DEFINITIONS.map((e) => e.id));
    for (const [id, months] of Object.entries(EVENT_MONTHS)) {
      expect(ids.has(id), id).toBe(true);
      expect(months.length, id).toBeGreaterThan(0);
      for (const m of months) expect(m >= 1 && m <= 12, `${id}:${m}`).toBe(true);
      expect(getEventDefinition(id)?.months).toEqual(months);
    }
  });

  it('enchente de verão não sai no inverno', () => {
    const base = defaultConfig(7, 'prefeito', 'RJ');
    const s = startGame({ ...base, startInOffice: true });
    s.date = `${s.date.slice(0, 4)}-07-15`;
    expect(eligibleEventIds(s)).not.toContain('mun_alagamento');
    s.date = `${s.date.slice(0, 4)}-01-15`;
    expect(eligibleEventIds(s)).toContain('mun_alagamento');
  });
});
