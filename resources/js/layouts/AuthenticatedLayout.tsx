import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import Header from '@/components/Header'; // O @ é um atalho para /resources/js
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { usePage, router } from '@inertiajs/react';
import { PageProps, Operator } from '@/types'; // Seus tipos podem estar aqui

interface Props {
    children: ReactNode;
    // Você pode passar o nome da view atual se precisar
    currentView: 'pdv' | 'estoque' | 'relatorios' | 'fornecedores' | 'clientes' | 'financeiro' | 'loja';
}

export default function AuthenticatedLayout({ children, currentView }: Props) {
    // No Inertia, dados compartilhados como o usuário logado vêm via `usePage`
    const { auth } = usePage<PageProps>().props;
    const currentOperator = auth.user as Operator;

    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Tem certeza?',
            text: 'Você será desconectado do sistema.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, sair!',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            router.post('/logout'); 
        }
    };
    
    const handleViewChange = (view: string) => {
        // Navega para a rota correspondente preservando estado/scroll para transições mais rápidas
        const routes: { [key: string]: string } = {
            'pdv': '/pdv',
            'estoque': '/estoque',
            'relatorios': '/relatorios',
            'fornecedores': '/fornecedores',
            'clientes': '/clientes',
            'financeiro': '/financeiro',
            'loja': '/admin/loja/pedidos'
        };
        router.get(routes[view] || '/pdv', {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                currentView={currentView}
                onViewChange={handleViewChange}
                // cartItemCount={...} // O estado do carrinho pode ser local ou global (Context/Zustand)
                currentOperator={currentOperator}
                onLogout={handleLogout}
            />
            
            <main className="container mx-auto px-4 py-6 max-w-7xl">
                <motion.div
                    key={currentView}
                    initial={{ opacity: 0.6, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    {children} {/* As páginas serão inseridas aqui */}
                </motion.div>
            </main>
            <PWAInstallPrompt />
        </div>
    );
}
