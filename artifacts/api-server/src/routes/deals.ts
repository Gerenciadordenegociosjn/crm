import { Router, type IRouter } from "express";
import { db, dealsTable, usersTable, clientsTable, activitiesTable } from "@workspace/db";
import { eq, ilike, or, sql, and } from "drizzle-orm";
import {
  CreateDealBody,
  UpdateDealBody,
  GetDealParams,
  UpdateDealParams,
  DeleteDealParams,
  ListDealsQueryParams,
  UpdateDealStageParams,
  UpdateDealStageBody,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

async function enrichDeal(deal: typeof dealsTable.$inferSelect) {
  const [client] = deal.clientId
    ? await db.select({ name: clientsTable.name }).from(clientsTable).where(eq(clientsTable.id, deal.clientId))
    : [null];
  const [owner] = deal.ownerId
    ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, deal.ownerId))
    : [null];

  return {
    ...deal,
    estimatedValue: deal.estimatedValue ? Number(deal.estimatedValue) : null,
    proposalValue: deal.proposalValue ? Number(deal.proposalValue) : null,
    adAccountLimit: deal.adAccountLimit ? Number(deal.adAccountLimit) : null,
    clientName: client?.name ?? null,
    ownerName: owner?.name ?? null,
  };
}

router.get("/deals", requireAuth, async (req, res): Promise<void> => {
  const query = ListDealsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { stage, owner_id, platform, search, page = 1, limit = 50 } = query.data;
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (stage) conditions.push(eq(dealsTable.stage, stage));
  if (owner_id) conditions.push(eq(dealsTable.ownerId, owner_id));
  if (platform) conditions.push(eq(dealsTable.platform, platform));
  if (search) {
    conditions.push(ilike(dealsTable.title, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined;

  const [rawDeals, countResult] = await Promise.all([
    db
      .select()
      .from(dealsTable)
      .where(whereClause)
      .orderBy(dealsTable.createdAt)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(dealsTable).where(whereClause),
  ]);

  // Batch-load client/owner names
  const clientIds = [...new Set(rawDeals.map((d) => d.clientId).filter(Boolean))] as number[];
  const ownerIds = [...new Set(rawDeals.map((d) => d.ownerId).filter(Boolean))] as number[];

  const [clients, owners] = await Promise.all([
    clientIds.length > 0
      ? db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable)
      : Promise.resolve([]),
    ownerIds.length > 0
      ? db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
      : Promise.resolve([]),
  ]);

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const ownerMap = Object.fromEntries(owners.map((u) => [u.id, u.name]));

  const data = rawDeals.map((d) => ({
    ...d,
    estimatedValue: d.estimatedValue ? Number(d.estimatedValue) : null,
    proposalValue: d.proposalValue ? Number(d.proposalValue) : null,
    adAccountLimit: d.adAccountLimit ? Number(d.adAccountLimit) : null,
    clientName: d.clientId ? (clientMap[d.clientId] ?? null) : null,
    ownerName: d.ownerId ? (ownerMap[d.ownerId] ?? null) : null,
  }));

  res.json({ data, total: Number(countResult[0]?.count ?? 0), page, limit });
});

router.post("/deals", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = CreateDealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data as any;
  const insertData = {
    ...d,
    estimatedValue: d.estimatedValue?.toString(),
    proposalValue: d.proposalValue?.toString(),
    adAccountLimit: d.adAccountLimit?.toString(),
    acceptanceDate: d.acceptanceDate ? String(d.acceptanceDate).slice(0, 10) : undefined,
    contractEndDate: d.contractEndDate ? String(d.contractEndDate).slice(0, 10) : undefined,
  };
  const [deal] = await db.insert(dealsTable).values(insertData).returning();

  // Log activity
  await db.insert(activitiesTable).values({
    dealId: deal.id,
    userId: req.userId,
    type: "stage_change",
    description: `Negócio criado na etapa: ${deal.stage}`,
  });

  res.status(201).json(await enrichDeal(deal));
});

router.get("/deals/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetDealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deal] = await db.select().from(dealsTable).where(eq(dealsTable.id, params.data.id));
  if (!deal) {
    res.status(404).json({ error: "Deal not found" });
    return;
  }

  const activities = await db
    .select({
      id: activitiesTable.id,
      dealId: activitiesTable.dealId,
      userId: activitiesTable.userId,
      userName: usersTable.name,
      type: activitiesTable.type,
      description: activitiesTable.description,
      createdAt: activitiesTable.createdAt,
    })
    .from(activitiesTable)
    .leftJoin(usersTable, eq(activitiesTable.userId, usersTable.id))
    .where(eq(activitiesTable.dealId, params.data.id))
    .orderBy(activitiesTable.createdAt);

  res.json({ deal: await enrichDeal(deal), activities });
});

router.patch("/deals/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateDealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const pd = parsed.data as any;
  const updateData = {
    ...pd,
    estimatedValue: pd.estimatedValue?.toString(),
    proposalValue: pd.proposalValue?.toString(),
    adAccountLimit: pd.adAccountLimit?.toString(),
    acceptanceDate: pd.acceptanceDate ? String(pd.acceptanceDate).slice(0, 10) : undefined,
    contractEndDate: pd.contractEndDate ? String(pd.contractEndDate).slice(0, 10) : undefined,
    updatedAt: new Date(),
  };
  const [deal] = await db
    .update(dealsTable)
    .set(updateData)
    .where(eq(dealsTable.id, params.data.id))
    .returning();

  if (!deal) {
    res.status(404).json({ error: "Deal not found" });
    return;
  }

  res.json(await enrichDeal(deal));
});

router.delete("/deals/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteDealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deal] = await db.delete(dealsTable).where(eq(dealsTable.id, params.data.id)).returning();
  if (!deal) {
    res.status(404).json({ error: "Deal not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/deals/:id/stage", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateDealStageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDealStageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existingDeal] = await db.select().from(dealsTable).where(eq(dealsTable.id, params.data.id));
  if (!existingDeal) {
    res.status(404).json({ error: "Deal not found" });
    return;
  }

  const [deal] = await db
    .update(dealsTable)
    .set({ stage: parsed.data.stage, updatedAt: new Date() })
    .where(eq(dealsTable.id, params.data.id))
    .returning();

  await db.insert(activitiesTable).values({
    dealId: deal.id,
    userId: req.userId ?? null,
    type: "stage_change",
    description: parsed.data.reason ?? `Etapa alterada de ${existingDeal.stage} para ${parsed.data.stage}`,
  });

  res.json(await enrichDeal(deal));
});

export default router;
