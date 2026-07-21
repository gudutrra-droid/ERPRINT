// Executado pelo Cron Trigger da Cloudflare a cada 1 minuto (ver worker/index.ts).
// Percorre todas as integrações e roda as syncs que estão "vencidas" conforme
// os intervalos configurados por loja. Substitui o setInterval do app espelho.
import { getDb } from "../../db";
import { shopeeIntegrations } from "../../db/schema";
import { syncIntegration } from "./sync";
import { syncAdsSpend, logAdsError } from "./ads";

export async function runShopeePoll(): Promise<void> {
  const db = getDb();
  const integrations = await db.select().from(shopeeIntegrations);
  const now = Date.now();

  for (const integ of integrations) {
    // ── Vendas ──
    const lastSales = integ.lastSyncAt ? new Date(integ.lastSyncAt).getTime() : 0;
    const salesDue = integ.autoSyncSales && now - lastSales >= integ.syncIntervalS * 1000;
    if (salesDue) {
      try {
        const result = await syncIntegration(integ.id);
        if (result.imported > 0 || result.pending > 0) {
          console.log(
            `[shopee] loja ${integ.shopName ?? integ.shopId}: ${result.imported} vendas novas, ${result.pending} sem vínculo`,
          );
        }
      } catch (e) {
        console.error(`[shopee] erro na sync da loja ${integ.shopId}:`, e instanceof Error ? e.message : e);
      }
    }

    // ── Gasto com ADS ──
    const lastAds = integ.lastAdsSyncAt ? new Date(integ.lastAdsSyncAt).getTime() : 0;
    const adsDue = integ.autoSyncAds && now - lastAds >= integ.adsSyncIntervalS * 1000;
    if (adsDue) {
      try {
        const ads = await syncAdsSpend(integ.id);
        if (ads.created > 0 || ads.updated > 0) {
          console.log(
            `[shopee] ADS loja ${integ.shopName ?? integ.shopId}: ${ads.created} novo(s), ${ads.updated} atualizado(s)`,
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[shopee] erro na sync de ADS da loja ${integ.shopId}:`, msg);
        await logAdsError(integ.id, msg).catch(() => {});
      }
    }
  }
}
