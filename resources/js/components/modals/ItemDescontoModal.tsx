import React, { useState } from 'react';

interface ItemDescontoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: number, type: 'fixed' | 'percent') => void;
  itemName?: string;
}

const ItemDescontoModal: React.FC<ItemDescontoModalProps> = ({ isOpen, onClose, onApply, itemName }) => {
  const [value, setValue] = useState<string>('');
  const [type, setType] = useState<'fixed' | 'percent'>('fixed');
  if (!isOpen) return null;
  const confirm = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onApply(num, type);
      onClose();
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Aplicar Desconto</h2>
          {itemName && <p className="text-sm text-gray-500">Item: {itemName}</p>}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'fixed' ? 'R$' : '%'}
              className="w-24 px-2 py-1 border rounded"
              min={0}
              step={type === 'percent' ? 0.1 : 0.01}
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'fixed' | 'percent')}
              className="px-2 py-1 border rounded"
            >
              <option value="fixed">R$</option>
              <option value="percent">%</option>
            </select>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button onClick={confirm} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Confirmar</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">Voltar</button>
        </div>
      </div>
    </div>
  );
};

export default ItemDescontoModal;