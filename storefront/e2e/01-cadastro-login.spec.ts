import { test, expect, novoCliente, cadastrar, login, logout } from "./helpers";

test.describe("Cadastro e login do cliente", () => {
  test("cadastra, sai e entra novamente", async ({ page }) => {
    const c = novoCliente();

    // ── Cadastro: cria conta e já entra logado ──
    await cadastrar(page, c);
    await expect(page).toHaveURL(/\/conta\b/);
    // A área da conta saúda o cliente pelo primeiro nome.
    await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();

    // ── Logout ──
    await logout(page);
    // Voltou à home; o header oferece entrar novamente.
    await expect(page.getByRole("link", { name: /Entrar/i }).first()).toBeVisible();

    // ── Login com as mesmas credenciais ──
    await login(page, c.email, c.senha);
    await expect(page).toHaveURL(/\/conta\b/);
    await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
  });
});
