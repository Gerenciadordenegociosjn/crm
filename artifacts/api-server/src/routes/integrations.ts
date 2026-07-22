import { Router, type IRouter } from "express";
import { db, clientsTable, dealsTable, activitiesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import {
  WhatsappCreateLeadBody,
  WhatsappUpdateDealStageBody,
  WhatsappUpdateClientBody,
  WhatsappGetClientByPhoneQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const INTEGRATION_KEY = process.env["INTEGRATION_KEY"] ?? "whatsapp-integration-dev-key";

function requireIntegrationKey(req: any, res: any, next: any): void {
  const key = req.headers["x-integration-key"];
  if (key !== INTEGRATION_KEY) {
    res.status(401).json({ error: "Invalid integration key" });
    return;
  }
  next();
}

router.post("/integrations/whatsapp/leads", requireIntegrationKey, async (req, res): Promise<void> => {
  const parsed = WhatsappCreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { externalId, name, phone, niche, platforms, estimatedInvestment, hasBlockHistory, blockDescription } = parsed.data;

  // Find existing client by phone or externalId
  let client: typeof clientsTable.$inferSelect | undefined;
  if (phone || externalId) {
    const conditions: any[] = [];
    if (phone) conditions.push(eq(clientsTable.phone, phone));
    if (externalId) conditions.push(eq(clientsTable.externalId, externalId));
    [client] = await db.select().from(clientsTable).where(conditions.length === 1 ? conditions[0] : or(...conditions));
  }

  if (client) {
    // Update existing client
    [client] = await db
      .update(clientsTable)
      .set({ name, phone: phone ?? client.phone, externalId: externalId ?? client.externalId })
      .where(eq(clientsTable.id, client.id))
      .returning();
  } else {
    // Create new client
    [client] = await db
      .insert(clientsTable)
      .values({ name, phone, externalId, status: "ativo" })
      .returning();
  }

  const platform = platforms && platforms.length > 0 ? platforms.join(", ") : undefined;
  const title = `Lead WhatsApp – ${name}${niche ? ` (${niche})` : ""}`;

  const [deal] = await db
    .insert(dealsTable)
    .values({
      title,
      clientId: client.id,
      stage: "lead_captado",
      platform,
      estimatedValue: estimatedInvestment?.toString(),
      niche,
      leadSource: "WhatsApp",
      hasBlockHistory: hasBlockHistory ?? null,
      blockDescription: blockDescription ?? null,
    })
    .returning();

  await db.insert(activitiesTable).values({
    dealId: deal.id,
    userId: null,
    type: "contact",
    description: `Lead criado via WhatsApp pela IA. Cliente: ${name}${niche ? `, nicho: ${niche}` : ""}${estimatedInvestment ? `, investimento: R$ ${estimatedInvestment}` : ""}`,
  });

  res.json({ client, deal: { ...deal, estimatedValue: deal.estimatedValue ? Number(deal.estimatedValue) : null } });
});

router.post("/integrations/whatsapp/deals/update-stage", requireIntegrationKey, async (req, res): Promise<void> => {
  const parsed = WhatsappUpdateDealStageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { dealId, newStage, reason } = parsed.data;

  const [existingDeal] = await db.select().from(dealsTable).where(eq(dealsTable.id, dealId));
  if (!existingDeal) {
    res.status(404).json({ error: "Deal not found" });
    return;
  }

  const [deal] = await db
    .update(dealsTable)
    .set({ stage: newStage, updatedAt: new Date() })
    .where(eq(dealsTable.id, dealId))
    .returning();

  await db.insert(activitiesTable).values({
    dealId,
    userId: null,
    type: "stage_change",
    description: reason ?? `Etapa atualizada via WhatsApp de ${existingDeal.stage} para ${newStage}`,
  });

  res.json({ ...deal, estimatedValue: deal.estimatedValue ? Number(deal.estimatedValue) : null });
});

router.post("/integrations/whatsapp/clients/update", requireIntegrationKey, async (req, res): Promise<void> => {
  const parsed = WhatsappUpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, ...updates } = parsed.data;

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.phone, phone));
  if (!client) {
    res.status(404).json({ error: "Client not found with this phone number" });
    return;
  }

  const [updated] = await db
    .update(clientsTable)
    .set({
      name: updates.name ?? client.name,
      status: updates.status ?? client.status,
    })
    .where(eq(clientsTable.id, client.id))
    .returning();

  res.json(updated);
});

router.get("/integrations/whatsapp/client-by-phone", requireIntegrationKey, async (req, res): Promise<void> => {
  const query = WhatsappGetClientByPhoneQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.phone, query.data.phone));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const deals = await db
    .select()
    .from(dealsTable)
    .where(eq(dealsTable.clientId, client.id))
    .orderBy(dealsTable.updatedAt);

  res.json({
    client,
    deals: deals.map((d) => ({ ...d, estimatedValue: d.estimatedValue ? Number(d.estimatedValue) : null })),
  });
});

export default router;
