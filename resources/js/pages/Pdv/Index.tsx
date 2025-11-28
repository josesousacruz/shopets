// resources/js/Pages/PDV.tsx

import { useState, useEffect, useRef } from 'react';
import { Printer, XCircle } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useMultiCart } from '../../hooks/useMultiCart';
import PDVView from '../../components/views/PDVView';
import FinalizarVendaModal from '../../components/modals/FinalizarVendaModal';
import CupomPreviewModal from '../../components/modals/CupomPreviewModal';
import OffCanvas from '../../components/ui/OffCanvas';
import CancelarVendaModal from '../../components/modals/CancelarVendaModal';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { Product, Category, Cart } from '../../types';
import Swal from 'sweetalert2';
import axios from 'axios';
import { debounce } from 'lodash';

interface Cliente {
    id_cliente: number;
    nome: string;
    email?: string;
    telefone?: string;
    pontos_fidelidade?: number;
}

interface FormaPagamento {
    id_forma_pagamento: number;
    nome: string;
    tipo: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'transferencia' | 'cheque';
    permite_parcelamento: boolean;
    max_parcelas?: number;
    taxa_juros?: number;
}

interface PagamentoParcial {
    id_forma_pagamento: number;
    valor_pagamento: number;
    numero_parcelas?: number;
}

interface DadosFinalizacao {
    id_cliente?: number;
    id_forma_pagamento: number;
    pontos_fidelidade_utilizados?: number;
    observacoes?: string;
    acao_pos?: 'finalizar' | 'cupom' | 'nfe';
    desconto_valor?: number;
    pagamentos?: PagamentoParcial[];
}

interface VendaEmAberto {
    id: number;
    numero: string;
    valor_total?: number;
    status?: string;
}

interface Props {
    products: Product[];
    categories: Category[];
    clientes: Cliente[];
    formasPagamento: FormaPagamento[];
    empresa?: {
        nome_empresa: string;
        razao_social?: string;
        cnpj?: string;
        telefone?: string;
        email?: string;
        endereco?: string;
    } | null;
    flash?: {
        success?: string;
        error?: string;
    };
}

