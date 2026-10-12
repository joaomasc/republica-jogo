import { describe, expect, it } from 'vitest';
import { EXTRA_WEEK_CARDS, type CardSituation } from '../src/campaign/weeklyCards.data';
import { ISSUES } from '../src/ideology/issues';
import { EXTRA_ISSUE_QUESTIONS } from '../src/media/questions.data';
import { HOSTILE_QUESTIONS, ISSUE_QUESTIONS } from '../src/media/textBank';

const vars = (t: string) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

describe('Bancos de conteúdo', () => {
  it('cada tema tem ao menos 15 perguntas de entrevista, só com variáveis conhecidas', () => {
    for (const issue of ISSUES) {
      const all = [...ISSUE_QUESTIONS[issue], ...EXTRA_ISSUE_QUESTIONS[issue]];
      expect(all.length, issue).toBeGreaterThanOrEqual(15);
      for (const q of all)
        for (const v of vars(q)) expect(['place', 'unemployment', 'inflation'], q).toContain(v);
    }
  });

  it('perguntas difíceis têm variações e usam só as variáveis do seu motivo', () => {
    const allowed: Record<string, string[]> = {
      scandal: ['memory'],
      promise: ['memory'],
      party: ['party'],
      polls: ['share'],
    };
    for (const [kind, list] of Object.entries(HOSTILE_QUESTIONS)) {
      expect(list.length, kind).toBeGreaterThan(0);
      for (const q of list) for (const v of vars(q)) expect(allowed[kind] ?? [], q).toContain(v);
    }
  });

  it('cartas extras da semana: chaves únicas, efeitos válidos e peso calculável', () => {
    const keys = EXTRA_WEEK_CARDS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    const sit: CardSituation = {
      week: 3,
      daysLeft: 20,
      debateSoon: true,
      attackedMe: true,
      hasRival: true,
      rank: 2,
      share: 0.2,
      majoritarian: true,
      president: false,
      statewide: true,
      municipal: false,
      money: 100_000,
      moneyScale: 1,
      energy: 20,
      enthusiasm: 70,
      militantsHigh: true,
      unity: 40,
      fame: 30,
      scandal: 20,
      credibility: 55,
      promises: 0,
    };
    for (const card of EXTRA_WEEK_CARDS) {
      expect(card.effects.length, card.key).toBeGreaterThan(0);
      expect(card.chance).toBeGreaterThan(0);
      expect(card.chance).toBeLessThanOrEqual(1);
      if (card.chance < 1) expect(card.failure, `${card.key} precisa de falha`).toBeDefined();
      expect(Number.isFinite(card.weight(sit))).toBe(true);
    }
  });
});

describe('Conquistas e legado', () => {
  it('conquistas têm ids únicos e avaliam sem erro num jogo recém-criado', async () => {
    const { ACHIEVEMENTS, satisfiedAchievements, legacyScore } =
      await import('../src/career/achievements');
    const { startGame } = await import('../src/index');
    const { defaultConfig } = await import('./helpers');
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const s = startGame(defaultConfig(1, 'prefeito', 'SP'));
    expect(satisfiedAchievements(s)).toEqual([]);
    const legacy = legacyScore(s);
    expect(legacy.score).toBeGreaterThanOrEqual(0);
    expect(legacy.score).toBeLessThanOrEqual(100);
  });
});
