import { test, expect, SEEDED, login, garantirEndereco, adicionarPowerBank } from "./helpers";

test.describe("Compra com entrega + pagamento Pix", () => {
  test("compra um Power Bank, paga via Pix (simulado) e vê o pedido confirmado", async ({ page }) => {
    // ── Login com cliente seeded (já costuma ter endereço) ──
    await login(page, SEEDED.email, SEEDED.senha);
    await garantirEndereco(page);

    // ── Adiciona produto e vai ao carrinho ──
    await adicionarPowerBank(page);
    await page.goto("/carrinho");
    await page.getByRole("link", { name: /Finalizar compra/i }).click();
    await page.waitForURL(/\/checkout\b/, { timeout: 30_000 });

    // ── Etapa 1: Entrega (modalidade padrão) + endereço ──
    // Os rádios têm overlay visual (.dot), então clica no <label> que os envolve.
    const labelEndereco = page.locator('label.co-opt:has(input[name="endereco"])').first();
    await expect(labelEndereco).toBeVisible();
    await labelEndereco.click();
    await page.getByRole("button", { name: /Continuar para o frete/i }).click();

    // ── Etapa 2: Frete ──
    await page.getByRole("button", { name: /Calcular frete/i }).click();
    const labelFrete = page.locator('label.co-opt:has(input[name="frete"])');
    await expect(labelFrete.first()).toBeVisible({ timeout: 20_000 });
    const labelPac = labelFrete.filter({ hasText: "PAC" });
    if (await labelPac.count()) {
      await labelPac.first().click();
    } else {
      await labelFrete.first().click();
    }
    await page.getByRole("button", { name: /Revisar pedido/i }).click();

    // ── Etapa 3: Revisão → Confirmar pedido ──
    await page.getByRole("button", { name: /Confirmar pedido/i }).click();

    // A action cria o pedido (esvaziando o carrinho) e redireciona para a tela
    // de pagamento Pix. Como /checkout/pagamento e /checkout/sucesso NÃO são
    // mais filhas de /checkout (rotas checkout_.*), o guard de carrinho vazio
    // não dispara — a tela de Pix é alcançável de forma estável.
    await page.waitForURL(/\/checkout\/pagamento\//, { timeout: 30_000 });

    // ── Pagamento Pix + simulação dev (driver fake) ──
    await page.getByRole("button", { name: /Gerar código Pix/i }).click();
    const simular = page.getByRole("button", { name: /Já fiz o pagamento \(simular\)/i });
    await expect(simular).toBeVisible({ timeout: 20_000 });
    await simular.click();

    // Redireciona para a tela de sucesso com "Pagamento confirmado".
    await page.waitForURL(/\/checkout\/sucesso\//, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: /Pagamento confirmado/i }),
    ).toBeVisible({ timeout: 20_000 });

    // ── O pedido aparece em /conta/pedidos como o mais recente, Entrega, Pago ──
    await page.goto("/conta/pedidos");
    const recente = page.locator("a.co-order").first();
    await expect(recente).toBeVisible({ timeout: 20_000 });
    await expect(recente).toContainText(/Entrega/i);
    await expect(recente).toContainText(/Pago/i);
  });
});
