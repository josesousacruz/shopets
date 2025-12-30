import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';

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
  venda: any | null;
  items: any[];
  cliente?: ClienteInfo;
  formaPagamentoNome?: string;
  observacoes?: string;
  empresa?: EmpresaInfo;
  id_venda?: number;
}

const CupomPreviewModal: React.FC<CupomPreviewModalProps> = ({
  isOpen,
  onClose,
  venda,
  items,
  cliente,
  formaPagamentoNome,
  observacoes,
  empresa,
  id_venda
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const [stateVenda, setStateVenda] = useState<any | null>(null);
  const [stateItems, setStateItems] = useState<any[]>([]);
  const [stateCliente, setStateCliente] = useState<ClienteInfo | undefined>(undefined);
  const [stateForma, setStateForma] = useState<string | undefined>(undefined);
  const [stateObs, setStateObs] = useState<string | undefined>(undefined);
  const [stateEmpresa, setStateEmpresa] = useState<EmpresaInfo | undefined>(undefined);
  const [statePagamentos, setStatePagamentos] = useState<{ forma_nome: string; valor_pagamento: number; numero_parcelas?: number; valor_parcela?: number; status_pagamento?: string; }[]>([]);

  useEffect(() => {
    const fetchCupom = async () => {
      if (!id_venda || !isOpen) return;
      try {
        const { data } = await axios.get(`/pdv/cupom/${id_venda}`);
        setStateVenda(data.venda);
        setStateItems(data.items || []);
        setStateCliente(data.cliente);
        setStateForma(data.formaPagamentoNome);
        setStateObs(data.venda?.observacoes);
        setStateEmpresa(data.empresa);
        setStatePagamentos(data.pagamentos || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCupom();
  }, [id_venda, isOpen]);

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: `Cupom_${id_venda || 'venda'}`,
  });

  if (!isOpen) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatCNPJ = (value: string | undefined) => {
    if (!value) return "";
    const cnpj = value.replace(/\D/g, '');
    if (cnpj.length !== 14) return value;
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };

  const vendaDataStr = stateVenda?.data_venda
    ? new Date(stateVenda.data_venda).toLocaleString("pt-BR")
    : "-";

  // 1. Calcula o total de quantidade
  const totalQtd = (stateItems || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0);

  // 2. Calcula o Total Bruto (Preço * Quantidade)
  const valorTotalBruto = (stateItems || []).reduce((s: number, it: any) =>
    s + (((Number(it.product?.price) || 0) * (Number(it.quantity) || 0))), 0
  );

  // 3. Calcula o Total de Descontos (Soma dos descontos dos itens)
  const valorDesconto = (stateItems || []).reduce((s: number, it: any) =>
    s + (Number(it.desconto_item) || 0), 0
  );

  // Isso garante que a conta visual no cupom sempre bata exata.
  const valorTotalLiquido = valorTotalBruto - valorDesconto;

  const rows = (stateItems || []).map((it: any, idx: number) => {
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
    <div
      id="modal-overlay"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative flex flex-col">

        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Cupom Não Fiscal</h2>
          <p className="text-sm text-gray-500">Pré-visualização</p>
        </div>

        {/* Área de Conteúdo Scrollável */}
        <div className="p-6 overflow-y-auto flex-grow bg-gray-50 flex justify-center">

          {/* --- ÁREA DE IMPRESSÃO (Ref) --- */}
          <div ref={contentRef} className="bg-white p-2 shadow-sm" style={{ width: '72mm', minHeight: '100px' }}>

            {/* CSS Original Injetado */}
            <style>{`
              @page { 
                size: 72mm auto; 
                margin: 0 !important; 
              }
              @media print {
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                }
                /* Garante que o conteúdo quebre linha corretamente */
                * {
                  word-wrap: break-word;
                  white-space: normal !important;
                }
              }

              /* Classes originais do seu código */
              #cupom-print-area { width: 100%; margin: 0 auto; font-family: sans-serif; color: #000; }
              .cupom-line { border-top: 1px dashed #999; margin: 8px 0; }
              .cupom-section-title { font-weight: 600; font-size: 12px; margin-bottom: 4px; }
              .cupom-text { font-size: 12px; line-height: 1.3; }
              .cupom-small { font-size: 11px; }
              
              table { width: 100%; border-collapse: collapse; }
              th, td { vertical-align: top; }
            `}</style>

            <div id="cupom-print-area">
              {/* Cabeçalho */}
              <div className="cupom-text text-center">
                <div className="font-semibold">{stateEmpresa?.nome_empresa || "Sua Empresa"}</div>
                {stateEmpresa?.cnpj && <div>CNPJ: {formatCNPJ(stateEmpresa.cnpj)}</div>}
                {stateEmpresa?.telefone && <div>Telefone: {stateEmpresa.telefone}</div>}
                {stateEmpresa?.endereco && <div>Endereço: {stateEmpresa.endereco}</div>}
              </div>

              <div className="cupom-line" />

              {/* Pedido */}
              <div className="cupom-text">
                <div>Pedido: {stateVenda?.numero || "-"}</div>
                <div>Data: {vendaDataStr}</div>
              </div>

              <div className="cupom-line" />

              {/* Cliente */}
              <div className="cupom-text">
                <div>Cliente: {stateCliente?.nome || "CONSUMIDOR"}</div>
                {stateCliente?.telefone && <div>Telefone: {stateCliente.telefone}</div>}
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
                <div>Nome: {stateCliente?.nome || "CONSUMIDOR"}</div>
                <div>Cidade: -</div>
                <div>Avisos: {stateObs || "SEM OBSERVAÇÕES"}</div>
                <div>Endereço: -</div>
              </div>

              <div className="cupom-line" />

              {/* Pagamento */}
              <div className="cupom-text">
                <div className="cupom-section-title">Forma de registro</div>
                <div>{stateForma || "-"}</div>
                <div>Recebida: {formatCurrency(valorTotalLiquido)}</div>
              </div>

              {statePagamentos && statePagamentos.length > 0 && (
                <>
                  <div className="cupom-line" />
                  <div className="cupom-text">
                    <div className="cupom-section-title">Pagamentos</div>
                    {statePagamentos.map((p, idx) => (
                      <div key={idx} className="cupom-small">
                        <span>{p.forma_nome}</span>
                        <span> · {formatCurrency(p.valor_pagamento)}</span>
                        {p.numero_parcelas && p.numero_parcelas > 1 && (
                          <span> · {p.numero_parcelas}x de {formatCurrency(p.valor_parcela || 0)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="cupom-line" />

              {/* Totais Completos (Layout Original) */}
              <div className="cupom-text">
                <div>Total de itens: {totalQtd}</div>
                <div>Peso bruto: 0,00</div>
                <div>Peso líquido: 0,00</div>
                <div>Garantia: 0,00</div>
                <div>Total bruto: {formatCurrency(valorTotalBruto)}</div>
                <div>(+) Frete: 0,00</div>
                <div>(+) Despesas: 0,00</div>
                <div>(-) Desconto: {formatCurrency(valorDesconto)}</div>
                <div className="font-bold">
                  Total líquido: {formatCurrency(valorTotalLiquido)}
                </div>
              </div>

              <div className="cupom-line" />

              {/* Rodapé */}
              <div className="cupom-text text-center">
                <div className="font-semibold">*NÃO ACEITAMOS DEVOLUÇÃO*</div>
                <div>*TROCA NO MÁXIMO DE 24HRS*</div>
                <div>***DOCUMENTO NÃO FISCAL***</div>
                <div className="cupom-small mt-1">{vendaDataStr}</div>
              </div>
            </div>
          </div>
          {/* --- FIM DA ÁREA DE IMPRESSÃO --- */}

        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={() => handlePrint()}
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
  );
};

export default CupomPreviewModal;