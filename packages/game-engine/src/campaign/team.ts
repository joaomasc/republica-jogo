import { randomName } from '../candidate/names';
import { formatMoney } from '../core/math';
import { withRng } from '../core/rng';
import type { ActionResult } from '../core/types';
import { nextId, requireCampaign } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { spend } from './finance';
import { hiringCost, STAFF_LEVELS, STAFF_ROLES } from './staff';
import type { StaffRoleId } from './types';

const MAX_STAFF = 10;

export function hireStaff(state: GameState, roleId: StaffRoleId, level: 1 | 2 | 3): ActionResult {
  if (state.phase !== 'campaign' || !state.campaign)
    return { ok: false, message: 'Contratações só durante a campanha.' };
  const campaign = requireCampaign(state);
  const role = STAFF_ROLES[roleId];
  if (!role) return { ok: false, message: 'Função inválida.' };
  if (campaign.staff.length >= MAX_STAFF) return { ok: false, message: 'Equipe completa.' };
  if (campaign.staff.some((s) => s.roleId === roleId))
    return { ok: false, message: 'Você já tem alguém nessa função.' };
  const cost = Math.round(hiringCost(roleId, level, campaign.moneyScale));
  if (!spend(state, cost, 'staff', `Contratação: ${role.name}`))
    return { ok: false, message: `Dinheiro insuficiente (${formatMoney(cost)}).` };
  const name = withRng(state, (rng) => {
    const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
    return `${n.firstName} ${n.lastName}`;
  });
  campaign.staff.push({ id: nextId(state, 'staff'), roleId, level, name, hiredOn: state.date });
  return {
    ok: true,
    message: `${name} contratado(a) como ${role.name} (${STAFF_LEVELS[level].name}).`,
  };
}

export function fireStaff(state: GameState, staffId: string): ActionResult {
  const campaign = state.campaign;
  if (!campaign) return { ok: false, message: 'Não há campanha.' };
  const idx = campaign.staff.findIndex((s) => s.id === staffId);
  const member = campaign.staff[idx];
  if (!member) return { ok: false, message: 'Membro não encontrado.' };
  campaign.staff.splice(idx, 1);
  return { ok: true, message: `${member.name} foi dispensado(a).` };
}
