import { useNavigate, useSearchParams } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { toastErro, toastSucesso } from "~/lib/painel-swal";

interface ActionResult {
  ok?: string | boolean;
  mensagem?: string;
  erro?: string;
}

/**
 * Dispara toast Swal (sucesso/erro) sempre que `data` mudar para um novo
 * resultado de action. Suporta o retorno padronizado `{ ok, mensagem }` e
 * `{ erro }`. Mensagens padrão por intent (`create`/`update`/`delete`/`toggle`)
 * são usadas quando `mensagem` não é informada.
 *
 * @example
 * const actionData = useActionData<typeof action>();
 * useActionFeedback(actionData);
 */
export function useActionFeedback(data: ActionResult | undefined | null): void {
  const ultimo = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (!data) return;
    if (ultimo.current === data) return;
    ultimo.current = data;

    if (data.erro) {
      toastErro(data.erro);
      return;
    }
    if (data.ok) {
      const mensagem = data.mensagem ?? mensagemPadrao(String(data.ok));
      if (mensagem) toastSucesso(mensagem);
    }
  }, [data]);
}

/**
 * Lê `?feedback=...` ou `?erro=...` da URL (definido por redirects pós-action),
 * dispara o toast adequado e limpa o parâmetro para não disparar de novo no F5.
 *
 * Usar uma vez por rota com action que faça `redirect("?feedback=...")`.
 */
export function useFlashFeedback(): void {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const jaProcessado = useRef<string | null>(null);

  useEffect(() => {
    const feedback = params.get("feedback");
    const erro = params.get("erro");
    const chave = `${feedback ?? ""}|${erro ?? ""}`;

    if (!feedback && !erro) return;
    if (jaProcessado.current === chave) return;
    jaProcessado.current = chave;

    if (erro) {
      toastErro(decodeURIComponent(erro));
    } else if (feedback) {
      const msg = mensagemPadrao(feedback);
      if (msg) toastSucesso(msg);
    }

    // Limpa o parâmetro sem entrar no histórico nem disparar revalidação.
    const url = new URL(window.location.href);
    url.searchParams.delete("feedback");
    url.searchParams.delete("erro");
    navigate(url.pathname + url.search + url.hash, { replace: true, preventScrollReset: true });
  }, [params, navigate]);
}

export function mensagemPadrao(intent: string): string {
  switch (intent) {
    case "create":
    case "criar":
      return "Criado com sucesso.";
    case "update":
    case "editar":
    case "atualizar":
      return "Alterações salvas.";
    case "delete":
    case "excluir":
      return "Excluído.";
    case "toggle":
      return "Status atualizado.";
    case "duplicate":
    case "duplicar":
      return "Duplicado.";
    case "move":
    case "mover":
      return "Ordem atualizada.";
    case "ajuste":
      return "Saldo ajustado.";
    case "transferencia":
      return "Transferência realizada.";
    case "concluir":
      return "Inventário concluído.";
    case "cancelar":
      return "Cancelado.";
    case "contar":
      return "Contagem registrada.";
    default:
      return "";
  }
}
