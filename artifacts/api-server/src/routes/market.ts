import { Router, type IRouter } from "express";
import { yf as yahooFinance } from "../lib/yahoo";
import {
  GetHistoryQueryParams,
  GetOptionChainQueryParams,
  SearchSymbolsQueryParams,
  GetQuoteParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /market/quote/:symbol
router.get("/market/quote/:symbol", async (req, res): Promise<void> => {
  const params = GetQuoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const symbol = params.data.symbol.toUpperCase();

  try {
    const quote = await yahooFinance.quote(symbol) as any;
    if (!quote || !quote.regularMarketPrice) {
      res.status(404).json({ error: "Symbol not found" });
      return;
    }

    res.json({
      symbol: quote.symbol,
      name: quote.longName ?? quote.shortName ?? symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      marketCap: quote.marketCap ?? null,
      open: quote.regularMarketOpen ?? quote.regularMarketPrice,
      high: quote.regularMarketDayHigh ?? quote.regularMarketPrice,
      low: quote.regularMarketDayLow ?? quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose ?? quote.regularMarketPrice,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? quote.regularMarketPrice,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? quote.regularMarketPrice,
      avgVolume: quote.averageDailyVolume3Month ?? null,
      pe: quote.trailingPE ?? null,
      eps: quote.epsTrailingTwelveMonths ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.warn({ symbol, err }, "Failed to fetch quote");
    res.status(404).json({ error: "Symbol not found or data unavailable" });
  }
});

// GET /market/history?symbol=AAPL&interval=1d&range=3mo
router.get("/market/history", async (req, res): Promise<void> => {
  const parsed = GetHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const q = parsed.data as { symbol: string; interval?: string; range?: string };
  const symbol = q.symbol.toUpperCase();
  const intervalMap: Record<string, "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1wk"> = {
    "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
    "1h": "1h", "1d": "1d", "1wk": "1wk",
  };
  const rangeMap: Record<string, "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y"> = {
    "1d": "1d", "5d": "5d", "1mo": "1mo", "3mo": "3mo",
    "6mo": "6mo", "1y": "1y", "2y": "2y", "5y": "5y",
  };

  const yInterval = intervalMap[q.interval ?? "1d"] ?? "1d";

  // v4 chart() requires period1 (date) instead of range
  const rangeDaysMap: Record<string, number> = {
    "1d": 1, "5d": 5, "1mo": 30, "3mo": 90,
    "6mo": 180, "1y": 365, "2y": 730, "5y": 1825,
  };
  const days = rangeDaysMap[q.range ?? "3mo"] ?? 90;
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const chart = await yahooFinance.chart(symbol, { interval: yInterval, period1 }) as any;

    const candles = ((chart.quotes ?? []) as any[])
      .filter((c: any) => c.open != null && c.close != null)
      .map((c: any) => ({
        timestamp: Math.floor(new Date(c.date).getTime() / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume ?? 0,
      }));

    res.json({ symbol, interval: q.interval ?? "1d", range: q.range ?? "3mo", candles });
  } catch (err) {
    req.log.warn({ symbol, err }, "Failed to fetch history");
    res.status(404).json({ error: "History data unavailable" });
  }
});

// GET /market/options?symbol=AAPL&expiry=2024-01-19
router.get("/market/options", async (req, res): Promise<void> => {
  const parsed = GetOptionChainQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const q = parsed.data as { symbol: string; expiry?: string };
  const symbol = q.symbol.toUpperCase();

  try {
    const quoteRaw = await yahooFinance.quote(symbol) as any;
    const underlyingPrice = quoteRaw?.regularMarketPrice ?? 0;

    const optionData = await yahooFinance.options(symbol, q.expiry ? { date: q.expiry } : undefined) as any;
    const expiryDates: string[] = (optionData.expirationDates ?? []).map((d: any) =>
      typeof d === "string" ? d : new Date(d).toISOString().split("T")[0]
    );

    const mapContract = (c: any) => ({
      contractSymbol: c.contractSymbol ?? "",
      strike: c.strike ?? 0,
      expiry: typeof c.expiration === "string"
        ? c.expiration
        : new Date(c.expiration ?? Date.now()).toISOString().split("T")[0],
      lastPrice: c.lastPrice ?? 0,
      bid: c.bid ?? 0,
      ask: c.ask ?? 0,
      impliedVolatility: c.impliedVolatility ?? 0,
      openInterest: c.openInterest ?? 0,
      volume: c.volume ?? 0,
      delta: null, gamma: null, theta: null, vega: null,
      inTheMoney: c.inTheMoney ?? false,
    });

    const selectedExpiry = q.expiry ?? expiryDates[0] ?? "";
    const options = [{
      date: selectedExpiry,
      calls: ((optionData.options?.[0]?.calls ?? []) as any[]).map(mapContract),
      puts: ((optionData.options?.[0]?.puts ?? []) as any[]).map(mapContract),
    }];

    res.json({ symbol, underlyingPrice, expiryDates, options });
  } catch (err) {
    req.log.warn({ symbol, err }, "Failed to fetch options");
    res.status(404).json({ error: "Options data unavailable" });
  }
});

// GET /market/search?q=AAPL
router.get("/market/search", async (req, res): Promise<void> => {
  const parsed = SearchSymbolsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q } = parsed.data as { q: string };

  try {
    const results = await yahooFinance.search(q, { newsCount: 0, quotesCount: 10 }) as any;
    const quotes = ((results.quotes ?? []) as any[])
      .filter((r: any) => r.quoteType === "EQUITY" || r.quoteType === "ETF" || r.quoteType === "INDEX")
      .slice(0, 10)
      .map((r: any) => ({
        symbol: r.symbol,
        name: r.longname ?? r.shortname ?? r.symbol,
        type: r.quoteType ?? "EQUITY",
        exchange: r.exchange ?? "",
      }));
    res.json(quotes);
  } catch (err) {
    req.log.warn({ q, err }, "Search failed");
    res.json([]);
  }
});

// GET /market/movers
router.get("/market/movers", async (req, res): Promise<void> => {
  const mapMover = (q: any) => ({
    symbol: q.symbol ?? "",
    name: q.shortName ?? q.longName ?? q.symbol ?? "",
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePercent: q.regularMarketChangePercent ?? 0,
    volume: q.regularMarketVolume ?? 0,
  });

  try {
    const [gainersRes, losersRes, activeRes] = await Promise.allSettled([
      yahooFinance.screener({ scrIds: "day_gainers", count: 10 }),
      yahooFinance.screener({ scrIds: "day_losers", count: 10 }),
      yahooFinance.screener({ scrIds: "most_actives", count: 10 }),
    ]);

    const gainers = gainersRes.status === "fulfilled" ? ((gainersRes.value as any).quotes ?? []).map(mapMover) : [];
    const losers = losersRes.status === "fulfilled" ? ((losersRes.value as any).quotes ?? []).map(mapMover) : [];
    const active = activeRes.status === "fulfilled" ? ((activeRes.value as any).quotes ?? []).map(mapMover) : [];

    res.json({ gainers, losers, active });
  } catch (err) {
    req.log.warn({ err }, "Failed to fetch movers");
    res.json({ gainers: [], losers: [], active: [] });
  }
});

export default router;
