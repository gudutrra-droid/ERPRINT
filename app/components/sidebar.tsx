import Link from "next/link";
import { LogoutButton } from "./logout-button";

type SidebarProps = {
  companyName: string;
  userEmail: string;
  active?: "company" | "printers" | "filaments" | "supplies" | "sales-channels";
};

export function Sidebar({ companyName, userEmail, active }: SidebarProps) {
  return (
    <aside className="sidebar">
      <Link className="brand" href="/dashboard" aria-label="ERPrint — painel inicial">
        <div className="brand-mark" aria-hidden="true">E</div>
        <div><strong>ERPrint</strong><span>Gestão integrada</span></div>
      </Link>

      <nav className="sidebar-nav" aria-label="Navegação principal">
        <Link className={active === "company" ? "active" : undefined} href="/configuracoes/empresa">
          <span className="nav-icon" aria-hidden="true"><span className="company-icon" /></span>
          <span><strong>Empresa</strong><small>Configurações</small></span>
        </Link>
        <Link className={active === "printers" ? "active" : undefined} href="/cadastros/impressoras">
          <span className="nav-icon" aria-hidden="true"><span className="printer-glyph" /></span>
          <span><strong>Impressoras</strong><small>Produção</small></span>
        </Link>
        <Link className={active === "filaments" ? "active" : undefined} href="/cadastros/filamentos">
          <span className="nav-icon" aria-hidden="true"><span className="filament-glyph" /></span>
          <span><strong>Filamentos</strong><small>Materiais</small></span>
        </Link>
        <Link className={active === "supplies" ? "active" : undefined} href="/cadastros/insumos">
          <span className="nav-icon" aria-hidden="true"><span className="supply-glyph" /></span>
          <span><strong>Insumos</strong><small>Materiais</small></span>
        </Link>
        <Link className={active === "sales-channels" ? "active" : undefined} href="/cadastros/canais-de-venda">
          <span className="nav-icon" aria-hidden="true"><span className="channel-glyph" /></span>
          <span><strong>Canais de venda</strong><small>Marketplace</small></span>
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
        <LogoutButton />
      </div>
    </aside>
  );
}
