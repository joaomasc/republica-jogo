import { describe, expect, it } from 'vitest';
import { addMonths } from '../src/core/date';
import { Rng } from '../src/core/rng';
import { updateEconomy } from '../src/economy/economy';
import { dispatch, STATE_IDS, startGame, type GameState } from '../src/index';
import { popId } from '../src/population/population';
import { defaultConfig } from '../scripts/bot';
import { governanceConfig } from '../scripts/governance-sim';

/** Avança `months` meses só da economia (rápido, sem eventos nem Congresso). */
function economyMonths(state: GameState, months: number): GameState {
  const rng = new Rng(7);
  for (let i = 0; i < months; i++) {
    state.date = addMonths(state.date, 1);
    updateEconomy(state, rng);
  }
  return state;
}

function hasBadNumber(value: unknown): boolean {
  if (typeof value === 'number') return !Number.isFinite(value);
  if (value && typeof value === 'object') return Object.values(value).some(hasBadNumber);
  return false;
}

function workforceTotal(state: GameState, stateId: (typeof STATE_IDS)[number]): number {
  let total = 0;
  for (const t of [
    'workers',
    'industrial_workers',
    'farmers',
    'business',
    'merchants',
    'middle_class',
    'civil_servants',
    'health_workers',
    'tech_workers',
    'unemployed',
  ] as const)
    total += state.population.pops[popId(stateId, t)]?.size ?? 0;
  return total;
}

describe('Economia industrial', () => {
  it('a geração inicial cria edifícios, mercado calibrado e âncoras', () => {
    const s = startGame(defaultConfig(11, 'presidente', 'SP'));
    let levels = 0;
    for (const id of STATE_IDS) for (const b of Object.values(s.industry.buildings[id])) levels += b?.level ?? 0;
    expect(levels).toBeGreaterThan(1000);
    expect(s.industry.calib).toBeDefined();
    expect(s.industry.constructionCapacity).toBeGreaterThan(0);
    for (const g of Object.values(s.market.goods)) expect(g.price).toBeCloseTo(1, 5);
    // O país começa exportando commodities e importando alta tecnologia.
    expect(s.market.goods.soy.exports).toBeGreaterThan(0);
    expect(s.market.goods.electronics.imports).toBeGreaterThan(0);
  });

  it('é determinística', () => {
    const a = economyMonths(startGame(governanceConfig(3)), 12);
    const b = economyMonths(startGame(governanceConfig(3)), 12);
    expect(a.economy).toEqual(b.economy);
    expect(a.market.goods.steel.price).toBe(b.market.goods.steel.price);
  });

  it('o primeiro ano sem ações não tem saltos', () => {
    const s = startGame(governanceConfig(5));
    const u0 = s.economy.unemployment;
    economyMonths(s, 12);
    expect(Math.abs(s.economy.unemployment - u0)).toBeLessThan(1.5);
    expect(s.economy.growth).toBeGreaterThan(-1);
    expect(s.economy.growth).toBeLessThan(5);
  });

  it.each([1, 2, 3])('8 anos em situação normal ficam em faixas plausíveis (seed %i)', (seed) => {
    const s = startGame(governanceConfig(seed));
    const totals = STATE_IDS.map((id) => workforceTotal(s, id));
    economyMonths(s, 96);
    expect(hasBadNumber(s.industry)).toBe(false);
    expect(hasBadNumber(s.market)).toBe(false);
    expect(hasBadNumber(s.economy)).toBe(false);
    expect(s.economy.unemployment).toBeGreaterThan(3);
    expect(s.economy.unemployment).toBeLessThan(14);
    expect(s.economy.inflation).toBeGreaterThan(0);
    expect(s.economy.inflation).toBeLessThan(10);
    const avgGrowth = s.economy.history.slice(-96).reduce((a, h) => a + h.growth, 0) / 96;
    expect(avgGrowth).toBeGreaterThan(0);
    expect(avgGrowth).toBeLessThan(4.5);
    for (const g of Object.values(s.market.goods)) {
      expect(g.price).toBeGreaterThanOrEqual(0.25);
      expect(g.price).toBeLessThanOrEqual(1.75);
    }
    STATE_IDS.forEach((id, i) => {
      const before = totals[i] ?? 0;
      expect(Math.abs(workforceTotal(s, id) - before)).toBeLessThanOrEqual(Math.max(30, before * 0.001));
    });
  });

  it('economia planificada estatiza e encolhe a classe empresarial', () => {
    // Só a economia (o Congresso NPC poderia mudar o pacote de leis no meio do caminho).
    const s = economyMonths(startGame(governanceConfig(2, 'planificado')), 36);
    let priv = 0;
    let all = 0;
    for (const id of STATE_IDS)
      for (const b of Object.values(s.industry.buildings[id])) {
        if (!b) continue;
        priv += b.ownership.private * b.level;
        all += b.level;
      }
    expect(priv / all).toBeLessThan(0.15);
    const base = startGame(governanceConfig(2, 'padrao'));
    const share = (st: GameState) => {
      let b = 0;
      let t = 0;
      for (const p of Object.values(st.population.pops)) {
        t += p.size;
        if (p.typeId === 'business') b += p.size;
      }
      return b / t;
    };
    expect(share(s)).toBeLessThan(share(base) * 0.7);
  });

  it('substituição de importações fecha o mercado; a abertura liberal importa mais e barateia', () => {
    const isi = economyMonths(startGame(governanceConfig(4, 'desenvolvimentista')), 48);
    const open = economyMonths(startGame(governanceConfig(4, 'liberal')), 48);
    const base = startGame(governanceConfig(4, 'padrao'));
    expect(isi.industry.stats.manufacturingShare).toBeGreaterThan(base.industry.stats.manufacturingShare);
    expect(isi.market.goods.electronics.imports).toBeLessThan(open.market.goods.electronics.imports);
    expect(isi.industry.stats.imports).toBeLessThan(open.industry.stats.imports);
    expect(isi.market.goods.electronics.price).toBeGreaterThan(open.market.goods.electronics.price);
  });

  it('o Presidente encomenda uma obra, ela avança e vira um nível novo', () => {
    let s = startGame(governanceConfig(9));
    const before = s.industry.buildings.BA.steel_mill?.level ?? 0;
    s.government!.budget!.spending.industry *= 4;
    const out = dispatch(s, { type: 'industry/build', stateId: 'BA', buildingId: 'steel_mill', levels: 1 });
    expect(out.result.ok).toBe(true);
    s = out.state;
    const project = s.industry.queue.find((q) => q.origin === 'player');
    expect(project).toBeDefined();
    for (let i = 0; i < 12 && s.industry.queue.some((q) => q.id === project!.id); i++) {
      for (const ev of s.events.pending)
        s = dispatch(s, { type: 'event/resolve', instanceId: ev.instanceId, optionId: ev.options.find((o) => o.available)?.id ?? '' }).state;
      s = dispatch(s, { type: 'time/advance', step: 'month' }).state;
    }
    expect(s.industry.buildings.BA.steel_mill?.level ?? 0).toBeGreaterThan(before);
  });

  it('legislador não pode mandar construir', () => {
    const s = startGame(governanceConfig(9, 'padrao', { office: { officeId: 'deputado_federal', stateId: 'SP' } }));
    const out = dispatch(s, { type: 'industry/build', stateId: 'SP', buildingId: 'steel_mill', levels: 1 });
    expect(out.result.ok).toBe(false);
  });
});
