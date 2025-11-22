import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ColumnDef, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable, flexRender } from '@tanstack/react-table';

interface RelatorioTabelaProps<T> {
  title: string;
  data: T[];
  columns: ColumnDef<T, any>[];
  searchPlaceholder?: string;
  className?: string;
  pageSize?: number;
}

export default function RelatorioTabela<T>({ title, data, columns, searchPlaceholder, className, pageSize = 10 }: RelatorioTabelaProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useMemo(() => {
    table.setPageSize(pageSize);
  }, [pageSize]);

  return (
    <div className={className || 'bg-white rounded-xl shadow-md p-6'}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            placeholder={searchPlaceholder || 'Buscar'}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b">
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    className={`px-3 py-2 text-left text-gray-600 font-medium ${h.column.columnDef.meta?.headerClassName || ''}`}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={table.getAllColumns().length} className="px-3 py-4 text-gray-500 text-center">Nenhum registro encontrado neste período.</td>
              </tr>
            )}
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={`px-3 py-2 text-gray-800 ${cell.column.columnDef.meta?.cellClassName || ''}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded-md" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</button>
          <button className="px-2 py-1 border rounded-md" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Próxima</button>
          <span className="text-xs text-gray-500 ml-2">Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Tamanho:</span>
          <select className="border rounded-md text-sm px-2 py-1" value={table.getState().pagination.pageSize} onChange={(e) => table.setPageSize(Number(e.target.value))}>
            {[5, 10, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}