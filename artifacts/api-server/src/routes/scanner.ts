import { Router, type IRouter } from "express";
import { yf as yahooFinance } from "../lib/yahoo";
import { ScanStocksQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

const PRESET_SCREENER_IDS: Record<string, string> = {
  gainers: "day_gainers",
  losers: "day_losers",
  "high-volume": "most_actives",
  "gap-up": "day_gainers",
  "gap-down": "day_losers",
};

// GET /scanner
router.get("/scanner", async (req, res): Promise<void> => {
  const parsed = ScanStocksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    preset,
    minPrice,
    maxPrice,
    minVolume,
    minChangePercent,
    maxChangePercent,
  } = parsed.data as {
    preset?: string;
    minPrice?: number;
    maxPrice?: number;
    minVolume?: number;
    minChangePercent?: number;
    maxChangePercent?: number;
  };

  try {
    const scrId = preset && PRESET_SCREENER_IDS[preset]
      ? PRESET_SCREENER_IDS[preset]
      : "most_actives";

    const result = await yahooFinance.screener({ scrIds: scrId, count: 100 }) as any;

    type ScanItem = { symbol: string; name: string; price: number; change: number; changePercent: number; volume: number; marketCap: number | null; pe: number | null };

    let items: ScanItem[] = ((result.quotes ?? []) as any[]).map((q: any) => ({
      symbol: q.symbol ?? "",
      name: q.shortName ?? q.longName ?? q.symbol ?? "",
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      volume: q.regularMarketVolume ?? 0,
      marketCap: q.marketCap ?? null,
      pe: q.trailingPE ?? null,
    }));

    // Apply custom filters
    if (minPrice != null) items = items.filter((i) => i.price >= minPrice);
    if (maxPrice != null) items = items.filter((i) => i.price <= maxPrice);
    if (minVolume != null) items = items.filter((i) => i.volume >= minVolume);
    if (minChangePercent != null) items = items.filter((i) => i.changePercent >= minChangePercent);
    if (maxChangePercent != null) items = items.filter((i) => i.changePercent <= maxChangePercent);

    res.json(items);
  } catch (err) {
    req.log.warn({ err }, "Scanner failed");
    res.json([]);
  }
});

export default router;
