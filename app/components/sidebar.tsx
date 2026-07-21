import Link from "next/link";
import { LogoutButton } from "./logout-button";

type SidebarProps = {
  companyName: string;
  userEmail: string;
  active?:
    | "dashboard"
    | "sales"
    | "shopee"
    | "company"
    | "products"
    | "printers"
    | "filaments"
    | "supplies"
    | "sales-channels";
};

export function Sidebar({ companyName, userEmail, active }: SidebarProps) {
  return (
    <aside className="sidebar">
      <Link className="brand" href="/dashboard" aria-label="ERPrint — painel inicial">
        <div className="brand-mark" aria-hidden="true">E</div>
        <div><strong>ERPrint</strong><span>Gestão integrada</span></div>
      </Link>

      <nav className="sidebar-nav" aria-label="Navegação principal">
        <Link className={active === "dashboard" ? "active" : undefined} href="/dashboard">
          <span className="nav-icon" aria-hidden="true"><span className="dashboard-glyph" /></span>
          <span><strong>Painel</strong><small>Visão geral</small></span>
        </Link>
        <Link className={active === "sales" ? "active" : undefined} href="/vendas">
          <span className="nav-icon" aria-hidden="true"><span className="sales-glyph" /></span>
          <span><strong>Vendas</strong><small>Faturamento</small></span>
        </Link>
        <Link className={active === "shopee" ? "active" : undefined} href="/integracoes/shopee">
          <span className="nav-icon" aria-hidden="true"><span className="shopee-glyph" /></span>
          <span><strong>Shopee</strong><small>Integração</small></span>
        </Link>

        <span className="nav-divider" aria-hidden="true" />

        <Link className={active === "company" ? "active" : undefined} href="/configuracoes/empresa">
          <span className="nav-icon" aria-hidden="true"><span className="company-icon" /></span>
          <span><strong>Empresa</strong><small>Configurações</small></span>
        </Link>
        <Link className={active === "products" ? "active" : undefined} href="/cadastros/produtos">
          <span className="nav-icon" aria-hidden="true"><span className="product-glyph" /></span>
          <span><strong>Produtos</strong><small>Catálogo e custo</small></span>
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