function PDV({ 
    products, 
    categories, 
    clientes, 
    formasPagamento,
    empresa,
    flash,
}: Props) {
    
    const { carts, activeCart, ...cartActions } = useMultiCart();
    
    const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false);
    const [isCupomModalOpen, setIsCupomModalOpen] = useState(false);
    const [cupomVendaId, setCupomVendaId] = useState<number | undefined>(undefined);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [recentSales, setRecentSales] = useState<any[]>([]);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelSaleId, setCancelSaleId] = useState<number | undefined>(undefined);
    const [cancelSaleStatus, setCancelSaleStatus] = useState<string | undefined>(undefined);
    
    const [vendaEmAberto, setVendaEmAberto] = useState<VendaEmAberto | null>(null);
    const [currentProducts, setCurrentProducts] = useState<Product[]>(products);

    const reloadProducts = async () => {
        try {
            const response = await axios.get('/pdv/products');
            if (response.data.products) {
                setCurrentProducts(response.data.products);
            }
        } catch (error) {
            console.error('Erro ao recarregar produtos:', error);
        }
    };

    const handleCheckout = async () => {
        if (!activeCart || activeCart.items.length === 0) {
            Swal.fire('Atenção!', 'Adicione itens ao carrinho antes de finalizar a venda.', 'warning');
            return;
        }

        try {
            let currentVenda = vendaEmAberto;

            // 1. Se não houver venda em aberto, crie uma nova
            if (!currentVenda) {
                const response = await axios.post('/sales');
                if (!response.data.success || !response.data.venda) {
                    throw new Error('Falha ao criar o cabeçalho da venda.');
                }
                currentVenda = {
                    id: response.data.venda.id_venda,
                    numero: response.data.venda.numero_venda,
                    status: response.data.venda.status,
                };
                setVendaEmAberto(currentVenda);
            }

            // Abre o modal de finalização
            setIsFinalizarModalOpen(true);

        } catch (error) {
            console.error('Erro no processo de checkout:', error);
            Swal.fire('Erro!', 'Não foi possível iniciar o processo de venda.', 'error');
        }
    };

    const handleFinalizarVenda = async (dados: DadosFinalizacao) => {
        if (!vendaEmAberto || !activeCart) {
            Swal.fire('Erro!', 'Nenhuma venda em aberto ou carrinho ativo.', 'error');
            return;
        }

        // Monta o payload único com todos os dados necessários
        const finalSaleData = {
            id_venda: vendaEmAberto.id,
            id_cliente: dados.id_cliente,
            observacoes: dados.observacoes,
            pagamentos: dados.pagamentos,
            items: activeCart.items.map((it: any) => ({
                product: it.product,
                quantity: it.quantity,
                desconto_item: it.desconto_item ?? 0,
            })),
        };

        try {
            // Faz a chamada única para a rota de finalização
            const response = await axios.post('/sales/finalizar', finalSaleData);
            
            if (response.data.success) {
                if (dados.acao_pos === 'cupom') {
                    setCupomVendaId(vendaEmAberto.id);
                    setIsCupomModalOpen(true);
                }

                if (dados.acao_pos === 'nfe') {
                    // setIsNfeModalOpen(true);
                    Swal.fire('NFe Gerada!', response.data.message, 'success');
                }
                
                setIsFinalizarModalOpen(false);
                setVendaEmAberto(null);
                cartActions.removeCart(activeCart.id);
                
                await reloadProducts();
                Swal.fire('Venda Finalizada!', response.data.message, 'success');
            } else {
                Swal.fire('Erro!', response.data.message || 'Não foi possível finalizar a venda.', 'error');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Não foi possível finalizar a venda.';
            Swal.fire('Erro!', errorMessage, 'error');
        }
    };

    const openHistory = async () => {
        setIsHistoryOpen(true);
        try {
            const { data } = await axios.get('/pdv/vendas/recentes');
            setRecentSales(data.vendas || []);
        } catch (e) {
            console.error('Erro ao carregar histórico de vendas', e);
        }
    };

    const handleConfirmCancel = async (motivo: string) => {
        if (!cancelSaleId) return;
        try {
            const response = await axios.post('/sales/cancelar', { id_venda: cancelSaleId, motivo });
            if (response.data.success) {
                setIsCancelModalOpen(false);
                setCancelSaleId(undefined);
                await openHistory();
                Swal.fire('Cancelada!', response.data.message, 'success');
            } else {
                Swal.fire('Erro!', response.data.message || 'Não foi possível cancelar a venda.', 'error');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Não foi possível cancelar a venda.';
            Swal.fire('Erro!', errorMessage, 'error');
        }
    };

    const handleCancelarVenda = () => {
        if (!vendaEmAberto) return;

        Swal.fire({
            title: 'Cancelar Venda?',
            text: 'Esta ação irá cancelar a venda em aberto.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, cancelar!',
            cancelButtonText: 'Não'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await axios.post('/sales/cancelar', {
                        id_venda: vendaEmAberto.id,
                        motivo: 'Cancelada pelo usuário no PDV antes de finalizar'
                    });

                    if (response.data.success) {
                        setIsFinalizarModalOpen(false);
                        setVendaEmAberto(null);
                        if (activeCart) {
                            cartActions.removeCart(activeCart.id);
                        }
                        await reloadProducts();
                        Swal.fire('Cancelada!', response.data.message, 'success');
                    } else {
                        Swal.fire('Erro!', response.data.message || 'Não foi possível cancelar a venda.', 'error');
                    }
                } catch (error: any) {
                    const errorMessage = error.response?.data?.message || 'Não foi possível cancelar a venda.';
                    Swal.fire('Erro!', errorMessage, 'error');
                }
            }
        });
    };

    const handleCloseModal = () => {
        setIsFinalizarModalOpen(false);
    };

    return (
        <>
            <PDVView
                products={currentProducts}
                categories={categories}
                carts={carts}
                activeCart={activeCart}
                onCheckout={handleCheckout}
                onAddCart={cartActions.addCart}
                onRemoveCart={cartActions.removeCart}
                onRenameCart={cartActions.renameCart}
                onSelectCart={cartActions.setActiveCart}
                onAddToCart={cartActions.addItemToActiveCart}
                onUpdateQuantity={cartActions.updateActiveCartItemQuantity}
                onRemoveItem={cartActions.removeActiveCartItem}
                vendaEmAberto={vendaEmAberto}
                onCancelarVenda={handleCancelarVenda}
                onOpenHistory={openHistory}
                onUpdateItemDiscount={cartActions.updateActiveCartItemDiscount}
            />
            
            {(() => {
                const subtotalBrutoCart = activeCart ? activeCart.items.reduce((s: number, it: any) => s + ((Number(it.product.price) || 0) * (Number(it.quantity) || 0)), 0) : 0;
                const descontoItensCart = activeCart ? activeCart.items.reduce((s: number, it: any) => s + (Number(it.desconto_item) || 0), 0) : 0;
                return (
                    <FinalizarVendaModal
                        isOpen={isFinalizarModalOpen}
                        onClose={handleCloseModal}
                        onConfirm={handleFinalizarVenda}
                        onCancel={handleCancelarVenda}
                        valorTotal={subtotalBrutoCart}
                        numeroVenda={vendaEmAberto?.numero}
                        clientes={clientes}
                        formasPagamento={formasPagamento}
                        descontoValor={descontoItensCart}
                    />
                );
            })()}

            <CupomPreviewModal
                isOpen={isCupomModalOpen}
                onClose={() => setIsCupomModalOpen(false)}
                id_venda={cupomVendaId}
            />

            <OffCanvas
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                position="end"
                title="Histórico de Vendas"
            >
                <div className="space-y-3">
                    {recentSales.map((v) => (
                        <div key={v.id_venda} className={`flex items-center justify-between border-b pb-2 ${(v.status === 'cancelada' || v.status === 'devolvida') ? 'opacity-60' : ''}`}>
                            <div>
                                <div className="text-sm font-semibold text-gray-800">#{v.numero_venda}</div>
                                <div className="text-xs text-gray-500">{new Date(v.data_venda).toLocaleString('pt-BR')}</div>
                                <div className="text-xs text-gray-600">{v.cliente || 'CONSUMIDOR'} · {v.forma_pagamento || '-'}</div>
                                {(v.status === 'cancelada' || v.status === 'devolvida') && (
                                  <span className="ml-2 inline-block px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700">{v.status === 'cancelada' ? 'Cancelada' : 'Devolvida'}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    {v.valor_desconto > 0 && (
                                        <div className="text-xs text-gray-500 line-through">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.valor_subtotal || 0)}
                                        </div>
                                    )}
                                    <div className="text-sm font-bold text-green-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.valor_total || 0)}
                                    </div>
                                </div>
                                <button
                                    className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    onClick={() => {
                                        setCupomVendaId(v.id_venda);
                                        setIsCupomModalOpen(true);
                                    }}
                                    aria-label="Imprimir Cupom Não Fiscal"
                                >
                                    <Printer size={18} />
                                </button>
                                <button
                                    className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                                    onClick={() => {
                                        setCancelSaleId(v.id_venda);
                                        setCancelSaleStatus(v.status);
                                        setIsCancelModalOpen(true);
                                    }}
                                    aria-label="Cancelar Venda"
                                >
                                    <XCircle size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {recentSales.length === 0 && (
                        <div className="text-sm text-gray-500">Nenhuma venda encontrada.</div>
                    )}
                </div>
            </OffCanvas>

            <CancelarVendaModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={handleConfirmCancel}
                isFinalizada={cancelSaleStatus === 'finalizada'}
            />
        </>
    );
}

PDV.layout = (page) => <AuthenticatedLayout children={page} currentView="pdv" />;

export default PDV;
