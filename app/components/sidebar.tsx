import { modules } from "../lib/modules";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">ER</div>
        <div>
          <strong>ERPrint</strong>
          <span>Gestão integrada</span>
        </div>
      </div>

      <p className="nav-label">Operação</p>
      <nav className="sidebar-nav" aria-label="Módulos do ERP">
        {modules.map((module) => (
          <a
            className="nav-item"
            href={module.href}
            key={module.id}
            aria-current={module.id === "dashboard" ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">{module.shortLabel}</span>
            <span>{module.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <strong>ERPrint ERP</strong>
        <span>Fundação v0.1.0</span>
      </div>
    </aside>
  );
}
