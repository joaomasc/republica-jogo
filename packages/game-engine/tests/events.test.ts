import { describe, expect, it } from 'vitest';
import {
  dispatch,
  EVENT_DEFINITIONS,
  generateEvent,
  getEventDefinition,
  resolveEvent,
} from '../src/index';
import { newGame } from './helpers';

describe('Eventos', () => {
  it('todas as definições têm opções e categorias válidas', () => {
    for (const def of EVENT_DEFINITIONS) {
      expect(def.options.length).toBeGreaterThan(0);
      expect(def.phases.length).toBeGreaterThan(0);
      for (const opt of def.options) expect(opt.effects).toBeDefined();
    }
  });

  it('eventos encadeados apontam para eventos existentes', () => {
    for (const def of EVENT_DEFINITIONS) {
      for (const opt of def.options) {
        for (const e of opt.effects)
          if (e.type === 'chain') expect(getEventDefinition(e.eventId)).toBeDefined();
      }
    }
  });

  function stateWithPendingEvent() {
    let s = newGame('presidente', 'SP', 31);
    for (let i = 0; i < 30 && s.events.pending.length === 0; i++) s = generateEvent(s).state;
    return s;
  }

  it('generateEvent cria um evento pendente com opções e prévia de efeitos', () => {
    const s = stateWithPendingEvent();
    expect(s.events.pending.length).toBe(1);
    const ev = s.events.pending[0]!;
    expect(ev.title).not.toContain('{');
    expect(ev.options.length).toBeGreaterThan(1);
  });

  it('evento pendente bloqueia o avanço do tempo', () => {
    const s = stateWithPendingEvent();
    const out = dispatch(s, { type: 'time/advance', step: 'day' });
    expect(out.result.ok).toBe(false);
    expect(out.state.date).toBe(s.date);
  });

  it('resolveEvent aplica a opção, registra no log e libera o tempo', () => {
    const s = stateWithPendingEvent();
    const ev = s.events.pending[0]!;
    const out = resolveEvent(s, ev.instanceId, ev.options[0]!.id);
    expect(out.result.ok).toBe(true);
    expect(out.state.events.pending).toHaveLength(0);
    expect(out.state.events.log[0]?.instanceId).toBe(ev.instanceId);
    expect(dispatch(out.state, { type: 'time/advance', step: 'day' }).result.ok).toBe(true);
  });

  it('opção inválida é recusada', () => {
    const s = stateWithPendingEvent();
    expect(resolveEvent(s, s.events.pending[0]!.instanceId, 'nao-existe').result.ok).toBe(false);
  });

  it('o avanço do tempo gera eventos ao longo da campanha', () => {
    let s = newGame('presidente', 'SP', 32);
    let fired = 0;
    for (let i = 0; i < 40 && s.phase === 'campaign'; i++) {
      const out = dispatch(s, { type: 'time/advance', step: 'day' });
      s = out.state;
      for (const ev of s.events.pending) {
        fired++;
        s = resolveEvent(s, ev.instanceId, ev.options[0]!.id).state;
      }
      const debate = s.election?.debates.find((d) => d.status === 'scheduled' && d.date === s.date);
      if (debate) s = dispatch(s, { type: 'debate/decline', debateId: debate.id }).state;
    }
    expect(fired + s.events.log.length).toBeGreaterThan(0);
  });
});
