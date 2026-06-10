import type { CategoriaAdmin, ProdutoDetalheAdmin } from "~/lib/painel.server";

type Errors = Record<string, string[]>;

/**
 * Campos compartilhados do formulário de produto (dados, preços, peso/dim,
 * SEO, badges, visibilidade). Renderiza apenas inputs — o <Form> e os botões
 * ficam na rota. `defaultValue` vem do produto (edição) ou vazio (criação).
 */
export function ProdutoCampos({
  produto,
  categorias,
  errors = {},
}: {
  produto?: Partial<ProdutoDetalheAdmin>;
  categorias: CategoriaAdmin[];
  errors?: Errors;
}) {
  const p = produto ?? {};
  const err = (k: string) => (errors[k] ? <span className="err">{errors[k][0]}</span> : null);

  return (
    <>
      <div className="pn-card">
        <h2>Dados do produto</h2>
        <p className="card-sub">Informações principais exibidas na vitrine.</p>

        <div className="ct-field">
          <label htmlFor="nome">Nome *</label>
          <input id="nome" name="nome" required defaultValue={p.nome ?? ""} />
          {err("nome")}
        </div>

        <div className="ct-field">
          <label htmlFor="descricao_curta">Descrição curta</label>
          <input
            id="descricao_curta"
            name="descricao_curta"
            maxLength={500}
            defaultValue={p.descricao_curta ?? ""}
          />
          {err("descricao_curta")}
        </div>

        <div className="ct-field">
          <label htmlFor="descricao_longa">Descrição longa</label>
          <textarea
            id="descricao_longa"
            name="descricao_longa"
            rows={5}
            className="pn-textarea"
            defaultValue={p.descricao_longa ?? ""}
          />
          {err("descricao_longa")}
        </div>

        <div className="ct-field">
          <label htmlFor="id_categoria">Categoria</label>
          <select id="id_categoria" name="id_categoria" defaultValue={p.id_categoria ?? ""}>
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {err("id_categoria")}
        </div>
      </div>

      <div className="pn-card">
        <h2>Preços e estoque</h2>
        <div className="ct-row">
          <div className="ct-field" style={{ marginTop: 0 }}>
            <label htmlFor="preco_venda">Preço de venda *</label>
            <input
              id="preco_venda"
              name="preco_venda"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={p.preco_venda ?? ""}
            />
            {err("preco_venda")}
          </div>
          <div className="ct-field" style={{ marginTop: 0 }}>
            <label htmlFor="preco_promocional">Preço promocional</label>
            <input
              id="preco_promocional"
              name="preco_promocional"
              type="number"
              step="0.01"
              min="0"
              defaultValue={p.preco_promocional ?? ""}
            />
            {err("preco_promocional")}
          </div>
        </div>
        <div className="ct-row" style={{ marginTop: 14 }}>
          <div className="ct-field" style={{ marginTop: 0 }}>
            <label htmlFor="estoque_atual">Estoque atual</label>
            <input
              id="estoque_atual"
              name="estoque_atual"
              type="number"
              min="0"
              defaultValue={p.estoque_atual ?? ""}
            />
            {err("estoque_atual")}
          </div>
          <div className="ct-field" style={{ marginTop: 0 }}>
            <label htmlFor="estoque_minimo">Estoque mínimo</label>
            <input
              id="estoque_minimo"
              name="estoque_minimo"
              type="number"
              min="0"
              defaultValue={p.estoque_minimo ?? ""}
            />
            {err("estoque_minimo")}
          </div>
        </div>
      </div>

      <div className="pn-card">
        <h2>Peso e dimensões</h2>
        <p className="card-sub">Usados para cálculo de frete.</p>
        <div className="ct-row">
          <div className="ct-field" style={{ marginTop: 0 }}>
            <label htmlFor="peso_gramas">Peso (g)</label>
            <input id="peso_gramas" name="peso_gramas" type="number" min="0" defaultValue={p.peso_gramas ?? ""} />
            {err("peso_gramas")}
          </div>
          <div className="ct-field" style={{ marginTop: 0 }}>
            <label htmlFor="altura_cm">Altura (cm)</label>
            <input id="altura_cm" name="altura_cm" type="number" step="0.1" min="0" defaultValue={p.altura_cm ?? ""} />
          </div>
        </div>
        <div className="ct-row" style={{ marginTop: 14 }}>
          <div className="ct-field" style={{ marginTop: 0 }}>
            <label htmlFor="largura_cm">Largura (cm)</label>
            <input id="largura_cm" name="largura_cm" type="number" step="0.1" min="0" defaultValue={p.largura_cm ?? ""} />
          </div>
          <div className="ct-field" style={{ marginTop: 0 }}>
            <label htmlFor="comprimento_cm">Comprimento (cm)</label>
            <input
              id="comprimento_cm"
              name="comprimento_cm"
              type="number"
              step="0.1"
              min="0"
              defaultValue={p.comprimento_cm ?? ""}
            />
          </div>
        </div>
      </div>

      <div className="pn-card">
        <h2>SEO</h2>
        <div className="ct-field">
          <label htmlFor="meta_title">Meta title</label>
          <input id="meta_title" name="meta_title" maxLength={255} defaultValue={p.meta_title ?? ""} />
        </div>
        <div className="ct-field">
          <label htmlFor="meta_description">Meta description</label>
          <input
            id="meta_description"
            name="meta_description"
            maxLength={500}
            defaultValue={p.meta_description ?? ""}
          />
        </div>
      </div>

      <div className="pn-card">
        <h2>Visibilidade e selos</h2>
        <div className="ct-field--inline">
          <input
            id="visivel_ecommerce"
            name="visivel_ecommerce"
            type="checkbox"
            value="true"
            defaultChecked={p.visivel_ecommerce ?? false}
          />
          <label htmlFor="visivel_ecommerce">Visível na loja (vitrine pública)</label>
        </div>
        <div className="ct-field--inline">
          <input id="destaque" name="destaque" type="checkbox" value="true" defaultChecked={p.destaque ?? false} />
          <label htmlFor="destaque">Destaque</label>
        </div>
        <div className="ct-field--inline">
          <input id="novo" name="novo" type="checkbox" value="true" defaultChecked={p.novo ?? false} />
          <label htmlFor="novo">Novo</label>
        </div>
        <div className="ct-field--inline">
          <input
            id="em_promocao"
            name="em_promocao"
            type="checkbox"
            value="true"
            defaultChecked={p.em_promocao ?? false}
          />
          <label htmlFor="em_promocao">Em promoção</label>
        </div>
        <div className="ct-field--inline">
          <input id="ativo" name="ativo" type="checkbox" value="true" defaultChecked={p.ativo ?? true} />
          <label htmlFor="ativo">Ativo</label>
        </div>
      </div>
    </>
  );
}

