import { expect, test, type Page } from '@playwright/test';
import { openNav } from './helpers';

/**
 * Desempenho do mapa (Atlas): mede o intervalo entre quadros (requestAnimationFrame) durante
 * zoom pela roda, arrasto e voo de câmera, e o tempo para abrir painéis. Imprime os números
 * (para acompanhar ao longo do tempo) e falha só em regressões grosseiras — a máquina de CI varia.
 */

interface FrameStats {
  frames: number;
  median: number;
  p95: number;
  worst: number;
}

async function startPresidency(page: Page) {
  await page.goto('/novo?cenario=presidencia_2027');
  await page.getByTestId('input-first-name').fill('Teste');
  await page.getByTestId('input-last-name').fill('Desempenho');
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

async function startSampling(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __sampling: boolean };
    w.__frames = [];
    w.__sampling = true;
    let last = performance.now();
    const tick = (t: number) => {
      w.__frames.push(t - last);
      last = t;
      if (w.__sampling) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopSampling(page: Page): Promise<FrameStats> {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __sampling: boolean };
    w.__sampling = false;
    const f = w.__frames.slice(2).sort((a, b) => a - b);
    const at = (q: number) => f[Math.min(f.length - 1, Math.floor(q * f.length))] ?? 0;
    return { frames: f.length, median: at(0.5), p95: at(0.95), worst: f[f.length - 1] ?? 0 };
  });
}

const fmt = (s: FrameStats) =>
  `${s.frames} quadros · mediana ${s.median.toFixed(1)} ms · p95 ${s.p95.toFixed(1)} ms · pior ${s.worst.toFixed(1)} ms`;

test('desempenho do mapa: zoom, arrasto, voo e abertura de painéis', async ({ page }) => {
  await startPresidency(page);
  // Números e marcadores ligados: o caso mais carregado de rótulos.
  await page.getByTestId('map-opt-numbers').click();
  const box = (await page.getByTestId('map').boundingBox())!;
  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.5;
  await page.mouse.move(cx, cy);

  await startSampling(page);
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, i < 6 ? -120 : 120);
    await page.waitForTimeout(40);
  }
  const zoom = await stopSampling(page);

  await startSampling(page);
  await page.mouse.down();
  for (let i = 0; i < 40; i++) await page.mouse.move(cx - i * 8, cy - i * 4);
  await page.mouse.up();
  const drag = await stopSampling(page);

  // Voo puro (sem painel montando junto): do zoom atual de volta ao Brasil inteiro.
  await startSampling(page);
  await page.getByRole('button', { name: 'Enquadrar o mapa' }).click();
  await page.waitForTimeout(1000);
  const recenter = await stopSampling(page);
  await startSampling(page);
  await page.locator('path[data-uf="RS"]').click({ force: true });
  await page.waitForTimeout(1000);
  const flight = await stopSampling(page);

  // Segunda abertura de cada painel: a primeira, no servidor de desenvolvimento, inclui compilar
  // a tela sob demanda (no build de produção elas já vêm pré-carregadas).
  const panels: string[] = [];
  for (const path of ['economia', 'mercado', 'leis', 'congresso']) {
    await openNav(page, path);
    await expect(page.getByTestId('panel-close')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('panel-close')).toBeHidden();
    const t0 = Date.now();
    await openNav(page, path);
    await expect(page.getByTestId('panel-close')).toBeVisible();
    panels.push(`${path} ${Date.now() - t0} ms`);
  }

  console.log(`[perf] zoom: ${fmt(zoom)}`);
  console.log(`[perf] arrasto: ${fmt(drag)}`);
  console.log(`[perf] voo enquadrar: ${fmt(recenter)}`);
  console.log(`[perf] voo até RS + painel da região: ${fmt(flight)}`);
  console.log(`[perf] abrir painel: ${panels.join(' · ')}`);

  // Só regressões grosseiras (máquinas de CI variam muito).
  for (const s of [zoom, drag, recenter, flight]) {
    expect(s.frames).toBeGreaterThan(5);
    expect(s.median).toBeLessThan(50);
  }
});

test.describe('mapa 3D', () => {
  // Preferência padrão do jogador: 3D.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('desempenho do mapa 3D: arrasto, giro, zoom e mudança de modo', async ({ page }) => {
    await startPresidency(page);
    await expect(page.locator('.atlas3d-canvas')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('map-opt-numbers').click();
    await page.waitForTimeout(800);
    const box = (await page.getByTestId('map').boundingBox())!;
    const cx = box.x + box.width * 0.45;
    const cy = box.y + box.height * 0.5;

    await page.mouse.move(cx, cy);
    await startSampling(page);
    await page.mouse.down();
    for (let i = 0; i < 40; i++) await page.mouse.move(cx - i * 6, cy - i * 3);
    await page.mouse.up();
    const drag = await stopSampling(page);

    await startSampling(page);
    await page.mouse.down({ button: 'right' });
    for (let i = 0; i < 30; i++) await page.mouse.move(cx + i * 6, cy - i * 2);
    await page.mouse.up({ button: 'right' });
    const orbit = await stopSampling(page);

    await startSampling(page);
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, i < 5 ? -150 : 150);
      await page.waitForTimeout(40);
    }
    const zoom = await stopSampling(page);

    // Mudança de modo: os prismas sobem/descem animados.
    await startSampling(page);
    await page.getByTestId('map-mode-unemployment').click();
    await page.waitForTimeout(1200);
    const relief = await stopSampling(page);

    console.log(`[perf 3D] arrasto: ${fmt(drag)}`);
    console.log(`[perf 3D] giro: ${fmt(orbit)}`);
    console.log(`[perf 3D] zoom: ${fmt(zoom)}`);
    console.log(`[perf 3D] relevo animado (troca de modo): ${fmt(relief)}`);
    for (const s of [drag, orbit, zoom, relief]) expect(s.frames).toBeGreaterThan(5);
  });
});
