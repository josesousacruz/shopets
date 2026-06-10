import { cn } from "~/lib/format";

interface Props {
  novo?: boolean;
  emPromocao?: boolean;
  destaque?: boolean;
  className?: string;
}

const BADGE = "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider";

export function Badges({ novo, emPromocao, destaque, className }: Props) {
  if (!novo && !emPromocao && !destaque) return null;
  return (
    <div className={cn("flex gap-1 flex-wrap", className)}>
      {emPromocao && <span className={`${BADGE} bg-brand-accent text-ink`}>Promoção</span>}
      {novo && <span className={`${BADGE} bg-brand-primary text-white`}>Novo</span>}
      {destaque && !novo && !emPromocao && (
        <span className={`${BADGE} bg-slate-200 text-slate-700`}>Destaque</span>
      )}
    </div>
  );
}
