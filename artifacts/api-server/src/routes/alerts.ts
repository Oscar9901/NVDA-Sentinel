import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, alertsTable } from "@workspace/db";
import {
  CreateAlertBody,
  UpdateAlertParams,
  UpdateAlertBody,
  DeleteAlertParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const formatAlert = (a: typeof alertsTable.$inferSelect) => ({
  id: a.id,
  symbol: a.symbol,
  condition: a.condition,
  targetPrice: parseFloat(a.targetPrice),
  note: a.note ?? null,
  isActive: a.isActive,
  createdAt: a.createdAt.toISOString(),
  triggeredAt: a.triggeredAt ? a.triggeredAt.toISOString() : null,
});

// GET /alerts
router.get("/alerts", async (_req, res): Promise<void> => {
  const alerts = await db.select().from(alertsTable).orderBy(alertsTable.createdAt);
  res.json(alerts.map(formatAlert));
});

// POST /alerts
router.post("/alerts", async (req, res): Promise<void> => {
  const parsed = CreateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const [alert] = await db
    .insert(alertsTable)
    .values({
      symbol: d.symbol.toUpperCase(),
      condition: d.condition as "above" | "below",
      targetPrice: String(d.targetPrice),
      note: d.note ?? null,
      isActive: true,
    })
    .returning();

  res.status(201).json(formatAlert(alert));
});

// PATCH /alerts/:id
router.patch("/alerts/:id", async (req, res): Promise<void> => {
  const params = UpdateAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.targetPrice != null) updates.targetPrice = String(d.targetPrice);
  if (d.condition) updates.condition = d.condition;
  if (d.note !== undefined) updates.note = d.note;
  if (d.isActive !== undefined) {
    updates.isActive = d.isActive;
    if (d.isActive === false && !updates.triggeredAt) {
      updates.triggeredAt = new Date();
    }
  }

  const [alert] = await db
    .update(alertsTable)
    .set(updates)
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(formatAlert(alert));
});

// DELETE /alerts/:id
router.delete("/alerts/:id", async (req, res): Promise<void> => {
  const params = DeleteAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(alertsTable)
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
