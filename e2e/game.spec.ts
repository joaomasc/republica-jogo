import { expect, test } from '@playwright/test';
import { advanceUntilElection, clearBlockers, createCandidate, openNav } from './helpers';

test.describe('República — fluxo principal', () => {
  test('criar candidato, fazer campanha, realizar eleição, salvar e carregar', async ({ page }) => {
    await createCandidate(page, { officeTestId: 'office-prefeito', stateId: 'PE' });

    // Mapa e painel da disputa
    await expect(page.getByTestId('map')).toBeVisible();
    const moneyBefore = await page.getByTestId('metric-money').innerText();

    // Ações de campanha: rápida (redes) e com alvo (comício numa zona)
    await openNav(page, 'campanha');
    await page.getByTestId('action-social_media').click();
    await expect(page.getByTestId('toast').first()).toBeVisible();
    await page.getByTestId('action-rally').click();
    await page.getByTestId('action-confirm').click();
    await clearBlockers(page);
    await expect(page.getByTestId('metric-money')).not.toHaveText(moneyBefore);

    // Propaganda nas redes
    await openNav(page, 'propaganda');
    await page.getByTestId('channel-social').click();
    await page.getByTestId('ad-launch').click();
    await expect(page.getByText(/no ar por \d+ dia/)).toBeVisible();

    // Pesquisa interna
    await openNav(page, 'pesquisas');
    await page.getByTestId('btn-internal-poll').click();
    await expect(page.getByTestId('poll-results')).toBeVisible();

    // Eleitores (Pops)
    await openNav(page, 'eleitores');
    await expect(page.getByTestId('pops-grid')).toBeVisible();

    // Avançar o tempo até a eleição e votar
    const dateBefore = await page.getByTestId('game-date').innerText();
    await advanceUntilElection(page);
    await expect(page.getByTestId('game-date')).not.toHaveText(dateBefore);
    await page.getByTestId('hold-election').click();
    await expect(page.getByTestId('election-results')).toBeVisible();
    await expect(page.getByTestId('election-banner')).toHaveText(/VITÓRIA|Derrota|2º turno/, {
      timeout: 20_000,
    });

    // Salvar
    await page.getByTestId('btn-save').click();
    await expect(page.getByText('Jogo salvo!')).toBeVisible();
    const savedDate = await page.getByTestId('game-date').innerText();

    // Voltar ao menu e carregar
    await page.goto('/carregar');
    const slot = page.getByTestId('save-slot').filter({ hasText: 'Teste Automatizado' }).first();
    await expect(slot).toBeVisible();
    await slot.getByRole('button', { name: 'Carregar' }).click();
    await expect(page.getByTestId('game-date')).toHaveText(savedDate);
  });

  test('eleição proporcional (vereador) chega ao resultado com cadeiras', async ({ page }) => {
    await createCandidate(page, { officeTestId: 'office-vereador', stateId: 'MG' });
    await page.getByTestId('time-month').click();
    await advanceUntilElection(page);
    await page.getByTestId('hold-election').click();
    await expect(page.getByText(/Distribuição de cadeiras/)).toBeVisible({ timeout: 20_000 });
  });

  test('campanha dinâmica: reunião semanal com cartas trava e libera o tempo', async ({ page }) => {
    await createCandidate(page, {
      officeTestId: 'office-governador',
      stateId: 'MG',
      keepWeek: true,
    });
    await expect(page.getByTestId('week-modal')).toBeVisible();
    await expect(page.getByTestId('week-card')).toHaveCount(3);
    await expect(page.getByTestId('time-day')).toBeDisabled();
    await page.getByTestId('week-card').first().click();
    await expect(page.getByTestId('week-modal')).toBeHidden();
    await expect(page.getByTestId('time-day')).toBeEnabled();
  });

  test('gabinete mensal: no governo, a reunião do mês trava e libera o tempo', async ({ page }) => {
    await page.goto('/novo?cenario=prefeitura_salvador');
    await page.getByTestId('input-first-name').fill('Teste');
    await page.getByTestId('input-last-name').fill('Gabinete');
    await page.getByTestId('input-age').fill('45');
    for (let i = 0; i < 9; i++) {
      if (await page.getByTestId('start-game').isVisible()) break;
      if (await page.getByTestId('bg-teacher').isVisible())
        await page.getByTestId('bg-teacher').click();
      if (await page.getByTestId('party-mdb').isVisible())
        await page.getByTestId('party-mdb').click();
      await page.getByTestId('wizard-next').click();
    }
    await page.getByTestId('start-game').click();
    await expect(page.getByTestId('game-date')).toBeVisible();
    for (let i = 0; i < 20; i++) {
      if (await page.getByTestId('cabinet-modal').isVisible()) break;
      const option = page.getByTestId('event-option').first();
      if (await option.isVisible().catch(() => false)) await option.click();
      else if (await page.getByTestId('time-month').isEnabled())
        await page.getByTestId('time-month').click();
      await page.waitForTimeout(300);
    }
    await expect(page.getByTestId('cabinet-modal')).toBeVisible();
    await expect(page.getByTestId('cabinet-card')).toHaveCount(3);
    await expect(page.getByTestId('time-day')).toBeDisabled();
    await page.getByTestId('cabinet-card').first().click();
    await expect(page.getByTestId('cabinet-modal')).toBeHidden();
    await expect(page.getByTestId('time-day')).toBeEnabled();
  });

  test('cenários, sandbox e configurações abrem', async ({ page }) => {
    await page.goto('/cenarios');
    await page.getByTestId('scenario-outsider').getByRole('button').click();
    await expect(page.getByText('Cenário: O Outsider')).toBeVisible();
    await page.goto('/sandbox');
    await page.getByTestId('sandbox-office').selectOption('senador');
    await page.getByTestId('sandbox-continue').click();
    await expect(page.getByText('Sandbox — novo personagem')).toBeVisible();
    await page.goto('/config');
    await expect(page.getByText('Salvamento automático')).toBeVisible();
  });
});
