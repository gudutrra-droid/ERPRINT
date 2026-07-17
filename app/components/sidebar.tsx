import { LogoutButton } from "./logout-button";
import { modules } from "../lib/modules";

type SidebarProps = { companyName: string; userEmail: string; provider: "password" | "chatgpt" };

export function Sidebar({ companyName, userEmail, provider }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">E</div>
        <div><strong>ERPrint</strong><span>Gestão integrada</span></div>
      </div>

      <p className="nav-label">Operação</p>
      <nav className="sidebar-nav" aria-label="Módulos do ERP">
        {modules.map((module) => (
          <a className="nav-item" href={module.href} key={module.id} aria-current={module.id === "dashboard" ? "page" : undefined}>
            <span className="nav-icon" aria-hidden="true">{module.shortLabel}</span>
            <span>{module.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="company-avatar" aria-hidden="true">{companyName.slice(0, 1).toUpperCase()}</div>
        <div className="company-identity"><strong>{companyName}</strong><span>{userEmail}</span></div>
        <LogoutButton provider={provider} />
      </div>
    </aside>
  );
}
