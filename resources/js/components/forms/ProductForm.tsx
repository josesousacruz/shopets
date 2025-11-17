import React, { useState, useEffect } from 'react';
import { X, Save, Barcode, Package, Plus, Upload } from 'lucide-react';
import { Product, UnitType, Supplier, StockEntry, Category } from '../../types';
import { motion } from 'framer-motion';
import { AddStockModal } from '../modals/AddStockModal';
import { StockHistory } from '../StockHistory';
import LatestStockEntries from '../LatestStockEntries';
// SupplierSelector removed - supplier management moved to stock addition flow

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'minStock'> & { minStock?: number }) => void;
  onAddStock?: (productId: string, stockEntry: Omit<StockEntry, 'id'>) => void;
  product?: Product;
  suppliers: Supplier[];
  categories: Category[];
  onSupplierAdded?: (supplier: Supplier) => void;
}

const unitOptions: { value: UnitType; label: string; fractional: boolean }[] = [
  // { value: 'kg', label: 'Quilograma (kg)', fractional: true },
  // { value: 'g', label: 'Grama (g)', fractional: true },
  // { value: 'L', label: 'Litro (L)', fractional: true },
  // { value: 'ml', label: 'Mililitro (ml)', fractional: true },
  // { value: 'metro', label: 'Metro (m)', fractional: true },
  // { value: 'cm', label: 'Centímetro (cm)', fractional: true },
  { value: 'un', label: 'Peça/Unidade', fractional: false },
  // { value: 'pacote', label: 'Pacote', fractional: false },
  // { value: 'caixa', label: 'Caixa', fractional: false },
];

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, onSave, onAddStock, product, suppliers, categories, onSupplierAdded }) => {
  // Supplier management removed - handled in stock addition flow
  const initialFormData = {
    name: '',
    category: categories.length > 0 ? categories[0].name : '',
    price: '',
    salePrice: '',
    purchasePrice: '',
    unit: 'un' as UnitType,
    stock: '',
    barcode: '',
    description: '',
    allowFractional: false,
    minQuantity: '1',
    stepQuantity: '1',
    minStock: '5',
    supplierId: '',
  };
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [showStockHistory, setShowStockHistory] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price.toString(),
        salePrice: product.salePrice?.toString() || '',
        purchasePrice: product.purchasePrice?.toString() || '',
        unit: product.unit,
        stock: product.stock.toString(),
        barcode: product.barcode || '',
        description: product.description || '',
        allowFractional: product.allowFractional,
        minQuantity: product.minQuantity?.toString() || '1',
        stepQuantity: product.stepQuantity?.toString() || '1',
        minStock: product.minStock?.toString() || '5',
        supplierId: product.supplierId || '',
      });
    } else {
      setFormData(initialFormData);
      setInvoiceFile(null);
    }
    // Clear errors when modal opens
    setErrors({});
  }, [product, isOpen]);


  const handleUnitChange = (unit: UnitType) => {
    const unitInfo = unitOptions.find(opt => opt.value === unit);
    setFormData(prev => ({
      ...prev,
      unit,
      allowFractional: unitInfo?.fractional || false,
      minQuantity: unitInfo?.fractional ? '0.1' : '1',
      stepQuantity: unitInfo?.fractional ? '0.1' : '1',
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Preço deve ser maior que zero';
    if (!formData.salePrice || parseFloat(formData.salePrice) <= 0) newErrors.salePrice = 'Preço de venda deve ser maior que zero';
    // if (formData.stock === '' || parseFloat(formData.stock) < 0) newErrors.stock = 'Estoque não pode ser negativo';
    if (!formData.minQuantity || parseFloat(formData.minQuantity) <= 0) newErrors.minQuantity = 'Quantidade mínima deve ser maior que zero';
    if (!formData.stepQuantity || parseFloat(formData.stepQuantity) <= 0) newErrors.stepQuantity = 'Incremento deve ser maior que zero';
    setErrors(newErrors);
    console.log(newErrors);
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Encontrar o ID da categoria selecionada
    const selectedCategory = categories.find(cat => cat.name === formData.category);
    
    const newProductData = {
      name: formData.name.trim(),
      categoryId: selectedCategory?.id,
      price: parseFloat(formData.price),
      unit: formData.unit,
      barcode: formData.barcode.trim() || undefined,
      description: formData.description.trim() || undefined,
      allowFraction: formData.allowFractional,
      minStock: parseFloat(formData.minStock),
      purchasePrice: parseFloat(formData.price),
      supplierId: formData.supplierId || undefined,
    };

    onSave(newProductData);
    onClose();
  };

  const generateBarcode = () => {
    const barcode = Math.floor(Math.random() * 9000000000000) + 1000000000000;
    setFormData(prev => ({ ...prev, barcode: barcode.toString() }));
  };

  const handleAddStock = (stockEntry: Omit<StockEntry, 'id'>) => {
    if (product && onAddStock) {
      onAddStock(product.id, stockEntry);
      // Atualizar o estoque atual no formulário
      const newStock = parseFloat(formData.stock) + stockEntry.quantity;
      setFormData(prev => ({ ...prev, stock: newStock.toString() }));
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
          </div>

          {/* Últimas Entradas de Estoque */}
          <LatestStockEntries product_id={product?.id || 0} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} placeholder="Ex: Ração Premium"/>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>)}
                </select>
              </div>
              {/* SupplierSelector removed - supplier management moved to stock addition flow */}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
              <div className="flex">
                <input type="text" value={formData.barcode} onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))} className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500" placeholder="13 dígitos"/>
                <button type="button" onClick={generateBarcode} className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200" title="Gerar código"><Barcode size={16} /></button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade de Medida *</label>
              <select value={formData.unit} onChange={(e) => handleUnitChange(e.target.value as UnitType)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                {unitOptions.map(option => <option key={option.value} value={option.value}>{option.label} {option.fractional ? '(Fracionado)' : '(Unidade)'}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                  <input type="number" step="0.01" min="0" value={formData.salePrice} onChange={(e) => setFormData(prev => ({ ...prev, salePrice: e.target.value, price: e.target.value }))} className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.salePrice ? 'border-red-500' : 'border-gray-300'}`} placeholder="0,00"/>
                </div>
                {errors.salePrice && <p className="text-red-500 text-xs mt-1">{errors.salePrice}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Estoque Atual</label>
                  {product && (
                    <button
                      type="button"
                      onClick={() => setIsAddStockModalOpen(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar Estoque
                    </button>
                  )}
                </div>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                  {product ? `${product.stock.toFixed(formData.allowFractional ? 1 : 0)} ${formData.unit}` : 'Produto não salvo'}
                </div>
                {product && product.stockHistory && product.stockHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowStockHistory(!showStockHistory)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Package className="w-3 h-3" />
                    {showStockHistory ? 'Ocultar' : 'Ver'} Histórico ({product.stockHistory.length} entradas)
                  </button>
                )}
              </div>
            </div>

            {formData.allowFractional && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-3">Venda Fracionada</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Qtd. Mínima *</label>
                    <input type="number" step="0.01" min="0.01" value={formData.minQuantity} onChange={(e) => setFormData(prev => ({ ...prev, minQuantity: e.target.value }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.minQuantity ? 'border-red-500' : 'border-gray-300'}`}/>
                    {errors.minQuantity && <p className="text-red-500 text-xs mt-1">{errors.minQuantity}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Incremento *</label>
                    <input type="number" step="0.01" min="0.01" value={formData.stepQuantity} onChange={(e) => setFormData(prev => ({ ...prev, stepQuantity: e.target.value }))} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.stepQuantity ? 'border-red-500' : 'border-gray-300'}`}/>
                    {errors.stepQuantity && <p className="text-red-500 text-xs mt-1">{errors.stepQuantity}</p>}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo (Alerta)</label>
              <input type="number" step={formData.allowFractional ? "0.1" : "1"} min="0" value={formData.minStock} onChange={(e) => setFormData(prev => ({ ...prev, minStock: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="5"/>
              <p className="text-xs text-gray-500 mt-1">Sistema alertará quando estoque atingir este valor.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Upload className="w-4 h-4 inline mr-1" />
                Nota Fiscal (opcional)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
                    if (allowedTypes.includes(file.type)) {
                      setInvoiceFile(file);
                    } else {
                      alert('Por favor, selecione um arquivo PDF ou imagem (JPG, PNG)');
                      e.target.value = '';
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {invoiceFile && (
                <p className="text-sm text-green-600 mt-1">
                  Arquivo selecionado: {invoiceFile.name}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceitos: PDF, JPG, PNG (máx. 10MB)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Descrição opcional..."/>
            </div>

            {/* Histórico de Estoque */}
            {product && showStockHistory && product.stockHistory && (
              <div className="border-t pt-4">
                <StockHistory stockHistory={product.stockHistory} suppliers={suppliers} />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"><Save size={16} /><span>{product ? 'Atualizar' : 'Salvar'}</span></button>
            </div>
          </form>
        </div>
      </motion.div>
      
      {/* Modal de Adicionar Estoque */}
      {product && (
        <AddStockModal
          isOpen={isAddStockModalOpen}
          onClose={() => setIsAddStockModalOpen(false)}
          onAddStock={handleAddStock}
          productId={product.id}
          productName={product.name}
          productUnit={product.unidade}
          currentStock={product.stock}
          suppliers={suppliers}
        />
      )}
    </motion.div>
  );
};

export default ProductForm;
