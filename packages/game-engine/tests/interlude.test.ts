import { describe, expect, it } from 'vitest';
import {
  careerOptions,
  dispatch,
  interludeView,
  nextMilestone,
  parseEnvelope,
  partyCompatibility,
  projectCandidacy,
  serializeGame,
  startGame,
  type GameState,
} from '../src/index';
import { defaultConfig, must, playCampaign } from './helpers';

/** Perde uma eleição de prefeito e cai na entressafra. */
function lost(): GameState {
  for (let seed = 1; seed <= 30; seed++) {
    let s = startGame(defaultConfig(seed, 'prefeito', 'RS'));
    s = playCampaign(s, 'passive');
    s = dispatch(s, { type: 'election/hold' }).state;
    if (s.election?.status === 'campaign') continue;
    s = dispatch(s, { type: 'election/continue' }).state;
    if (s.phase === 'career') return s;
  }
  throw new Error('nenhuma derrota encontrada');
}

function run(s: GameState): GameState {
  const t = interludeView(s).target!;
  return must(s, {
    type: 'career/run',
    officeId: t.officeId,
    stateId: t.stateId,
    ...(t.cityId ? { cityId: t.cityId } : {}),
  });
}

describe('Entressafra por marcos', () => {
  const base = lost();

  it('a derrota deixa base onde houve voto e um alvo padrão', () => {
    const it0 = base.career.interlude!;
    expect(it0.target?.officeId).toBe('prefeito');
    expect(it0.base).toBeGreaterThan(0);
  });

  it('avança até o próximo marco, com resumo do bloco e uma preparação por bloco', () => {
    let s = must(base, { type: 'career/prep', prepId: 'base' });
    const after = s.career.interlude!.base;
    expect(after).toBeGreaterThan(base.career.interlude!.base);
    expect(dispatch(s, { type: 'career/prep', prepId: 'media' }).result.ok).toBe(false);
    const m = nextMilestone(s)!;
    s = must(s, { type: 'career/advance' });
    expect(s.date).toBe(m.date);
    const sum = s.career.interlude!.summaries[0]!;
    expect(sum.milestone).toBe(m.label);
    expect(s.career.interlude!.prepDone).toBe(false);
  });

  it('chega ao início da campanha e não passa dele', () => {
    let s = base;
    for (let i = 0; i < 20; i++) {
      for (const ev of s.events.pending)
        s = must(s, {
          type: 'event/resolve',
          instanceId: ev.instanceId,
          optionId: ev.options.find((o) => o.available)!.id,
        });
      const out = dispatch(s, { type: 'career/advance' });
      if (!out.result.ok) break;
      s = out.state;
    }
    const start = careerOptions(s).find((o) => o.officeId === 'prefeito')!.campaignStart;
    expect(s.date).toBe(start);
    expect(nextMilestone(s)).toBeNull();
  });

  it('base, caixa e aliados entram na campanha seguinte', () => {
    const player = base.candidates[base.playerId]!;
    const ally = Object.values(base.parties)
      .filter((p) => p.id !== player.partyId)
      .sort(
        (a, b) => partyCompatibility(player.ideology, b) - partyCompatibility(player.ideology, a),
      )[0]!;
    const plain = structuredClone(base);
    plain.career.interlude = { ...plain.career.interlude!, base: 0, warChest: 0, allies: [] };
    const prepared = structuredClone(base);
    const it0 = prepared.career.interlude!;
    prepared.career.interlude = {
      ...it0,
      base: 40,
      baseKey: null,
      warChest: 0.3,
      allies: [ally.id],
    };
    // A base precisa estar no lugar do alvo: faz uma preparação ali para fixar o lugar.
    prepared.career.interlude.prepDone = false;
    const fixed = must(prepared, { type: 'career/prep', prepId: 'base' });
    const a = run(plain);
    const b = run(fixed);
    const avg = (r: Record<string, number>) =>
      Object.values(r).reduce((x, y) => x + y, 0) / Object.keys(r).length;
    const pa = a.election!.participants[a.playerId]!;
    const pb = b.election!.participants[b.playerId]!;
    expect(avg(pb.presence)).toBeGreaterThan(avg(pa.presence) + 5);
    expect(avg(pb.knowledge)).toBeGreaterThan(avg(pa.knowledge) + 5);
    expect(b.campaign!.money).toBeGreaterThan(a.campaign!.money * 1.2);
    expect(b.election!.candidateIds.some((id) => b.candidates[id]?.partyId === ally.id)).toBe(
      false,
    );
    expect(b.election!.endorsements?.[b.playerId]?.[0]?.partyId).toBe(ally.id);
    expect(b.career.interlude).toBeNull();
  });

  it('"se a eleição fosse hoje" melhora com base construída', () => {
    const low = structuredClone(base);
    low.career.interlude = { ...low.career.interlude!, base: 0 };
    const high = structuredClone(base);
    high.career.interlude = { ...high.career.interlude!, base: 60 };
    const pl = projectCandidacy(low)!;
    const ph = projectCandidacy(high)!;
    expect(ph.knowledge).toBeGreaterThan(pl.knowledge);
    expect(ph.share).toBeGreaterThan(pl.share);
  });

  it('filiação depois da janela partidária não vale para a eleição daquele ano', () => {
    let s = structuredClone(base);
    const year = interludeView(s).target!.year;
    s.date = `${year}-05-10`;
    const other = Object.values(s.parties).find((p) => p.id !== s.candidates[s.playerId]!.partyId)!;
    s = must(s, { type: 'career/switchParty', partyId: other.id });
    const opt = careerOptions(s).find((o) => o.officeId === 'prefeito')!;
    if (opt.year === year) expect(opt.eligible).toBe(false);
  });

  it('save antigo (v3) na entressafra ganha alvo e recursos ao carregar', () => {
    const raw = JSON.parse(serializeGame(base, '2030-01-01T00:00:00Z')) as {
      version: number;
      state: GameState;
    };
    raw.version = 3;
    delete raw.state.career.interlude;
    const loaded = parseEnvelope(raw).state;
    expect(loaded.career.interlude?.target).toBeTruthy();
  });
});
