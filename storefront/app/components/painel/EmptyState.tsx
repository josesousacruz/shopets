import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  cta?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, cta }: Props) {
  return (
    <div className="pn-empty">
      <div className="ill">
        <Icon size={26} />
      </div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {cta ? <div style={{ marginTop: 6 }}>{cta}</div> : null}
    </div>
  );
}
