import React from 'react';
import { Category } from '../../types';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
}) => {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onCategoryChange('all')}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          selectedCategory === 'all'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Todos
      </button>
      
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.name)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-1 ${
            selectedCategory === category.name
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span>{category.icon}</span>
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
