import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import { Supplier, Customer } from '../../types';

interface LancamentoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: any, type: 'payable' | 'receivable') => void;
  type: 'payable' | 'receivable';
  suppliers: Supplier[];
  customers: Customer[];
}

const LancamentoForm: React.FC<LancamentoFormProps> = ({ isOpen, onClose, onSave, type, suppliers, customers }) => {
  const [descricao, setDescricao] = useState('');
  const [valor_original, setValorOriginal] = useState('');
  const [data_vencimento, setDataVencimento] = useState('');
  const [linkId, setLinkId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDescricao('');
      setValorOriginal('');
      setDataVencimento('');
      setLinkId('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !valor_original || !data_vencimento) {
      Swal.fire({
        title: 'Campos Obrigatórios',
        text: 'Preencha todos os campos obrigatórios.',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }
    
    const entryData = {
      descricao,
      valor_original: parseFloat(valor_original),
      data_vencimento: new Date(data_vencimento),
      total_parcelas: 1,
      id_pdv: 1,
      ...(type === 'payable' ? { supplierId: linkId } : { customerId: linkId }),
    };
    
    onSave(entryData, type);
    onClose();
  };

  if (!isOpen) return null;

  const isPayable = type === 'payable';
  const title = isPayable ? 'Nova Conta a Pagar' : 'Nova Conta a Receber';
  const linkLabel = isPayable ? 'Fornecedor' : 'Cliente';
  const linkOptions = isPayable ? suppliers : customers;

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
        className="bg-white rounded-xl shadow-xl w-full max-w-lg"
      >
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input type="number" value={valor_original} onChange={e => setValorOriginal(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento *</label>
              <input type="date" value={data_vencimento} onChange={e => setDataVencimento(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{linkLabel} (Opcional)</label>
            <select value={linkId} onChange={e => setLinkId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Nenhum</option>
              {linkOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"><Save size={16} /><span>Salvar</span></button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default LancamentoForm;
