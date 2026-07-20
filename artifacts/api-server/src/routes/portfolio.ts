import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, portfolioPositionsTable } from "@workspace/db";
import { yf as yahooFinance } from "../lib/yahoo";
import {
  AddPositionBody,
  UpdatePositionParams,
  UpdatePositionBody,
  DeletePositionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const formatPosition = (p: typeof portfolioPositionsTable.$inferSelect) => ({
  id: p.id,
  symbol: p.symbol,
  name: p.name,
  quantity: parseFloat(p.quantity),
  avgCost: parseFloat(p.avgCost),
  openedAt: p.openedAt.toISOString(),
  notes: p.notes ?? null,
  assetType: p.assetType,
  contractType: p.contractType ?? null,
  strikePrice: p.strikePrice != null ? parseFloat(p.strikePrice) : null,
  expiryDate: p.expiryDate ?? null,
});

// GET /portfolio
router.get("/portfolio", async (_req, res): Promise<void> => {
  const positions = await db.select().from(portfolioPositionsTable).orderBy(portfolioPositionsTable.openedAt);
  res.json(positions.map(formatPosition));
});

// POST /portfolio
router.post("/portfolio", async (req, res): Promise<void> => {
  const parsed = AddPositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [pos] = await db
    .insert(portfolioPositionsTable)
    .values({
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      quantity: String(data.quantity),
      avgCost: String(data.avgCost),
      notes: data.notes ?? null,
      assetType: data.assetType as "stock" | "option",
      contractType: data.contractType ?? null,
      strikePrice: data.strikePrice != null ? String(data.strikePrice) : null,
      expiryDate: data.expiryDate ?? null,
    })
    .returning();

  res.status(201).json(formatPosition(pos));
});

// PATCH /portfolio/:id
router.patch("/portfolio/:id", async (req, res): Promise<void> => {
  const params = UpdatePositionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.quantity != null) updates.quantity = String(d.quantity);
  if (d.avgCost != null) updates.avgCost = String(d.avgCost);
  if (d.notes !== undefined) updates.notes = d.notes;

  const [pos] = await db
    .update(portfolioPositionsTable)
    .set(updates)
    .where(eq(portfolioPositionsTable.id, params.data.id))
    .returning();

  if (!pos) {
    res.status(404).json({ error: "Position not found" });
    return;
  }

  res.json(formatPosition(pos));
});

// DELETE /portfolio/:id
router.delete("/portfolio/:id", async (req, res): Promise<void> => {
  const params = DeletePositionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(portfolioPositionsTable)
    .where(eq(portfolioPositionsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Position not found" });
    return;
  }

  res.sendStatus(204);
});

// GET /portfolio/summary
router.get("/portfolio/summary", async (req, res): Promise<void> => {
  const positions = await db.select().from(portfolioPositionsTable);

  if (positions.length === 0) {
    res.json({
      totalCost: 0, totalValue: 0, totalPnl: 0, totalPnlPercent: 0,
      dayPnl: 0, dayPnlPercent: 0, positionCount: 0,
    });
    return;
  }

  try {
    const symbols = [...new Set(positions.map((p) => p.symbol))];
    const quotes = await Promise.allSettled(symbols.map((s) => yahooFinance.quote(s)));
    const priceMap: Record<string, { price: number; prevClose: number }> = {};
    quotes.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const q = r.value as any;
        if (q?.regularMarketPrice) {
          priceMap[symbols[i]] = {
            price: q.regularMarketPrice,
            prevClose: q.regularMarketPreviousClose ?? q.regularMarketPrice,
          };
        }
      }
    });

    let totalCost = 0, totalValue = 0, dayPnl = 0;
    for (const pos of positions) {
      const qty = parseFloat(pos.quantity);
      const cost = parseFloat(pos.avgCost);
      const mktData = priceMap[pos.symbol];
      const currentPrice = mktData?.price ?? cost;
      const prevClose = mktData?.prevClose ?? cost;

      totalCost += qty * cost;
      totalValue += qty * currentPrice;
      dayPnl += qty * (currentPrice - prevClose);
    }

    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    const dayPnlPercent = totalValue > 0 ? (dayPnl / (totalValue - dayPnl)) * 100 : 0;

    res.json({
      totalCost: Math.round(totalCost * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
      dayPnl: Math.round(dayPnl * 100) / 100,
      dayPnlPercent: Math.round(dayPnlPercent * 100) / 100,
      positionCount: positions.length,
    });
  } catch (err) {
    req.log.warn({ err }, "Failed to fetch live prices for portfolio summary");
    const totalCost = positions.reduce((acc, p) => acc + parseFloat(p.quantity) * parseFloat(p.avgCost), 0);
    res.json({
      totalCost: Math.round(totalCost * 100) / 100,
      totalValue: Math.round(totalCost * 100) / 100,
      totalPnl: 0, totalPnlPercent: 0, dayPnl: 0, dayPnlPercent: 0,
      positionCount: positions.length,
    });
  }
});

export default router;
