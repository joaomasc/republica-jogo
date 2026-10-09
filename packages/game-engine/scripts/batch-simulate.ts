/**
 * Ferramenta de balanceamento: joga várias campanhas com bots (incluindo 2º turno) e imprime estatísticas.
 * Uso: npm run simulate -- [cargo] [estado] [partidas]
 */
import {
  dispatch,
  OTHERS_KEY,
  startGame,
  type GameState,
  type OfficeId,
  type StateId,
} from '../src/index';
import { defaultConfig, playCampaign, summarizeCampaign, type BotStrategy } from './bot';

const officeId = (process.argv[2] ?? 'presidente') as OfficeId;
const stateId = (process.argv[3] ?? 'SP') as StateId;
const runs = Number(process.argv[4] ?? 6);

function topLine(state: GameState): string {
  const result = state.election?.results.at(-1);
  if (!result) return '';
  const top = Object.entries(result.pct)
    .filter(([id]) => id !== OTHERS_KEY)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(
      ([id, v]) =>
        `${state.candidates[id]?.ballotName.split(' ')[0]}${id === state.playerId ? '*' : ''} ${(v * 100).toFixed(1)}`,
    )
    .join(' | ');
  const p = result.proportional;
  const extra = p
    ? ` [votos ${p.playerVotes.toLocaleString('pt-BR')} · ${p.playerRankInParty}º no partido · partido ${p.playerPartySeats}/${p.seats} cadeiras · corte ${p.cutLine.toLocaleString('pt-BR')}]`
    : '';
  return `${top}${result.runoff ? ' (2º turno)' : ''}${extra}`;
}

for (const strategy of ['passive', 'active'] as BotStrategy[]) {
  let wins = 0;
  let runoffs = 0;
  const t0 = Date.now();
  for (let i = 0; i < runs; i++) {
    const start = startGame(defaultConfig(1000 + i, officeId, stateId));
    let s = playCampaign(start, strategy);
    const summary = summarizeCampaign(start, s);
    s = dispatch(s, { type: 'election/hold' }).state;
    let line = `R1: ${topLine(s)}`;
    const last = s.election?.results.at(-1);
    if (last?.runoff?.includes(s.playerId)) {
      runoffs++;
      s = dispatch(s, { type: 'election/continue' }).state;
      s = playCampaign(s, strategy);
      s = dispatch(s, { type: 'election/hold' }).state;
      line += ` → R2: ${topLine(s)}`;
    }
    const won = s.election?.outcome?.won ?? false;
    if (won) wins++;
    console.log(strategy, JSON.stringify(summary), line, won ? '✔ VENCEU' : '');
  }
  console.log(
    `== ${strategy}: ${wins}/${runs} vitórias, ${runoffs} 2º turnos (${((Date.now() - t0) / runs).toFixed(0)} ms/partida)\n`,
  );
}
