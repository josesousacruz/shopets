import { formatBRL } from "~/lib/format";

interface Props {
  precoVenda: number;
  precoPromocional?: number | null;
  size?: "sm" | "md" | "lg";
}

export function Price({ precoVenda, precoPromocional, size = "md" }: Props) {
  const sizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-3xl",
  };
  const hasPromo = precoPromocional !== null && precoPromocional !== undefined;
  return (
    <div className="flex items-baseline gap-2">
      {hasPromo && (
        <span className="text-slate-400 text-sm line-through">{formatBRL(precoVenda)}</span>
      )}
      <span className={`font-display font-extrabold ${sizes[size]} text-ink`}>
        {formatBRL(hasPromo ? precoPromocional! : precoVenda)}
      </span>
    </div>
  );
}
