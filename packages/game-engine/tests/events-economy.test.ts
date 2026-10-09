import { describe, expect, it } from 'vitest';
import {
  describeEffect,
  EVENT_DEFINITIONS,
  getEventDefinition,
  startGame,
  type Effect,
  type EventDefinition,
  type GameState,
} from '../src/index';
import { fireEvent, resolveEvent, rollEvent } from '../src/events/events';
import { Rng } from '../src/core/rng';
import { updateInterestGroups } from '../src/politics/interestGroups';
import { NATION_EVENT_DEFINITIONS } from '../src/events/economy.events.data';
import { defaultConfig } from './helpers';

function president(seed = 11): GameState {
  return startGame({ ...defaultConfig(seed, 'presidente', 'SP'), startInOffice: true });
}

const NEW_IDS = [
  'commodity_supercycle',
  'commodity_crash',
  'oil_discovery',
  'truckers_strike',
  'general_strike',
  'capital_flight',
  'foreign_automaker',
  'blackout',
  'food_price_protests',
  'congress_cpi',
  'agrarian_reform_march',
  'currency_crisis',
];

/** Deixa o estado em condição de disparar o evento. */
function prepare(s: GameState, id: string): void {
  switch (id) {
    case 'truckers_strike':
      s.economy.inflation = 9;
      s.interestGroups.workers.radicalism = 40;
      break;
    case 'general_strike':
      s.interestGroups.unions.radicalism = 70;
      s.interestGroups.unions.approval = 30;
      break;
    case 'capital_flight':
      s.economy.confidence = 30;
      break;
    case 'blackout':
      s.market.goods.electricity.shortage = 0.2;
      break;
    case 'food_price_protests':
      s.economy.inflation = 10;
      s.market.goods.processed_food.price = 1.5;
      break;
    case 'congress_cpi':
      s.candidates[s.playerId]!.scandal = 30;
      break;
    case 'agrarian_reform_march':
      s.interestGroups.social_movements.approval = 30;
      break;
    case 'currency_crisis':
      s.market.exchangeRate = 1.6;
      break;
    default:
      break;
  }
}

function fire(s: GameState, def: EventDefinition) {
  const pending = fireEvent(s, def);
  expect(pending).not.toBeNull();
  return pending!;
}

