import { expect, test, type Page } from '@playwright/test';
import { openNav } from './helpers';

/** Pasta para capturas de tela opcionais (SHOTS=<pasta>). */
const SHOTS = process.env.SHOTS;

// Preferência padrão do jogador: mapa 3D.
test.use({ storageState: { cookies: [], origins: [] } });

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function startPresidency(page: Page) {
  await page.goto('/novo?cenario=presidencia_2027');
  await page.getByTestId('input-first-name').fill('Teste');
  await page.getByTestId('input-last-name').fill('Relevo');
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

/** Clica no centro do rótulo de um estado (o clique atravessa o rótulo e acerta o prisma). */
async function clickState(page: Page, uf: string) {
  const label = page.locator(`.atlas3d-label[data-region="${uf}"]`);
  const box = (await label.boundingBox())!;
  // Um pouco abaixo do rótulo: o topo do prisma.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height + 6);
}

test.describe('Atlas 3D', () => {
  test('relevo por dado, clique no prisma, painel → modo e volta ao 2D', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startPresidency(page);
    await expect(page.locator('.atlas3d-canvas')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.atlas3d-label')).toHaveCount(27);
    await shot(page, 'z00-3d');

    await page.getByTestId('map-opt-numbers').click();
    await openNav(page, 'economia');
    await expect(page.getByTestId('map-mode-unemployment')).toHaveAttribute('aria-checked', 'true');
    await shot(page, 'z01-3d-economia');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);

    await clickState(page, 'MT');
    await expect(page.getByTestId('unit-details')).toBeVisible();
    await shot(page, 'z02-3d-regiao');

    // Teclado: o rótulo é um botão focável.
    await page.locator('.atlas3d-label[data-region="SP"]').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/jogo\/regiao\/SP$/);

    // Girar com o botão direito.
    const box = (await page.getByTestId('map').boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.42, { steps: 12 });
    await page.mouse.up({ button: 'right' });
    await shot(page, 'z03-3d-girado');

    await page.getByTestId('map-opt-3d').click();
    await expect(page.locator('path[data-uf="SP"]')).toBeAttached();
    await expect(page.locator('.atlas3d-canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
