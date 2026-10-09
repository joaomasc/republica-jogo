import { describe, expect, it } from 'vitest';
import {
  BUILDING_IDS,
  BUILDING_LIST,
  BUILDINGS,
  GOOD_IDS,
  GOODS,
  POP_TYPES,
  RESOURCE_IDS,
  SECTOR_IDS,
  STATE_IDS,
  STATE_RESOURCES,
  STATE_SPECIALTIES,
  getBuilding,
  getMethod,
  type BuildingDefinition,
  type BuildingId,
  type GoodId,
  type LaborTypeId,
  type ProductionMethod,
} from '../src/index';

const PUBLIC_BUILDINGS: BuildingId[] = ['public_admin', 'hospital', 'school'];

/** Salário de referência por emprego (R$ bi/ano por pessoa). */
function referenceWage(t: LaborTypeId): number {
  return (POP_TYPES[t].income * 12) / 1e9;
}

function sumValues(o: Partial<Record<string, number>>): number {
  return Object.values(o).reduce<number>((a, b) => a + (b ?? 0), 0);
}

function economics(m: ProductionMethod) {
  const revenue = sumValues(m.outputs);
  const inputs = sumValues(m.inputs);
  const wages = (Object.entries(m.jobs) as [LaborTypeId, number][]).reduce(
    (a, [t, n]) => a + n * referenceWage(t),
    0,
  );
  const jobs = sumValues(m.jobs);
  return { revenue, inputs, wages, jobs, margin: revenue > 0 ? (revenue - inputs - wages) / revenue : 0 };
}

function isProductive(b: BuildingDefinition): boolean {
  return !PUBLIC_BUILDINGS.includes(b.id) && b.id !== 'construction_sector' && b.id !== 'informal';
}

