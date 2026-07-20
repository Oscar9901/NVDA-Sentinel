import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, portfolioPositionsTable, tradesTable, alertsTable } from "@workspace/db";
import { yf as yahooFinance } from "../lib/yahoo";

const router: IRouter = Router();

// GET /dashboard
router.get("/dashboard", async (req, res): Promise<void> => {
  try {
    const [positions, recentTradesRaw, allAlerts] = await Promise.all([
      db.select().from(portfolioPositionsTable),
      db.select().from(tradesTable).orderBy(desc(tradesTable.tradedAt)).limit(5),
      db.select().from(alertsTable),
    ]);

    // Compute portfolio P&L
    let portfolioValue = 0, portfolioPnl = 0, portfolioPnlPercent = 0, dayPnl = 0, dayPnlPercent = 0;

    if (positions.length > 0) {
      const symbols = [...new Set(positions.map((p) => p.symbol))];
      const quoteResults = await Promise.allSettled(symbols.map((s) => yahooFinance.quote(s)));
      const priceMap: Record<string, { price: number; prevClose: number }> = {};
      quoteResults.forEach((r, i) => {
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

      let totalCost = 0;
      for (const pos of positions) {
        const qty = parseFloat(pos.quantity);
        const cost = parseFloat(pos.avgCost);
        const mktData = priceMap[pos.symbol];
        const currentPrice = mktData?.price ?? cost;
        const prevClose = mktData?.prevClose ?? cost;
        totalCost += qty * cost;
        portfolioValue += qty * currentPrice;
        dayPnl += qty * (currentPrice - prevClose);
      }
      portfolioPnl = portfolioValue - totalCost;
      portfolioPnlPercent = totalCost > 0 ? (portfolioPnl / totalCost) * 100 : 0;
      dayPnlPercent = portfolioValue > 0 ? (dayPnl / (portfolioValue - dayPnl)) * 100 : 0;
    }

    // Get top movers
    let topMovers: any[] = [];
    try {
      const moversResult = await yahooFinance.screener({ scrIds: "day_gainers", count: 5 }) as any;
      topMovers = ((moversResult.quotes ?? []) as any[]).map((q: any) => ({
        symbol: q.symbol ?? "",
        name: q.shortName ?? q.longName ?? q.symbol ?? "",
        price: q.regularMarketPrice ?? 0,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        volume: q.regularMarketVolume ?? 0,
      }));
    } catch {
      topMovers = [];
    }

    const activeAlerts = allAlerts.filter((a) => a.isActive).length;
    const triggeredAlerts = allAlerts.filter((a) => !a.isActive && a.triggeredAt).length;

    const recentTrades = recentTradesRaw.map((t) => ({
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
    }));

    const totalTrades = await db.$count(tradesTable);

    res.json({
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      portfolioPnl: Math.round(portfolioPnl * 100) / 100,
      portfolioPnlPercent: Math.round(portfolioPnlPercent * 100) / 100,
      dayPnl: Math.round(dayPnl * 100) / 100,
      dayPnlPercent: Math.round(dayPnlPercent * 100) / 100,
      activeAlerts,
      triggeredAlerts,
      totalTrades,
      recentTrades,
      topMovers,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard fetch failed");
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

export default router;
