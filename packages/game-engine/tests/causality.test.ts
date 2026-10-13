import { describe, expect, it } from 'vitest';
import { dispatch, explainIntention, explainRival, startGame, type GameState } from '../src/index';
import { driftParties } from '../src/parties/parties';
import { DriverReader, driverEffect } from '../src/events/drivers';
import { getEventDefinition } from '../src/events/events.data';
import { fireEvent } from '../src/events/events';
import { computeIntentions } from '../src/election/voterModel';
import { defaultConfig } from './helpers';

function trueShare(s: GameState): number {
  return (
    computeIntentions(s, s.election!, { includeSegments: false }).total.shares[s.playerId] ?? 0
  );
}

/** Joga N dias resolvendo o que trava o tempo (1ª opção dos eventos, sem carta, recusa debates). */
function playDays(s: GameState, days: number): GameState {
  for (let d = 0; d < days && s.phase === 'campaign'; d++) {
    for (let g = 0; g < 10; g++) {
      const ev = s.events.pending[0];
      if (ev) {
        s = dispatch(s, {
          type: 'event/resolve',
          instanceId: ev.instanceId,
          optionId: ev.options.find((o) => o.available)?.id ?? '',
        }).state;
        continue;
      }
      if (s.campaign?.week?.pending) {
        s = dispatch(s, { type: 'week/choose', cardId: null }).state;
        continue;
      }
      if (s.interactions.interview) {
        s = dispatch(s, { type: 'interview/close' }).state;
        continue;
      }
      const debate = s.election?.debates.find((x) => x.status === 'scheduled' && x.date === s.date);
      if (debate) {
        s = dispatch(s, { type: 'debate/decline', debateId: debate.id }).state;
        continue;
      }
      break;
    }
    const out = dispatch(s, { type: 'time/advance', step: 'day' });
    if (!out.result.ok) break;
    s = out.state;
  }
  return s;
}

describe('Causalidade da intenção de voto', () => {
  const start = startGame({ ...defaultConfig(7, 'prefeito', 'RS'), weekly: true });
  const end = playDays(start, 30);

  it('toda variação real da intenção tem fonte registrada no medidor', () => {
    const real = trueShare(end) - trueShare(start);
    const recorded = (end.campaign?.impactCum ?? 0) - (start.campaign?.impactCum ?? 0);
    expect(Math.abs(real - recorded)).toBeLessThan(1e-6);
  });

  it('nenhuma linha usa os baldes genéricos antigos', () => {
    const generic = ['Campanha dos adversários', 'Eventos e efeitos em andamento'];
    expect(end.campaign!.impact!.some((e) => generic.includes(e.label))).toBe(false);
    const residual = end.campaign!.impact!.filter((e) => e.label === 'Outros efeitos do dia');
    for (const e of residual) expect(Math.abs(e.share)).toBeLessThan(1e-6);
  });

  it('o início da semana vira linhas nomeadas (pauta, temas que esfriam)', () => {
    expect(
      end.campaign!.impact!.some((e) => e.source === 'week' && e.label.startsWith('Nova pauta')),
    ).toBe(true);
  });

  it('"por que mudou?" separa o que a pesquisa mostra do que mudou de fato', () => {
    const why = explainIntention(end)!;
    expect(why.top.length).toBeGreaterThan(0);
    expect(why.top.length).toBeLessThanOrEqual(3);
    expect(why.poll?.previous).not.toBeNull();
    expect(why.poll!.real).not.toBeNull();
    expect(why.poll!.noise!).toBeCloseTo(why.poll!.shown! - why.poll!.real!, 10);
    // Margem honesta: amostra e viés de instituto.
    expect(why.poll!.latest.margin).toBeGreaterThan(why.poll!.latest.samplingMargin);
  });

  it('cada adversário tem as próprias causas (o que fez e o que sofreu)', () => {
    const rival = end.election!.candidateIds.find((id) => id !== end.playerId)!;
    const why = explainRival(end, rival)!;
    const name = end.candidates[rival]!.ballotName;
    expect(why.top.some((l) => l.label.includes(name))).toBe(true);
  });
});

