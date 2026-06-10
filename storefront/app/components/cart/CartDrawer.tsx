import { useEffect, useRef } from "react";
import { Link, useFetcher } from "@remix-run/react";
import { X, ShoppingBag, Trash2, ShieldCheck, Minus, Plus, Check } from "lucide-react";
import { formatBRL } from "~/lib/format";
import { useCart } from "./CartContext";
import type { Carrinho } from "~/types/api";

type CartLoad = { ok: boolean; carrinho: Carrinho | null };

export function CartDrawer() {
  const { open, closeCart, toast, clearToast } = useCart();
  const loadFetcher = useFetcher<CartLoad>();
  const loadedOnce = useRef(false);

  // Carrega o carrinho ao abrir (e recarrega ao reabrir para refletir mudanças).
  useEffect(() => {
    if (open) {
      loadFetcher.load("/api/carrinho");
      loadedOnce.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fecha com ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeCart]);

  const carrinho = loadFetcher.data?.carrinho ?? null;
  const itens = carrinho?.itens ?? [];
  const carregando = loadFetcher.state === "loading" && !loadedOnce.current;

  return (
    <>
      <div
        className={`fc-overlay${open ? " open" : ""}`}
        onClick={closeCart}
        aria-hidden={!open}
      />
      <aside
        className={`fc-drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
      >
        <header>
          <h3>Seu carrinho</h3>
          <button type="button" className="close" aria-label="Fechar carrinho" onClick={closeCart}>
            <X size={20} />
          </button>
        </header>

        {carregando ? (
          <div className="items" style={{ display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 14 }}>
            Carregando...
          </div>
        ) : itens.length === 0 ? (
          <div className="items" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", color: "var(--muted)" }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(136,226,202,.22)", color: "var(--ink)", display: "grid", placeItems: "center" }}>
              <ShoppingBag size={28} />
            </div>
            <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>Seu carrinho está vazio</div>
            <p style={{ fontSize: 13.5, maxWidth: 240, lineHeight: 1.5 }}>
              Explore nossas capas, películas e acessórios e adicione seus favoritos.
            </p>
            <Link to="/loja" className="ct-btn ct-btn--mint" style={{ width: "auto" }} onClick={closeCart}>
              Ver produtos
            </Link>
          </div>
        ) : (
          <>
            <div className="items">
              {itens.map((it) => (
                <DrawerItem key={it.id} item={it} />
              ))}
            </div>

            <div className="totals">
              <div className="row total">
                <span>Subtotal</span>
                <span>{formatBRL(carrinho?.subtotal ?? 0)}</span>
              </div>
            </div>

            <Link to="/checkout" className="checkout" onClick={closeCart}>
              Finalizar compra
            </Link>
            <Link
              to="/carrinho"
              onClick={closeCart}
              style={{ display: "block", textAlign: "center", margin: "-6px 24px 6px", fontSize: 13.5, fontWeight: 700, color: "var(--mint-deep)" }}
            >
              Ver carrinho completo
            </Link>
            <div className="secure">
              <ShieldCheck size={14} style={{ color: "var(--mint-deep)" }} />
              Pagamento 100% seguro
            </div>
          </>
        )}
      </aside>

      {toast && (
        <div className="fc-toast show" role="status" onClick={clearToast}>
          <Check size={18} />
          {toast}
        </div>
      )}
    </>
  );
}

function DrawerItem({ item }: { item: Carrinho["itens"][number] }) {
  const fetcher = useFetcher<{ ok: boolean; message?: string }>();
  // Otimista: usa a quantidade submetida enquanto a mutação está em voo.
  const submittedQty = fetcher.formData?.get("quantidade");
  const qty = submittedQty != null ? Number(submittedQty) : item.quantidade;
  const busy = fetcher.state !== "idle";
  const erro = fetcher.data && fetcher.data.ok === false ? fetcher.data.message : undefined;

  function setQty(next: number) {
    if (next < 1) return;
    fetcher.submit(
      { intent: "update", id: String(item.id), quantidade: String(next) },
      { method: "post", action: "/api/carrinho" },
    );
  }

  return (
    <div className="item">
      <div className="thumb">
        {item.imagem ? <img src={item.imagem} alt={item.nome ?? ""} /> : <i />}
      </div>
      <div className="info">
        <div className="name">{item.nome ?? "Produto"}</div>
        {item.variacao?.nome && <div className="var">{item.variacao.nome}</div>}
        <div className="qty" aria-label="Quantidade">
          <button type="button" onClick={() => setQty(qty - 1)} disabled={busy || qty <= 1} aria-label="Diminuir">
            <Minus size={13} />
          </button>
          <span>{qty}</span>
          <button type="button" onClick={() => setQty(qty + 1)} disabled={busy} aria-label="Aumentar">
            <Plus size={13} />
          </button>
        </div>
        {erro && <div className="var" style={{ color: "var(--tag-promo)", fontWeight: 600, marginTop: 4 }}>{erro}</div>}
      </div>
      <div className="price">
        {formatBRL(item.subtotal)}
        <fetcher.Form method="post" action="/api/carrinho">
          <input type="hidden" name="intent" value="remove" />
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            aria-label="Remover item"
            disabled={busy}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}
          >
            <Trash2 size={13} /> Remover
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}
