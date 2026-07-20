import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import { db, tradesTable } from "@workspace/db";
import {
  CreateTradeBody,
  UpdateTradeParams,
  UpdateTradeBody,
  DeleteTradeParams,
  GetTradesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const formatTrade = (t: typeof tradesTable.$inferSelect) => ({
  id: t.id,
  symbol: t.symbol,
  side: t.side,
  quantity: parseFloat(t.quantity),
  price: parseFloat(t.price),
  fees: parseFloat(t.fees),
  pnl: t.pnl != null ? parseFloat(t.pnl) : null,
  notes: t.notes ?? null,
  tradedAt: t.tradedAt.toISOString(),
  assetType: t.assetType,
  contractType: t.contractType ?? null,
  strikePrice: t.strikePrice != null ? parseFloat(t.strikePrice) : null,
  expiryDate: t.expiryDate ?? null,
});

// GET /trades
router.get("/trades", async (req, res): Promise<void> => {
  const parsed = GetTradesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { symbol, limit = 50, offset = 0 } = parsed.data as {
    symbol?: string; limit?: number; offset?: number;
  };

  let query = db.select().from(tradesTable).$dynamic();
  if (symbol) {
    query = query.where(eq(tradesTable.symbol, symbol.toUpperCase()));
  }
  const trades = await query
    .orderBy(desc(tradesTable.tradedAt))
    .limit(limit)
    .offset(offset);

  res.json(trades.map(formatTrade));
});

// POST /trades
router.post("/trades", async (req, res): Promise<void> => {
  const parsed = CreateTradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const [trade] = await db
    .insert(tradesTable)
    .values({
      symbol: d.symbol.toUpperCase(),
      side: d.side as "buy" | "sell",
      quantity: String(d.quantity),
      price: String(d.price),
      fees: d.fees != null ? String(d.fees) : "0",
      pnl: d.pnl != null ? String(d.pnl) : null,
      notes: d.notes ?? null,
      tradedAt: d.tradedAt ? new Date(d.tradedAt) : new Date(),
      assetType: d.assetType ?? "stock",
      contractType: d.contractType ?? null,
      strikePrice: d.strikePrice != null ? String(d.strikePrice) : null,
      expiryDate: d.expiryDate ?? null,
    })
    .returning();

  res.status(201).json(formatTrade(trade));
});

// PATCH /trades/:id
router.patch("/trades/:id", async (req, res): Promise<void> => {
  const params = UpdateTradeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.price != null) updates.price = String(d.price);
  if (d.quantity != null) updates.quantity = String(d.quantity);
  if (d.fees != null) updates.fees = String(d.fees);
  if (d.pnl !== undefined) updates.pnl = d.pnl != null ? String(d.pnl) : null;
  if (d.notes !== undefined) updates.notes = d.notes;
  if (d.tradedAt) updates.tradedAt = new Date(d.tradedAt);

  const [trade] = await db
    .update(tradesTable)
    .set(updates)
    .where(eq(tradesTable.id, params.data.id))
    .returning();

  if (!trade) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  res.json(formatTrade(trade));
});

// DELETE /trades/:id
router.delete("/trades/:id", async (req, res): Promise<void> => {
  const params = DeleteTradeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(tradesTable)
    .where(eq(tradesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Trade not found" });
    return;
  }

  res.sendStatus(204);
});

// GET /trades/stats
router.get("/trades/stats", async (_req, res): Promise<void> => {
  const trades = await db.select().from(tradesTable).orderBy(asc(tradesTable.tradedAt));

  const closedTrades = trades.filter((t) => t.pnl != null);
  const pnls = closedTrades.map((t) => parseFloat(t.pnl!));
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);

  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  const largestWin = wins.length > 0 ? Math.max(...wins) : 0;
  const largestLoss = losses.length > 0 ? Math.abs(Math.min(...losses)) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;

  // Average holding period (hours) — pair buys and sells
  let totalHours = 0, pairedCount = 0;
  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i - 1];
    const curr = trades[i];
    if (prev.symbol === curr.symbol && prev.side === "buy" && curr.side === "sell") {
      const diffMs = curr.tradedAt.getTime() - prev.tradedAt.getTime();
      totalHours += diffMs / (1000 * 60 * 60);
      pairedCount++;
    }
  }

  res.json({
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closedTrades.length > 0 ? Math.round((wins.length / closedTrades.length) * 10000) / 100 : 0,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    largestWin: Math.round(largestWin * 100) / 100,
    largestLoss: Math.round(largestLoss * 100) / 100,
    avgHoldingPeriodHours: pairedCount > 0 ? Math.round((totalHours / pairedCount) * 100) / 100 : 0,
  });
});

export default router;
