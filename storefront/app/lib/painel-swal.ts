import Swal from "sweetalert2";

/**
 * SweetAlert estilizado conforme o painel (cor mint #0d9488).
 * Use os helpers — `confirmDestrutivo`, `confirmAcao`, `toastSucesso`, `toastErro` —
 * para manter feedback consistente entre todas as telas do painel.
 *
 * IMPORTANTE: SweetAlert é client-side puro. Em forms server-action do Remix,
 * use `useActionFeedback` para disparar toasts a partir do retorno do action.
 */

const cores = {
  mint: "#0d9488",
  mintDark: "#0f766e",
  danger: "#b91c1c",
  warning: "#d97706",
  text: "#0f172a",
  border: "#e2e8f0",
} as const;

const baseClasses = {
  popup: "pn-swal-popup",
  title: "pn-swal-title",
  htmlContainer: "pn-swal-text",
  confirmButton: "pn-swal-btn pn-swal-btn--primary",
  cancelButton: "pn-swal-btn pn-swal-btn--ghost",
  denyButton: "pn-swal-btn pn-swal-btn--danger",
};

const PainelSwal = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  customClass: baseClasses,
  confirmButtonColor: cores.mint,
  cancelButtonColor: cores.border,
  focusConfirm: false,
});

/** Confirma uma ação destrutiva (excluir, cancelar, etc.). Retorna true se confirmado. */
export async function confirmDestrutivo(opts: {
  titulo: string;
  mensagem?: string;
  confirmar?: string;
  cancelar?: string;
}): Promise<boolean> {
  const r = await PainelSwal.fire({
    icon: "warning",
    iconColor: cores.danger,
    title: opts.titulo,
    text: opts.mensagem,
    showCancelButton: true,
    confirmButtonText: opts.confirmar ?? "Excluir",
    cancelButtonText: opts.cancelar ?? "Cancelar",
    customClass: { ...baseClasses, confirmButton: "pn-swal-btn pn-swal-btn--danger" },
    confirmButtonColor: cores.danger,
  });
  return r.isConfirmed;
}

/** Confirma uma ação genérica (ativar, concluir, etc.). Retorna true se confirmado. */
export async function confirmAcao(opts: {
  titulo: string;
  mensagem?: string;
  confirmar?: string;
  cancelar?: string;
  icone?: "question" | "info" | "warning";
}): Promise<boolean> {
  const r = await PainelSwal.fire({
    icon: opts.icone ?? "question",
    iconColor: cores.mint,
    title: opts.titulo,
    text: opts.mensagem,
    showCancelButton: true,
    confirmButtonText: opts.confirmar ?? "Confirmar",
    cancelButtonText: opts.cancelar ?? "Cancelar",
  });
  return r.isConfirmed;
}

const PainelToast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2400,
  timerProgressBar: true,
  customClass: { popup: "pn-swal-toast" },
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

/** Toast de sucesso no canto superior direito. */
export function toastSucesso(mensagem: string): void {
  void PainelToast.fire({ icon: "success", title: mensagem, iconColor: cores.mint });
}

/** Toast de erro no canto superior direito. */
export function toastErro(mensagem: string): void {
  void PainelToast.fire({ icon: "error", title: mensagem, iconColor: cores.danger, timer: 4500 });
}

/** Toast de info (mudança visível, sem ação direta). */
export function toastInfo(mensagem: string): void {
  void PainelToast.fire({ icon: "info", title: mensagem, iconColor: "#0369a1" });
}

export { PainelSwal as Swal };
