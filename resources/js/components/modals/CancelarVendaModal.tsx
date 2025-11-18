import React, { useState, useEffect } from 'react';

interface CancelarVendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  isFinalizada?: boolean;
}

const CancelarVendaModal: React.FC<CancelarVendaModalProps> = ({ isOpen, onClose, onConfirm, isFinalizada }) => {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (isOpen) setMotivo('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Cancelar Venda</h2>
          <p className="text-sm text-gray-500">Informe o motivo do cancelamento.</p>
          {isFinalizada && (
            <span className="mt-2 inline-block text-red-600 font-bold">Atenção: cancelando uma venda já finalizada.</span>
          )}
        </div>
        <div className="p-6 space-y-4">
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows={4}
            placeholder="Motivo do cancelamento..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => onConfirm(motivo)}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Confirmar Cancelamento
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelarVendaModal;