import type { ErpModule } from "../lib/modules";

type ModuleCardProps = {
  module: ErpModule;
  order: number;
};

export function ModuleCard({ module, order }: ModuleCardProps) {
  return (
    <article className="module-card" id={module.id}>
      <div className="module-card-header">
        <span className="module-number">MÓDULO {String(order).padStart(2, "0")}</span>
        <span className="module-status">{module.status}</span>
      </div>
      <h3>{module.label}</h3>
      <p>{module.description}</p>
      <span className="module-meta">{module.scope}</span>
    </article>
  );
}
