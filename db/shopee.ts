import { and, desc, eq } from "drizzle-orm";
import { getDb } from ".";
import {
  shopeeConfigs,
  shopeeIntegrations,
  shopeePendingItems,
  shopeeSyncLogs,
} from "./schema";

export async function getShopeeConfig(companyId: string) {
  const [config] = await getDb()
    .select()
    .from(shopeeConfigs)
    .where(eq(shopeeConfigs.companyId, companyId))
    .limit(1);
  return config ?? null;
}

/** Nunca devolve a chave inteira — só um indicativo mascarado para a UI. */
export function maskKey(key: string | null | undefined) {
  if (!key) return null;
  return key.length <= 10 ? "••••" : `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export async function getIntegrationsForCompany(companyId: string) {
  return getDb()
    .select()
    .from(shopeeIntegrations)
    .where(eq(shopeeIntegrations.companyId, companyId))
    .orderBy(desc(shopeeIntegrations.createdAt));
}

/** Confere que a integração pertence à empresa (evita agir na loja de outrem). */
export async function getOwnedIntegration(companyId: string, integrationId: string) {
  const [integ] = await getDb()
    .select()
    .from(shopeeIntegrations)
    .where(and(eq(shopeeIntegrations.id, integrationId), eq(shopeeIntegrations.companyId, companyId)))
    .limit(1);
  return integ ?? null;
}

export async function getPendingItemsForCompany(companyId: string) {
  const integs = await getIntegrationsForCompany(companyId);
  const ids = new Set(integs.map((i) => i.id));
  if (ids.size === 0) return [];
  const rows = await getDb()
    .select()
    .from(shopeePendingItems)
    .orderBy(desc(shopeePendingItems.lastSeenAt));
  return rows.filter((r) => ids.has(r.integrationId));
}

export async function getSyncLogsForCompany(companyId: string, limit = 25) {
  const integs = await getIntegrationsForCompany(companyId);
  const ids = new Set(integs.map((i) => i.id));
  if (ids.size === 0) return [];
  const rows = await getDb()
    .select()
    .from(shopeeSyncLogs)
    .orderBy(desc(shopeeSyncLogs.startedAt))
    .limit(200);
  return rows.filter((r) => ids.has(r.integrationId)).slice(0, limit);
}
