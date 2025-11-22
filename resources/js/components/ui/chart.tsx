import React from 'react';
import { Tooltip as RechartsTooltip, TooltipProps } from 'recharts';

export type ChartConfig = Record<string, { label: string; color: string }>;

export function ChartContainer({ children, config }: { children: React.ReactNode; config?: ChartConfig }) {
  return (
    <div style={Object.fromEntries(Object.entries(config || {}).map(([k, v]) => [`--color-${k}`, v.color]))}>
      {children}
    </div>
  );
}

export function ChartTooltip({ content, ...rest }: Omit<React.ComponentProps<typeof RechartsTooltip>, 'content'> & { content?: React.ReactNode }) {
  return <RechartsTooltip {...rest} content={content as TooltipProps['content']} />;
}

export function ChartTooltipContent(props: TooltipProps<any, any> & { indicator?: 'line'; hideLabel?: boolean }) {
  const { active, payload, label, indicator, hideLabel } = props as any;
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-md border bg-white px-3 py-2 text-sm shadow-md">
      {!hideLabel && <div className="mb-1 text-gray-700">{String(label)}</div>}
      <div className="flex items-center gap-2">
        {indicator === 'line' && <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color as string }} />}
        <span className="font-semibold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(p.value || 0))}</span>
      </div>
    </div>
  );
}