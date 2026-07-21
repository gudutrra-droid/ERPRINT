// Motor de sincronização: puxa pedidos da Shopee e grava vendas locais.
// Diferente do app espelho, aqui toda venda é registrada com o faturamento
// imediatamente (nome/SKU vindos da Shopee), mesmo sem produto cadastrado —
// o vínculo com produto/custo é enriquecimento posterior. Itens sem vínculo
// também entram na fila de pendências para quando o catálogo existir.
import { and, eq, inArray, like, lt, or } from "drizzle-orm";
import { getDb } from "../../db";
import {
  sales,
  shopeeConfigs,
  shopeeIntegrations,
  shopeePendingItems,
  shopeeProductMappings,
  shopeeSyncLogs,
} from "../../db/schema";
import {
  ShopeeEnv,
  listOrders,
  getOrderDetails,
  refreshAccessToken,
  ShopeeOrderDetail,
} from "./client";

const IMPORTABLE_STATUSES = new Set([
  "UNPAID",
  "READY_TO_SHIP",
  "PROCESSED",
  "SHIPPED",
  "COMPLETED",
  "TO_CONFIRM_RECEIVE",
  "IN_CANCEL",
  "TO_RETURN",
]);

const nowIso = () => new Date().toISOString();

export async function getShopeeEnv(companyId: string): Promise<ShopeeEnv | null> {
  const db = getDb();
  const [config] = await db
    .select()
    .from(shopeeConfigs)
    .where(eq(shopeeConfigs.companyId, companyId))
    .limit(1);
  if (!config || !config.partnerId || !config.partnerKey) return null;
  return {
    partnerId: config.partnerId,
    partnerKey: config.partnerKey,
    environment: config.environment === "production" ? "production" : "sandbox",
  };
}

type IntegrationRow = typeof shopeeIntegrations.$inferSelect;

async function getIntegration(integrationId: string): Promise<IntegrationRow> {
  const db = getDb();
  const [integ] = await db
    .select()
    .from(shopeeIntegrations)
    .where(eq(shopeeIntegrations.id, integrationId))
    .limit(1);
  if (!integ) throw new Error("Integração não encontrada.");
  return integ;
}

/** Garante token válido, renovando se faltar menos de 30 min. */
export async function ensureToken(
  env: ShopeeEnv,
  integ: IntegrationRow,
): Promise<{ accessToken: string; shopId: string }> {
  const expiresSoon = new Date(integ.tokenExpiresAt).getTime() - Date.now() < 30 * 60 * 1000;
  if (!expiresSoon) return { accessToken: integ.accessToken, shopId: integ.shopId };

  const refreshed = await refreshAccessToken(env, integ.refreshToken, integ.shopId);
  await getDb()
    .update(shopeeIntegrations)
    .set({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenExpiresAt: new Date(Date.now() + refreshed.expiresInS * 1000).toISOString(),
    })
    .where(eq(shopeeIntegrations.id, integ.id));
  return { accessToken: refreshed.accessToken, shopId: integ.shopId };
}

export interface ImportResult {
  imported: number;
  pending: number;
  skipped: number;
  cancelled: number;
}

type SaleInsert = typeof sales.$inferInsert;
type PendingUpsert = {
  shopeeItemId: string;
  shopeeModelId: string;
  shopeeItemName: string;
  shopeeSku: string | null;
  shopeeImageUrl: string | null;
};

/**
 * Importa pedidos detalhados como vendas locais (idempotente por linha).
 * Trabalha em lote: uma consulta para descobrir o que já existe e inserção em
 * bloco com proteção contra duplicata — evita centenas de idas ao banco por
 * rodada, o que estourava o tempo do Worker no cron.
 */