describe('Dados da indústria: edifícios', () => {
  it('contém todos os BUILDING_IDS e getters coerentes', () => {
    expect(BUILDING_LIST).toHaveLength(BUILDING_IDS.length);
    for (const id of BUILDING_IDS) {
      const b = BUILDINGS[id];
      expect(b, id).toBeDefined();
      expect(b.id).toBe(id);
      expect(getBuilding(id)).toBe(b);
      expect(getMethod(id, b.methods[0]!.id)).toBe(b.methods[0]);
      expect(SECTOR_IDS).toContain(b.sector);
    }
  });

  it('ícones, nomes e descrições não vazios; custos positivos; 2 a 3 métodos', () => {
    for (const b of BUILDING_LIST) {
      expect(b.icon.length, b.id).toBeGreaterThan(0);
      expect(b.icon, b.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(b.name.length, b.id).toBeGreaterThan(0);
      expect(b.description.length, b.id).toBeGreaterThan(10);
      expect(b.constructionCost, b.id).toBeGreaterThan(0);
      expect(b.methods.length, b.id).toBeGreaterThanOrEqual(2);
      expect(b.methods.length, b.id).toBeLessThanOrEqual(3);
    }
  });

  it('ids de métodos são únicos por edifício e todos os números são finitos e >= 0', () => {
    for (const b of BUILDING_LIST) {
      const ids = b.methods.map((m) => m.id);
      expect(new Set(ids).size, b.id).toBe(ids.length);
      for (const m of b.methods) {
        const nums = [
          ...Object.values(m.jobs),
          ...Object.values(m.inputs),
          ...Object.values(m.outputs),
          m.constructionPoints ?? 0,
          m.minTech ?? 0,
          m.pollution ?? 0,
        ];
        for (const n of nums) {
          expect(Number.isFinite(n), `${b.id}/${m.id}`).toBe(true);
          expect(n, `${b.id}/${m.id}`).toBeGreaterThanOrEqual(0);
        }
        expect(m.pollution ?? 0, `${b.id}/${m.id}`).toBeLessThanOrEqual(1);
        for (const g of [...Object.keys(m.inputs), ...Object.keys(m.outputs)])
          expect(GOOD_IDS, `${b.id}/${m.id}`).toContain(g);
      }
    }
  });

  it('empregos por nível do método padrão ficam em [1.500; 12.000]', () => {
    for (const b of BUILDING_LIST) {
      const { jobs } = economics(b.methods[0]!);
      expect(jobs, b.id).toBeGreaterThanOrEqual(1500);
      expect(jobs, b.id).toBeLessThanOrEqual(12000);
    }
  });

  it('o método padrão não exige tecnologia; métodos avançados exigem minTech 1..3', () => {
    for (const b of BUILDING_LIST) {
      expect(b.methods[0]!.minTech ?? 0, b.id).toBe(0);
      for (const m of b.methods.slice(1)) {
        expect(m.minTech, `${b.id}/${m.id}`).toBeGreaterThanOrEqual(1);
        expect(m.minTech, `${b.id}/${m.id}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('margem do método padrão em [5%; 35%] e dos avançados em [0; 45%] (preços 1)', () => {
    for (const b of BUILDING_LIST.filter(isProductive)) {
      if (!b.buildableBy.includes('private')) continue;
      b.methods.forEach((m, i) => {
        const { margin } = economics(m);
        if (i === 0) {
          expect(margin, `${b.id}/${m.id}`).toBeGreaterThanOrEqual(0.05);
          expect(margin, `${b.id}/${m.id}`).toBeLessThanOrEqual(0.35);
        } else {
          expect(margin, `${b.id}/${m.id}`).toBeGreaterThanOrEqual(0);
          expect(margin, `${b.id}/${m.id}`).toBeLessThanOrEqual(0.45);
        }
      });
    }
  });

  it('métodos avançados têm no máximo os empregos do padrão', () => {
    for (const b of BUILDING_LIST.filter(isProductive)) {
      const base = economics(b.methods[0]!).jobs;
      for (const m of b.methods.slice(1)) {
        expect(economics(m).jobs, `${b.id}/${m.id}`).toBeLessThanOrEqual(base * 1.05);
      }
    }
  });

  it('cadeias fechadas: insumos têm produtor ou são comercializáveis; todo bem tem produtor', () => {
    const produced = new Set<GoodId>();
    for (const b of BUILDING_LIST)
      for (const m of b.methods) for (const g of Object.keys(m.outputs)) produced.add(g as GoodId);
    for (const b of BUILDING_LIST) {
      for (const m of b.methods) {
        for (const g of Object.keys(m.inputs) as GoodId[]) {
          expect(produced.has(g) || GOODS[g].tradeable, `${b.id}/${m.id} usa ${g}`).toBe(true);
        }
      }
    }
    for (const g of GOOD_IDS) {
      expect(produced.has(g), `${g} sem produtor`).toBe(true);
    }
  });

  it('setores estratégicos esperados', () => {
    const expected: BuildingId[] = [
      'oil_field',
      'refinery',
      'mine',
      'steel_mill',
      'power_hydro',
      'chemical_plant',
      'machinery_factory',
      'electronics_factory',
      'aerospace',
    ];
    for (const id of expected) expect(BUILDINGS[id].strategic, id).toBe(true);
  });

  it('budgetCategory só nos públicos; informal não é construível', () => {
    for (const b of BUILDING_LIST) {
      if (PUBLIC_BUILDINGS.includes(b.id)) expect(b.budgetCategory, b.id).toBeDefined();
      else expect(b.budgetCategory, b.id).toBeUndefined();
    }
    expect(BUILDINGS.public_admin.budgetCategory).toBe('administration');
    expect(BUILDINGS.hospital.budgetCategory).toBe('health');
    expect(BUILDINGS.school.budgetCategory).toBe('education');
    expect(BUILDINGS.informal.buildableBy).toEqual([]);
    expect(BUILDINGS.informal.sector).toBe('informal');
    for (const id of PUBLIC_BUILDINGS) expect(BUILDINGS[id].buildableBy).toEqual(['state']);
  });

  it('setor público sem produção vendável; informal sem insumos e bem menos produtivo', () => {
    for (const id of PUBLIC_BUILDINGS) {
      for (const m of BUILDINGS[id].methods) {
        expect(Object.keys(m.outputs), `${id}/${m.id}`).toHaveLength(0);
        expect(economics(m).jobs).toBeGreaterThan(0);
      }
    }
    const inf = BUILDINGS.informal.methods[0]!;
    expect(Object.keys(inf.inputs)).toHaveLength(0);
    expect(inf.jobs.workers).toBeGreaterThanOrEqual(6000);
    const formal = economics(BUILDINGS.commerce.methods[0]!);
    const informal = economics(inf);
    expect(informal.revenue / informal.jobs).toBeLessThan(0.5 * (formal.revenue / formal.jobs));
  });

  it('construction_sector: pontos de construção > 0 em todos os métodos, sem produção', () => {
    for (const m of BUILDINGS.construction_sector.methods) {
      expect(m.constructionPoints ?? 0, m.id).toBeGreaterThan(0);
      expect(Object.keys(m.outputs), m.id).toHaveLength(0);
      for (const g of ['construction_materials', 'steel', 'machinery', 'transport'] as const)
        expect(m.inputs[g] ?? 0, `${m.id}/${g}`).toBeGreaterThan(0);
    }
    for (const b of BUILDING_LIST) {
      if (b.id === 'construction_sector') continue;
      for (const m of b.methods) expect(m.constructionPoints, `${b.id}/${m.id}`).toBeUndefined();
    }
  });
});

describe('Dados da indústria: recursos por estado', () => {
  it('edifícios com recurso têm potencial > 0 em pelo menos 3 estados', () => {
    for (const b of BUILDING_LIST) {
      if (!b.resource) continue;
      const res = b.resource;
      const states = STATE_IDS.filter((s) => (STATE_RESOURCES[s]?.[res] ?? 0) > 0);
      expect(states.length, `${b.id}/${res}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('cada edifício usa o recurso esperado', () => {
    const map: Partial<Record<BuildingId, string>> = {
      farm_grain: 'arable',
      farm_soy: 'arable',
      plantation: 'arable',
      ranch: 'pasture',
      forestry: 'forest',
      mine: 'iron',
      oil_field: 'oil',
      power_hydro: 'hydro',
      power_renewable: 'wind_solar',
    };
    for (const b of BUILDING_LIST) expect(b.resource, b.id).toBe(map[b.id]);
  });

  it('todos os estados presentes, potenciais inteiros > 0 e todo recurso existe em algum estado', () => {
    for (const s of STATE_IDS) {
      expect(STATE_RESOURCES[s], s).toBeDefined();
      for (const [r, v] of Object.entries(STATE_RESOURCES[s]!)) {
        expect(RESOURCE_IDS).toContain(r);
        expect(Number.isInteger(v), `${s}/${r}`).toBe(true);
        expect(v, `${s}/${r}`).toBeGreaterThan(0);
      }
    }
    for (const r of RESOURCE_IDS) {
      const total = STATE_IDS.reduce((a, s) => a + (STATE_RESOURCES[s]?.[r] ?? 0), 0);
      expect(total, r).toBeGreaterThan(0);
    }
  });

  it('geografia: grandes potenciais nos estados esperados', () => {
    const top = (r: (typeof RESOURCE_IDS)[number], n: number) =>
      [...STATE_IDS]
        .sort((a, b) => (STATE_RESOURCES[b]?.[r] ?? 0) - (STATE_RESOURCES[a]?.[r] ?? 0))
        .slice(0, n);
    expect(top('oil', 1)).toEqual(['RJ']);
    expect(top('iron', 2).sort()).toEqual(['MG', 'PA']);
    expect(top('arable', 8)).toEqual(expect.arrayContaining(['MT', 'SP', 'MG']));
    expect(top('pasture', 6)).toEqual(expect.arrayContaining(['MT', 'MS', 'GO']));
    expect(STATE_RESOURCES.DF?.iron).toBeUndefined();
    expect(STATE_RESOURCES.AC?.oil).toBeUndefined();
  });

  it('especialidades referenciam edifícios e estados válidos', () => {
    for (const [s, spec] of Object.entries(STATE_SPECIALTIES)) {
      expect(STATE_IDS).toContain(s);
      for (const [b, v] of Object.entries(spec ?? {})) {
        expect(BUILDING_IDS).toContain(b);
        expect(v).toBeGreaterThan(0);
      }
    }
  });
});
