import { expect, type Page } from '@playwright/test';

/** Cria um candidato pelo assistente e começa a campanha (dispensando a 1ª reunião semanal). */
export async function createCandidate(
  page: Page,
  opts: { officeTestId: string; stateId?: string; partyId?: string; keepWeek?: boolean },
) {
  await page.goto('/');
  await page.getByTestId('menu-novo').click();
  await page.getByTestId('input-first-name').fill('Teste');
  await page.getByTestId('input-last-name').fill('Automatizado');
  await page.getByTestId('input-age').fill('45');
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('bg-teacher').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('wizard-next').click();
  // Bandeiras: escolhe uma lei para defender.
  await page.getByTestId('platform-edu_tech').click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId(`party-${opts.partyId ?? 'udc'}`).click();
  await page.getByTestId('wizard-next').click();
  await page.getByTestId(opts.officeTestId).click();
  if (opts.stateId) await page.getByTestId('office-state').selectOption(opts.stateId);
  await page.getByTestId('wizard-next').click();
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('game-date')).toBeVisible();
  if (opts.keepWeek) return;
  const week = page.getByTestId('week-modal');
  const open = await week
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (open) await page.getByTestId('week-skip').click();
}

/** Resolve o que estiver bloqueando o tempo (evento, entrevista, debate). Retorna true se fez algo. */
export async function clearBlockers(page: Page): Promise<boolean> {
  if (await page.getByTestId('week-modal').isVisible()) {
    await page.getByTestId('week-skip').click();
    return true;
  }
  if (await page.getByTestId('event-modal').isVisible()) {
    await page.getByTestId('event-option').first().click();
    return true;
  }
  if (await page.getByTestId('interview-modal').isVisible()) {
    const close = page.getByTestId('interview-close');
    if (await close.isVisible()) await close.click();
    else await page.getByTestId('interview-answer').first().click();
    return true;
  }
  if (await page.getByTestId('debate-modal').isVisible()) {
    const close = page.getByTestId('debate-close');
    if (await close.isVisible()) await close.click();
    else await page.getByTestId('debate-popular').click();
    return true;
  }
  if (await page.getByTestId('debate-decline').isVisible()) {
    await page.getByTestId('debate-decline').click();
    return true;
  }
  return false;
}

/** Avança o tempo semana a semana até o dia da eleição. */
export async function advanceUntilElection(page: Page) {
  for (let i = 0; i < 120; i++) {
    if (await clearBlockers(page)) continue;
    if (await page.getByTestId('hold-election').isVisible()) return;
    const week = page.getByTestId('time-week');
    if (await week.isEnabled()) {
      await week.click();
      continue;
    }
    const cta = page.getByTestId('cta');
    if (await cta.isVisible()) await cta.click();
  }
  throw new Error('Não chegou ao dia da eleição');
}
