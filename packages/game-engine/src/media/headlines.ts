/**
 * Manchetes a partir de fatos da simulação (banco de conteúdo, seção 13).
 */
import { formatPct } from '../core/math';

export interface PollFacts {
  pollster: string;
  place: string;
  playerName: string;
  playerShare: number;
  previousShare: number | null;
  leaderName: string;
  leaderShare: number;
  playerLeads: boolean;
  undecided: number;
  /** Nome do adversário mais próximo do jogador (o líder, se o jogador não lidera). */
  rivalName: string;
}

/** Escolhe a manchete da pesquisa conforme o que ela mostra (variação, empate, indecisos...). */
export function pollHeadline(f: PollFacts): string {
  const delta = f.previousShare === null ? 0 : f.playerShare - f.previousShare;
  const gap = f.leaderShare - f.playerShare;
  const pts = Math.round(Math.abs(delta) * 100);
  if (!f.playerLeads && delta >= 0.03 && gap <= 0.04)
    return `${f.playerName} dispara e encosta em ${f.rivalName} (${f.pollster})`;
  if (!f.playerLeads && gap < 0.03)
    return `Empate técnico na disputa por ${f.place}, aponta ${f.pollster}`;
  if (delta <= -0.03) return `${f.playerName} perde ${pts} pontos, mostra ${f.pollster}`;
  if (f.playerLeads && delta >= 0.03)
    return `${f.playerName} amplia a vantagem e chega a ${formatPct(f.playerShare, 0)} (${f.pollster})`;
  if (f.undecided >= 0.25)
    return `Indecisos ainda são ${formatPct(f.undecided, 0)} e podem decidir a eleição (${f.pollster})`;
  return `${f.pollster}: ${f.leaderName} lidera com ${Math.round(f.leaderShare * 100)}%; ${f.playerName} tem ${Math.round(f.playerShare * 100)}%`;
}
