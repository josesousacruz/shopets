import React, { useState } from 'react';

interface CartDescontoProps {
  onApply: (value: number, type: 'fixed' | 'percent') => void;
}

export default function CartDesconto({ onApply }: CartDescontoProps) {
  const [value, setValue] = useState<string>('');
  const [type, setType] = useState<'fixed' | 'percent'>('fixed');

  const applyIfValid = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onApply(num, type);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={applyIfValid}
        placeholder={type === 'fixed' ? 'R$' : '%'}
        className="w-24 px-2 py-1 border rounded"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as 'fixed' | 'percent')}
        onBlur={applyIfValid}
        className="px-2 py-1 border rounded"
      >
        <option value="fixed">R$</option>
        <option value="percent">%</option>
      </select>
    </div>
  );
}
