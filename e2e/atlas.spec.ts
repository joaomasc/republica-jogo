import { expect, test, type Page } from '@playwright/test';
import { openNav, waitMapIdle } from './helpers';

/** Pasta para capturas de tela opcionais (SHOTS=<pasta>). */
const SHOTS = process.env.SHOTS;

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  // Espera voos de câmera e transições de cor terminarem.
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function startPresidency(page: Page) {
  await page.goto('/novo?cenario=presidencia_2027');
  await page.getByTestId('input-first-name').fill('Teste');
  await page.getByTestId('input-last-name').fill('Atlas');
  await page.getByTestId('input-age').fill('50');
  for (let i = 0; i < 8; i++) {
    if (await page.getByTestId('start-game').isVisible()) break;
    if (await page.getByTestId('bg-teacher').isVisible())
      await page.getByTestId('bg-teacher').click();
    if (await page.getByTestId('party-mdb').isVisible())
      await page.getByTestId('party-mdb').click();
    await page.getByTestId('wizard-next').click();
  }
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('game-date')).toBeVisible();
}

/** Centro horizontal de um estado na tela. */
async function centerX(page: Page, uf: string): Promise<number> {
  const box = await page.locator(`path[data-uf="${uf}"]`).boundingBox();
  if (!box) throw new Error(`${uf} sem caixa`);
  return box.x + box.width / 2;
}

test.describe('Atlas: mapa integrado aos painéis', () => {
  test('legenda, números, ranking, painel → modo do mapa e câmera fora do painel', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await startPresidency(page);
    await expect(page.getByTestId('map-legend')).toBeVisible();
    await shot(page, 'a00-mapa');

    // Números sobre o mapa e ranking das UFs.
    await page.getByTestId('map-opt-numbers').click();
    await expect(page.locator('.atlas-value').first()).toBeAttached();
    await page.getByTestId('map-opt-ranking').click();
    await expect(page.getByTestId('map-ranking').locator('li')).toHaveCount(27);
    await shot(page, 'a01-numeros-ranking');
    await page.getByTestId('map-opt-ranking').click();

    // Abrir Economia muda o mapa para o desemprego e empurra o Brasil para fora do painel.
    const before = await centerX(page, 'GO');
    await openNav(page, 'economia');
    // Painel largo: sobra pouca faixa para a legenda; o modo ativo aparece no seletor de modos.
    await expect(page.getByTestId('map-mode-unemployment')).toHaveAttribute('aria-checked', 'true');
    await page.waitForTimeout(1100);
    const after = await centerX(page, 'GO');
    expect(after).toBeGreaterThan(before + 100);
    await shot(page, 'a02-economia');

    // Leis → ideologia do eleitorado, com eixo escolhível.
    await openNav(page, 'leis');
    await expect(page.getByTestId('map-legend')).toContainText('Ideologia');
    await page.getByTestId('map-axis').selectOption('social');
    await expect(page.getByTestId('map-legend')).toContainText('Costumes');
    await shot(page, 'a03-leis-ideologia');

    // Governos estaduais pelo seletor de modos.
    await page.keyboard.press('Escape');
    await page.getByTestId('map-mode-governors').click();
    await expect(page.getByTestId('map-legend')).toContainText('Governos estaduais');
    await shot(page, 'a04-governadores');

    // Desligar o vínculo: abrir um painel não troca mais o modo.
    await page.getByTestId('map-opt-auto').click();
    await openNav(page, 'economia');
    await expect(page.getByTestId('map-mode-governors')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('map-opt-auto').click();
    await page.keyboard.press('Escape');

    // Região: clique abre o painel e a câmera voa até o estado.
    await waitMapIdle(page);
    await page.locator('path[data-uf="BA"]').click({ force: true });
    await expect(page.getByTestId('unit-details')).toBeVisible();
    await shot(page, 'a05-regiao');

    expect(errors).toEqual([]);
  });

  test('painéis usam o mapa: produção de um bem, polos de um edifício e escolher onde construir', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startPresidency(page);

    // Mercado: escolher o aço pinta o mapa com a produção de aço por estado.
    await openNav(page, 'mercado');
    await page.getByRole('cell', { name: 'Aço', exact: true }).click();
    await expect(page.getByTestId('map-legend')).toContainText('Produção: Aço');
    await shot(page, 'a07-mercado-aco');
    // Fechar o painel devolve o mapa ao modo normal.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('map-legend')).not.toContainText('Produção');

    // Indústria: escolher um edifício mostra onde ele existe; o mapa escolhe onde construir.
    await openNav(page, 'industria');
    const row = page.locator('[data-testid^="industry-row-"]').first();
    const name = (await row.locator('td').first().innerText()).split(/\r?\n/)[0]!.trim();
    await row.click();
    await expect(page.getByTestId('map-legend')).toContainText(`Indústria: ${name}`);
    await waitMapIdle(page);
    await page.locator('path[data-uf="PA"]').click({ force: true });
    await expect(page.getByTestId('construction-state')).toHaveValue('PA');
    // O painel continua aberto (o clique escolheu o estado, não abriu a região).
    await expect(page.getByTestId('unit-details')).toBeHidden();
    await shot(page, 'a08-industria');
    expect(errors).toEqual([]);
  });

  test('zoom pela roda e arrasto mexem a câmera sem erros, e "Enquadrar" volta ao Brasil inteiro', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startPresidency(page);
    const map = page.getByTestId('map');
    const box = (await map.boundingBox())!;
    const start = await page.locator('path[data-uf="MG"]').boundingBox();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.6);
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -240);
    await page.waitForTimeout(300);
    const zoomed = await page.locator('path[data-uf="MG"]').boundingBox();
    expect(zoomed!.width).toBeGreaterThan(start!.width * 1.6);
    await shot(page, 'a06-zoom');

    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4, { steps: 8 });
    await page.mouse.up();
    const dragged = await page.locator('path[data-uf="MG"]').boundingBox();
    expect(Math.abs(dragged!.x - zoomed!.x)).toBeGreaterThan(50);

    await page.getByRole('button', { name: 'Enquadrar o mapa' }).click();
    await page.waitForTimeout(1000);
    const reset = await page.locator('path[data-uf="MG"]').boundingBox();
    expect(reset!.width).toBeCloseTo(start!.width, -1);
    expect(errors).toEqual([]);
  });
});
