import { asc, desc, eq } from "drizzle-orm";
import { getDb } from ".";
import { printers } from "./schema";

export async function getPrintersForCompany(companyId: string) {
  return getDb()
    .select()
    .from(printers)
    .where(eq(printers.companyId, companyId))
    .orderBy(desc(printers.active), asc(printers.name));
}
