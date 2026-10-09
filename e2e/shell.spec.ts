import { expect, test, type Page } from '@playwright/test';
import { createCandidate } from './helpers';

/** Começa o cenário "Presidência" (já no poder) para exercitar o shell do jogo. */
async function startInOffice(page: Page) {
  await page.goto('/novo?cenario=presidencia_2027');
  await page.getByTestId('input-first-name').fill('Teste');
  await page.getByTestId('input-last-name').fill('Automatizado');
  await page.getByTestId('input-age').fill('45');
  for (let i = 0; i < 8; i++) {
    if (await page.getByTestId('start-game').isVisible()) break;
    if (await page.getByTestId('bg-teacher').isVisible()) await page.getByTestId('bg-teacher').click();
    if (await page.getByTestId('party-udc').isVisible()) await page.getByTestId('party-udc').click();
    await page.getByTestId('wizard-next').click();
  }
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('game-date')).toBeVisible();
}

test.describe('Shell do jogo', () => {
  test('painéis abrem sobre o mapa, Esc fecha e atalhos ignoram campos de texto', async ({ page }) => {
    await startInOffice(page);
    await expect(page.getByTestId('map')).toBeVisible();

    await page.getByTestId('nav-leis').click();
    await expect(page.getByTestId('panel-close')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('panel-close')).toBeHidden();

    // Região pelo mapa (clique) e pelo teclado (Enter no estado focado).
    await page.locator('path[data-uf="BA"]').click({ force: true });
    await expect(page.getByTestId('unit-details')).toBeVisible();
    await page.locator('path[data-uf="SP"]').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/jogo\/regiao\/SP$/);

    // Digitar num campo não muda a velocidade nem liga o avanço automático.
    const speed = async () => {
      for (const s of [1, 2, 3, 4, 5])
        if ((await page.getByTestId(`speed-${s}`).getAttribute('aria-checked')) === 'true') return s;
      return 0;
    };
    await page.keyboard.press('4');
    expect(await speed()).toBe(4);
    await page.evaluate(() => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
    });
    await page.keyboard.type('1 5 ');
    expect(await speed()).toBe(4);
    await expect(page.getByTestId('time-play')).toHaveAttribute('aria-pressed', 'false');
  });

  test('avanço automático anda e para ao pausar', async ({ page }) => {
    await startInOffice(page);
    const before = await page.getByTestId('game-date').innerText();
    await page.getByTestId('speed-5').click();
    await page.getByTestId('time-play').click();
    await expect(page.getByTestId('game-date')).not.toHaveText(before);
    await page.getByTestId('time-play').click();
    await expect(page.getByTestId('time-play')).toHaveAttribute('aria-pressed', 'false');
    const paused = await page.getByTestId('game-date').innerText();
    await page.waitForTimeout(800);
    await expect(page.getByTestId('game-date')).toHaveText(paused);
  });
  test('avanço automático para sozinho na primeira interrupção (reunião ou evento)', async ({ page }) => {
    await createCandidate(page, { officeTestId: 'office-prefeito', stateId: 'PE' });
    await page.getByTestId('speed-5').click();
    await page.getByTestId('time-play').click();
    const interruption = page.locator('[data-testid="week-modal"], [data-testid="event-modal"]');
    await expect(interruption.first()).toBeVisible();
    await expect(page.getByTestId('time-play')).toHaveAttribute('aria-pressed', 'false');
    // Espaço com a interrupção aberta não religa o tempo.
    await page.keyboard.press('Space');
    await expect(page.getByTestId('time-play')).toHaveAttribute('aria-pressed', 'false');
  });
});
