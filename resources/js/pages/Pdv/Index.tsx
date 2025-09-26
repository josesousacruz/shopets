// resources/js/Pages/PDV.tsx

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import PDVView from '@/components/views/PDVView'; // Seu componente de view existente
import { useMultiCart } from '@/hooks/useMultiCart'; // O hook do carrinho pode continuar no frontend
import { Product, Category } from '@/types';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';

// A página recebe os dados (produtos e categorias) como props do controller do Laravel
export default function PDV({ products, categories }: { products: Product[], categories: Category[] }) {
    
    // O estado do carrinho é local do frontend, então o hook continua útil!
    const { carts, activeCart, ...cartActions } = useMultiCart();

    // A lógica de checkout agora envia os dados para o backend
    const handleCheckout = (paymentMethod: string) => {
        if (!activeCart || activeCart.items.length === 0) return;

        const saleData = {
            items: activeCart.items,
            total: activeCart.total,
            paymentMethod: paymentMethod,
        };

        // Envia os dados da venda para o controller do Laravel
        router.post('/sales', saleData, {
            onSuccess: () => {
                cartActions.removeCart(activeCart.id);
                Swal.fire('Venda Finalizada!', `Total: R$ ${activeCart.total.toFixed(2)}`, 'success');
            },
            onError: (errors) => {
                Swal.fire('Erro!', 'Não foi possível completar a venda.', 'error');
            }
        });
    };

    return (
        <PDVView
            products={products}
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
        />
    );
}

// Diz ao Inertia para usar o AuthenticatedLayout para esta página
PDV.layout = (page) => <AuthenticatedLayout children={page} currentView="pdv" />;