describe('Eventos econômico-políticos', () => {
  it('os 12 eventos novos estão no catálogo, com ids únicos', () => {
    for (const id of NEW_IDS) expect(getEventDefinition(id)).toBeDefined();
    expect(NATION_EVENT_DEFINITIONS).toHaveLength(NEW_IDS.length);
    const ids = EVENT_DEFINITIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('têm formato válido: fases, cooldown, opções com efeitos e texto sem marcadores soltos', () => {
    for (const def of NATION_EVENT_DEFINITIONS) {
      expect(def.phases.length).toBeGreaterThan(0);
      expect(def.options.length).toBeGreaterThan(0);
      expect(def.weight).toBeGreaterThan(0);
      expect(def.cooldownDays ?? 1).toBeGreaterThan(0);
      for (const o of def.options) {
        expect(o.label).toBeTruthy();
        expect(o.effects.length).toBeGreaterThan(0);
      }
    }
  });

  it('todo evento com mais de uma opção oferece ganhos e perdas (neutralidade)', () => {
    for (const def of NATION_EVENT_DEFINITIONS) {
      if (def.options.length < 2) continue;
      const groupSigns = new Set<number>();
      for (const o of def.options)
        for (const e of o.effects)
          if (e.type === 'interestGroup') groupSigns.add(Math.sign(e.delta));
      // Cada decisão favorece algum grupo e desfavorece outro.
      expect(groupSigns.has(1) && groupSigns.has(-1) || def.id === 'congress_cpi').toBe(true);
    }
  });

  it('as condições respeitam o estado da economia', () => {
    const s = president();
    const calm = new Map<string, boolean>();
    for (const id of NEW_IDS) {
      const def = getEventDefinition(id)!;
      calm.set(id, def.condition ? def.condition(s) : true);
    }
    expect(calm.get('blackout')).toBe(false);
    expect(calm.get('currency_crisis')).toBe(false);
    expect(calm.get('food_price_protests')).toBe(false);
    expect(calm.get('commodity_supercycle')).toBe(true);
    for (const id of NEW_IDS) {
      const t = president();
      prepare(t, id);
      const def = getEventDefinition(id)!;
      expect(def.condition ? def.condition(t) : true, id).toBe(true);
    }
  });

  it('cada opção de cada evento dispara, resolve e deixa o estado em JSON válido', () => {
    for (const id of NEW_IDS) {
      const def = getEventDefinition(id)!;
      for (const option of def.options) {
        const s = president();
        prepare(s, id);
        const pending = fire(s, def);
        expect(pending.options.every((o) => o.preview.length > 0)).toBe(true);
        const out = resolveEvent(s, pending.instanceId, option.id);
        expect(out.ok, `${id}/${option.id}`).toBe(true);
        expect(s.events.pending).toHaveLength(0);
        expect(() => JSON.stringify(s)).not.toThrow();
        expect(s.nation.legitimacy).toBeGreaterThanOrEqual(0);
        expect(s.nation.legitimacy).toBeLessThanOrEqual(100);
        expect(s.market.exchangeRate).toBeGreaterThan(0);
      }
    }
  });

  it('superciclo e crash mexem nos preços mundiais em sentidos opostos', () => {
    const up = president();
    const before = up.market.goods.soy.worldPrice;
    resolveEvent(up, fire(up, getEventDefinition('commodity_supercycle')!).instanceId, 'ride');
    expect(up.market.goods.soy.worldPrice).toBeGreaterThan(before);
    expect(up.market.goods.oil.worldPrice).toBeGreaterThan(1);

    const down = president();
    resolveEvent(down, fire(down, getEventDefinition('commodity_crash')!).instanceId, 'adjust');
    expect(down.market.goods.soy.worldPrice).toBeLessThan(before);
    expect(down.market.goods.iron_ore.worldPrice).toBeLessThan(1);
  });

  it('descoberta de petróleo cria níveis no edifício, com o dono escolhido', () => {
    const state = president();
    const before = state.industry.buildings.RJ.oil_field ? { ...state.industry.buildings.RJ.oil_field, ownership: { ...state.industry.buildings.RJ.oil_field.ownership } } : null;
    resolveEvent(state, fire(state, getEventDefinition('oil_discovery')!).instanceId, 'state');
    const field = state.industry.buildings.RJ.oil_field!;
    expect(field.level).toBeGreaterThan(before?.level ?? 0);
    expect(field.ownership.state).toBeGreaterThan(before?.ownership.state ?? 0);

    const open = president();
    const foreign0 = open.industry.buildings.RJ.oil_field?.ownership.foreign ?? 0;
    resolveEvent(open, fire(open, getEventDefinition('oil_discovery')!).instanceId, 'concession');
    expect(open.industry.buildings.RJ.oil_field!.ownership.foreign).toBeGreaterThan(foreign0);
  });

  it('montadora estrangeira soma níveis a uma planta existente e mistura a propriedade', () => {
    const s = president();
    s.industry.buildings.PR.auto_plant = {
      level: 2,
      methodId: 'x',
      ownership: { private: 1, state: 0, cooperative: 0, foreign: 0 },
      staffing: 1,
      wageFactor: 1,
      productivity: 1,
      revenue: 0,
      inputCost: 0,
      wageBill: 0,
      profit: 0,
      avgMargin: 0,
      subsidy: 0,
      lossMonths: 0,
    };
    resolveEvent(s, fire(s, getEventDefinition('foreign_automaker')!).instanceId, 'incentives');
    const plant = s.industry.buildings.PR.auto_plant!;
    expect(plant.level).toBe(4);
    expect(plant.ownership.foreign).toBeCloseTo(0.5);
    const total = Object.values(plant.ownership).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
  });

  it('fuga de capitais encolhe os fundos e desvaloriza o câmbio', () => {
    const s = president();
    s.industry.investmentPool = 100;
    s.industry.foreignPool = 100;
    const exchange = s.market.exchangeRate;
    resolveEvent(s, fire(s, getEventDefinition('capital_flight')!).instanceId, 'signal');
    expect(s.industry.investmentPool).toBeLessThan(100);
    expect(s.industry.foreignPool).toBeLessThan(100);
    expect(s.market.exchangeRate).toBeGreaterThan(exchange);
  });

  it('efeitos de legitimidade, inquietação e radicalismo são aplicados', () => {
    const s = president();
    const legitimacy = s.nation.legitimacy;
    const unrest = s.nation.unrest;
    s.interestGroups.unions.radicalism = 70;
    s.interestGroups.unions.approval = 30;
    s.interestGroups.unions.radicalism = 70;
    const pending = fire(s, getEventDefinition('general_strike')!);
    resolveEvent(s, pending.instanceId, 'hold');
    expect(s.nation.legitimacy).toBeLessThan(legitimacy);
    expect(s.nation.unrest).toBeGreaterThan(unrest);
    expect(s.interestGroups.unions.radicalism!).toBeGreaterThan(70);
  });

  it('describeEffect descreve os efeitos novos em português', () => {
    const effects: Effect[] = [
      { type: 'worldPrice', goods: ['soy'], factor: 1.35, label: 'superciclo' },
      { type: 'worldPrice', goods: ['soy'], factor: 0.7, label: 'queda' },
      { type: 'buildingLevels', stateId: 'RJ', buildingId: 'oil_field', delta: 1 },
      { type: 'legitimacy', delta: -2 },
      { type: 'unrest', delta: 4 },
      { type: 'radicalism', groupId: 'unions', delta: 8 },
      { type: 'capitalFlow', privateFactor: 0.9, foreignFactor: 0.9 },
      { type: 'capitalFlow', privateFactor: 1.1, foreignFactor: 1.1 },
      { type: 'exchangeRate', factor: 1.1 },
      { type: 'exchangeRate', factor: 0.9 },
    ];
    for (const e of effects) expect(describeEffect(e, 1)).toBeTruthy();
    expect(describeEffect(effects[0]!, 1)).toContain('+35%');
    expect(describeEffect(effects[1]!, 1)).toContain('-30%');
    expect(describeEffect(effects[3]!, 1)).toBe('Legitimidade -2');
  });

  it('o sorteio mensal dispara eventos novos num país em crise', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const s = president(seed);
      for (const id of NEW_IDS) prepare(s, id);
      for (let i = 0; i < 12; i++) {
        const pending = rollEvent(s, 1);
        if (pending) {
          seen.add(pending.eventId);
          s.events.pending = [];
          s.events.lastFired = {};
        }
      }
    }
    const fromNew = NEW_IDS.filter((id) => seen.has(id));
    expect(fromNew.length).toBeGreaterThanOrEqual(8);
  });

  it('é determinístico', () => {
    const run = () => {
      const s = president(5);
      prepare(s, 'currency_crisis');
      const pending = fire(s, getEventDefinition('currency_crisis')!);
      resolveEvent(s, pending.instanceId, 'float');
      return JSON.stringify([s.market.exchangeRate, s.economy.shocks, s.events.log]);
    };
    expect(run()).toBe(run());
  });
});

