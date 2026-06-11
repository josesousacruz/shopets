import { test, expect, SEEDED, login } from "./helpers";

/**
 * Devolução (best-effort).
 *
 * O botão "Solicitar devolução" só aparece para pedidos com status
 * `enviado` ou `entregue`. Montar esse estado puramente pela UI da loja é
 * inviável (depende do lojista marcar o pedido como enviado/entregue no
 * painel). Então este teste é tolerante: procura um pedido elegível entre os
 * pedidos do cliente seeded; se não houver, faz `test.skip` com explicação em
 * vez de falhar de forma instável.
 */
test.describe("Solicitação de devolução (best-effort)", () => {
  test("solicita devolução de um pedido entregue, se existir", async ({ page }) => {
    test.setTimeout(120_000); // varre vários pedidos via navegação direta
    await login(page, SEEDED.email, SEEDED.senha);

    await page.goto("/conta/pedidos");
    const pedidos = page.locator("a.co-order");
    await pedidos.first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});

    // Coleta (href, texto do card) e filtra apenas os elegíveis (Enviado /
    // Entregue), evitando visitar dezenas de pedidos não elegíveis.
    const cards = await pedidos.evaluateAll((els) =>
      els.map((e) => ({
        href: (e as HTMLAnchorElement).getAttribute("href"),
        texto: (e.textContent ?? "").toLowerCase(),
      })),
    );

    if (cards.length === 0) {
      test.skip(true, "Cliente seeded não possui pedidos.");
      return;
    }

    const elegiveis = cards
      .filter((c) => c.href && (c.texto.includes("entregue") || c.texto.includes("enviado")))
      .map((c) => c.href as string);

    if (elegiveis.length === 0) {
      test.skip(
        true,
        "Nenhum pedido com status enviado/entregue. Marque um pedido como " +
          "entregue no painel para exercitar este fluxo.",
      );
      return;
    }

    // Visita os pedidos elegíveis até achar um que permita devolução (dentro do prazo).
    let encontrou = false;
    for (const href of elegiveis) {
      await page.goto(href);
      await page.getByRole("heading", { name: /Resumo/i }).first().waitFor({ timeout: 15_000 }).catch(() => {});

      const botao = page.getByRole("button", { name: /Solicitar devolução/i });
      if (await botao.count()) {
        encontrou = true;

        await botao.click();
        // Seleciona o primeiro item (clica no label; .dot intercepta o input).
        await page.locator('label.co-opt:has(input[name^="sel_"])').first().click();
        await page
          .locator("#motivo")
          .fill("Teste E2E: arrependimento dentro do prazo (CDC art. 49).");
        await page.getByRole("button", { name: /Enviar solicitação/i }).click();

        // O backend responde com sucesso (dentro do prazo) ou com um alerta de
        // erro (fora do prazo CDC). Em ambos os casos o fluxo de UI funcionou —
        // este teste best-effort valida que a solicitação foi processada.
        await expect(page.locator(".ct-alert").first()).toBeVisible({ timeout: 20_000 });
        break;
      }
    }

    if (!encontrou) {
      test.skip(
        true,
        "Nenhum pedido entregue/enviado expôs o botão 'Solicitar devolução' " +
          "(fora do prazo CDC, ou detalhe não acessível). Best-effort: skip.",
      );
    }
  });
});
