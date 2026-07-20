import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, watchlistTable } from "@workspace/db";
import {
  AddToWatchlistBody,
  RemoveFromWatchlistParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /watchlist
router.get("/watchlist", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(watchlistTable)
    .orderBy(watchlistTable.addedAt);
  res.json(items.map((i) => ({ ...i, addedAt: i.addedAt.toISOString() })));
});

// POST /watchlist
router.post("/watchlist", async (req, res): Promise<void> => {
  const parsed = AddToWatchlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(watchlistTable)
    .values({ symbol: parsed.data.symbol.toUpperCase(), name: parsed.data.name })
    .returning();

  res.status(201).json({ ...item, addedAt: item.addedAt.toISOString() });
});

// DELETE /watchlist/:id
router.delete("/watchlist/:id", async (req, res): Promise<void> => {
  const params = RemoveFromWatchlistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(watchlistTable)
    .where(eq(watchlistTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Watchlist item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
