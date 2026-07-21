import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from ".";
import { adSpend, sales, salesChannels } from "./schema";

export type SalesPeriod = "7d" | "30d" | "90d" | "all";

function sinceIsoFor(period: SalesPeriod): string | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export interface SalesSummary {
  revenueCents: number;
  orders: number;
  units: number;
  ticketCents: number;
  adSpendCents: number;
}

export async function getSalesForCompany(companyId: string, period: SalesPeriod, limit = 100) {
  const db = getDb();
  const since = sinceIsoFor(period);
  const where = since
    ? and(eq(sales.companyId, companyId), gte(sales.saleDate, since))
    : eq(sales.companyId, companyId);

  const rows = await db
    .select({
      id: sales.id,
      saleDate: sales.saleDate,
      quantity: sales.quantity,
      saleValueCents: sales.saleValueCents,
      orderNumber: sales.orderNumber,
      orderStatus: sales.orderStatus,
      buyerUsername: sales.buyerUsername,
      source: sales.source,
      itemName: sales.itemName,
      itemSku: sales.itemSku,
      imageUrl: sales.imageUrl,
      channelName: salesChannels.name,
    })
    .from(sales)
    .leftJoin(salesChannels, eq(sales.salesChannelId, salesChannels.id))
    .where(where)
    .orderBy(desc(sales.saleDate))
    .limit(limit);

  return rows;
}

export async function getSalesSummary(companyId: string, period: SalesPeriod): Promise<SalesSummary> {
  const db = getDb();
  const since = sinceIsoFor(period);
  const where = since
    ? and(eq(sales.companyId, companyId), gte(sales.saleDate, since))
    : eq(sales.companyId, companyId);

  const rows = await db
    .select({
      quantity: sales.quantity,
      saleValueCents: sales.saleValueCents,
      orderNumber: sales.orderNumber,
    })
    .from(sales)
    .where(where);

  const orderSet = new Set<string>();
  let revenueCents = 0;
  let units = 0;
  for (const r of rows) {
    revenueCents += r.saleValueCents * r.quantity;
    units += r.quantity;
    orderSet.add(r.orderNumber ?? r.saleValueCents.toString());
  }
  const orders = orderSet.size;

  const adWhere = since
    ? and(eq(adSpend.companyId, companyId), gte(adSpend.spendDate, since.slice(0, 10)))
    : eq(adSpend.companyId, companyId);
  const adRows = await db
    .select({ amountCents: adSpend.amountCents })
    .from(adSpend)
    .where(adWhere);
  const adSpendCents = adRows.reduce((sum, a) => sum + a.amountCents, 0);

  return {
    revenueCents,
    orders,
    units,
    ticketCents: orders > 0 ? Math.round(revenueCents / orders) : 0,
    adSpendCents,
  };
}
