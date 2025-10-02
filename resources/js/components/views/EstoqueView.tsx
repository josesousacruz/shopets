import React, { useState } from 'react';
import { Search, Plus, Edit, Package, AlertTriangle, Tag, Trash2 } from 'lucide-react';
import { Product, Category, Supplier, StockEntry } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import ProductForm from '../forms/ProductForm';
import CategoryForm from '../forms/CategoryForm';

interface EstoqueViewProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onAddStock: (productId: string, stockEntry: Omit<StockEntry, 'id'>) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
}

const getUnitLabel = (unit: string): string => {
  const labels = {
    'kg': 'kg', 'g': 'g', 'L': 'L', 'ml': 'ml', 'peca': 'un.',
    'pacote': 'pct.', 'caixa': 'cx.', 'metro': 'm', 'cm': 'cm'
  };
  return labels[unit as keyof typeof labels] || unit;
};

const formatPrice = (price: number, unit: string): string => {
  // Exibir preço por unidade individual para melhor clareza
  return `R$ ${price.toFixed(2)}/${getUnitLabel(unit)}`;
};

const EstoqueView: React.FC<EstoqueViewProps> = ({ 
  products, 
  categories, 
  suppliers, 
  onAddProduct, 
  onUpdateProduct, 
  onAddStock,
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory,
  onAddSupplier 
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();

  const filteredProducts = products.filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || product.barcode?.includes(searchTerm);
    if (filterType === 'baixo') return matchesSearch && product.stock <= (product.minStock || 0) && product.stock > 0;
    if (filterType === 'zerado') return matchesSearch && product.stock === 0;
    if (filterType === 'fracionado') return matchesSearch && product.allowFractional;
    return matchesSearch;
  });

  const lowStockCount = products.filter(p => p.stock <= (p.minStock || 0) && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const fractionalCount = products.filter(p => p.allowFractional).length;

  const handleNewProduct = () => {
    setEditingProduct(undefined);
    setIsProductFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductFormOpen(true);
  };

  const handleSaveProduct = (productData: Omit<Product, 'id'>) => {
    if (editingProduct) {
      onUpdateProduct({ ...productData, id: editingProduct.id });
    } else {
      onAddProduct(productData);
    }
    setIsProductFormOpen(false);
  };

  const handleNewCategory = () => {
    setEditingCategory(undefined);
    setIsCategoryFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  };

  const handleSaveCategory = (categoryData: Omit<Category, 'id'>) => {
    if (editingCategory) {
      onUpdateCategory({ ...categoryData, id: editingCategory.id });
    } else {
      onAddCategory(categoryData);
    }
    setIsCategoryFormOpen(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      onDeleteCategory(categoryId);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Abas */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'products'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package size={20} />
            <span>Produtos</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'categories'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Tag size={20} />
            <span>Categorias</span>
          </button>
        </div>
      </div>

      {activeTab === 'products' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between"><p className="text-sm text-gray-600">Total de Produtos</p><p className="text-2xl font-bold text-gray-800">{products.length}</p><Package className="text-blue-500" size={32} /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between"><p className="text-sm text-gray-600">Fracionados</p><p className="text-2xl font-bold text-gray-800">{fractionalCount}</p><div className="text-green-500 text-2xl">⚖️</div></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between"><p className="text-sm text-gray-600">Estoque Baixo</p><p className="text-2xl font-bold text-gray-800">{lowStockCount}</p><AlertTriangle className="text-orange-500" size={32} /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between"><p className="text-sm text-gray-600">Sem Estoque</p><p className="text-2xl font-bold text-gray-800">{outOfStockCount}</p><Package className="text-red-500" size={32} /></div>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Buscar produto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="all">Todos</option>
              <option value="fracionado">Fracionados</option>
              <option value="baixo">Estoque Baixo</option>
              <option value="zerado">Sem Estoque</option>
            </select>
            <button onClick={handleNewProduct} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"><Plus size={20} /><span className="hidden sm:inline">Novo Produto</span></button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque Atual</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque Mínimo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <AnimatePresence>
                {filteredProducts.map((product) => {
                  const isLowStock = product.stock > 0 && product.stock <= (product.minStock || 0);
                  const isOutOfStock = product.stock === 0;
                  return (
                    <motion.tr 
                      key={product.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      className={`${isLowStock ? 'bg-orange-50' : ''} ${isOutOfStock ? 'bg-red-50 opacity-70' : ''} hover:bg-gray-100 transition-colors`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">#{product.barcode || 'S/N'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap"><span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{product.category}</span></td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatPrice(product.price, product.unit)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-sm font-bold rounded-full ${isOutOfStock ? 'bg-red-100 text-red-800' : isLowStock ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                          {product.stock} {getUnitLabel(product.unit)}
                        </span>
                      </td>
                       <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.minStock} {getUnitLabel(product.unit)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100">
                          <Edit size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <div className="text-center py-12"><div className="text-6xl mb-4">📦</div><p className="text-gray-500">Nenhum produto encontrado</p></div>
        )}
      </div>
        </>
      )}

      {activeTab === 'categories' && (
        <>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar categoria..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <button 
                onClick={handleNewCategory} 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Nova Categoria</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
              <AnimatePresence>
                {filteredCategories.map((category) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{category.icon}</span>
                        <h3 className="font-medium text-gray-800">{category.name}</h3>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {products.filter(p => p.category === category.name).length} produtos
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏷️</div>
                <p className="text-gray-500">Nenhuma categoria encontrada</p>
              </div>
            )}
          </div>
        </>
      )}

      <ProductForm isOpen={isProductFormOpen} onClose={() => setIsProductFormOpen(false)} onSave={handleSaveProduct} onAddStock={onAddStock} product={editingProduct} suppliers={suppliers} categories={categories} onSupplierAdded={onAddSupplier} />
      <CategoryForm isOpen={isCategoryFormOpen} onClose={() => setIsCategoryFormOpen(false)} onSave={handleSaveCategory} category={editingCategory} />
    </div>
  );
};

export default EstoqueView;
