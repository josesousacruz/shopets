import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

interface RelatorioTabelaProps<T> {
  title: string;
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  searchPlaceholder?: string;
  className?: string;
  ignoreAccents?: boolean;
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeValue(value: unknown, ignoreAccents: boolean): string {
  if (typeof value === 'string') {
    const base = value.toLowerCase();
    return ignoreAccents ? stripAccents(base) : base;
  }
  if (typeof value === 'number') return String(value).toLowerCase();
  return '';
}

export default function RelatorioTabela<T>({ title, items, renderRow, searchPlaceholder, className, ignoreAccents = true }: RelatorioTabelaProps<T>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let q = query.trim().toLowerCase();
    if (ignoreAccents) q = stripAccents(q);
    if (!q) return items;
    return items.filter((item: any) => {
      if (item && typeof item === 'object') {
        const values = Object.values(item);
        return values.some(v => normalizeValue(v, ignoreAccents).includes(q));
      }
      return normalizeValue(item, ignoreAccents).includes(q);
    });
  }, [items, query]);

  return (
    <div className={className || 'bg-white rounded-xl shadow-md p-6'}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            placeholder={searchPlaceholder || 'Buscar'}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map((item, index) => (
          <React.Fragment key={index}>{renderRow(item, index)}</React.Fragment>
        ))}
      </div>
    </div>
  );
}