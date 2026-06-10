import { Link } from "@remix-run/react";
import {
  Smartphone,
  Shield,
  BatteryCharging,
  Cable,
  Headphones,
  Speaker,
  Battery,
  Anchor,
  ArrowRight,
} from "lucide-react";
import type { Categoria } from "~/types/api";

const ICONS = [
  Smartphone,
  Shield,
  BatteryCharging,
  Cable,
  Headphones,
  Speaker,
  Battery,
  Anchor,
];

export function DepartmentGrid({ categorias }: { categorias: Categoria[] }) {
  if (categorias.length === 0) return null;
  return (
    <section className="depts">
      <div className="fc-container">
        <div className="fc-section-head">
          <div>
            <span className="eye">Departamentos</span>
            <h2>Por onde você quer começar?</h2>
            <p className="lead">
              Escolha pelo tipo de acessório — todo o catálogo organizado pra você achar
              o que combina com o seu celular em segundos.
            </p>
          </div>
          <Link to="/loja" className="more">
            Ver catálogo completo
            <ArrowRight className="size-[14px]" />
          </Link>
        </div>

        <div className="dept-grid">
          {categorias.slice(0, 8).map((cat, i) => {
            const Icon = ICONS[i % ICONS.length];
            const tone = `d${(i % 4) + 1}`;
            return (
              <Link key={cat.id} className={`dept ${tone}`} to={`/loja/${cat.slug}`}>
                <div className="ic">
                  <Icon className="size-7" strokeWidth={2.2} />
                </div>
                <h4>{cat.nome}</h4>
                <p>{cat.descricao ?? "Acessórios selecionados pro seu celular."}</p>
                <div className="meta">
                  <span>Ver produtos</span>
                  <b>
                    Ver
                    <ArrowRight className="size-[12px]" />
                  </b>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
