import { describe, expect, it } from 'vitest';
import {
  capitalOf,
  CITIES,
  citiesOf,
  cityCouncilSeats,
  cityOf,
  mayorPartyOf,
  STATE_IDS,
  STATES,
  startGame,
  validateNewGame,
} from '../src/index';
import { jurisdictionKey } from '../src/laws/laws';
import { defaultConfig } from '../scripts/bot';
import type { GameState } from '../src/simulation/state';
import { clearBlockers, must } from './helpers';

const CAXIAS = '4305108';

function municipalGame(officeId: 'prefeito' | 'vereador', cityId: string | undefined, seed = 4) {
  const base = defaultConfig(seed, officeId, 'RS', 'udc');
  return startGame({ ...base, office: { ...base.office, ...(cityId ? { cityId } : {}) } });
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

describe('Cidades jogáveis', () => {
  it('cada estado tem a capital (com o mesmo nome do cadastro de UFs) e cidades-polo', () => {
    expect(Object.keys(CITIES).length).toBe(123);
    for (const id of STATE_IDS) {
      const capital = capitalOf(id);
      expect(capital.capital).toBe(true);
      expect(capital.name).toBe(STATES[id].capital);
      expect(citiesOf(id)[0]).toBe(capital);
    }
    expect(citiesOf('RS').map((c) => c.name)).toEqual(
      expect.arrayContaining(['Caxias do Sul', 'Santa Maria', 'Passo Fundo', 'Pelotas']),
    );
  });

  it('cidade de outro estado ou desconhecida cai na capital', () => {
    expect(cityOf('RS', CAXIAS).name).toBe('Caxias do Sul');
    expect(cityOf('SP', CAXIAS).name).toBe('São Paulo');
    expect(cityOf('RS', null).name).toBe('Porto Alegre');
  });

  it('vereadores seguem o teto da Constituição pela população', () => {
    expect(cityCouncilSeats('SP')).toBe(55);
    expect(cityCouncilSeats('RS')).toBe(35); // Porto Alegre, 1,33 mi
    expect(cityCouncilSeats('RS', CAXIAS)).toBe(25); // 464 mil
    expect(cityCouncilSeats('RS', '4311403')).toBe(17); // Lajeado, 94 mil
  });

  it('eleição para prefeito numa cidade-polo usa a cidade, não a capital', () => {
    const s = municipalGame('prefeito', CAXIAS);
    const j = s.election!.jurisdiction;
    expect(j.cityId).toBe(CAXIAS);
    expect(j.label).toBe('Caxias do Sul (RS)');
    const capital = municipalGame('prefeito', undefined);
    const voters = (g: GameState) => g.election!.units.reduce((a, u) => a + u.voters, 0);
    // Caxias tem cerca de um terço dos habitantes de Porto Alegre.
    expect(voters(s) / voters(capital)).toBeGreaterThan(0.25);
    expect(voters(s) / voters(capital)).toBeLessThan(0.45);
    expect(s.landscape.cityMayors?.[CAXIAS]).toBeDefined();
  });

  it('vereador na cidade-polo disputa as cadeiras da câmara dela', () => {
    const s = municipalGame('vereador', CAXIAS);
    expect(s.election!.seats).toBe(25);
  });

  it('cidade de outro estado é recusada', () => {
    const base = defaultConfig(1, 'prefeito', 'SP', 'udc');
    expect(validateNewGame({ ...base, office: { ...base.office, cityId: CAXIAS } })).toMatch(
      /Cidade inválida/,
    );
  });

  it('cada cidade tem as próprias leis; a capital mantém a chave antiga', () => {
    expect(jurisdictionKey({ level: 'municipal', stateId: 'RS' })).toBe('municipal:RS');
    expect(jurisdictionKey({ level: 'municipal', stateId: 'RS', cityId: capitalOf('RS').id })).toBe(
      'municipal:RS',
    );
    expect(jurisdictionKey({ level: 'municipal', stateId: 'RS', cityId: CAXIAS })).toBe(
      `municipal:RS:${CAXIAS}`,
    );
  });

  it('uma campanha inteira em Caxias do Sul termina e registra o prefeito eleito', () => {
    let s = municipalGame('prefeito', CAXIAS, 9);
    // Cidade com mais de 200 mil eleitores: pode haver 2º turno.
    for (let round = 0; round < 2; round++) {
      s = clearBlockers(runCampaign(s));
      expect(s.phase).toBe('election_day');
      s = must(s, { type: 'election/hold' });
      if (s.election!.results.at(-1)?.winnerId) break;
      s = must(s, { type: 'election/continue' });
    }
    const winnerId = s.election!.results.at(-1)?.winnerId;
    expect(winnerId).toBeTruthy();
    expect(mayorPartyOf(s, 'RS', CAXIAS)).toBe(s.candidates[winnerId!]!.partyId);
    expect(s.landscape.mayors.RS).toBeDefined();
  }, 60_000);
});
