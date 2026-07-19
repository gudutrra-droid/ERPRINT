import { asc, desc, eq } from "drizzle-orm";
import { getDb } from ".";
import { supplies } from "./schema";

export async function getSuppliesForCompany(companyId: string) {
  return getDb()
    .select()
    .from(supplies)
    .where(eq(supplies.companyId, companyId))
    .orderBy(desc(supplies.active), asc(supplies.name));
}
