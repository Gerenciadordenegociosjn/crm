import { Router, type IRouter } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq, ilike, or, sql } from "drizzle-orm";
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

router.get("/clients", requireAuth, async (req, res): Promise<void> => {
  const query = ListClientsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, status, page = 1, limit = 20 } = query.data;
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
  if (status) {
    conditions.push(eq(clientsTable.status, status));
  }

  const whereClause = conditions.length > 0 ? conditions[0] : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(clientsTable)
      .where(whereClause)
      .orderBy(clientsTable.name)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(clientsTable).where(whereClause),
  ]);

  res.json({ data, total: Number(countResult[0]?.count ?? 0), page, limit });
});

router.post("/clients", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db.insert(clientsTable).values(parsed.data).returning();
  res.status(201).json(client);
});

router.get("/clients/:id", requireAuth, async (req, res): Promise<void> => {
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

  const [deals, adAccounts] = await Promise.all([
    db.select().from(dealsTable).where(eq(dealsTable.clientId, params.data.id)).orderBy(dealsTable.createdAt),
    db.select().from(adAccountsTable).where(eq(adAccountsTable.clientId, params.data.id)).orderBy(adAccountsTable.createdAt),
  ]);

  res.json({ client, deals, adAccounts });
});

router.patch("/clients/:id", requireAuth, async (req, res): Promise<void> => {
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

  const [client] = await db
    .update(clientsTable)
    .set(parsed.data)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(client);
});

router.delete("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.update(clientsTable).set({ status: "inativo" }).where(eq(clientsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
