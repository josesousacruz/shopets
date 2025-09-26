import React, { useState } from 'react';
import { X, Package, DollarSign, User, Calendar, FileText, Upload } from 'lucide-react';
import { StockEntry, Supplier } from '../../types';
import SupplierSelector from '../common/SupplierSelector';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStock: (stockEntry: Omit<StockEntry, 'id'>) => void;
  productId: string;
  productName: string;
  productUnit?: string;
  suppliers: Supplier[];
  onSupplierAdded?: (supplier: Supplier) => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  onAddStock,
  productId,
  productName,
  productUnit,
  suppliers,
  onSupplierAdded
}) => {
  // Filter suppliers to show only those associated with this product
  const associatedSuppliers = React.useMemo(() => {
    const filtered = (suppliers || []).filter(supplier => 
      supplier.productIds && supplier.productIds.includes(productId.toString())
    );
    
    // Always add "Not Informed" option at the beginning
    const notInformedOption = {
      id: 'not-informed',
      name: 'Não Informar',
      phone: '',
      email: '',
      productIds: []
    };
    
    return [notInformedOption, ...filtered];
  }, [suppliers, productId]);

  const [formData, setFormData] = useState({
    quantity: '',
    purchasePrice: '',
    supplierId: '',
    notes: ''
  });

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Supplier addition removed - suppliers must be associated via Suppliers management screen

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantidade deve ser maior que zero';
    }
    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
      newErrors.purchasePrice = 'Preço de compra deve ser maior que zero';
    }
    if (!formData.supplierId) {
      newErrors.supplierId = 'Fornecedor é obrigatório';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const stockEntry: Omit<StockEntry, 'id'> = {
      productId,
      quantity: parseFloat(formData.quantity),
      purchasePrice: parseFloat(formData.purchasePrice),
      supplierId: formData.supplierId,
      date: new Date(),
      notes: formData.notes || undefined,
      invoiceFile: invoiceFile || undefined
    };

    onAddStock(stockEntry);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      quantity: '',
      purchasePrice: '',
      supplierId: '',
      notes: ''
    });
    setInvoiceFile(null);
    setErrors({});
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar se é um arquivo PDF ou imagem
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (allowedTypes.includes(file.type)) {
        setInvoiceFile(file);
      } else {
        alert('Por favor, selecione um arquivo PDF ou imagem (JPG, PNG)');
        e.target.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Adicionar Estoque
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Produto:</p>
          <p className="font-medium text-gray-800">{productName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Package className="w-4 h-4 inline mr-1" />
              Quantidade{productUnit && ` (${productUnit})`}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={`Ex: 10${productUnit ? ` ${productUnit}` : ''}`}
            />
            {errors.quantity && (
              <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Preço de Compra (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.purchasePrice ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: 5.50"
            />
            {errors.purchasePrice && (
              <p className="text-red-500 text-sm mt-1">{errors.purchasePrice}</p>
            )}
          </div>

          <SupplierSelector
            suppliers={associatedSuppliers}
            selectedSupplierId={formData.supplierId}
            onSupplierSelect={(supplierId) => setFormData({ ...formData, supplierId })}
            error={errors.supplierId}
            required={true}
            showSupplierDetails={true}
            placeholder="Selecione o fornecedor para esta entrada de estoque"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Observações (opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Observações sobre esta entrada de estoque..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Upload className="w-4 h-4 inline mr-1" />
              Nota Fiscal (opcional)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
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

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              Adicionar Estoque
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};