import { GameConstants } from '../config/constants';
import { diffDays } from '../core/date';
import { formatPct } from '../core/math';
import { nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import type { Alert } from './types';

const A = GameConstants.alerts;

export type AlertInput = Omit<Alert, 'id' | 'date' | 'read'>;

export function pushAlert(state: GameState, input: AlertInput): void {
  // Evita duplicar o mesmo tipo de alerta no mesmo dia.
  if (
    state.alerts.some(
      (a) => a.kind === input.kind && a.date === state.date && a.title === input.title,
    )
  )
    return;
  state.alerts.unshift({ ...input, id: nextId(state, 'alert'), date: state.date, read: false });
  if (state.alerts.length > A.limit) state.alerts.length = A.limit;
}

export function markAlertsRead(state: GameState): void {
  for (const a of state.alerts) a.read = true;
}

/** Alertas de campanha: popularidade, regiões, caixa, partido. */
export function campaignAlerts(
  state: GameState,
  playerShare: number,
  unitShares: Record<string, number>,
): void {
  const tracking = state.tracking;
  const election = state.election;
  if (!election) return;

  if (
    tracking.lastPlayerShare !== null &&
    playerShare < tracking.lastPlayerShare - A.popularityDrop
  ) {
    pushAlert(state, {
      kind: 'popularity_drop',
      severity: 'danger',
      title: 'Sua intenção de voto caiu',
      message: `De ${formatPct(tracking.lastPlayerShare)} para ${formatPct(playerShare)} desde a última medição.`,
      link: 'polls',
    });
  } else if (
    tracking.lastPlayerShare !== null &&
    playerShare > tracking.lastPlayerShare + A.popularityDrop
  ) {
    pushAlert(state, {
      kind: 'popularity_gain',
      severity: 'success',
      title: 'Sua campanha ganha força',
      message: `Intenção de voto subiu para ${formatPct(playerShare)}.`,
      link: 'polls',
    });
  }

  let worst: { id: string; drop: number } | null = null;
  for (const [unitId, share] of Object.entries(unitShares)) {
    const prev = tracking.lastUnitShares[unitId];
    if (prev === undefined) continue;
    const drop = prev - share;
    if (drop > A.regionalDrop && (!worst || drop > worst.drop)) worst = { id: unitId, drop };
  }
  if (worst) {
    const unit = election.units.find((u) => u.id === worst.id);
    pushAlert(state, {
      kind: 'regional_drop',
      severity: 'warning',
      title: `Você está perdendo apoio em ${unit?.name ?? worst.id}`,
      message: `Queda de ${formatPct(worst.drop)} na região.`,
      link: 'map',
    });
  }

  const campaign = state.campaign;
  if (campaign) {
    const net = campaign.lastDayIncome - campaign.lastDayExpenses;
    const daysLeft = net < 0 ? campaign.money / -net : Number.POSITIVE_INFINITY;
    if (daysLeft < A.lowMoneyDays) {
      pushAlert(state, {
        kind: 'low_money',
        severity: 'danger',
        title: 'Seu caixa está acabando',
        message: 'No ritmo atual, o dinheiro acaba em poucos dias. Corte equipe ou arrecade.',
        link: 'finance',
      });
    }
  }

  const party = state.parties[state.candidates[state.playerId]?.partyId ?? ''];
  if (party && party.unity < A.partyUnityWarning) {
    pushAlert(state, {
      kind: 'party_divided',
      severity: 'warning',
      title: 'Seu partido está dividido',
      message: `Unidade partidária em ${Math.round(party.unity)}%. Facções insatisfeitas reduzem o apoio da militância.`,
      link: 'party',
    });
  }

  tracking.lastPlayerShare = playerShare;
  tracking.lastUnitShares = { ...unitShares };
  tracking.lastCheck = state.date;
}

export function debateInvitationAlerts(state: GameState): void {
  const election = state.election;
  if (!election) return;
  for (const debate of election.debates) {
    const days = diffDays(state.date, debate.date);
    if (debate.status === 'scheduled' && days === 5) {
      pushAlert(state, {
        kind: 'debate_invite',
        severity: 'info',
        title: 'Você recebeu convite para debate',
        message: `${debate.host} promove debate em 5 dias. Prepare-se!`,
        link: 'debate',
      });
    }
  }
}
