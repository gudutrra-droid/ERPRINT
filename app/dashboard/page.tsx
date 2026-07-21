import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../db/companies";
import { getSalesSummary } from "../../db/sales";
import { Sidebar } from "../components/sidebar";
import { requireAppUser } from "../current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel",
  description: "Visão geral da sua operação no ERPrint.",
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function Dashboard() {
  const user = await requireAppUser("/dashboard");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");

  const summary = await getSalesSummary(company.id, "30d");
  const hasData = summary.orders > 0 || summary.revenueCents > 0;

  return (
    <div className="app-shell">
      <Sidebar companyName={company.name} userEmail={user.email} active="dashboard" />

      <main className="main-content settings-main">
        <div className="settings-container">
          <header className="settings-header">
            <div>
              <p className="eyebrow">Painel</p>
              <h1>{company.name}</h1>
              <p>Resumo dos últimos 30 dias. As vendas da Shopee entram sozinhas a cada minuto.</p>
            </div>
            <span className="company-status"><i aria-hidden="true" /> Operação conectada</span>
          </header>

          <section className="stat-row" aria-label="Resumo dos últimos 30 dias">
            <article className="stat-tile accent">
              <span>Faturamento (30d)</span>
              <strong>{money(summary.revenueCents)}</strong>
              <small>{summary.units} unidade(s)</small>
            </article>
            <article className="stat-tile">
              <span>Pedidos</span>
              <strong>{summary.orders}</strong>
              <small>Ticket médio {money(summary.ticketCents)}</small>
            </article>
            <article className="stat-tile">
              <span>Gasto com ADS</span>
              <strong>{money(summary.adSpendCents)}</strong>
              <small>Anúncios Shopee</small>
            </article>
            <article className="stat-tile">
              <span>Receita menos ADS</span>
              <strong className={summary.revenueCents - summary.adSpendCents >= 0 ? "pos" : "neg"}>
                {money(summary.revenueCents - summary.adSpendCents)}
              </strong>
              <small>Sem custo de produto</small>
            </article>
          </section>

          {!hasData ? (
            <section className="dashboard-cta">
              <div className="dashboard-cta-glyph" aria-hidden="true"><span className="shopee-glyph" /></div>
              <div>
                <h2>Conecte sua loja Shopee</h2>
                <p>Assim que a loja for conectada, seus pedidos e o gasto com anúncios aparecem aqui automaticamente.</p>
              </div>
              <Link className="primary-button" href="/integracoes/shopee">Conectar agora</Link>
            </section>
          ) : (
            <section className="dashboard-links">
              <Link className="dashboard-link" href="/vendas">
                <strong>Ver todas as vendas</strong>
                <span>Detalhamento por pedido, período e canal</span>
              </Link>
              <Link className="dashboard-link" href="/integracoes/shopee">
                <strong>Integração Shopee</strong>
                <span>Status da sincronização e itens sem vínculo</span>
              </Link>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
