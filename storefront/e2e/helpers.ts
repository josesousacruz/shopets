import { expect, test as base, type Page } from "@playwright/test";

/**
 * `test` estendido: dispensa o banner de consentimento de cookies antes de
 * qualquer navegação (ele fica fixo no rodapé e intercepta cliques nos botões
 * de confirmação do checkout). A escolha fica gravada no localStorage.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("shopets_cookie_consent", "rejected");
      } catch {
        /* ignore */
      }
    });
    await use(page);
  },
});
export { expect };

/** Cliente seeded conhecido (com endereço cadastrado), usado nos fluxos de compra. */
export const SEEDED = {
  email: "almir.smoke@example.com",
  senha: "senha12345",
} as const;

/** Gera credenciais únicas por execução (timestamp). */
export function novoCliente() {
  const ts = Date.now();
  return {
    nome: `Cliente E2E ${ts}`,
    email: `e2e+${ts}@example.com`,
    senha: "senha12345",
  };
}

/** Cadastra um cliente novo e fica logado (redireciona para /conta). */
export async function cadastrar(page: Page, c: ReturnType<typeof novoCliente>) {
  await page.goto("/cadastro");
  await page.locator("#nome").fill(c.nome);
  await page.locator("#email").fill(c.email);
  await page.locator("#password").fill(c.senha);
  await page.locator("#password_confirmation").fill(c.senha);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL(/\/conta\b/, { timeout: 30_000 });
}

/** Faz login pela página /login. */
export async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/conta\b/, { timeout: 30_000 });
}

/** Sai da conta (botão "Sair" em /conta). */
export async function logout(page: Page) {
  await page.goto("/conta");
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/", { timeout: 30_000 });
}

/**
 * Garante que o cliente logado tenha ao menos um endereço cadastrado.
 * Se a lista estiver vazia, cria um via ViaCEP (01310-100, número 100).
 */
export async function garantirEndereco(page: Page) {
  await page.goto("/conta/enderecos");
  // Já existe ao menos um endereço? Então não faz nada.
  const existentes = page.locator("article.ct-addr");
  if ((await existentes.count()) > 0) return;

  await page.getByRole("button", { name: /Novo endereço|Adicionar endereço/ }).first().click();
  const cep = page.locator("#cep");
  await expect(cep).toBeVisible();
  await cep.fill("01310-100");
  // Dispara o blur para o ViaCEP preencher logradouro/bairro/cidade/uf.
  await page.locator("#numero").click();
  await page.locator("#numero").fill("100");

  // Dá um tempo para o ViaCEP responder e preencher os campos.
  await expect
    .poll(async () => (await page.locator("#logradouro").inputValue()).length, { timeout: 8_000 })
    .toBeGreaterThan(0)
    .catch(() => {});

  // Fallback: se o ViaCEP não preencher, completa manualmente.
  const logradouro = page.locator("#logradouro");
  if (!(await logradouro.inputValue())) await logradouro.fill("Avenida Paulista");
  const bairro = page.locator("#bairro");
  if (!(await bairro.inputValue())) await bairro.fill("Bela Vista");
  const cidade = page.locator("#cidade");
  if (!(await cidade.inputValue())) await cidade.fill("São Paulo");
  const uf = page.locator("#uf");
  if (!(await uf.inputValue())) await uf.fill("SP");

  await page.getByRole("button", { name: "Salvar endereço" }).click();
  // O dialog fecha ao salvar com sucesso; o endereço aparece na lista.
  await expect(page.locator("article.ct-addr").first()).toBeVisible({ timeout: 20_000 });
}

/**
 * Adiciona um produto SEM variações (Power Bank) ao carrinho a partir da PDP.
 * Retorna a slug do produto usado.
 */
export async function adicionarPowerBank(page: Page): Promise<string> {
  await page.goto("/loja/power-banks");
  // Abre a PDP do primeiro Power Bank (link do card cobre imagem/título).
  const primeiro = page.locator("article.product-card").first();
  await expect(primeiro).toBeVisible();
  await primeiro.getByRole("link").first().click();
  await page.waitForURL(/\/produto\//, { timeout: 30_000 });
  const slug = new URL(page.url()).pathname.split("/").pop() ?? "";

  // PDP de produto sem variação: botão "Adicionar ao carrinho".
  const addBtn = page.getByRole("button", { name: /Adicionar ao carrinho/i });
  await expect(addBtn).toBeEnabled();
  await addBtn.click();

  // O drawer abre com um toast de confirmação.
  await expect(page.getByText("Produto adicionado ao carrinho")).toBeVisible();
  return slug;
}
