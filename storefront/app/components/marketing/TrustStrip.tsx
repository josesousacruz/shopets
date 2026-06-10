import { Truck, Percent, RefreshCw, ShieldCheck } from "lucide-react";

const PERKS = [
  { Icon: Truck, title: "Frete grátis", text: "Em compras acima de R$199" },
  { Icon: Percent, title: "Pix 5% OFF", text: "Desconto à vista no Pix" },
  { Icon: RefreshCw, title: "Troca em 7 dias", text: "Sem complicação" },
  { Icon: ShieldCheck, title: "Compra segura", text: "Site 100% protegido" },
];

export function TrustStrip() {
  return (
    <div className="perks-band">
      {PERKS.map(({ Icon, title, text }) => (
        <div className="perk" key={title}>
          <div className="ic">
            <Icon className="size-[22px]" strokeWidth={2.2} />
          </div>
          <div>
            <b>{title}</b>
            <span>{text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
