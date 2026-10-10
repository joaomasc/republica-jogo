import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe('Prefeito: tudo no escopo da cidade', () => {
  test('vê a cidade, inicia obra e acompanha o clima nas ruas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/novo?cenario=prefeitura_salvador');
    await page.getByTestId('input-first-name').fill('Teste');
    await page.getByTestId('input-last-name').fill('Prefeito');
    await page.getByTestId('input-age').fill('45');
    for (let i = 0; i < 9; i++) {
      if (await page.getByTestId('start-game').isVisible()) break;
      if (await page.getByTestId('bg-teacher').isVisible()) await page.getByTestId('bg-teacher').click();
      if (await page.getByTestId('party-mdb').isVisible()) await page.getByTestId('party-mdb').click();
      await page.getByTestId('wizard-next').click();
    }
    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('game-date')).toBeVisible();
    await shot(page, '30-prefeito-mapa');

    // Escopo local: nada de Mercado nacional / Comércio exterior / Decretos no dock.
    await expect(page.getByTestId('nav-mercado')).toHaveCount(0);
    await expect(page.getByTestId('nav-comercio')).toHaveCount(0);
    await expect(page.getByText(/Desemprego de Salvador/).first()).toBeVisible();

    await page.getByTestId('nav-economia').click();
    await expect(page.getByText('Contexto nacional (Brasil)', { exact: false })).toBeVisible();
    await shot(page, '31-prefeito-economia');

    await page.getByTestId('nav-obras').click();
    await page.getByTestId('work-start-ubs').click();
    await expect(page.getByText('Minhas obras (1)')).toBeVisible();
    await shot(page, '32-prefeito-obras');

    await page.getByTestId('nav-governo').click();
    await expect(page.getByTestId('street-panel')).toBeVisible();
    await shot(page, '33-prefeito-gabinete');

    expect(errors).toEqual([]);
  });
});
