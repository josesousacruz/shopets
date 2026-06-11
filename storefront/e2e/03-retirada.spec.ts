import { test, expect, SEEDED, login, adicionarPowerBank } from "./helpers";

test.describe("Retirada na loja com pagamento no balcão", () => {
  test("reserva pedido para retirada, pagando na retirada", async ({ page }) => {
    await login(page, SEEDED.email, SEEDED.senha);

    await adicionarPowerBank(page);
    await page.goto("/carrinho");
    await page.getByRole("link", { name: /Finalizar compra/i }).click();
    await page.waitForURL(/\/checkout\b/, { timeout: 30_000 });

    // ── Etapa 1: escolhe "Retirar na loja" ──
    // O rádio "Retirar na loja" fica desabilitado se não houver loja habilitada.
    const radioRetirada = page.locator(
      'label.co-opt:has-text("Retirar na loja") input[name="modalidade"]',
    );
    await expect(radioRetirada).toBeVisible({ timeout: 15_000 });
    if (await radioRetirada.isDisabled()) {
      test.skip(true, "Nenhum ponto de retirada (permite_retirada) habilitado nesta API.");
      return;
    }
    // Clica no <label> (overlay .dot intercepta o input).
    await page.locator('label.co-opt:has-text("Retirar na loja")').click();

    // Seleciona a primeira loja disponível.
    const loja = page.locator('label.co-opt:has(input[name="pdv"])').first();
    await expect(loja).toBeVisible({ timeout: 15_000 });
    await loja.click();
    await page.getByRole("button", { name: /Continuar para o pagamento/i }).click();

    // ── Etapa 2: pagar na retirada (balcão) ──
    await page.locator('label.co-opt:has-text("Pagar na retirada")').click();
    await page.getByRole("button", { name: /Revisar pedido/i }).click();

    // ── Etapa 3: reservar pedido ──
    await page.getByRole("button", { name: /Reservar pedido/i }).click();

    // Espera sair da etapa de revisão (tolerante ao race de redirect).
    await page
      .waitForURL((u) => !/\/checkout(\?|$)/.test(u.toString()), { timeout: 30_000 })
      .catch(() => {});

    if (/\/checkout\/sucesso\//.test(page.url())) {
      // ── Caminho feliz: tela de sucesso de retirada ──
      await expect(page.getByRole("heading", { name: /Pedido reservado/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByText(/Retire na loja|Aguardando retirada/i).first(),
      ).toBeVisible();
    } else {
      // ── Recuperação: confere o pedido recém-criado na conta ──
      await page.goto("/conta/pedidos");
      const pedido = page.locator("a.co-order").first();
      await expect(pedido).toBeVisible({ timeout: 20_000 });
      // O pedido mais recente deve ser de retirada e aguardando retirada.
      await expect(pedido).toContainText(/Retirada/i);
      await expect(pedido).toContainText(/Aguardando retirada/i);
    }
  });
});
