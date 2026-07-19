import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from ".";
import { salesChannelFeeRanges, salesChannels } from "./schema";

export async function getSalesChannelsForCompany(companyId: string) {
  const db = getDb();
  const channels = await db
    .select()
    .from(salesChannels)
    .where(eq(salesChannels.companyId, companyId))
    .orderBy(desc(salesChannels.active), asc(salesChannels.name));

  if (channels.length === 0) return [];

  const ranges = await db
    .select()
    .from(salesChannelFeeRanges)
    .where(inArray(salesChannelFeeRanges.salesChannelId, channels.map((channel) => channel.id)))
    .orderBy(asc(salesChannelFeeRanges.position), asc(salesChannelFeeRanges.minSaleCents));

  return channels.map((channel) => ({
    ...channel,
    feeRanges: ranges.filter((range) => range.salesChannelId === channel.id),
  }));
}
