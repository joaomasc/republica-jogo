import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  IDEOLOGY_AXES,
  partyIdForWorld,
  REAL_PARTIES,
  REAL_PARTY_EQUIVALENTS,
  DEFAULT_PARTIES,
  startGame,
} from '../src/index';
import { buildChambers } from '../src/politics/congress';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../scripts/bot';
import type { GameState } from '../src/simulation/state';
import { must } from './helpers';

const PUBLIC_DIR = fileURLToPath(new URL('../../../apps/web/public/', import.meta.url));
const MICRO = ['up', 'pstu', 'pcb', 'pco', 'democrata', 'agir', 'dc', 'mobiliza', 'prtb'];

function realGame(seed: number, office: 'presidente' | 'deputado_federal' = 'presidente') {
  return startGame({ ...defaultConfig(seed, office, 'SP', 'mdb'), world: 'real' });
}

function runCampaign(state: GameState): GameState {
  let s = state;
  for (let guard = 0; guard < 200 && s.phase === 'campaign'; guard++) {
    const ev = s.events.pending[0];
    if (ev) {
      s = must(s, {
        type: 'event/resolve',
        instanceId: ev.instanceId,
        optionId: ev.options.find((o) => o.available)!.id,
      });
      continue;
    }
    const interview = s.interactions.interview;
    if (interview) {
      const q = interview.questions[interview.index];
      s = must(
        s,
        interview.finished || !q
          ? { type: 'interview/close' }
          : { type: 'interview/answer', answerId: q.answers[0]!.id },
      );
      continue;
    }
    const d = s.election!.debates.find((x) => x.status === 'scheduled' && x.date === s.date);
    if (d) {
      s = must(s, { type: 'debate/decline', debateId: d.id });
      continue;
    }
    s = must(s, { type: 'time/advance', step: 'week' });
  }
  return s;
}

describe('Mundo real (partidos do TSE)', () => {
  it('tem os 30 partidos registrados, sem sigla, número ou id repetidos', () => {
    expect(REAL_PARTIES).toHaveLength(30);
    expect(new Set(REAL_PARTIES.map((p) => p.id)).size).toBe(30);
    expect(new Set(REAL_PARTIES.map((p) => p.acronym)).size).toBe(30);
    expect(new Set(REAL_PARTIES.map((p) => p.number)).size).toBe(30);
    const fictionalIds = new Set(DEFAULT_PARTIES.map((p) => p.id));
    for (const p of REAL_PARTIES) {
      expect(fictionalIds.has(p.id)).toBe(false);
      expect(p.provenance.kind).toBe('historical');
      for (const axis of IDEOLOGY_AXES) {
        expect(p.ideology[axis]).toBeGreaterThanOrEqual(0);
        expect(p.ideology[axis]).toBeLessThanOrEqual(100);
      }
      expect(p.factions.reduce((a, f) => a + f.size, 0)).toBeCloseTo(1, 5);
    }
  });

  it('todo partido tem logo e o arquivo existe no site', () => {
    for (const p of REAL_PARTIES) {
      expect(p.logo, p.id).toMatch(/^partidos\/[a-z]+\.(png|jpg)$/);
      expect(existsSync(PUBLIC_DIR + p.logo), p.logo).toBe(true);
    }
  });

  it('começa com o PT na Presidência; na média, PL e PT têm as maiores bancadas', () => {
    const average: Record<string, number> = {};
    const seeds = [1, 2, 3, 4, 5, 6];
    for (const seed of seeds) {
      const s = realGame(seed);
      expect(s.settings.world).toBe('real');
      expect(Object.keys(s.parties)).toHaveLength(30);
      expect(s.landscape.presidentPartyId).toBe('pt');
      const [camara, senado] = buildChambers(s, { level: 'federal' } as never, new Rng(seed));
      expect(Object.values(camara!.seats).reduce((a, b) => a + b, 0)).toBe(513);
      for (const [id, seats] of Object.entries(camara!.seats))
        average[id] = (average[id] ?? 0) + seats / seeds.length;
      for (const id of MICRO) {
        expect(camara!.seats[id], id).toBe(0);
        expect(senado!.seats[id], id).toBe(0);
      }
    }
    const ranked = Object.entries(average).sort((a, b) => b[1] - a[1]);
    expect(ranked.slice(0, 2).map(([id]) => id)).toEqual(['pl', 'pt']);
  });

  it('traduz partidos entre os mundos', () => {
    for (const [model, real] of Object.entries(REAL_PARTY_EQUIVALENTS)) {
      expect(partyIdForWorld(model, 'real')).toBe(real);
      expect(partyIdForWorld(real, 'fictional')).toBe(model);
      expect(partyIdForWorld(real, 'parody')).toBe(model);
    }
    expect(partyIdForWorld('pcb', 'real')).toBe('pcb');
    expect(partyIdForWorld('pcb', 'fictional')).toBe('udc');
    expect(partyIdForWorld(undefined, 'real')).toBe('mdb');
    expect(partyIdForWorld('inexistente', 'real')).toBe('mdb');
  });

  it('uma campanha inteira roda com os 30 partidos', () => {
    const s = runCampaign(realGame(7, 'deputado_federal'));
    expect(s.phase).not.toBe('campaign');
    for (const c of Object.values(s.candidates))
      expect(s.parties[c.partyId], c.partyId).toBeDefined();
  }, 60_000);
});
