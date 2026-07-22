import { Router, type IRouter } from "express";
import { db, activitiesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListActivitiesParams, CreateActivityParams, CreateActivityBody } from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/deals/:dealId/activities", requireAuth, async (req, res): Promise<void> => {
  const params = ListActivitiesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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
    .where(eq(activitiesTable.dealId, params.data.dealId))
    .orderBy(activitiesTable.createdAt);

  res.json(activities);
});

router.post("/deals/:dealId/activities", requireAuth, async (req: any, res): Promise<void> => {
  const params = CreateActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [activity] = await db
    .insert(activitiesTable)
    .values({
      dealId: params.data.dealId,
      userId: req.userId ?? null,
      type: parsed.data.type,
      description: parsed.data.description,
    })
    .returning();

  // Fetch with user name
  const [withUser] = await db
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
    .where(eq(activitiesTable.id, activity.id));

  res.status(201).json(withUser);
});

export default router;