describe('Eventos econômico-políticos: revisão adversarial', () => {
  it('eventos de decisão do Executivo só ocorrem na fase de governo', () => {
    for (const id of ['commodity_supercycle', 'commodity_crash', 'agrarian_reform_march'])
      expect(getEventDefinition(id)!.phases).toEqual(['governing']);
  });

  it('crise cambial e fuga de capitais (juros, controles) são decisões da Presidência', () => {
    const gov = startGame({ ...defaultConfig(11, 'governador', 'SP'), startInOffice: true });
    for (const id of ['capital_flight', 'currency_crisis']) {
      prepare(gov, id);
      expect(getEventDefinition(id)!.condition!(gov), id).toBe(false);
      const pres = president();
      prepare(pres, id);
      expect(getEventDefinition(id)!.condition!(pres), id).toBe(true);
    }
  });

  it('reabrir um edifício fechado dá os novos níveis só ao dono do evento', () => {
    const s = president();
    s.industry.buildings.RJ.oil_field = {
      level: 0,
      methodId: 'x',
      ownership: { private: 0.7, state: 0.3, cooperative: 0, foreign: 0 },
      staffing: 1,
      wageFactor: 1,
      productivity: 1,
      revenue: 0,
      inputCost: 0,
      wageBill: 0,
      profit: 0,
      avgMargin: 0,
      subsidy: 0,
      lossMonths: 0,
    };
    resolveEvent(s, fire(s, getEventDefinition('oil_discovery')!).instanceId, 'state');
    const field = s.industry.buildings.RJ.oil_field!;
    expect(field.level).toBe(1);
    expect(field.ownership).toEqual({ private: 0, state: 1, cooperative: 0, foreign: 0 });
  });

  it('preço mundial e câmbio respeitam limites de segurança mesmo com choques repetidos', () => {
    const s = president();
    for (let i = 0; i < 30; i++) {
      resolveEvent(s, fire(s, getEventDefinition('commodity_crash')!).instanceId, 'adjust');
      s.events.lastFired = {};
    }
    expect(s.market.goods.soy.worldPrice).toBeGreaterThanOrEqual(0.2);
    for (let i = 0; i < 40; i++) {
      resolveEvent(s, fire(s, getEventDefinition('commodity_supercycle')!).instanceId, 'ride');
      s.events.lastFired = {};
    }
    expect(s.market.goods.soy.worldPrice).toBeLessThanOrEqual(5);
    s.market.exchangeRate = 1.6;
    for (let i = 0; i < 80; i++) {
      resolveEvent(s, fire(s, getEventDefinition('currency_crisis')!).instanceId, 'float');
      s.events.lastFired = {};
    }
    expect(s.market.exchangeRate).toBeLessThanOrEqual(5);
    expect(Number.isFinite(s.market.exchangeRate)).toBe(true);
  });

  it('fundos de investimento nunca ficam negativos', () => {
    const s = president();
    s.industry.investmentPool = 0;
    s.industry.foreignPool = 0;
    resolveEvent(s, fire(s, getEventDefinition('capital_flight')!).instanceId, 'capital_controls');
    expect(s.industry.investmentPool).toBeGreaterThanOrEqual(0);
    expect(s.industry.foreignPool).toBeGreaterThanOrEqual(0);
  });

  it('o primeiro item de cada evento (escolha automática ao expirar) é sempre disponível', () => {
    for (const def of NATION_EVENT_DEFINITIONS) {
      const s = president();
      prepare(s, def.id);
      expect(def.options[0]!.requirement).toBeUndefined();
    }
  });

  it('eventos nacionais (greves, apagão, commodities, petróleo) são decisões da Presidência', () => {
    const gov = startGame({ ...defaultConfig(11, 'governador', 'SP'), startInOffice: true });
    for (const id of [
      'commodity_supercycle',
      'commodity_crash',
      'oil_discovery',
      'truckers_strike',
      'general_strike',
      'blackout',
      'food_price_protests',
      'agrarian_reform_march',
    ]) {
      prepare(gov, id);
      expect(getEventDefinition(id)!.condition!(gov), id).toBe(false);
      const pres = president();
      prepare(pres, id);
      expect(getEventDefinition(id)!.condition!(pres), id).toBe(true);
    }
  });

  it('negociar ou ignorar um protesto de grupo muda o radicalismo do grupo', () => {
    const def = getEventDefinition('group_protest')!;
    const radicalismAfter = (optionId: string): number => {
      const s = president();
      s.interestGroups.unions.radicalism = 50;
      const pending = fireEvent(s, def, { groupId: 'unions', groupName: 'Sindicatos' })!;
      resolveEvent(s, pending.instanceId, optionId);
      return s.interestGroups.unions.radicalism!;
    };
    expect(radicalismAfter('negotiate')).toBeLessThan(50);
    expect(radicalismAfter('concede')).toBeLessThan(radicalismAfter('negotiate'));
    expect(radicalismAfter('ignore')).toBeGreaterThan(50);
  });

  it('protestos de grupos respeitam um intervalo mínimo entre si', () => {
    const s = president();
    for (const g of Object.values(s.interestGroups)) {
      g.approval = 5;
      g.radicalism = 100;
    }
    s.interestGroups.social_movements.approval = 5;
    const fired: string[] = [];
    for (let day = 0; day < 40; day++) {
      s.events.pending = [];
      s.date = `2027-02-${String((day % 28) + 1).padStart(2, '0')}`;
      const before = s.events.firedCount.group_protest ?? 0;
      updateInterestGroups(s, new Rng(day + 1));
      if ((s.events.firedCount.group_protest ?? 0) > before) fired.push(s.date);
    }
    // Com a data girando dentro de fevereiro, só o primeiro protesto passa: o resto cai no intervalo.
    expect(fired.length).toBeLessThanOrEqual(2);
  });
});
