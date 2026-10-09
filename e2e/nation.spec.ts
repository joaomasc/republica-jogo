import { expect, test, type Page } from '@playwright/test';

/** Pasta para capturas de tela opcionais (SHOTS=<pasta>). */
const SHOTS = process.env.SHOTS;

async function startPresidency(page: Page) {
  await page.goto('/novo?cenario=presidencia_2027');
  await page.getByTestId('input-first-name').fill('Teste');
  await page.getByTestId('input-last-name').fill('Nacional');
  await page.getByTestId('input-age').fill('52');
  for (let i = 0; i < 8; i++) {
    if (await page.getByTestId('start-game').isVisible()) break;
    if (await page.getByTestId('bg-teacher').isVisible()) await page.getByTestId('bg-teacher').click();
    if (await page.getByTestId('platform-trade_isi').isVisible()) {
      await page.getByTestId('platform-trade_isi').click();
      await page.getByTestId('platform-edu_tech').click();
      await shot(page, '00a-bandeiras');
    }
    if (await page.getByTestId('party-udc').isVisible()) {
      await page.getByTestId('party-udc').click();
      await shot(page, '00b-partidos');
    }
    await page.getByTestId('wizard-next').click();
  }
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('game-date')).toBeVisible();
}

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe('Nação: economia, leis e Congresso', () => {
  test('painéis da economia industrial e do processo legislativo abrem sem erros', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await startPresidency(page);
    await shot(page, '00-mapa');

    for (const [path, name] of [
      ['economia', '01-economia'],
      ['mercado', '02-mercado'],
      ['industria', '03-industria'],
      ['comercio', '04-comercio'],
      ['nacao', '05-nacao'],
      ['grupos', '06-grupos'],
      ['decretos', '07-decretos'],
      ['orcamento', '08-orcamento'],
      ['candidato', '08b-candidato'],
    ] as const) {
      await page.getByTestId(`nav-${path}`).click();
      await expect(page.getByTestId('panel-close')).toBeVisible();
      await page.waitForTimeout(300);
      await shot(page, name);
    }

    // Leis: escolhe uma opção, vê a prévia e apresenta o projeto.
    await page.getByTestId('nav-leis').click();
    await page.getByTestId('law-cat-trade').click();
    await page.getByText('Substituição de importações').first().click();
    await shot(page, '09-leis');
    await page.getByTestId('impact-simulate').click();
    await expect(page.getByText('Principais efeitos')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(400);
    await shot(page, '09b-impacto');
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();
    await page.getByTestId('propose-trade_isi').click();
    await expect(page.getByTestId('bill').first()).toBeVisible();

    // Congresso: a proposição aparece no rastreador; abas abrem.
    await page.getByTestId('nav-congresso').click();
    await expect(page.getByText('Substituição de importações').first()).toBeVisible();
    await shot(page, '10-congresso');
    for (const tab of ['parties', 'caucuses', 'house'] as const) {
      await page.getByTestId(`congress-tab-${tab}`).click();
      await page.waitForTimeout(200);
      await shot(page, `11-congresso-${tab}`);
    }

    // Região: seção econômica do estado.
    await page.keyboard.press('Escape');
    await page.locator('path[data-uf="SP"]').click({ force: true });
    await expect(page.getByTestId('state-economy-SP')).toBeVisible();
    await shot(page, '12-regiao');

    expect(errors.filter((e) => !/favicon|ResizeObserver/.test(e))).toEqual([]);
  });
});
