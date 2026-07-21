import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../db/companies";
import { getSalesForCompany, getSalesSummary, type SalesPeriod } from "../../db/sales";
import { Sidebar } from "../components/sidebar";
import { requireAppUser } from "../current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendas",
  description: "Faturamento e vendas da sua operação, com sincronização da Shopee.",
};

const PERIODS: { key: SalesPeriod; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "all", label: "Tudo" },
];

const STATUS_LABEL: Record<string, string> = {
  UNPAID: "Não pago",
  READY_TO_SHIP: "A enviar",
  PROCESSED: "Processado",
  SHIPPED: "Enviado",
  TO_CONFIRM_RECEIVE: "A confirmar",
  COMPLETED: "Concluído",
  IN_CANCEL: "Em cancelamento",
  TO_RETURN: "Devolução",
  CANCELLED: "Cancelado",
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

type VendasProps = { searchParams: Promise<{ period?: string }> };

export default async function VendasPage({ searchParams }: VendasProps) {
  const user = await requireAppUser("/vendas");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");

  const { period: periodParam } = await searchParams;
  const period: SalesPeriod = (["7d", "30d", "90d", "all"] as const).includes(periodParam as SalesPeriod)
    ? (periodParam as SalesPeriod)
    : "30d";

  const [summary, salesList] = await Promise.all([
    getSalesSummary(company.id, period),
    getSalesForCompany(company.id, period),
  ]);

  const profitCents = summary.revenueCents - summary.adSpendCents;

  return (
    <div className="app-shell">
      <Sidebar companyName={company.name} userEmail={user.email} active="sales" />
      <main className="main-content settings-main">
        <div className="settings-container">
          <header className="settings-header">
            <div>
              <p className="eyebrow">Faturamento</p>
              <h1>Vendas</h1>
              <p>Todo pedido da Shopee entra aqui automaticamente. Escolha o período para ver os números.</p>
            </div>
            <nav className="period-switch" aria-label="Período">
              {PERIODS.map((p) => (
                <Link
                  key={p.key}
                  href={`/vendas?period=${p.key}`}
                  className={p.key === period ? "active" : undefined}
                >
                  {p.label}
                </Link>
              ))}
            </nav>
          </header>

          <section className="stat-row" aria-label="Resumo do período">
            <article className="stat-tile accent">
              <span>Faturamento</span>
              <strong>{money(summary.revenueCents)}</strong>
              <small>{summary.units} unidade(s) vendida(s)</small>
            </article>
            <article className="stat-tile">
              <span>Pedidos</span>
              <strong>{summary.orders}</strong>
              <small>Ticket médio {money(summary.ticketCents)}</small>
            </article>
            <article className="stat-tile">
              <span>Gasto com ADS</span>
              <strong>{money(summary.adSpendCents)}</strong>
              <small>Anúncios Shopee no período</small>
            </article>
            <article className="stat-tile">
              <span>Receita menos ADS</span>
              <strong className={profitCents >= 0 ? "pos" : "neg"}>{money(profitCents)}</strong>
              <small>Custo de produto ainda não incluído</small>
            </article>
          </section>

          <section className="sales-panel" aria-label="Lista de vendas">
            <div className="sales-panel-head">
              <div>
                <p className="eyebrow">Últimas vendas</p>
                <h2>Detalhamento</h2>
              </div>
              <span className="sales-count">{salesList.length}</span>
            </div>

            {salesList.length === 0 ? (
              <div className="sales-empty">
                <div className="sales-empty-glyph" aria-hidden="true"><span className="sales-glyph" /></div>
                <h3>Nenhuma venda no período</h3>
                <p>
                  Conecte sua loja na página{" "}
                  <Link href="/integracoes/shopee">Shopee</Link> — os pedidos passam a entrar sozinhos a cada minuto.
                </p>
              </div>
            ) : (
              <div className="sales-list">
                <div className="sales-row head">
                  <span>Item</span>
                  <span>Pedido</span>
                  <span>Status</span>
                  <span>Qtd</span>
                  <span className="right">Valor</span>
                </div>
                {salesList.map((sale) => (
                  <div className="sales-row" key={sale.id}>
                    <div className="sale-item">
                      {sale.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sale.imageUrl} alt="" />
                      ) : (
                        <div className="sale-thumb" aria-hidden="true" />
                      )}
                      <div>
                        <strong>{sale.itemName ?? "Venda"}</strong>
                        <small>
                          {fmtDate(sale.saleDate)}
                          {sale.channelName ? ` · ${sale.channelName}` : sale.source === "shopee" ? " · Shopee" : ""}
                          {sale.buyerUsername ? ` · ${sale.buyerUsername}` : ""}
                        </small>
                      </div>
                    </div>
                    <span className="sale-order">{sale.orderNumber ?? "—"}</span>
                    <span className="sale-status">{STATUS_LABEL[sale.orderStatus ?? ""] ?? sale.orderStatus ?? "—"}</span>
                    <span className="sale-qty">{sale.quantity}</span>
                    <span className="sale-value right">{money(sale.saleValueCents * sale.quantity)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
