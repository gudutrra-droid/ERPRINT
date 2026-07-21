import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from ".";
import { productSupplies, products } from "./schema";

export async function getProductsForCompany(companyId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.companyId, companyId))
    .orderBy(desc(products.active), asc(products.name));

  if (rows.length === 0) return [];
  const psRows = await db
    .select()
    .from(productSupplies)
    .where(inArray(productSupplies.productId, rows.map((p) => p.id)));

  return rows.map((p) => ({
    ...p,
    supplies: psRows.filter((ps) => ps.productId === p.id),
  }));
}

export async function getProductForCompany(companyId: string, productId: string) {
  const db = getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
    .limit(1);
  if (!product) return null;
  const ps = await db.select().from(productSupplies).where(eq(productSupplies.productId, product.id));
  return { ...product, supplies: ps };
}