export async function importOrders(
  integ: IntegrationRow,
  orders: ShopeeOrderDetail[],
): Promise<ImportResult> {
  const db = getDb();
  const result: ImportResult = { imported: 0, pending: 0, skipped: 0, cancelled: 0 };
  if (orders.length === 0) return result;

  const mappings = await db
    .select()
    .from(shopeeProductMappings)
    .where(eq(shopeeProductMappings.integrationId, integ.id));

  // Cancelados: remove vendas já importadas do pedido.
  const cancelledSns = orders.filter((o) => o.order_status === "CANCELLED").map((o) => o.order_sn);
  for (const sn of cancelledSns) {
    const removed = await db
      .delete(sales)
      .where(
        and(
          eq(sales.source, "shopee"),
          or(eq(sales.shopeeOrderSn, sn), like(sales.shopeeOrderSn, `${sn}#%`)),
        ),
      )
      .returning({ id: sales.id });
    result.cancelled += removed.length;
  }

  const active = orders.filter((o) => {
    if (o.order_status === "CANCELLED") return false;
    if (!IMPORTABLE_STATUSES.has(o.order_status)) {
      result.skipped++;
      return false;
    }
    return true;
  });
  if (active.length === 0) return result;

  // Uma consulta só: linhas já existentes desses pedidos (sn → status atual).
  const orderSns = active.map((o) => o.order_sn);
  const existingRows = await db
    .select({ sn: sales.shopeeOrderSn, status: sales.orderStatus })
    .from(sales)
    .where(and(eq(sales.source, "shopee"), inArray(sales.orderNumber, orderSns)));
  const existing = new Map(existingRows.map((r) => [r.sn, r.status]));

  const toInsert: SaleInsert[] = [];
  const statusUpdates: Array<{ sn: string; status: string }> = [];
  const pendingByKey = new Map<string, PendingUpsert>();

  for (const order of active) {
    for (let line = 0; line < (order.item_list ?? []).length; line++) {
      const item = order.item_list[line];
      const lineSn = line === 0 ? order.order_sn : `${order.order_sn}#${line + 1}`;

      if (existing.has(lineSn)) {
        if (existing.get(lineSn) !== order.order_status) {
          statusUpdates.push({ sn: lineSn, status: order.order_status });
        }
        continue;
      }

      const itemName = [item.item_name, item.model_name].filter(Boolean).join(" — ");
      const sku = item.model_sku || item.item_sku || null;
      const mapping = mappings.find(
        (m) =>
          m.shopeeItemId === String(item.item_id) &&
          (m.shopeeModelId ?? "0") === String(item.model_id ?? 0),
      );

      if (!mapping || !mapping.productId) {
        const key = `${item.item_id}:${item.model_id ?? 0}`;
        pendingByKey.set(key, {
          shopeeItemId: String(item.item_id),
          shopeeModelId: String(item.model_id ?? 0),
          shopeeItemName: itemName,
          shopeeSku: sku,
          shopeeImageUrl: item.image_info?.image_url ?? null,
        });
        result.pending++;
      }

      toInsert.push({
        id: crypto.randomUUID(),
        companyId: integ.companyId,
        saleDate: new Date(order.create_time * 1000).toISOString(),
        quantity: Number(item.model_quantity_purchased ?? 1),
        saleValueCents: Math.round(Number(item.model_discounted_price) * 100),
        salesChannelId: integ.salesChannelId,
        orderNumber: order.order_sn,
        shopeeOrderSn: lineSn,
        orderStatus: order.order_status,
        buyerUsername: order.buyer_username ?? null,
        source: "shopee",
        itemName,
        itemSku: sku,
        imageUrl: item.image_info?.image_url ?? null,
        productId: mapping?.productId ?? null,
      });
    }
  }

  // Inserção em blocos, ignorando linhas que uma rodada concorrente já gravou.
  for (let i = 0; i < toInsert.length; i += 40) {
    const chunk = toInsert.slice(i, i + 40);
    await db.insert(sales).values(chunk).onConflictDoNothing({ target: sales.shopeeOrderSn });
  }
  result.imported = toInsert.length;

  // Pendências (poucas — só itens distintos sem vínculo).
  for (const p of pendingByKey.values()) {
    await db
      .insert(shopeePendingItems)
      .values({
        id: crypto.randomUUID(),
        integrationId: integ.id,
        ...p,
        occurrences: 1,
        lastSeenAt: nowIso(),
      })
      .onConflictDoUpdate({
        target: [
          shopeePendingItems.integrationId,
          shopeePendingItems.shopeeItemId,
          shopeePendingItems.shopeeModelId,
        ],
        set: { shopeeItemName: p.shopeeItemName, lastSeenAt: nowIso() },
      });
  }

  // Atualizações de status (raras).
  for (const u of statusUpdates) {
    await db.update(sales).set({ orderStatus: u.status }).where(eq(sales.shopeeOrderSn, u.sn));
  }

  return result;
}

