import React, { useState, useEffect } from 'react';
import { X, Save, Tag } from 'lucide-react';
import { Category } from '../../types';
import { motion } from 'framer-motion';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Omit<Category, 'id'>) => void;
  category?: Category;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ isOpen, onClose, onSave, category }) => {
  const [formData, setFormData] = useState({
    name: '',
    icon: '📦'
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const commonIcons = [
    '📦', '🥗', '🎾', '🧴', '💊', '🦮', '🦴', '🐕', '🐱', '🐾',
    '🏠', '🚗', '🎯', '⚽', '🎪', '🎨', '📚', '💻', '🔧', '🍎'
  ];

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        icon: category.icon
      });
    } else {
      setFormData({
        name: '',
        icon: '📦'
      });
    }
    setErrors({});
  }, [category, isOpen]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da categoria é obrigatório';
    }

    if (!formData.icon.trim()) {
      newErrors.icon = 'Ícone é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
            <Tag className="text-blue-600" size={24} />
            <span>{category ? 'Editar Categoria' : 'Nova Categoria'}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Categoria *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: Ração, Brinquedos, Higiene..."
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ícone da Categoria *
            </label>
            <div className="grid grid-cols-10 gap-2 mb-3">
              {commonIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleInputChange('icon', icon)}
                  className={`p-2 text-xl border rounded-lg hover:bg-gray-50 transition-colors ${
                    formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => handleInputChange('icon', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.icon ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ou digite um emoji personalizado"
            />
            {errors.icon && (
              <p className="text-red-500 text-sm mt-1">{errors.icon}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Save size={20} />
              <span>{category ? 'Atualizar' : 'Salvar'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CategoryForm;