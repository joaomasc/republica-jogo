import { describe, expect, it } from 'vitest';
import {
  blockingReason,
  dispatch,
  startGame,
  type GameState,
  type OfficeId,
  type StateId,
} from '../src/index';
import { CABINET_CARDS } from '../src/government/cabinetCards.data';
import { GameConstants } from '../src/config/constants';
import { renova } from '../src/events/dsl';
import { applyEffects } from '../src/events/effects';
import { defaultConfig } from './helpers';

function inOffice(officeId: OfficeId, stateId: StateId, cabinet = true, seed = 3): GameState {
  return startGame({ ...defaultConfig(seed, officeId, stateId), startInOffice: true, cabinet });
}

/** Avança até o mês seguinte, resolvendo eventos (primeira opção) e a reunião (se pedido). */
function month(s: GameState, pick: 'first' | 'skip' | 'none' = 'first'): GameState {
  const startMonth = s.date.slice(0, 7);
  for (let guard = 0; guard < 60; guard++) {
    const ev = s.events.pending[0];
    if (ev) {
      s = dispatch(s, {
        type: 'event/resolve',
        instanceId: ev.instanceId,
        optionId: ev.options.find((o) => o.available)?.id ?? '',
      }).state;
      continue;
    }
    const moved = s.date.slice(0, 7) !== startMonth;
    if (s.government?.cabinet?.pending) {
      if (pick === 'none') return s;
      const cardId = pick === 'first' ? s.government.cabinet.cards[0]!.id : null;
      s = dispatch(s, { type: 'gov/cabinet', cardId }).state;
      continue;
    }
    if (moved || blockingReason(s)) return s;
    s = dispatch(s, { type: 'time/advance', step: 'month' }).state;
  }
  return s;
}

describe('Gabinete mensal', () => {
  it('abre no início do mês com pauta, oposição e 3 cartas — e trava o tempo até a escolha', () => {
    let s = inOffice('prefeito', 'BA');
    s = month(s, 'none');
    const meeting = s.government?.cabinet;
    expect(meeting?.pending).toBe(true);
    expect(meeting?.cards).toHaveLength(GameConstants.cabinet.cards);
    expect(meeting?.cards[0]?.key).toBe(`pauta_${meeting?.trend}`);
    expect(meeting?.opposition.length).toBeGreaterThan(10);
    expect(blockingReason(s)).toMatch(/gabinete/i);
    const out = dispatch(s, { type: 'time/advance', step: 'day' });
    expect(out.state.date).toBe(s.date);
    const chosen = dispatch(s, { type: 'gov/cabinet', cardId: meeting!.cards[1]!.id });
    expect(chosen.result.ok).toBe(true);
    expect(chosen.state.government?.cabinet?.pending).toBe(false);
    expect(blockingReason(chosen.state)).toBeNull();
  });

  it('não existe com a opção desligada nem para legisladores', () => {
    expect(month(inOffice('prefeito', 'BA', false), 'none').government?.cabinet ?? null).toBeNull();
    expect(
      month(inOffice('deputado_federal', 'SP'), 'none').government?.cabinet ?? null,
    ).toBeNull();
  });

  it('é determinístico com a mesma semente', () => {
    const run = () =>
      JSON.stringify(month(month(inOffice('governador', 'RS')), 'none').government?.cabinet);
    expect(run()).toBe(run());
  });

  it('as cartas do baralho têm efeitos, chance válida e falha quando podem falhar', () => {
    const keys = CABINET_CARDS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of CABINET_CARDS) {
      expect(c.effects.length, c.key).toBeGreaterThan(0);
      if (c.chance < 1) expect(c.failure, c.key).toBeDefined();
    }
  });
});

