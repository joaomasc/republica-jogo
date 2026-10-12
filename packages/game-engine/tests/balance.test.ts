import { describe, expect, it } from 'vitest';
import {
  blockingReason,
  dispatch,
  pendingDecisions,
  startGame,
  type GameState,
} from '../src/index';
import { diffDays } from '../src/core/date';
import { getEventDefinition } from '../src/events/events.data';
import { ANNUAL_EVENTS } from '../src/events/seasons';
import { defaultConfig } from './helpers';

/** Governa um mandato inteiro sem iniciativa: eventos pela 1ª opção, votos "sim". */
function passiveTerm(
  seed: number,
  scenarioId: string,
  officeId: 'prefeito' | 'governador',
  uf: 'BA',
): GameState {
  let s = startGame({ ...defaultConfig(seed, officeId, uf), scenarioId });
  for (let guard = 0; guard < 3000 && s.phase === 'governing'; guard++) {
    const ev = s.events.pending[0];
    if (ev) {
      s = dispatch(s, {
        type: 'event/resolve',
        instanceId: ev.instanceId,
        optionId: ev.options.find((o) => o.available)?.id ?? '',
      }).state;
      continue;
    }
    const d = pendingDecisions(s).find((x) => x.blocking);
    if (d && 'billId' in d && d.billId) {
      s = dispatch(s, { type: 'leg/vote', billId: d.billId, vote: 'yes' }).state;
      continue;
    }
    if (blockingReason(s)) break;
    const out = dispatch(s, { type: 'time/advance', step: 'month' });
    if (!out.result.ok) break;
    s = out.state;
  }
  return s;
}

describe('Balanceamento (regressão)', () => {
  const runs = [1, 2, 3].map((seed) => passiveTerm(seed, 'prefeitura_salvador', 'prefeito', 'BA'));

  it('o bot passivo termina o mandato de prefeito com aprovação média de no máximo 50%', () => {
    const finals = runs.map(
      (s) =>
        s.career.lastEvaluation?.approval ?? s.government?.approvalHistory.at(-1)?.value ?? 100,
    );
    const mean = finals.reduce((a, b) => a + b, 0) / finals.length;
    expect(mean).toBeLessThanOrEqual(50);
  });

  it('nenhum evento sorteável se repete em menos de 18 meses no mesmo mandato', () => {
    for (const s of runs) {
      const seen = new Map<string, string>();
      for (const e of [...s.events.log].reverse()) {
        const def = getEventDefinition(e.eventId);
        if (!def || def.chainOnly || def.months || ANNUAL_EVENTS.has(def.id)) continue;
        const prev = seen.get(e.eventId);
        if (prev) expect(diffDays(prev, e.date), e.eventId).toBeGreaterThanOrEqual(540);
        seen.set(e.eventId, e.date);
      }
    }
  });
});
