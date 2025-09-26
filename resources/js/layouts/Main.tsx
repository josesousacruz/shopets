import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import Header from '../components/Header';
import PDVView from '../components/views/PDVView';
import EstoqueView from '../components/views/EstoqueView';
import RelatoriosView from '../components/views/RelatoriosView';
import FornecedoresView from '../components/views/FornecedoresView';
import ClientesView from '../components/views/ClientesView';
import FinanceiroView from '../components/views/FinanceiroView';
import OperatorLogin from '../components/auth/OperatorLogin';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import { useMultiCart } from '../hooks/useMultiCart';
import { useOperator } from '../hooks/useOperator';
import { useCustomers } from '../hooks/useCustomers';
import { useProducts } from '../hooks/useProducts';
import { generateMockSales, mockSuppliers, mockAccountsPayable, mockAccountsReceivable, categories, mockLoyaltyProgram, mockLoyaltyTransactions } from '../data/mockData';
import { Product, Sale, Supplier, Customer, AccountPayable, AccountReceivable, Category, StockEntry } from '../types';

function Main() {
  const { currentOperator, isLoggedIn, isLoading, login, logout } = useOperator();
  const [currentView, setCurrentView] = useState<'pdv' | 'estoque' | 'relatorios' | 'fornecedores' | 'clientes' | 'financeiro'>('pdv');
  
  // Hook para gerenciar produtos
  const {
    products,
    isLoading: productsLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    fetchProducts
  } = useProducts();
  const [categoriesState, setCategoriesState] = useState<Category[]>(categories);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [accountsPayable, setAccountsPayable] = useState<AccountPayable[]>(mockAccountsPayable);
  const [accountsReceivable, setAccountsReceivable] = useState<AccountReceivable[]>(mockAccountsReceivable);
  
  // Hook para gerenciar clientes
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    toggleCustomerStatus,
    addLoyaltyPoints,
    redeemLoyaltyPoints,
    updateCustomerSpent,
    getCustomerTransactions,
    customerStats
  } = useCustomers();
  
  // Carregar produtos na inicialização
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  
  const mockSales = useMemo(() => generateMockSales(products), [products]);
  const [sales, setSales] = useState<Sale[]>(mockSales);
  
  const {
    carts,
    activeCart,
    addCart,
    removeCart,
    renameCart,
    setActiveCart,
    addItemToActiveCart,
    updateActiveCartItemQuantity,
    removeActiveCartItem,
  } = useMultiCart();

  const handleCheckout = (paymentMethod: 'dinheiro' | 'cartao' | 'pix') => {
    if (!activeCart || activeCart.items.length === 0) return;

    const newSale: Sale = {
      id: Date.now().toString(),
      items: [...activeCart.items],
      total: activeCart.total,
      date: new Date(),
      paymentMethod,
    };

    setSales(prev => [newSale, ...prev]);
    removeCart(activeCart.id);
    
    Swal.fire({
      title: 'Venda Finalizada!',
      html: `<strong>Total:</strong> R$ ${activeCart.total.toFixed(2)}<br><strong>Pagamento:</strong> ${paymentMethod.toUpperCase()}`,
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#10b981'
    });
  };

  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      await addProduct(productData);
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      const { id, ...updates } = updatedProduct;
      await updateProduct(id, updates);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
    }
  };

  const handleAddStock = async (productId: string, stockEntry: Omit<StockEntry, 'id'>) => {
    const newStockEntry: StockEntry = {
      ...stockEntry,
      id: `stock-${Date.now()}`,
    };

    const product = products.find(p => p.id === productId);
    
    if (!product) return;

    try {
      // Atualizar o produto com o novo estoque
      await updateProduct(productId, {
        stock: product.stock + stockEntry.quantity,
        stockHistory: [...(product.stockHistory || []), newStockEntry]
      });

      // Adicionar ao histórico de compras do fornecedor
      if (stockEntry.supplierId && product) {
        const purchaseHistoryEntry = {
          id: `purchase-${Date.now()}`,
          productId: productId,
          productName: product.name,
          quantity: stockEntry.quantity,
          unitPrice: stockEntry.purchasePrice,
          totalAmount: stockEntry.quantity * stockEntry.purchasePrice,
          date: new Date(),
          notes: stockEntry.notes
        };

        setSuppliers(prev => 
          prev.map(supplier => {
            if (supplier.id === stockEntry.supplierId) {
              return {
                ...supplier,
                purchaseHistory: [...(supplier.purchaseHistory || []), purchaseHistoryEntry]
              };
            }
            return supplier;
          })
        );
      }

      Swal.fire({
        title: 'Estoque Adicionado!',
        text: `${stockEntry.quantity} unidades adicionadas ao produto "${product?.name}"`,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#10b981'
      });
    } catch (error) {
      console.error('Erro ao adicionar estoque:', error);
      Swal.fire({
        title: 'Erro!',
        text: 'Não foi possível adicionar o estoque.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  const handleAddCategory = (categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: `cat-${Date.now()}`,
    };
    setCategoriesState(prev => [newCategory, ...prev]);
    Swal.fire({
      title: 'Categoria Cadastrada!',
      text: `Categoria "${categoryData.name}" cadastrada com sucesso!`,
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#10b981'
    });
  };

  const handleUpdateCategory = (updatedCategory: Category) => {
    setCategoriesState(prev => 
      prev.map(category => 
        category.id === updatedCategory.id ? updatedCategory : category
      )
    );
    // TODO: Implementar atualização de categoria no backend
    // Os produtos serão atualizados automaticamente quando recarregados
    Swal.fire({
      title: 'Categoria Atualizada!',
      text: `Categoria "${updatedCategory.name}" atualizada com sucesso!`,
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#10b981'
    });
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categoriesState.find(c => c.id === categoryId);
    if (!category) return;

    const productsUsingCategory = products.filter(p => p.category === category.name);
    
    if (productsUsingCategory.length > 0) {
      Swal.fire({
        title: 'Não é possível excluir!',
        text: `Esta categoria possui ${productsUsingCategory.length} produto(s) associado(s). Remova ou altere a categoria dos produtos primeiro.`,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Excluir Categoria',
      text: `Tem certeza que deseja excluir a categoria "${category.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      setCategoriesState(prev => prev.filter(c => c.id !== categoryId));
      Swal.fire({
        title: 'Categoria Excluída!',
        text: `Categoria "${category.name}" excluída com sucesso!`,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#10b981'
      });
    }
  };

  const handleAddSupplier = (supplierData: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
    };
    setSuppliers(prev => [newSupplier, ...prev]);
    Swal.fire({
      title: 'Fornecedor Cadastrado!',
      text: `Fornecedor "${supplierData.name}" cadastrado com sucesso!`,
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#10b981'
    });
  };

  const handleUpdateSupplier = (updatedSupplier: Supplier) => {
    setSuppliers(prev =>
      prev.map(supplier =>
        supplier.id === updatedSupplier.id ? updatedSupplier : supplier
      )
    );
    Swal.fire({
      title: 'Fornecedor Atualizado!',
      text: `Fornecedor "${updatedSupplier.name}" atualizado com sucesso!`,
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#10b981'
    });
  };

  const handleAddCustomer = (customerData: Omit<Customer, 'id' | 'loyaltyPoints' | 'loyaltyLevel' | 'totalSpent' | 'createdAt'>) => {
    const newCustomer = addCustomer(customerData);
    Swal.fire({
      title: 'Cliente Cadastrado!',
      text: `Cliente "${customerData.name}" cadastrado com sucesso!`,
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#10b981'
    });
  };

  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    updateCustomer(updatedCustomer.id, updatedCustomer);
    Swal.fire({
      title: 'Cliente Atualizado!',
      text: `Cliente "${updatedCustomer.name}" atualizado com sucesso!`,
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#10b981'
    });
  };

  const handleAddFinancialEntry = (entry: Omit<AccountPayable, 'id' | 'status'> | Omit<AccountReceivable, 'id' | 'status'>, type: 'payable' | 'receivable') => {
    const newEntry = {
      ...entry,
      id: `fin-${type}-${Date.now()}`,
      status: 'pending' as const,
    };
    if (type === 'payable') {
      setAccountsPayable(prev => [newEntry as AccountPayable, ...prev]);
    } else {
      setAccountsReceivable(prev => [newEntry as AccountReceivable, ...prev]);
    }
    Swal.fire({
      title: 'Lançamento Adicionado!',
      text: `Lançamento de ${type === 'payable' ? 'conta a pagar' : 'conta a receber'} adicionado com sucesso!`,
      icon: 'success',
      confirmButtonText: 'OK',
      confirmButtonColor: '#10b981'
    });
  };

  const handleUpdateFinancialStatus = (id: string, type: 'payable' | 'receivable') => {
    const update = (setter: React.Dispatch<React.SetStateAction<any[]>>) => {
      setter(prev => prev.map(entry => 
        entry.id === id ? { ...entry, status: 'paid' as const, paidDate: new Date() } : entry
      ));
    };
    if (type === 'payable') {
      update(setAccountsPayable);
    } else {
      update(setAccountsReceivable);
    }
  };

  const handleAddAccountReceivable = (accountReceivableData: Omit<AccountReceivable, 'id'>) => {
    const newAccountReceivable: AccountReceivable = {
      ...accountReceivableData,
      id: `acc-rec-${Date.now()}`,
    };
    setAccountsReceivable(prev => [newAccountReceivable, ...prev]);
    
    Swal.fire({
      title: 'Conta a Receber Adicionada!',
      text: `Conta de R$ ${accountReceivableData.amount.toFixed(2)} adicionada com sucesso!`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };


  const renderCurrentView = () => {
    switch (currentView) {
      case 'pdv':
        return (
          <PDVView
            products={products}
            carts={carts}
            activeCart={activeCart}
            onAddCart={addCart}
            onRemoveCart={removeCart}
            onRenameCart={renameCart}
            onSelectCart={setActiveCart}
            onAddToCart={addItemToActiveCart}
            onUpdateQuantity={updateActiveCartItemQuantity}
            onRemoveItem={removeActiveCartItem}
            onCheckout={handleCheckout}
          />
        );
      case 'estoque':
        return (
          <EstoqueView 
            products={products} 
            categories={categoriesState}
            suppliers={suppliers}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onAddStock={handleAddStock}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddSupplier={handleAddSupplier}
          />
        );
      case 'relatorios':
        return <RelatoriosView sales={sales} products={products} />;
      case 'fornecedores':
        return (
          <FornecedoresView
            suppliers={suppliers}
            products={products}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
          />
        );
      case 'clientes':
        return (
          <ClientesView
            customers={customers}
            loyaltyProgram={mockLoyaltyProgram}
            loyaltyTransactions={mockLoyaltyTransactions}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onAddLoyaltyTransaction={addLoyaltyPoints}
            onAddAccountReceivable={handleAddAccountReceivable}
            accountsReceivable={accountsReceivable}
          />
        );
      case 'financeiro':
        return (
          <FinanceiroView
            accountsPayable={accountsPayable}
            accountsReceivable={accountsReceivable}
            suppliers={suppliers}
            customers={customers}
            sales={sales}
            onAddEntry={handleAddFinancialEntry}
            onUpdateStatus={handleUpdateFinancialStatus}
          />
        );
      default:
        return null;
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Sair do Sistema',
      text: 'Tem certeza que deseja sair?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, sair',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });
    
    if (result.isConfirmed) {
      logout();
    }
  };

  // Mostrar loading enquanto verifica sessão
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Mostrar tela de login se não estiver logado
  if (!isLoggedIn) {
    return <OperatorLogin onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        cartItemCount={activeCart?.itemCount || 0}
        currentOperator={currentOperator}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderCurrentView()}
        </motion.div>
      </main>
      <PWAInstallPrompt />
    </div>
  );
}

export default Main;
