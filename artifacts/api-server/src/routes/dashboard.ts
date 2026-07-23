import { Router, type IRouter } from "express";
import { db, dealsTable, clientsTable, adAccountsTable, activitiesTable, usersTable } from "@workspace/db";
import { eq, sql, and, gte, lte, desc, ilike, or } from "drizzle-orm";
import { GetPipelineBoardQueryParams, GetRecentActivityQueryParams, GetReportsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

const STAGES = [
  "lead_captado",
  "qualificacao",
  "proposta",
  "negociacao",
  "fechamento",
  "onboarding",
  "ativo",
  "renovacao",
  "encerrado",
];

router.get("/dashboard/summary", requireAuth, async (_req, res): Promise<void> => {
  const [
    totalDealsResult,
    totalClientsResult,
    totalAdAccountsResult,
    activeAdAccountsResult,
    dealsByStageResult,
    closedDealsResult,
    avgTicketResult,
    totalPipelineResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(dealsTable),
    db.select({ count: sql<number>`count(*)` }).from(clientsTable),
    db.select({ count: sql<number>`count(*)` }).from(adAccountsTable),
    db.select({ count: sql<number>`count(*)` }).from(adAccountsTable).where(eq(adAccountsTable.status, "ativa")),
    db
      .select({
        stage: dealsTable.stage,
        count: sql<number>`count(*)`,
        totalValue: sql<number>`coalesce(sum(estimated_value::numeric), 0)`,
      })
      .from(dealsTable)
      .groupBy(dealsTable.stage),
    // closed this month
    db
      .select({ count: sql<number>`count(*)` })
      .from(dealsTable)
      .where(
        and(
          or(eq(dealsTable.stage, "fechamento"), eq(dealsTable.stage, "ativo")),
          gte(dealsTable.updatedAt, new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
        ),
      ),
    db
      .select({ avg: sql<number>`coalesce(avg(estimated_value::numeric), 0)` })
      .from(dealsTable)
      .where(or(eq(dealsTable.stage, "fechamento"), eq(dealsTable.stage, "ativo"), eq(dealsTable.stage, "renovacao"))),
    db
      .select({ total: sql<number>`coalesce(sum(estimated_value::numeric), 0)` })
      .from(dealsTable)
      .where(sql`stage NOT IN ('encerrado')`),
  ]);

  const stageMap = Object.fromEntries(dealsByStageResult.map((r) => [r.stage, r]));
  const dealsByStage = STAGES.map((stage) => ({
    stage,
    count: Number(stageMap[stage]?.count ?? 0),
    totalValue: Number(stageMap[stage]?.totalValue ?? 0),
  }));

  res.json({
    totalDeals: Number(totalDealsResult[0]?.count ?? 0),
    totalClients: Number(totalClientsResult[0]?.count ?? 0),
    totalAdAccounts: Number(totalAdAccountsResult[0]?.count ?? 0),
    activeAdAccounts: Number(activeAdAccountsResult[0]?.count ?? 0),
    dealsByStage,
    closedThisMonth: Number(closedDealsResult[0]?.count ?? 0),
    avgTicket: Number(avgTicketResult[0]?.avg ?? 0),
    totalPipelineValue: Number(totalPipelineResult[0]?.total ?? 0),
  });
});

router.get("/dashboard/pipeline", requireAuth, async (req, res): Promise<void> => {
  const query = GetPipelineBoardQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { owner_id, platform, search, start_date, end_date } = query.data;

  const conditions: any[] = [];
  if (owner_id) conditions.push(eq(dealsTable.ownerId, owner_id));
  if (platform) conditions.push(eq(dealsTable.platform, platform));
  if (search) conditions.push(ilike(dealsTable.title, `%${search}%`));
  if (start_date) conditions.push(gte(dealsTable.createdAt, new Date(start_date)));
  if (end_date) conditions.push(lte(dealsTable.createdAt, new Date(end_date + "T23:59:59")));

  const whereClause = conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined;

  const rawDeals = await db
    .select()
    .from(dealsTable)
    .where(whereClause)
    .orderBy(dealsTable.createdAt);

  // Batch client/owner names
  const clientIds = [...new Set(rawDeals.map((d) => d.clientId).filter(Boolean))] as number[];
  const ownerIds = [...new Set(rawDeals.map((d) => d.ownerId).filter(Boolean))] as number[];

  const [clients, owners] = await Promise.all([
    clientIds.length > 0 ? db.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable) : Promise.resolve([]),
    ownerIds.length > 0 ? db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable) : Promise.resolve([]),
  ]);

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const ownerMap = Object.fromEntries(owners.map((u) => [u.id, u.name]));

  const enriched = rawDeals.map((d) => ({
    ...d,
    estimatedValue: d.estimatedValue ? Number(d.estimatedValue) : null,
    proposalValue: d.proposalValue ? Number(d.proposalValue) : null,
    adAccountLimit: d.adAccountLimit ? Number(d.adAccountLimit) : null,
    clientName: d.clientId ? (clientMap[d.clientId] ?? null) : null,
    ownerName: d.ownerId ? (ownerMap[d.ownerId] ?? null) : null,
  }));

  const stageMap = Object.fromEntries(STAGES.map((s) => [s, [] as typeof enriched]));
  for (const deal of enriched) {
    if (stageMap[deal.stage]) {
      stageMap[deal.stage].push(deal);
    }
  }

  const stages = STAGES.map((stage) => ({ stage, deals: stageMap[stage] ?? [] }));
  res.json({ stages });
});

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const query = GetRecentActivityQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const limit = query.data.limit ?? 20;

  const activities = await db
    .select({
      id: activitiesTable.id,
      dealId: activitiesTable.dealId,
      dealTitle: dealsTable.title,
      userId: activitiesTable.userId,
      userName: usersTable.name,
      type: activitiesTable.type,
      description: activitiesTable.description,
      createdAt: activitiesTable.createdAt,
    })
    .from(activitiesTable)
    .leftJoin(dealsTable, eq(activitiesTable.dealId, dealsTable.id))
    .leftJoin(usersTable, eq(activitiesTable.userId, usersTable.id))
    .orderBy(desc(activitiesTable.createdAt))
    .limit(limit);

  res.json(activities);
});

