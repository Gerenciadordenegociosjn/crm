import { Router } from "express";
import { db } from "@workspace/db";
import { suppliersTable, insertSupplierSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

// Partial update schema derived from insert schema
const SupplierUpdate = insertSupplierSchema.partial();
const SupplierInput = insertSupplierSchema;

function idParam(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function requireAdmin(req: any, res: any, next: any) {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

// GET /suppliers — all authenticated users (needed for supplier modal in pipeline)
router.get("/suppliers", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(suppliersTable)
    .orderBy(suppliersTable.companyName);
  res.json(rows);
});

// GET /suppliers/:id
router.get("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idParam(req.params["id"]);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
  if (!row) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(row);
});

// POST /suppliers — admin only
router.post("/suppliers", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const parsed = SupplierInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: String(parsed.error) }); return; }

  const [row] = await db.insert(suppliersTable).values(parsed.data).returning();
  res.status(201).json(row);
});

// PATCH /suppliers/:id — admin only
router.patch("/suppliers/:id", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const id = idParam(req.params["id"]);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = SupplierUpdate.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: String(parsed.error) }); return; }

  const [existing] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Supplier not found" }); return; }

  const [row] = await db
    .update(suppliersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(suppliersTable.id, id))
    .returning();
  res.json(row);
});

// DELETE /suppliers/:id — admin only
router.delete("/suppliers/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = idParam(req.params["id"]);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Supplier not found" }); return; }

  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
  res.status(204).send();
});

export default router;
