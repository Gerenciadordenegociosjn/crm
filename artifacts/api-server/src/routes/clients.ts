import { Router, type IRouter } from "express";
import { db, clientsTable, usersTable } from "@workspace/db";
import { eq, ilike, or, sql, and, inArray } from "drizzle-orm";
import {
  CreateClientBody,
  UpdateClientBody,
  GetClientParams,
  UpdateClientParams,
  DeleteClientParams,
  ListClientsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";
import { dealsTable } from "@workspace/db";
import { adAccountsTable } from "@workspace/db";

const router: IRouter = Router();

async function enrichClient(client: typeof clientsTable.$inferSelect) {
  const [salesUser] = client.assignedSalesId
    ? await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, client.assignedSalesId))
    : [null];
  return { ...client, assignedSalesName: salesUser?.name ?? null };
}

// ─── List clients ────────────────────────────────────────────────────────────
router.get("/clients", requireAuth, async (req: any, res): Promise<void> => {
  const query = ListClientsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, status, page = 1, limit = 20 } = query.data as any;

  // Sales role: always scoped to their own clients only
  const salesFilterId: number | null =
    req.userRole === "sales"
      ? req.userId
      : (query.data as any).assigned_sales_id
        ? Number((query.data as any).assigned_sales_id)
        : null;

  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (search) {
    conditions.push(
      or(
        ilike(clientsTable.name, `%${search}%`),
        ilike(clientsTable.contactName, `%${search}%`),
        ilike(clientsTable.email, `%${search}%`),
      ),
    );
  }
  if (status) conditions.push(eq(clientsTable.status, status));
  if (salesFilterId) conditions.push(eq(clientsTable.assignedSalesId, salesFilterId));

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const [data, countResult] = await Promise.all([
    db.select().from(clientsTable).where(whereClause).orderBy(clientsTable.name).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(clientsTable).where(whereClause),
  ]);

  const salesIds = [...new Set(data.map((c) => c.assignedSalesId).filter(Boolean))] as number[];
  const salesUsers =
    salesIds.length > 0
      ? await db
          .select({ id: usersTable.id, name: usersTable.name })
          .from(usersTable)
          .where(inArray(usersTable.id, salesIds))
      : [];
  const salesMap = Object.fromEntries(salesUsers.map((u) => [u.id, u.name]));

  const enriched = data.map((c) => ({
    ...c,
    assignedSalesName: c.assignedSalesId ? (salesMap[c.assignedSalesId] ?? null) : null,
  }));

  res.json({ data: enriched, total: Number(countResult[0]?.count ?? 0), page, limit });
});

// ─── Create client ───────────────────────────────────────────────────────────
router.post("/clients", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const values = { ...parsed.data } as any;

  // Sales role: always assigned to themselves, regardless of payload
  if (req.userRole === "sales") {
    values.assignedSalesId = req.userId;
  }

  const [client] = await db.insert(clientsTable).values(values).returning();
  res.status(201).json(await enrichClient(client));
});

// ─── Get client detail ───────────────────────────────────────────────────────
router.get("/clients/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  // Sales role: can only access their own clients
  if (req.userRole === "sales" && client.assignedSalesId !== req.userId) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }

  const [deals, adAccounts] = await Promise.all([
    db.select().from(dealsTable).where(eq(dealsTable.clientId, params.data.id)).orderBy(dealsTable.createdAt),
    db.select().from(adAccountsTable).where(eq(adAccountsTable.clientId, params.data.id)).orderBy(adAccountsTable.createdAt),
  ]);

  res.json({ client: await enrichClient(client), deals, adAccounts });
});

// ─── Update client ───────────────────────────────────────────────────────────
router.patch("/clients/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Sales role: verify ownership before allowing update
  if (req.userRole === "sales") {
    const [existing] = await db.select({ assignedSalesId: clientsTable.assignedSalesId })
      .from(clientsTable)
      .where(eq(clientsTable.id, params.data.id));

    if (!existing || existing.assignedSalesId !== req.userId) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    // Sales cannot reassign the client to another user
    delete (parsed.data as any).assignedSalesId;
  }

  const [client] = await db
    .update(clientsTable)
    .set(parsed.data as any)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(await enrichClient(client));
});

// ─── Delete client (soft) ────────────────────────────────────────────────────
router.delete("/clients/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Sales role: verify ownership
  if (req.userRole === "sales") {
    const [existing] = await db.select({ assignedSalesId: clientsTable.assignedSalesId })
      .from(clientsTable)
      .where(eq(clientsTable.id, params.data.id));

    if (!existing || existing.assignedSalesId !== req.userId) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
  }

  await db.update(clientsTable).set({ status: "inativo" }).where(eq(clientsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