describe('Desgaste do governo', () => {
  it('acumula depois da lua de mel e a renovação o reduz', () => {
    let s = inOffice('prefeito', 'BA', false);
    for (let i = 0; i < GameConstants.government.honeymoonMonths; i++) s = month(s);
    expect(s.government?.wear ?? 0).toBe(0);
    for (let i = 0; i < 6; i++) s = month(s);
    const wear = s.government!.wear!;
    expect(wear).toBeGreaterThan(6 * GameConstants.government.wearPerMonth - 0.01);
    applyEffects(s, [renova(3)], {});
    expect(s.government!.wear).toBeCloseTo(wear - 3, 5);
  });

  it('pesa na aprovação: o mesmo mandato sem desgaste termina mais bem avaliado', () => {
    const run = (withWear: boolean) => {
      let s = inOffice('prefeito', 'BA', false, 9);
      for (let i = 0; i < 24; i++) {
        s = month(s);
        if (!withWear && s.government) s.government.wear = 0;
      }
      return s.government!.approval;
    };
    expect(run(true)).toBeLessThan(run(false) - 3);
  });
});

describe('Relações federativas', () => {
  it('prefeito do partido do governador recebe repasses; adversário fica sem', async () => {
    const { federativeLinks, monthlyTransfers } = await import('../src/government/federative');
    const s = inOffice('prefeito', 'BA', false);
    const mine = s.candidates[s.playerId]!.partyId;
    s.landscape.governors.BA = mine;
    s.landscape.presidentPartyId = mine;
    expect(federativeLinks(s).map((l) => l.alignment)).toEqual(['mesmo_partido', 'mesmo_partido']);
    expect(monthlyTransfers(s)).toBeGreaterThan(0);
    const rival = Object.keys(s.parties).find((p) => p !== mine)!;
    s.landscape.governors.BA = rival;
    s.landscape.presidentPartyId = rival;
    s.congress.relations[rival] = -80;
    expect(monthlyTransfers(s)).toBeLessThan(0);
  });
});

describe('Objetivos de mandato', () => {
  it('a posse oferece 6 objetivos da esfera; dá para escolher até 3 nos primeiros meses', async () => {
    const { OBJECTIVES, objectiveProgress } = await import('../src/government/objectives');
    const s = inOffice('prefeito', 'BA', false);
    const obj = s.government!.objectives!;
    expect(obj.offered).toHaveLength(6);
    for (const id of obj.offered)
      expect(OBJECTIVES.find((o) => o.id === id)?.levels).toContain('municipal');
    expect(dispatch(s, { type: 'gov/objectives', ids: obj.offered.slice(0, 4) }).result.ok).toBe(
      false,
    );
    expect(dispatch(s, { type: 'gov/objectives', ids: ['inexistente'] }).result.ok).toBe(false);
    const ok = dispatch(s, { type: 'gov/objectives', ids: obj.offered.slice(0, 3) });
    expect(ok.result.ok).toBe(true);
    expect(objectiveProgress(ok.state)).toHaveLength(3);
    const late = structuredClone(ok.state);
    late.government!.monthsInOffice = 12;
    expect(dispatch(late, { type: 'gov/objectives', ids: obj.offered.slice(0, 1) }).result.ok).toBe(
      false,
    );
  });
});

describe('Gabinete com personalidades', () => {
  it('ministro nomeado tem lealdade e ambição; escândalo latente estoura como evento', async () => {
    const { availablePortfolios } = await import('../src/politics/negotiation');
    const { processMinisters } = await import('../src/government/ministers');
    const { Rng } = await import('../src/core/rng');
    let s = inOffice('governador', 'RS', false);
    const party = s.candidates[s.playerId]!.partyId;
    const portfolio = availablePortfolios(s)[0]!;
    s = dispatch(s, { type: 'gov/portfolio', partyId: party, portfolio }).state;
    const m = s.government!.ministers.find((x) => x.portfolio === portfolio)!;
    expect(m.loyalty).toBeGreaterThanOrEqual(60);
    expect(m.ambition).toBeGreaterThanOrEqual(10);
    m.hiddenScandal = 99;
    s.events.pending = [];
    // Várias tentativas mensais: a chance por mês é parcial.
    for (let i = 0; i < 30 && s.events.pending.length === 0; i++)
      processMinisters(s, new Rng(100 + i));
    const ev = s.events.pending[0];
    expect(ev?.eventId).toBe('cab_ministro_escandalo');
    expect(ev?.description).toContain(m.name);
  });
});
