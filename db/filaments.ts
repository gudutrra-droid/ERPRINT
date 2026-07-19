import { asc, desc, eq } from "drizzle-orm";
import { getDb } from ".";
import { filaments } from "./schema";

export async function getFilamentsForCompany(companyId: string) {
  return getDb()
    .select()
    .from(filaments)
    .where(eq(filaments.companyId, companyId))
    .orderBy(desc(filaments.active), asc(filaments.name));
}