describe('Causalidade da aprovação', () => {
  function month(s: GameState): GameState {
    for (let g = 0; g < 20; g++) {
      const ev = s.events.pending[0];
      if (ev) {
        s = dispatch(s, {
          type: 'event/resolve',
          instanceId: ev.instanceId,
          optionId: ev.options.find((o) => o.available)?.id ?? '',
        }).state;
        continue;
      }
      if (s.government?.cabinet?.pending) {
        s = dispatch(s, { type: 'gov/cabinet', cardId: null }).state;
        continue;
      }
      break;
    }
    const out = dispatch(s, { type: 'time/advance', step: 'month' });
    return out.result.ok ? out.state : s;
  }

  it('toda variação da aprovação tem causa listada (sem ruído sorteado)', () => {
    let s = startGame({ ...defaultConfig(3, 'prefeito', 'BA'), scenarioId: 'prefeitura_salvador' });
    const a0 = s.government!.approval;
    const c0 = s.government!.approvalCum ?? 0;
    for (let i = 0; i < 14 && s.phase === 'governing'; i++) s = month(s);
    const gov = s.government!;
    expect(Math.abs(gov.approval - a0 - ((gov.approvalCum ?? 0) - c0))).toBeLessThan(0.01);
    expect(gov.approvalTarget?.parts[0]?.label).toBe('Satisfação da população');
    // A partir do 7º mês o desgaste entra como parcela própria.
    expect(gov.approvalImpact!.some((e) => e.kind === 'wear')).toBe(true);
  });

  it('consequências agendadas (continuações de eventos) também disparam no mandato', () => {
    let s = startGame({ ...defaultConfig(1, 'prefeito', 'BA'), scenarioId: 'prefeitura_salvador' });
    s.events.scheduled.push({ eventId: 'bribe_exposed', date: s.date, context: {} });
    s = month(s);
    expect(s.events.scheduled).toHaveLength(0);
    expect(
      s.events.log.some((e) => e.eventId === 'bribe_exposed') ||
        s.events.pending.some((e) => e.eventId === 'bribe_exposed'),
    ).toBe(true);
  });
});

describe('Popularidade dos partidos', () => {
  it('não oscila sem causa: só volta ao patamar e responde à avaliação de quem governa', () => {
    const s = startGame(defaultConfig(5, 'prefeito', 'RS'));
    const parties = structuredClone(s.parties);
    const before = Object.fromEntries(Object.values(parties).map((p) => [p.id, p.popularity]));
    const [gov, other] = Object.keys(parties);
    driftParties(parties, 90, {
      governingPartyId: gov!,
      governingScore: -1,
      playerPartyId: null,
      playerScore: null,
    });
    expect(parties[gov!]!.popularity).toBeLessThan(before[gov!]!);
    expect(parties[other!]!.popularity).toBeCloseTo(before[other!]!, 10);
  });
});

describe('Eventos com causa', () => {
  const base = () =>
    startGame({ ...defaultConfig(1, 'prefeito', 'BA'), scenarioId: 'prefeitura_salvador' });

  it('a fila na UPA depende do orçamento da saúde (e diz isso ao jogador)', () => {
    const def = getEventDefinition('mun_fila_upa')!;
    const s = base();
    const b = s.government!.budget!;
    b.spending.health = b.baseline.health * 0.7;
    const bad = driverEffect(def, new DriverReader(s))!;
    b.spending.health = b.baseline.health * 1.3;
    const good = driverEffect(def, new DriverReader(s))!;
    expect(bad.mult).toBeGreaterThan(1.5);
    expect(good.mult).toBeLessThan(bad.mult / 2);
    const fired = fireEvent(s, def)!;
    expect(fired.cause).toMatch(/Saúde: serviço .* do padrão/);
    expect(fired.unforeseen).toBeUndefined();
  });

  it('evento sem gatilho no estado vem marcado como imprevisto', () => {
    const s = base();
    const fired = fireEvent(s, getEventDefinition('mun_animais')!)!;
    expect(fired.unforeseen).toBe(true);
    expect(fired.cause).toMatch(/^Imprevisto/);
  });

  it('continuação mostra a decisão que a causou', () => {
    let s = base();
    const lobby = fireEvent(s, getEventDefinition('lobby_offer')!)!;
    s = dispatch(s, {
      type: 'event/resolve',
      instanceId: lobby.instanceId,
      optionId: 'accept',
    }).state;
    const item = s.events.scheduled.find((x) => x.eventId === 'bribe_exposed');
    expect(item?.origin).toMatch(/→/);
  });
});