router.get("/dashboard/reports", requireAuth, async (req, res): Promise<void> => {
  const query = GetReportsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { start_date, end_date } = query.data;

  const dateConditions: any[] = [];
  if (start_date) dateConditions.push(gte(dealsTable.createdAt, new Date(start_date)));
  if (end_date) dateConditions.push(lte(dealsTable.createdAt, new Date(end_date)));
  const dateWhere = dateConditions.length > 0 ? and(...dateConditions) : undefined;

  const [dealsByStageResult, closedResult, churnResult] = await Promise.all([
    db
      .select({
        stage: dealsTable.stage,
        count: sql<number>`count(*)`,
        totalValue: sql<number>`coalesce(sum(estimated_value::numeric), 0)`,
      })
      .from(dealsTable)
      .where(dateWhere)
      .groupBy(dealsTable.stage),
    db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(estimated_value::numeric), 0)`,
        avg: sql<number>`coalesce(avg(estimated_value::numeric), 0)`,
      })
      .from(dealsTable)
      .where(
        and(
          or(eq(dealsTable.stage, "fechamento"), eq(dealsTable.stage, "ativo"), eq(dealsTable.stage, "renovacao")),
          dateWhere,
        ),
      ),
    db
      .select({
        reason: dealsTable.rentalStatus,
        count: sql<number>`count(*)`,
      })
      .from(dealsTable)
      .where(and(eq(dealsTable.stage, "encerrado"), dateWhere))
      .groupBy(dealsTable.rentalStatus),
  ]);

  const stageMap = Object.fromEntries(dealsByStageResult.map((r) => [r.stage, r]));
  const dealsByStage = STAGES.map((stage) => ({
    stage,
    count: Number(stageMap[stage]?.count ?? 0),
    totalValue: Number(stageMap[stage]?.totalValue ?? 0),
  }));

  res.json({
    dealsByStage,
    closedDeals: Number(closedResult[0]?.count ?? 0),
    closedValue: Number(closedResult[0]?.total ?? 0),
    avgTicket: Number(closedResult[0]?.avg ?? 0),
    churnReasons: churnResult.map((r) => ({
      reason: r.reason ?? "Não informado",
      count: Number(r.count),
    })),
  });
});

// GET /dashboard/monthly-pipeline?year=2026&month=7
router.get("/dashboard/monthly-pipeline", requireAuth, async (req, res): Promise<void> => {
  const year = parseInt(req.query["year"] as string ?? `${new Date().getFullYear()}`);
  const month = parseInt(req.query["month"] as string ?? `${new Date().getMonth() + 1}`);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    res.status(400).json({ error: "Invalid year or month" });
    return;
  }

  const ym = `${year}-${String(month).padStart(2, "0")}`;

  // Active clients: deals in 'ativo' with activeMonth = ym
  const rawActive = await db
    .select()
    .from(dealsTable)
    .where(and(eq(dealsTable.stage, "ativo"), eq(dealsTable.activeMonth, ym)));

  // Churn: deals in 'encerrado' with churnMonth = ym
  const rawChurn = await db
    .select()
    .from(dealsTable)
    .where(and(eq(dealsTable.stage, "encerrado"), eq(dealsTable.churnMonth, ym)));

  // Batch-load client and owner names for both sets
  const allDeals = [...rawActive, ...rawChurn];
  const clientIds = [...new Set(allDeals.map((d) => d.clientId).filter(Boolean))] as number[];
  const ownerIds = [...new Set(allDeals.map((d) => d.ownerId).filter(Boolean))] as number[];

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

  function enrichForMonthly(d: typeof dealsTable.$inferSelect) {
    return {
      ...d,
      estimatedValue: d.estimatedValue ? Number(d.estimatedValue) : null,
      clientName: d.clientId ? (clientMap[d.clientId] ?? null) : null,
      ownerName: d.ownerId ? (ownerMap[d.ownerId] ?? null) : null,
    };
  }

  const activeDeals = rawActive.map(enrichForMonthly);
  const churnDeals = rawChurn.map(enrichForMonthly);

  const totalActiveValue = activeDeals.reduce((sum, d) => sum + (d.estimatedValue ?? 0), 0);
  const avgTicket = activeDeals.length > 0 ? totalActiveValue / activeDeals.length : 0;
  const churnRate = activeDeals.length + churnDeals.length > 0
    ? (churnDeals.length / (activeDeals.length + churnDeals.length)) * 100
    : 0;

  res.json({
    year,
    month,
    ym,
    activeDeals,
    churnDeals,
    totalActive: activeDeals.length,
    totalChurn: churnDeals.length,
    totalActiveValue,
    avgTicket,
    churnRate: Math.round(churnRate * 100) / 100,
  });
});

export default router;
