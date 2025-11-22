import React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type DateRange = { from?: Date; to?: Date };

type Preset = { label: string; dateRange: DateRange };

interface DateRangePickerProps {
  presets?: Preset[];
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ presets = [], value, onChange, className }) => {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>(value);

  React.useEffect(() => {
    setRange(value);
  }, [value?.from?.getTime?.(), value?.to?.getTime?.()]);

  const applyRange = (r: DateRange | undefined) => {
    setRange(r);
    onChange?.(r);
    setOpen(false);
  };

  const label = range?.from && range?.to ? `${format(range.from, 'dd/MM/yyyy')} – ${format(range.to, 'dd/MM/yyyy')}` : 'Selecionar intervalo';

  return (
    <div className={`relative ${className || ''}`}>
      <button type="button" className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white shadow-sm text-sm text-gray-700" onClick={() => setOpen(!open)}>
        <span>{label}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 z-50 bg-white border rounded-lg shadow-xl p-3 w-[320px]">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={(r) => setRange(r || undefined)}
            locale={ptBR}
            fromYear={2020}
            toYear={2030}
            showOutsideDays
          />
          {presets.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <button key={p.label} type="button" className="text-xs px-2 py-1 border rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700" onClick={() => applyRange(p.dateRange)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="text-xs px-2 py-1 border rounded-md" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="button" className="text-xs px-2 py-1 border rounded-md bg-blue-600 text-white" onClick={() => applyRange(range)}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
};