/** Converte os campos do FormData de produto num payload JSON tipado para a API. */
export function lerProdutoForm(form: FormData): Record<string, unknown> {
  const num = (k: string) => {
    const v = form.get(k);
    if (v == null || v === "") return undefined;
    return Number(v);
  };
  const str = (k: string) => {
    const v = form.get(k);
    return v == null || v === "" ? undefined : String(v);
  };
  const bool = (k: string) => form.get(k) === "true";

  return {
    nome: str("nome"),
    descricao_curta: str("descricao_curta") ?? null,
    descricao_longa: str("descricao_longa") ?? null,
    preco_venda: num("preco_venda"),
    preco_promocional: num("preco_promocional") ?? null,
    id_categoria: num("id_categoria") ?? null,
    peso_gramas: num("peso_gramas") ?? null,
    altura_cm: num("altura_cm") ?? null,
    largura_cm: num("largura_cm") ?? null,
    comprimento_cm: num("comprimento_cm") ?? null,
    meta_title: str("meta_title") ?? null,
    meta_description: str("meta_description") ?? null,
    visivel_ecommerce: bool("visivel_ecommerce"),
    destaque: bool("destaque"),
    novo: bool("novo"),
    em_promocao: bool("em_promocao"),
    ativo: bool("ativo"),
    estoque_atual: num("estoque_atual"),
    estoque_minimo: num("estoque_minimo"),
  };
}
