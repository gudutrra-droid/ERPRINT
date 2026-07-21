// Sincronização do gasto com anúncios (ADS CPC) da Shopee: grava um registro
// por dia na tabela ad_spend (idempotente — nunca duplica, só cria/atualiza).
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { adSpend, shopeeIntegrations, shopeeSyncLogs } from "../../db/schema";
import { getAdsDailySpend } from "./client";
import { getShopeeEnv, ensureToken } from "./sync";

/** Dias para trás verificados a cada sync (a Shopee ajusta valores retroativamente). */
const ADS_LOOKBACK_DAYS = 7;
const nowIso = () => new Date().toISOString();

export interface AdsSyncResult {
  created: number;
  updated: number;
  unchanged: number;
  totalSpendCents: number;
}

export async function syncAdsSpend(integrationId: string): Promise<AdsSyncResult> {
  const db = getDb();
  const [integ] = await db
    .select()
    .from(shopeeIntegrations)
    .where(eq(shopeeIntegrations.id, integrationId))
    .limit(1);
  if (!integ) throw new Error("Integração não encontrada.");
  const env = await getShopeeEnv(integ.companyId);
  if (!env) throw new Error("Configure o Partner ID e a Partner Key da Shopee primeiro.");

  const { accessToken, shopId } = await ensureToken(env, integ);

  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (ADS_LOOKBACK_DAYS - 1));

  const daily = await getAdsDailySpend(env, accessToken, shopId, from, to);
  const result: AdsSyncResult = { created: 0, updated: 0, unchanged: 0, totalSpendCents: 0 };

  for (const [iso, amount] of daily) {
    const amountCents = Math.round(amount * 100);
    result.totalSpendCents += amountCents;

    const [existing] = await db
      .select({ id: adSpend.id, amountCents: adSpend.amountCents })
      .from(adSpend)
      .where(
        and(
          eq(adSpend.companyId, integ.companyId),
          eq(adSpend.spendDate, iso),
          eq(adSpend.source, "shopee"),
        ),
      )
      .limit(1);

    if (!existing) {
      if (amountCents <= 0) {
        result.unchanged++;
        continue;
      }
      await db.insert(adSpend).values({
        id: crypto.randomUUID(),
        companyId: integ.companyId,
        spendDate: iso,
        amountCents,
        source: "shopee",
      });
      result.created++;
    } else if (existing.amountCents !== amountCents) {
      await db
        .update(adSpend)
        .set({ amountCents, updatedAt: nowIso() })
        .where(eq(adSpend.id, existing.id));
      result.updated++;
    } else {
      result.unchanged++;
    }
  }

  await db
    .update(shopeeIntegrations)
    .set({ lastAdsSyncAt: nowIso() })
    .where(eq(shopeeIntegrations.id, integrationId));

  if (result.created > 0 || result.updated > 0) {
    const todayIso = new Date().toISOString().slice(0, 10);
    const todaySpend = ((daily.get(todayIso) ?? 0)).toFixed(2);
    await db.insert(shopeeSyncLogs).values({
      id: crypto.randomUUID(),
      integrationId,
      syncType: "ads",
      status: "success",
      message: `ADS: ${result.created} dia(s) novo(s), ${result.updated} atualizado(s) — gasto de hoje: R$ ${todaySpend}`,
      startedAt: nowIso(),
      finishedAt: nowIso(),
    });
  }
  return result;
}

/** Registra falha de sync de ADS no histórico, deduplicando o mesmo erro. */
export async function logAdsError(integrationId: string, message: string): Promise<void> {
  const db = getDb();
  const [last] = await db
    .select({ status: shopeeSyncLogs.status, message: shopeeSyncLogs.message })
    .from(shopeeSyncLogs)
    .where(and(eq(shopeeSyncLogs.integrationId, integrationId), eq(shopeeSyncLogs.syncType, "ads")))
    .orderBy(desc(shopeeSyncLogs.startedAt))
    .limit(1);
  if (last && last.status === "error" && last.message === message) return;
  await db.insert(shopeeSyncLogs).values({
    id: crypto.randomUUID(),
    integrationId,
    syncType: "ads",
    status: "error",
    message,
    startedAt: nowIso(),
    finishedAt: nowIso(),
  });
}
