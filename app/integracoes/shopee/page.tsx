import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCompanyForUser } from "../../../db/companies";
import { getSalesChannelsForCompany } from "../../../db/sales-channels";
import {
  getIntegrationsForCompany,
  getPendingItemsForCompany,
  getShopeeConfig,
  getSyncLogsForCompany,
  maskKey,
} from "../../../db/shopee";
import { Sidebar } from "../../components/sidebar";
import { requireAppUser } from "../../current-user";
import { ShopeeClient } from "./shopee-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shopee",
  description: "Conecte sua loja Shopee e sincronize vendas e anúncios automaticamente.",
};

export default async function ShopeePage() {
  const user = await requireAppUser("/integracoes/shopee");
  const company = await getCompanyForUser(user);
  if (!company) redirect("/onboarding");

  const [config, integrations, pending, logs, channels] = await Promise.all([
    getShopeeConfig(company.id),
    getIntegrationsForCompany(company.id),
    getPendingItemsForCompany(company.id),
    getSyncLogsForCompany(company.id),
    getSalesChannelsForCompany(company.id),
  ]);

  const initial = {
    config: {
      partnerId: config?.partnerId ?? "",
      partnerKeySet: Boolean(config?.partnerKey),
      partnerKeyHint: maskKey(config?.partnerKey),
      environment: config?.environment ?? "production",
    },
    integrations: integrations.map((i) => ({
      id: i.id,
      shopId: i.shopId,
      shopName: i.shopName,
      environment: i.environment,
      salesChannelId: i.salesChannelId,
      autoSyncSales: i.autoSyncSales,
      syncIntervalS: i.syncIntervalS,
      autoSyncAds: i.autoSyncAds,
      adsSyncIntervalS: i.adsSyncIntervalS,
      lastSyncAt: i.lastSyncAt,
      lastAdsSyncAt: i.lastAdsSyncAt,
    })),
    pending,
    logs,
  };

  return (
    <div className="app-shell">
      <Sidebar companyName={company.name} userEmail={user.email} active="shopee" />
      <main className="main-content settings-main">
        <div className="settings-container">
          <header className="settings-header">
            <div>
              <p className="eyebrow">Integrações</p>
              <h1>Shopee</h1>
              <p>Conecte sua loja e deixe as vendas e o gasto com anúncios entrarem sozinhos, a cada minuto.</p>
            </div>
            <span className="company-status"><i aria-hidden="true" /> Sync a cada 1 min</span>
          </header>

          <ShopeeClient initial={initial} channels={channels.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </main>
    </div>
  );
}
