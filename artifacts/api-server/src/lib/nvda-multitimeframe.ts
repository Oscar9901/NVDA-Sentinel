import { yf as yahooFinance } from "./yahoo";

type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TimeframeName = "1m" | "5m" | "15m" | "1h";
export type TimeframeDirection = "call" | "put" | "neutral";

export type TimeframeAnalysis = {
  timeframe: TimeframeName;
  direction: TimeframeDirection;
  score: number;
  currentPrice: number;
  ema9: number;
  ema20: number;
  rsi14: number;
  vwap: number;
  reasons: string[];
};

export type MultiTimeframeAnalysis = {
  direction: TimeframeDirection;
  sentinelScore: number;
  bullishScore: number;
  bearishScore: number;
  alignedTimeframes: number;
  timeframes: Record<TimeframeName, TimeframeAnalysis>;
};

const TIMEFRAME_SETTINGS: Record<
  TimeframeName,
  {
    interval: "1m" | "5m" | "15m" | "1h";
    lookbackDays: number;
    weight: number;
  }
> = {
  "1m": {
    interval: "1m",
    lookbackDays: 1,
    weight: 0.1,
  },
  "5m": {
    interval: "5m",
    lookbackDays: 5,
    weight: 0.4,
  },
  "15m": {
    interval: "15m",
    lookbackDays: 10,
    weight: 0.3,
  },
  "1h": {
    interval: "1h",
    lookbackDays: 60,
    weight: 0.2,
  },
};

function round(value: number, decimals = 2): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function calculateEMA(values: number[], period: number): number {
  if (values.length < period) {
    throw new Error(`Not enough values for EMA ${period}`);
  }

  const multiplier = 2 / (period + 1);

  let ema =
    values.slice(0, period).reduce((sum, value) => sum + value, 0) /
    period;

  for (let index = period; index < values.length; index += 1) {
    ema =
      values[index] * multiplier +
      ema * (1 - multiplier);
  }

  return ema;
}

function calculateRSI(values: number[], period = 14): number {
  if (values.length <= period) {
    throw new Error("Not enough values for RSI");
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (
    let index = period + 1;
    index < values.length;
    index += 1
  ) {
    const change = values[index] - values[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    averageGain =
      (averageGain * (period - 1) + gain) / period;

    averageLoss =
      (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) return 100;

  const relativeStrength = averageGain / averageLoss;

  return 100 - 100 / (1 + relativeStrength);
}

function calculateVWAP(candles: Candle[]): number {
  let totalPriceVolume = 0;
  let totalVolume = 0;

  for (const candle of candles) {
    if (candle.volume <= 0) continue;

    const typicalPrice =
      (candle.high + candle.low + candle.close) / 3;

    totalPriceVolume += typicalPrice * candle.volume;
    totalVolume += candle.volume;
  }

  if (totalVolume === 0) {
    return candles[candles.length - 1]?.close ?? 0;
  }

  return totalPriceVolume / totalVolume;
}

async function analyzeTimeframe(
  timeframe: TimeframeName,
): Promise<TimeframeAnalysis> {
  const settings = TIMEFRAME_SETTINGS[timeframe];

  const period1 = new Date(
    Date.now() -
      settings.lookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const chart = (await yahooFinance.chart("NVDA", {
    interval: settings.interval,
    period1,
  } as any)) as any;

  const candles: Candle[] = ((chart.quotes ?? []) as any[])
    .filter(
      (candle) =>
        candle.open != null &&
        candle.high != null &&
        candle.low != null &&
        candle.close != null,
    )
    .map((candle) => ({
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume ?? 0),
    }));

  if (candles.length < 30) {
    throw new Error(
      `Not enough ${timeframe} candle data for NVDA`,
    );
  }

  const closes = candles.map((candle) => candle.close);
  const currentPrice = closes[closes.length - 1];

  const ema9 = calculateEMA(closes, 9);
  const ema20 = calculateEMA(closes, 20);
  const rsi14 = calculateRSI(closes);
  const vwap = calculateVWAP(candles);

  let bullishScore = 0;
  let bearishScore = 0;

  const bullishReasons: string[] = [];
  const bearishReasons: string[] = [];

  if (ema9 > ema20) {
    bullishScore += 40;
    bullishReasons.push("EMA 9 above EMA 20");
  } else if (ema9 < ema20) {
    bearishScore += 40;
    bearishReasons.push("EMA 9 below EMA 20");
  }

  if (currentPrice > vwap) {
    bullishScore += 35;
    bullishReasons.push("Price above VWAP");
  } else if (currentPrice < vwap) {
    bearishScore += 35;
    bearishReasons.push("Price below VWAP");
  }

  if (rsi14 >= 52 && rsi14 <= 70) {
    bullishScore += 25;
    bullishReasons.push(`Bullish RSI ${rsi14.toFixed(1)}`);
  } else if (rsi14 >= 30 && rsi14 <= 48) {
    bearishScore += 25;
    bearishReasons.push(`Bearish RSI ${rsi14.toFixed(1)}`);
  }

  const direction: TimeframeDirection =
    bullishScore > bearishScore
      ? "call"
      : bearishScore > bullishScore
        ? "put"
        : "neutral";

  const score = Math.max(bullishScore, bearishScore);

  return {
    timeframe,
    direction,
    score: Math.min(score, 100),
    currentPrice: round(currentPrice),
    ema9: round(ema9),
    ema20: round(ema20),
    rsi14: round(rsi14, 1),
    vwap: round(vwap),
    reasons:
      direction === "call"
        ? bullishReasons
        : direction === "put"
          ? bearishReasons
          : [],
  };
}

export async function getNvdaMultiTimeframeAnalysis(): Promise<MultiTimeframeAnalysis> {
  const timeframeNames: TimeframeName[] = [
    "1m",
    "5m",
    "15m",
    "1h",
  ];

  const results = await Promise.all(
    timeframeNames.map((timeframe) =>
      analyzeTimeframe(timeframe),
    ),
  );

  const timeframes = Object.fromEntries(
    results.map((result) => [result.timeframe, result]),
  ) as Record<TimeframeName, TimeframeAnalysis>;

  let weightedBullishScore = 0;
  let weightedBearishScore = 0;

  for (const result of results) {
    const weight =
      TIMEFRAME_SETTINGS[result.timeframe].weight;

    if (result.direction === "call") {
      weightedBullishScore += result.score * weight;
    }

    if (result.direction === "put") {
      weightedBearishScore += result.score * weight;
    }
  }

  const direction: TimeframeDirection =
    weightedBullishScore > weightedBearishScore
      ? "call"
      : weightedBearishScore > weightedBullishScore
        ? "put"
        : "neutral";

  const alignedTimeframes = results.filter(
    (result) => result.direction === direction,
  ).length;

  const rawScore = Math.max(
    weightedBullishScore,
    weightedBearishScore,
  );

  const alignmentBonus =
    alignedTimeframes === 4
      ? 10
      : alignedTimeframes === 3
        ? 5
        : 0;

  const sentinelScore = Math.min(
    Math.round(rawScore + alignmentBonus),
    100,
  );

  return {
    direction,
    sentinelScore,
    bullishScore: Math.round(weightedBullishScore),
    bearishScore: Math.round(weightedBearishScore),
    alignedTimeframes,
    timeframes,
  };
}
