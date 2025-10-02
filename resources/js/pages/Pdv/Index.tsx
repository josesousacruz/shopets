// resources/js/Pages/PDV.tsx

import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { useMultiCart } from '../../hooks/useMultiCart';
import PDVView from '../../components/views/PDVView';
import FinalizarVendaModal from '../../components/modals/FinalizarVendaModal';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { Product, Category } from '../../types';
import Swal from 'sweetalert2';
import axios from 'axios';

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

interface DadosFinalizacao {
    id_cliente?: number;
    id_forma_pagamento: number;
    pontos_fidelidade_utilizados?: number;
    observacoes?: string;
}

interface Props {
    products: Product[];
    categories: Category[];
    clientes: Cliente[];
    formasPagamento: FormaPagamento[];
    flash?: {
        success?: string;
        error?: string;
    };
    venda?: {
        id_venda: number;
        numero_venda: string;
        status: string;
    };
}

// A página recebe os dados (produtos, categorias, clientes e formas de pagamento) como props do controller do Laravel
function PDV({ 
    products, 
    categories, 
    clientes, 
    formasPagamento,
    flash,
    venda
}: Props) {
    
    // O estado do carrinho é local do frontend, então o hook continua útil!
    const { carts, activeCart, ...cartActions } = useMultiCart();
    
    // Estado para controlar o modal de finalização
    const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false);
    
    // Estado para controlar se há uma venda em aberto
    const [vendaEmAberto, setVendaEmAberto] = useState<{ 
        id: number; 
        numero: string; 
        valor_total?: number; 
        status?: string; 
    } | null>(null);

    // Estado para produtos atualizados
    const [currentProducts, setCurrentProducts] = useState<Product[]>(products);

    // Função para recarregar produtos do servidor
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

    // Verificar se há uma venda criada nos props
    useEffect(() => {
        if (venda) {
            setVendaEmAberto({
                id: venda.id_venda,
                numero: venda.numero_venda
            });
            setIsFinalizarModalOpen(true);
        }
    }, [venda]);

    // Função para abrir o modal de finalização
    const handleCheckout = async () => {
        if (!activeCart || activeCart.items.length === 0) return;

        // Se já existe uma venda em aberto, apenas abre o modal
        if (vendaEmAberto) {
            setIsFinalizarModalOpen(true);
            return;
        }

        // Cria uma nova venda em aberto
        const saleData = {
            items: activeCart.items,
            total: activeCart.total,
            paymentMethod: 'pendente' // Será definido na finalização
        };

        try {
            // Faz requisição em segundo plano para criar a venda
            const response = await axios.post('/sales', saleData);
            console.log('Resposta da criação da venda:', response.data);
            
            if (response.data.success && response.data.venda) {
                // Armazena os dados da venda temporariamente
                setVendaEmAberto({
                    id: response.data.venda.id_venda,
                    numero: response.data.venda.numero_venda,
                    valor_total: response.data.venda.valor_total,
                    status: response.data.venda.status
                });
                
                // Abre o modal de finalização
                setIsFinalizarModalOpen(true);
            } else {
                console.error('Venda não encontrada na resposta:', response.data);
                Swal.fire('Erro!', 'Não foi possível obter os dados da venda criada.', 'error');
            }
        } catch (error) {
            console.error('Erro ao criar venda:', error);
            Swal.fire('Erro!', 'Não foi possível criar a venda.', 'error');
        }
    };

    // Função para finalizar a venda
    const handleFinalizarVenda = async (dados: DadosFinalizacao) => {
        if (!activeCart || activeCart.items.length === 0) return;
        
        // Verificar se temos uma venda em aberto
        if (!vendaEmAberto || !vendaEmAberto.id) {
            console.error('Nenhuma venda em aberto encontrada:', vendaEmAberto);
            Swal.fire('Erro!', 'Nenhuma venda em aberto encontrada. Tente novamente.', 'error');
            return;
        }

        const saleData = {
            id_venda: vendaEmAberto.id,
            id_forma_pagamento: dados.id_forma_pagamento,
            id_cliente: dados.id_cliente,
            pontos_fidelidade_utilizados: dados.pontos_fidelidade_utilizados,
            observacoes: dados.observacoes
        };

        console.log('Dados enviados para finalização:', saleData);

        try {
            const response = await axios.post('/sales/finalizar', saleData);
            
            if (response.data.success) {
                setIsFinalizarModalOpen(false);
                setVendaEmAberto(null);
                cartActions.removeCart(activeCart!.id);
                
                // Recarregar produtos após finalizar venda
                await reloadProducts();
                
                Swal.fire('Venda Finalizada!', response.data.message, 'success');
            } else {
                Swal.fire('Erro!', response.data.message || 'Não foi possível finalizar a venda.', 'error');
            }
        } catch (error: any) {
            console.error('Erro ao finalizar venda:', error);
            const errorMessage = error.response?.data?.message || 'Não foi possível finalizar a venda.';
            Swal.fire('Erro!', errorMessage, 'error');
        }
    };

    // Função para cancelar a venda
    const handleCancelarVenda = () => {
        if (!vendaEmAberto) return;

        Swal.fire({
            title: 'Cancelar Venda?',
            text: 'Esta ação não pode ser desfeita.',
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
                        motivo: 'Cancelada pelo usuário no PDV'
                    });

                    if (response.data.success) {
                        setIsFinalizarModalOpen(false);
                        setVendaEmAberto(null);
                        cartActions.removeCart(activeCart!.id);
                        
                        // Recarregar produtos após cancelar venda
                        await reloadProducts();
                        
                        Swal.fire('Cancelada!', response.data.message, 'success');
                    } else {
                        Swal.fire('Erro!', response.data.message || 'Não foi possível cancelar a venda.', 'error');
                    }
                } catch (error: any) {
                    console.error('Erro ao cancelar venda:', error);
                    const errorMessage = error.response?.data?.message || 'Não foi possível cancelar a venda.';
                    Swal.fire('Erro!', errorMessage, 'error');
                }
            }
        });
    };

    // Função para fechar o modal sem finalizar (mantém a venda em aberto)
    const handleCloseModal = () => {
        setIsFinalizarModalOpen(false);
        // NÃO limpa vendaEmAberto - mantém a venda em aberto para reutilização
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
            />
            
            <FinalizarVendaModal
                isOpen={isFinalizarModalOpen}
                onClose={handleCloseModal}
                onConfirm={handleFinalizarVenda}
                onCancel={handleCancelarVenda}
                valorTotal={vendaEmAberto?.valor_total || activeCart?.total || 0}
                numeroVenda={vendaEmAberto?.numero}
                clientes={clientes}
                formasPagamento={formasPagamento}
            />
        </>
    );
}

// Diz ao Inertia para usar o AuthenticatedLayout para esta página
PDV.layout = (page) => <AuthenticatedLayout children={page} currentView="pdv" />;

export default PDV;