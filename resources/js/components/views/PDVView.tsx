import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import ProductCard from '../product/ProductCard';
import CategoryFilter from '../ui/CategoryFilter';
import Cart from '../cart/Cart';
import CartTabs from '../cart/CartTabs';
import CartFAB from '../cart/CartFAB';
import CartModal from '../cart/CartModal';
import QuantityPromptModal from '../modals/QuantityPromptModal';
import { Product, Cart as CartType, Category } from '../../types';

interface PDVViewProps {
  products: Product[];
  categories?: Category[];
  carts: CartType[];
  activeCart: CartType | null;
  onAddCart: () => void;
  onRemoveCart: (cartId: string) => void;
  onRenameCart: (cartId: string, newName: string) => void;
  onSelectCart: (cartId: string) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: (paymentMethod: 'dinheiro' | 'cartao' | 'pix') => void;
}

const PDVView: React.FC<PDVViewProps> = ({
  products,
  categories = [],
  carts,
  activeCart,
  onAddCart,
  onRemoveCart,
  onRenameCart,
  onSelectCart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isQuantityPromptOpen, setIsQuantityPromptOpen] = useState(false);
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.barcode?.includes(searchTerm) ||
                           product.internalCode?.includes(searchTerm);
      
      // Find category by name to get its ID
      const selectedCategoryObj = categories.find(cat => cat.name === selectedCategory);
      const matchesCategory = selectedCategory === 'all' || 
                             product.categoryId === selectedCategoryObj?.id ||
                             product.category === selectedCategory; // fallback for old data
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory, categories]);

  const handleProductCardClick = (product: Product) => {
    setSelectedProductForQuantity(product);
    setIsQuantityPromptOpen(true);
  };

  const handleConfirmQuantity = (product: Product, quantity: number) => {
    onAddToCart(product, quantity);
    setIsQuantityPromptOpen(false);
    setSelectedProductForQuantity(null);
  };

  const cartProps = {
    cart: activeCart,
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    onRenameCart,
  };

  return (
    <div className="space-y-4">
      <CartTabs
        carts={carts}
        activeCartId={activeCart?.id || null}
        onSelectCart={onSelectCart}
        onAddCart={onAddCart}
        onRemoveCart={onRemoveCart}
        onActiveTabClick={() => setIsCartOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
        {/* Product List */}
        <div className="md:col-span-2 lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar produto ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-20 md:pb-4">
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleProductCardClick}
                  showStock={true}
                />
              ))}
            </AnimatePresence>
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-6xl mb-4" role="img" aria-label="Lupa">🔍</p>
              <h3 className="text-xl font-semibold text-gray-700">Nenhum produto encontrado</h3>
              <p className="text-gray-500 mt-2">Tente ajustar sua busca ou filtros.</p>
            </div>
          )}
        </div>

        {/* Desktop Cart */}
        <div className="hidden md:block md:col-span-1 lg:col-span-1">
          <div className="sticky top-24">
             <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-full max-h-[calc(100vh-120px)]">
                <Cart {...cartProps} />
             </div>
          </div>
        </div>
      </div>

      {/* Mobile Cart FAB */}
      <AnimatePresence>
        {activeCart && activeCart.itemCount > 0 && !isCartOpen && (
          <CartFAB
            itemCount={activeCart.itemCount}
            total={activeCart.total}
            onClick={() => setIsCartOpen(true)}
          />
        )}
      </AnimatePresence>
      
      {/* Mobile Cart Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        {...cartProps}
      />

      {/* Quantity Prompt Modal */}
      <QuantityPromptModal
        isOpen={isQuantityPromptOpen}
        onClose={() => setIsQuantityPromptOpen(false)}
        product={selectedProductForQuantity}
        onConfirm={handleConfirmQuantity}
      />
    </div>
  );
};

export default PDVView;
