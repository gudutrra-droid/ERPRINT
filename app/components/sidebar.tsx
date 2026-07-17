import Link from "next/link";
import { LogoutButton } from "./logout-button";

type SidebarProps = {
  companyName: string;
  userEmail: string;
  provider: "password" | "chatgpt";
  active?: "company";
};

export function Sidebar({ companyName, userEmail, provider, active }: SidebarProps) {
  return (
    <aside className="sidebar">
      <Link className="brand" href="/dashboard" aria-label="ERPrint — painel inicial">
        <div className="brand-mark" aria-hidden="true">E</div>
        <div><strong>ERPrint</strong><span>Gestão integrada</span></div>
      </Link>

      <nav className="sidebar-nav" aria-label="Navegação principal">
        <Link className={active === "company" ? "active" : undefined} href="/configuracoes/empresa">
          <span className="nav-index" aria-hidden="true">01</span>
          <span><strong>Empresa</strong><small>Configurações</small></span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="company-avatar" aria-hidden="true">
          {companyName.slice(0, 1).toUpperCase()}
        </div>
        <div className="company-identity">
          <strong>{companyName}</strong>
          <span>{userEmail}</span>
        </div>
        <LogoutButton provider={provider} />
      </div>
    </aside>
  );
}
