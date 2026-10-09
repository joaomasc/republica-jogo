import { describe, expect, it } from 'vitest';
import {
  deserializeGame,
  deleteSave,
  loadGame,
  MemorySaveStorage,
  parseEnvelope,
  saveGame,
  SaveFormatError,
  serializeGame,
} from '../src/index';
import { must, newGame } from './helpers';

describe('Save/Load', () => {
  it('estado é serializável em JSON e volta idêntico', () => {
    const s = must(newGame(), { type: 'time/advance', step: 'week' });
    const restored = deserializeGame(serializeGame(s, '2026-10-01T00:00:00Z'));
    expect(restored).toEqual(s);
  });

  it('continuar um jogo carregado produz o mesmo resultado que o original (determinismo)', () => {
    const s = newGame('governador', 'BA', 4);
    const restored = deserializeGame(serializeGame(s, 'x'));
    const a = must(s, { type: 'time/advance', step: 'week' });
    const b = must(restored, { type: 'time/advance', step: 'week' });
    expect(b).toEqual(a);
  });

  it('rejeita arquivos que não são saves', () => {
    expect(() => parseEnvelope('{"format":"outro"}')).toThrow(SaveFormatError);
    expect(() => parseEnvelope('null')).toThrow(SaveFormatError);
  });

  it('saveGame / loadGame / deleteSave com armazenamento plugável', async () => {
    const storage = new MemorySaveStorage();
    const s = newGame();
    const info = await saveGame(storage, 'slot-1', s, '2026-10-01T10:00:00Z');
    expect(info.summary.playerName).toBe('Teste Silva');
    expect((await storage.list()).map((x) => x.slotId)).toEqual(['slot-1']);
    expect(await loadGame(storage, 'slot-1')).toEqual(s);
    await deleteSave(storage, 'slot-1');
    expect(await loadGame(storage, 'slot-1')).toBeNull();
  });
});
