/**
 * RELAÇÕES FEDERATIVAS (bloco 11) — prefeito ↔ governador ↔ presidente.
 *
 * Repasses voluntários (convênios, obras, emendas) dependem do alinhamento político: governo do
 * mesmo partido repassa mais; aliado repassa o normal; adversário segura o dinheiro.
 */
import { GameConstants } from '../config/constants';
import type { PartyId, StateId } from '../core/types';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';

const F = GameConstants.federative;

export type Alignment = 'mesmo_partido' | 'aliado' | 'neutro' | 'adversario';

export interface FederativeLink {
  role: 'governador' | 'presidente';
  partyId: PartyId;
  alignment: Alignment;
}

function alignmentWith(state: GameState, partyId: PartyId): Alignment {
  const mine = getPlayer(state).partyId;
  if (partyId === mine) return 'mesmo_partido';
  const relation = state.congress.relations[partyId] ?? 0;
  if (state.congress.coalition.includes(partyId) || relation >= F.allyRelation) return 'aliado';
  if (relation <= F.rivalRelation) return 'adversario';
  // Distância ideológica entre os partidos decide o resto.
  const a = state.parties[mine]?.ideology;
  const b = state.parties[partyId]?.ideology;
  if (!a || !b) return 'neutro';
  const gap = Math.abs(a.economy - b.economy) + Math.abs(a.social - b.social);
  return gap > F.rivalIdeologyGap ? 'adversario' : 'neutro';
}

/** Com quem o governo do jogador depende para repasses (governador e/ou presidente). */
export function federativeLinks(state: GameState): FederativeLink[] {
  const gov = state.government;
  if (!gov || gov.branch !== 'executive') return [];
  const level = gov.jurisdiction.level;
  const out: FederativeLink[] = [];
  if (level === 'municipal' && gov.jurisdiction.stateId) {
    const governor = state.landscape.governors[gov.jurisdiction.stateId as StateId];
    if (governor)
      out.push({
        role: 'governador',
        partyId: governor,
        alignment: alignmentWith(state, governor),
      });
  }
  if (level === 'municipal' || level === 'estadual') {
    const president = state.landscape.presidentPartyId;
    out.push({
      role: 'presidente',
      partyId: president,
      alignment: alignmentWith(state, president),
    });
  }
  return out;
}

const FACTOR: Record<Alignment, number> = {
  mesmo_partido: 1,
  aliado: 0.5,
  neutro: 0,
  adversario: -0.6,
};

/** Repasse voluntário do mês (R$ bilhões; negativo = recursos segurados). */
export function monthlyTransfers(state: GameState): number {
  const budget = state.government?.budget;
  if (!budget) return 0;
  const monthlyRevenue = (budget.revenueTaxes + budget.revenueOther) / 12;
  return federativeLinks(state).reduce(
    (sum, link) => sum + monthlyRevenue * F.transferRate * FACTOR[link.alignment],
    0,
  );
}
