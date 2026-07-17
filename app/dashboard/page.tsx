import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../db/companies";
import { ModuleCard } from "../components/module-card";
import { Sidebar } from "../components/sidebar";
import { StatCard } from "../components/stat-card";
import { modules } from "../lib/modules";
import { requireAppUser } from "../current-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel", description: "Visão geral da operação de produção 3D e vendas da ERPrint." };

export default async function Dashboard() {
  const user = await requireAppUser("/dashboard");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");

  return (
    <div className="app-shell">
      <Sidebar companyName={company.name} userEmail={user.email} provider={user.provider} />
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Visão geral</p>
            <h1>Olá, {user.fullName?.split(" ")[0] ?? company.name}.</h1>
            <p>Este é o ponto de partida da sua operação.</p>
          </div>
          <div className="topbar-actions">
            <span className="live-pill"><i /> Espaço ativo</span>
            <button className="secondary-button" type="button">Configurar empresa</button>
          </div>
        </header>

        <section className="dashboard-hero" aria-labelledby="hero-title">
          <div>
            <span className="hero-kicker">ERPRINT · OPERAÇÃO 3D</span>
            <h2 id="hero-title">Tudo pronto para<br />começar a produzir.</h2>
            <p>Cadastre seus produtos e transforme pedidos em uma fila de produção organizada.</p>
          </div>
          <div className="hero-signal" aria-label="Implantação iniciada">
            <span>01</span>
            <div><strong>Empresa configurada</strong><small>Próximo: catálogo de produtos</small></div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Indicadores principais">
          <StatCard label="Pedidos em produção" value="0" detail="Fila ainda não configurada" tone="blue" />
          <StatCard label="Vendas Shopee" value="R$ 0" detail="Integração pendente" tone="orange" />
          <StatCard label="Produtos cadastrados" value="0" detail="Catálogo a ser criado" tone="violet" />
          <StatCard label="Resultado do mês" value="R$ 0" detail="Financeiro planejado" tone="green" />
        </section>

        <section className="dashboard-section" aria-labelledby="modules-title">
          <div className="section-heading">
            <div><p className="eyebrow">Mapa do sistema</p><h2 id="modules-title">Módulos da operação</h2></div>
            <span className="section-note">Construiremos um por vez</span>
          </div>
          <div className="modules-grid">
            {modules.filter((module) => module.id !== "dashboard").map((module, index) => (
              <ModuleCard key={module.id} module={module} order={index + 1} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
