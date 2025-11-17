import React from 'react';

interface EmpresaInfo {
  nome_empresa: string;
  razao_social?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

interface ClienteInfo {
  id_cliente: number;
  nome: string;
  email?: string;
  telefone?: string;
  pontos_fidelidade?: number;
}

interface CupomPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  venda: { numero?: string; valor_total?: number } | null;
  items: any[];
  cliente?: ClienteInfo;
  formaPagamentoNome?: string;
  observacoes?: string;
  empresa?: EmpresaInfo;
}

const CupomPreviewModal: React.FC<CupomPreviewModalProps> = ({
  isOpen,
  onClose,
  venda,
  items,
  cliente,
  formaPagamentoNome,
  observacoes,
  empresa
}) => {
  if (!isOpen) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handlePrint = () => {
    const printRoot = document.getElementById("print-root");
    const cupom = document.getElementById("cupom-print-area");

    if (!printRoot || !cupom) return;

    // copia o cupom para o container de impressão
    printRoot.innerHTML = cupom.innerHTML;
    printRoot.style.display = "block";

    window.print();

    // limpa após impressão
    printRoot.innerHTML = "";
    printRoot.style.display = "none";
  };

  const rows = (items || []).map((it: any, idx: number) => {
    const name = it.product?.name || it.product?.nome || "Item";
    const qty = it.quantity || 0;
    const price = it.product?.price || 0;
    const total = qty * price;

    return (
      <tr key={idx}>
        <td>{name}</td>
        <td style={{ textAlign: "center" }}>{qty}</td>
        <td style={{ textAlign: "right" }}>{formatCurrency(price)}</td>
        <td style={{ textAlign: "right" }}>{formatCurrency(total)}</td>
      </tr>
    );
  });

  return (
    <>
      {/* container invisível para impressão */}
      <div id="print-root" style={{ display: "none" }}></div>

      <div
        id="modal-overlay"
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Cupom Não Fiscal</h2>
            <p className="text-sm text-gray-500">Pré-visualização</p>
          </div>

          <div className="p-6" id="cupom-print-area">
            <style>{`  @page { 
    size: 72mm auto; 
    margin: 0 !important; 
  }

  @media print {

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 72mm !important;
    }

    body * {
      display: none !important;
    }


    #print-root, #print-root * {
      display: block !important;
    }

    #print-root {
      position: absolute;
      left: 0;
      top: 0;
      width: 72mm !important;
      max-width: 72mm !important;
      min-width: 72mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }

    #modal-overlay {
      display: none !important;
    }

    * {
      word-wrap: break-word;
      white-space: normal !important;
      page-break-inside: avoid;
    }
  }

  #cupom-print-area { width: 72mm; margin: 0 auto; }
  .cupom-line { border-top: 1px dashed #999; margin: 8px 0; }
  .cupom-section-title { font-weight: 600; font-size: 12px; margin-bottom: 4px; }
  .cupom-text { font-size: 12px; line-height: 1.3; }
  .cupom-small { font-size: 11px; }
            `}</style>

            {/* Cabeçalho */}
            <div className="cupom-text text-center">
              <div className="font-semibold">{empresa?.nome_empresa || "Sua Empresa"}</div>
              {empresa?.cnpj && <div>CNPJ: {empresa.cnpj}</div>}
              {empresa?.telefone && <div>Telefone: {empresa.telefone}</div>}
              {empresa?.endereco && <div>Endereço: {empresa.endereco}</div>}
            </div>

            <div className="cupom-line" />

            {/* Pedido */}
            <div className="cupom-text">
              <div>Pedido: {venda?.numero || "-"}</div>
              <div>Data: {new Date().toLocaleString("pt-BR")}</div>
            </div>

            <div className="cupom-line" />

            {/* Cliente */}
            <div className="cupom-text">
              <div>Cliente: {cliente?.nome || "CONSUMIDOR"}</div>
              {cliente?.telefone && <div>Telefone: {cliente.telefone}</div>}
              <div>CPF/CNPJ: -</div>
              <div>Cidade: -</div>
              <div>CEP: -</div>
              <div>Endereço: -</div>
            </div>

            <div className="cupom-line" />

            {/* Itens */}
            <table className="w-full border-collapse cupom-small">
              <thead>
                <tr>
                  <th className="text-left border-b py-1">Item</th>
                  <th className="text-center border-b py-1">Qtd</th>
                  <th className="text-right border-b py-1">Preço</th>
                  <th className="text-right border-b py-1">Total</th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>

            <div className="cupom-line" />

            {/* Entrega */}
            <div className="cupom-text">
              <div className="cupom-section-title">Entrega</div>
              <div>Nome: {cliente?.nome || "CONSUMIDOR"}</div>
              <div>Cidade: -</div>
              <div>Avisos: {observacoes || "SEM OBSERVAÇÕES"}</div>
              <div>Endereço: -</div>
            </div>

            <div className="cupom-line" />

            {/* Pagamento */}
            <div className="cupom-text">
              <div className="cupom-section-title">Forma de registro</div>
              <div>{formaPagamentoNome || "-"}</div>
              <div>Recebida: {formatCurrency(venda?.valor_total ?? 0)}</div>
            </div>

            <div className="cupom-line" />

            {/* Totais */}
            <div className="cupom-text">
              <div>
                Total de itens:{" "}
                {(items || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0)}
              </div>
              <div>Peso bruto: 0,00</div>
              <div>Peso líquido: 0,00</div>
              <div>Garantia: 0,00</div>
              <div>
                Total bruto:{" "}
                {formatCurrency(
                  (items || []).reduce(
                    (s: number, it: any) =>
                      s + (it.quantity || 0) * (it.product?.price || 0),
                    0
                  )
                )}
              </div>
              <div>(+) Frete: 0,00</div>
              <div>(+) Despesas: 0,00</div>
              <div>(-) Desconto: {formatCurrency(0)}</div>
              <div className="font-bold">
                Total líquido: {formatCurrency(venda?.valor_total ?? 0)}
              </div>
            </div>

            <div className="cupom-line" />

            {/* Rodapé */}
            <div className="cupom-text text-center">
              <div className="font-semibold">*NÃO ACEITAMOS DEVOLUÇÃO*</div>
              <div>*TROCA NO MÁXIMO DE 24HRS*</div>
              <div>***DOCUMENTO NÃO FISCAL***</div>
              <div className="cupom-small mt-1">
                {new Date().toLocaleString("pt-BR")}
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CupomPreviewModal;