/** Sincroniza pedidos alterados desde a última sync (com margem de segurança). */
export async function syncIntegration(
  integrationId: string,
  opts?: { sinceS?: number },
): Promise<ImportResult> {
  const db = getDb();
  const integ = await getIntegration(integrationId);
  const env = await getShopeeEnv(integ.companyId);
  if (!env) throw new Error("Configure o Partner ID e a Partner Key da Shopee primeiro.");

  // Fecha registros presos em "running" de rodadas anteriores cortadas pelo
  // limite de tempo do Worker (dados foram gravados, só o log não fechou).
  const staleBefore = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await db
    .update(shopeeSyncLogs)
    .set({ status: "error", message: "Interrompido (tempo do Worker excedido).", finishedAt: nowIso() })
    .where(
      and(
        eq(shopeeSyncLogs.integrationId, integrationId),
        eq(shopeeSyncLogs.status, "running"),
        lt(shopeeSyncLogs.startedAt, staleBefore),
      ),
    );

  const logId = crypto.randomUUID();
  await db.insert(shopeeSyncLogs).values({
    id: logId,
    integrationId,
    syncType: "orders",
    status: "running",
    startedAt: nowIso(),
  });

  try {
    const { accessToken, shopId } = await ensureToken(env, integ);
    const now = Math.floor(Date.now() / 1000);
    const margin = 60 * 30; // 30 min de sobreposição
    const defaultFrom = integ.lastSyncAt
      ? Math.floor(new Date(integ.lastSyncAt).getTime() / 1000) - margin
      : now - 60 * 60 * 24; // primeira sync: últimas 24h
    let timeFrom = opts?.sinceS ?? defaultFrom;
    const maxWindow = 15 * 24 * 60 * 60 - 60;
    if (now - timeFrom > maxWindow) timeFrom = now - maxWindow;

    const orderList = await listOrders(env, accessToken, shopId, timeFrom, now, "update_time");
    const details = orderList.length
      ? await getOrderDetails(env, accessToken, shopId, orderList.map((o) => o.order_sn))
      : [];
    const result = await importOrders(integ, details);

    await db
      .update(shopeeIntegrations)
      .set({ lastSyncAt: nowIso() })
      .where(eq(shopeeIntegrations.id, integrationId));

    const hadActivity = result.imported > 0 || result.pending > 0 || result.cancelled > 0;
    if (hadActivity) {
      await db
        .update(shopeeSyncLogs)
        .set({
          status: "success",
          message: `${orderList.length} pedidos verificados`,
          ordersImported: result.imported,
          ordersPending: result.pending,
          finishedAt: nowIso(),
        })
        .where(eq(shopeeSyncLogs.id, logId));
    } else {
      await db.delete(shopeeSyncLogs).where(eq(shopeeSyncLogs.id, logId));
    }
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db
      .update(shopeeSyncLogs)
      .set({ status: "error", message, finishedAt: nowIso() })
      .where(eq(shopeeSyncLogs.id, logId));
    throw e;
  }
}

/** Backfill histórico: varre create_time em janelas de 15 dias até agora. */
export async function backfillOrders(integrationId: string, fromDate: Date): Promise<void> {
  const db = getDb();
  const integ = await getIntegration(integrationId);
  const env = await getShopeeEnv(integ.companyId);
  if (!env) throw new Error("Configure o Partner ID e a Partner Key da Shopee primeiro.");

  const logId = crypto.randomUUID();
  await db.insert(shopeeSyncLogs).values({
    id: logId,
    integrationId,
    syncType: "backfill",
    status: "running",
    message: "Iniciando...",
    startedAt: nowIso(),
  });

  let imported = 0;
  let pendingCount = 0;
  try {
    const now = Math.floor(Date.now() / 1000);
    const windowS = 15 * 24 * 60 * 60 - 60;
    let from = Math.floor(fromDate.getTime() / 1000);

    while (from < now) {
      const to = Math.min(from + windowS, now);
      const { accessToken, shopId } = await ensureToken(env, integ);
      const orderList = await listOrders(env, accessToken, shopId, from, to, "create_time");
      if (orderList.length) {
        const details = await getOrderDetails(env, accessToken, shopId, orderList.map((o) => o.order_sn));
        const result = await importOrders(integ, details);
        imported += result.imported;
        pendingCount += result.pending;
      }
      await db
        .update(shopeeSyncLogs)
        .set({
          message: `Até ${new Date(to * 1000).toLocaleDateString("pt-BR")}: ${imported} vendas, ${pendingCount} sem vínculo de produto`,
          ordersImported: imported,
          ordersPending: pendingCount,
        })
        .where(eq(shopeeSyncLogs.id, logId));
      from = to;
    }

    await db
      .update(shopeeSyncLogs)
      .set({
        status: "success",
        finishedAt: nowIso(),
        message: `Backfill concluído: ${imported} vendas importadas`,
      })
      .where(eq(shopeeSyncLogs.id, logId));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db
      .update(shopeeSyncLogs)
      .set({ status: "error", message, finishedAt: nowIso() })
      .where(eq(shopeeSyncLogs.id, logId));
  }
}
