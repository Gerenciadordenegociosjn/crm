import { Router, type IRouter } from "express";
import { db, adAccountsTable, clientsTable, suppliersTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  CreateAdAccountBody,
  UpdateAdAccountBody,
  GetAdAccountParams,
  UpdateAdAccountParams,
  DeleteAdAccountParams,
  ListAdAccountsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

async function enrichAdAccount(acc: typeof adAccountsTable.$inferSelect) {
  const [client] = acc.clientId
    ? await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, acc.clientId))
    : [null];
  const [supplier] = acc.supplierId
    ? await db.select({ name: suppliersTable.companyName }).from(suppliersTable).where(eq(suppliersTable.id, acc.supplierId))
    : [null];
  return {
    ...acc,
    monthlyLimit: acc.monthlyLimit ? Number(acc.monthlyLimit) : null,
    clientName: client?.name ?? null,
    supplierName: supplier?.name ?? null,
  };
}

router.get("/ad-accounts", requireAuth, async (req: any, res): Promise<void> => {
  const query = ListAdAccountsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { client_id, platform, status, page = 1, limit = 20 } = query.data;
  const offset = (page - 1) * limit;

  const conditions: any[] = [];

  // Sales users can only see ad accounts for their own clients
  if (req.userRole === "sales") {
    const ownedClientIds = db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(eq(clientsTable.assignedSalesId, req.userId));
    conditions.push(inArray(adAccountsTable.clientId, ownedClientIds));
  }

  if (client_id) conditions.push(eq(adAccountsTable.clientId, client_id));
  if (platform) conditions.push(eq(adAccountsTable.platform, platform));
  if (status) conditions.push(eq(adAccountsTable.status, status));

  const whereClause = conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined;

  const [raw, countResult] = await Promise.all([
    db
      .select()
      .from(adAccountsTable)
      .where(whereClause)
      .orderBy(adAccountsTable.createdAt)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(adAccountsTable).where(whereClause),
  ]);

  // Batch client + supplier names
  const clientIds = [...new Set(raw.map((a) => a.clientId).filter(Boolean))] as number[];
  const supplierIds = [...new Set(raw.map((a) => a.supplierId).filter(Boolean))] as number[];
  const [clients, suppliers] = await Promise.all([
    clientIds.length > 0
      ? db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable)
      : Promise.resolve([]),
    supplierIds.length > 0
      ? db.select({ id: suppliersTable.id, name: suppliersTable.companyName }).from(suppliersTable)
      : Promise.resolve([]),
  ]);
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

  const data = raw.map((a) => ({
    ...a,
    monthlyLimit: a.monthlyLimit ? Number(a.monthlyLimit) : null,
    clientName: a.clientId ? (clientMap[a.clientId] ?? null) : null,
    supplierName: a.supplierId ? (supplierMap[a.supplierId] ?? null) : null,
  }));

  res.json({ data, total: Number(countResult[0]?.count ?? 0), page, limit });
});

router.post("/ad-accounts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAdAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data as any;
  const insertData = {
    ...d,
    monthlyLimit: d.monthlyLimit?.toString(),
    startDate: d.startDate ? String(d.startDate).slice(0, 10) : undefined,
    endDate: d.endDate ? String(d.endDate).slice(0, 10) : undefined,
  };
  const [acc] = await db.insert(adAccountsTable).values(insertData).returning();
  res.status(201).json(await enrichAdAccount(acc));
});

router.get("/ad-accounts/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetAdAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [acc] = await db.select().from(adAccountsTable).where(eq(adAccountsTable.id, params.data.id));
  if (!acc) {
    res.status(404).json({ error: "Ad account not found" });
    return;
  }

  // Sales users can only view accounts for their own clients
  if (req.userRole === "sales") {
    if (!acc.clientId) {
      res.status(404).json({ error: "Ad account not found" });
      return;
    }
    const [client] = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(and(eq(clientsTable.id, acc.clientId), eq(clientsTable.assignedSalesId, req.userId)));
    if (!client) {
      res.status(404).json({ error: "Ad account not found" });
      return;
    }
  }

  res.json(await enrichAdAccount(acc));
});

router.patch("/ad-accounts/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateAdAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAdAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // For sales users, verify the account belongs to one of their clients
  // and that any requested clientId reassignment also targets their own client
  if (req.userRole === "sales") {
    const [existing] = await db
      .select({ clientId: adAccountsTable.clientId })
      .from(adAccountsTable)
      .where(eq(adAccountsTable.id, params.data.id));

    if (!existing) {
      res.status(404).json({ error: "Ad account not found" });
      return;
    }

    // Current client must belong to this sales user
    if (existing.clientId) {
      const [client] = await db
        .select({ id: clientsTable.id })
        .from(clientsTable)
        .where(and(eq(clientsTable.id, existing.clientId), eq(clientsTable.assignedSalesId, req.userId)));

      if (!client) {
        res.status(403).json({ error: "Acesso negado" });
        return;
      }
    } else {
      // Account has no client — sales users cannot edit unassigned accounts
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    // If a new clientId is being set, it must also belong to this sales user
    const pd = parsed.data as any;
    if (pd.clientId != null && pd.clientId !== existing.clientId) {
      const [targetClient] = await db
        .select({ id: clientsTable.id })
        .from(clientsTable)
        .where(and(eq(clientsTable.id, pd.clientId), eq(clientsTable.assignedSalesId, req.userId)));

      if (!targetClient) {
        res.status(403).json({ error: "Acesso negado" });
        return;
      }
    }
  }

  const pd = parsed.data as any;
  const updateData = {
    ...pd,
    monthlyLimit: pd.monthlyLimit?.toString(),
    startDate: pd.startDate ? String(pd.startDate).slice(0, 10) : undefined,
    endDate: pd.endDate ? String(pd.endDate).slice(0, 10) : undefined,
  };
  const [acc] = await db
    .update(adAccountsTable)
    .set(updateData)
    .where(eq(adAccountsTable.id, params.data.id))
    .returning();

  if (!acc) {
    res.status(404).json({ error: "Ad account not found" });
    return;
  }

  res.json(await enrichAdAccount(acc));
});

router.delete("/ad-accounts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAdAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [acc] = await db.delete(adAccountsTable).where(eq(adAccountsTable.id, params.data.id)).returning();
  if (!acc) {
    res.status(404).json({ error: "Ad account not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
