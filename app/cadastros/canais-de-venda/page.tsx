import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../../db/companies";
import { getSalesChannelsForCompany } from "../../../db/sales-channels";
import { Sidebar } from "../../components/sidebar";
import { requireAppUser } from "../../current-user";
import { ChannelForm } from "./channel-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Canais de venda",
  description: "Cadastro de canais e faixas de taxas para precificação.",
};

type SalesChannelsPageProps = {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
};

function displayMoney(valueCents: number) {
  return (valueCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function displayPercentage(valueBps: number) {
  return `${(valueBps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function describeFees(percentageBps: number, fixedCents: number) {
  const parts = [];
  if (percentageBps > 0) parts.push(displayPercentage(percentageBps));
  if (fixedCents > 0) parts.push(displayMoney(fixedCents));
  return parts.length > 0 ? parts.join(" + ") : "Sem taxa";
}

export default async function SalesChannelsPage({ searchParams }: SalesChannelsPageProps) {
  const user = await requireAppUser("/cadastros/canais-de-venda");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");

  const channelList = await getSalesChannelsForCompany(company.id);
  const { success, error, edit } = await searchParams;
  const editingChannel = edit
    ? channelList.find((channel) => channel.id === edit) ?? null
    : null;
  const activeCount = channelList.filter((channel) => channel.active).length;

  return (
    <div className="app-shell">
      <Sidebar
        companyName={company.name}
        userEmail={user.email}
        provider={user.provider}
        active="sales-channels"
      />

      <main className="main-content settings-main printers-main">
        <div className="settings-container printers-container channels-container">
          <header className="settings-header printers-header">
            <div>
              <p className="eyebrow">Vendas</p>
              <h1>Canais de venda</h1>
              <p>Configure as taxas de marketplaces e outros canais para calcular o preço líquido de cada produto.</p>
            </div>
            <span className="company-status"><i aria-hidden="true" /> {activeCount} {activeCount === 1 ? "ativo" : "ativos"}</span>
          </header>

          {success ? <p className="settings-message success" role="status">{success}</p> : null}
          {error ? <p className="settings-message error" role="alert">{error}</p> : null}

          <div className="printers-workspace channels-workspace">
            <section className="printer-form-card channel-form-card" aria-labelledby="channel-form-title">
              <div className="printer-card-heading">
                <span className="printer-form-icon channel-form-icon" aria-hidden="true"><span className="channel-glyph" /></span>
                <div>
                  <p className="eyebrow">{editingChannel ? "Edição" : "Novo canal"}</p>
                  <h2 id="channel-form-title">{editingChannel ? "Editar canal" : "Cadastrar canal"}</h2>
                </div>
              </div>

              <ChannelForm channel={editingChannel} />

              <aside className="energy-note channel-note">
                <span aria-hidden="true">R$ + %</span>
                <p><strong>Como será calculado</strong>A faixa compatível substitui as taxas padrão; o frete é somado quando informado.</p>
              </aside>
            </section>

            <section className="printer-list-card channel-list-card" aria-labelledby="channel-list-title">
              <div className="printer-list-heading">
                <div>
                  <p className="eyebrow">Canais</p>
                  <h2 id="channel-list-title">Canais cadastrados</h2>
                </div>
                <span>{channelList.length}</span>
              </div>

              {channelList.length === 0 ? (
                <div className="printer-empty-state">
                  <span aria-hidden="true"><span className="channel-glyph" /></span>
                  <h3>Nenhum canal cadastrado</h3>
                  <p>Cadastre a Shopee ou outro canal para incluir as taxas na precificação.</p>
                </div>
              ) : (
                <div className="printer-list">
                  {channelList.map((channel) => (
                    <article className={`printer-row channel-row${channel.active ? "" : " inactive"}`} key={channel.id}>
                      <span className="printer-row-icon channel-row-icon" aria-hidden="true"><span className="channel-glyph" /></span>
                      <div className="printer-identity">
                        <h3>{channel.name}</h3>
                        <p>{channel.feeRanges.length} {channel.feeRanges.length === 1 ? "faixa configurada" : "faixas configuradas"}</p>
                        <small>Taxas aplicadas por valor da venda</small>
                      </div>
                      <div className="printer-metrics channel-metrics">
                        <span><small>Padrão</small><strong>{describeFees(channel.percentageFeeBps, channel.fixedFeeCents)}</strong></span>
                        <span><small>Frete</small><strong>{describeFees(channel.shippingFeeBps, channel.shippingFeeCents)}</strong></span>
                      </div>
                      <span className={`printer-status${channel.active ? " active" : ""}`}>
                        <i aria-hidden="true" /> {channel.active ? "Ativo" : "Inativo"}
                      </span>
                      <div className="printer-actions">
                        <Link href={`/cadastros/canais-de-venda?edit=${encodeURIComponent(channel.id)}`}>Editar</Link>
                        <form action="/api/sales-channels" method="post">
                          <input type="hidden" name="intent" value="toggle" />
                          <input type="hidden" name="channelId" value={channel.id} />
                          <button type="submit">{channel.active ? "Desativar" : "Ativar"}</button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
