import { yf as yahooFinance } from "./yahoo";
import { getNvdaMultiTimeframeAnalysis } from "./nvda-multitimeframe";

type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
};

export type NvdaSignal = {
  symbol: "NVDA";
  signal: "entry" | "watch" | "avoid";
  direction: "call" | "put" | "neutral";
  confidence: number;
  tradeGrade: "A+" | "A" | "B" | "C" | "NO_TRADE";
  sentinelScore: number;
  bullishScore: number;
  bearishScore: number;
  currentPrice: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  takeProfit: number;
  indicators: {
    ema9: number;
    ema20: number;
    rsi14: number;
    vwap: number;
    volumeRatio: number;
    support: number;
    resistance: number;
  };
  reasons: string[];
  warnings: string[];
  updatedAt: string;
};

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateEMA(values: number[], period: number): number {
  if (values.length < period) {
    throw new Error(`Not enough data to calculate EMA ${period}`);
  }

  const multiplier = 2 / (period + 1);

  let ema =
    values.slice(0, period).reduce((sum, value) => sum + value, 0) /
    period;

  for (let i = period; i < values.length; i += 1) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

function calculateRSI(values: number[], period = 14): number {
  if (values.length <= period) {
    throw new Error("Not enough data to calculate RSI");
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const change = values[i] - values[i - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let i = period + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) return 100;

  const relativeStrength = averageGain / averageLoss;

  return 100 - 100 / (1 + relativeStrength);
}

function calculateVWAP(candles: Candle[]): number {
  let totalPriceVolume = 0;
  let totalVolume = 0;

  for (const candle of candles) {
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

function calculateAverageVolume(
  candles: Candle[],
  period = 20,
): number {
  const volumeCandles = candles
    .filter((candle) => candle.volume > 0)
    .slice(-period);

  if (volumeCandles.length === 0) return 0;

  return (
    volumeCandles.reduce(
      (sum, candle) => sum + candle.volume,
      0,
    ) / volumeCandles.length
  );
}

function getSupportAndResistance(candles: Candle[]): {
  support: number;
  resistance: number;
} {
  const recentCandles = candles.slice(-20);

  return {
    support: Math.min(
      ...recentCandles.map((candle) => candle.low),
    ),
    resistance: Math.max(
      ...recentCandles.map((candle) => candle.high),
    ),
  };
}

export async function getNvdaSignal(): Promise<NvdaSignal> {
  const period1 = new Date(
    Date.now() - 5 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const chart = (await yahooFinance.chart("NVDA", {
    interval: "5m",
    period1,
  })) as any;

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
      timestamp: new Date(candle.date).getTime(),
    }));

  if (candles.length < 30) {
    throw new Error(
      "Not enough NVDA candle data to create a signal",
    );
  }

  const closes = candles.map((candle) => candle.close);
  const currentCandle = candles[candles.length - 1];

  const latestVolumeCandle =
    [...candles]
      .reverse()
      .find((candle) => candle.volume > 0) ??
    currentCandle;

  const currentPrice = currentCandle.close;

  const ema9 = calculateEMA(closes, 9);
  const ema20 = calculateEMA(closes, 20);
  const rsi14 = calculateRSI(closes, 14);
  const vwap = calculateVWAP(candles);

  const averageVolume = calculateAverageVolume(
    candles.slice(0, -1),
    20,
  );

  const volumeRatio =
    averageVolume > 0
      ? latestVolumeCandle.volume / averageVolume
      : 0;

  const { support, resistance } =
    getSupportAndResistance(candles.slice(0, -1));

  let bullishScore = 0;
  let bearishScore = 0;

  const bullishReasons: string[] = [];
  const bearishReasons: string[] = [];
  const warnings: string[] = [];

  // Bullish trend scoring
  if (ema9 > ema20) {
    bullishScore += 25;
    bullishReasons.push("EMA 9 is above EMA 20");
  } else {
    bearishScore += 25;
    bearishReasons.push("EMA 9 is below EMA 20");
  }

  // VWAP scoring
  if (currentPrice > vwap) {
    bullishScore += 25;
    bullishReasons.push("Price is above VWAP");
  } else if (currentPrice < vwap) {
    bearishScore += 25;
    bearishReasons.push("Price is below VWAP");
  }

  // RSI scoring
  if (rsi14 >= 50 && rsi14 <= 68) {
    bullishScore += 20;
    bullishReasons.push(
      `RSI supports calls at ${rsi14.toFixed(1)}`,
    );
  } else if (rsi14 >= 30 && rsi14 <= 50) {
    bearishScore += 20;
    bearishReasons.push(
      `RSI supports puts at ${rsi14.toFixed(1)}`,
    );
  } else if (rsi14 > 70) {
    warnings.push(
      `RSI is overextended at ${rsi14.toFixed(1)}`,
    );
  } else if (rsi14 < 30) {
    warnings.push(
      `RSI is oversold at ${rsi14.toFixed(1)}`,
    );
  }

  // Volume scoring
  if (
    averageVolume === 0 ||
    latestVolumeCandle.volume === 0
  ) {
    warnings.push("Volume data is unavailable");
  } else if (volumeRatio >= 1.2) {
    if (latestVolumeCandle.close >= latestVolumeCandle.open) {
      bullishScore += 20;
      bullishReasons.push(
        `Bullish volume is ${volumeRatio.toFixed(2)}× average`,
      );
    } else {
      bearishScore += 20;
      bearishReasons.push(
        `Selling volume is ${volumeRatio.toFixed(2)}× average`,
      );
    }
  } else {
    warnings.push(
      `Volume is only ${volumeRatio.toFixed(2)}× average`,
    );
  }

  // Breakout / breakdown scoring
  const distanceToResistancePercent =
    ((resistance - currentPrice) / currentPrice) * 100;

  const distanceToSupportPercent =
    ((currentPrice - support) / currentPrice) * 100;

  if (
    currentPrice >= resistance ||
    distanceToResistancePercent <= 0.3
  ) {
    bullishScore += 10;
    bullishReasons.push(
      "Price is testing or breaking resistance",
    );
  }

  if (
    currentPrice <= support ||
    distanceToSupportPercent <= 0.3
  ) {
    bearishScore += 10;
    bearishReasons.push(
      "Price is testing or breaking support",
    );
  }

  const direction: NvdaSignal["direction"] =
    bullishScore > bearishScore
      ? "call"
      : bearishScore > bullishScore
        ? "put"
        : "neutral";

  const confidence = Math.max(
    bullishScore,
    bearishScore,
  );

  const signal: NvdaSignal["signal"] =
  confidence >= 75
    ? "entry"
    : confidence >= 50
      ? "watch"
      : "avoid";
 
  const multiTimeframe = await getNvdaMultiTimeframeAnalysis();

  const sentinelScore = multiTimeframe.sentinelScore;
 
  const tradeGrade: NvdaSignal["tradeGrade"] =
  sentinelScore >= 90
    ? "A+"
    : sentinelScore >= 80
      ? "A"
      : sentinelScore >= 70
        ? "B"
        : sentinelScore >= 50
          ? "C"
          : "NO_TRADE";

  let entryLow: number;
  let entryHigh: number;
  let stopLoss: number;
  let takeProfit: number;

  if (direction === "put") {
    const entryCenter = Math.min(
      currentPrice,
      support,
    );

    entryLow = entryCenter * 0.998;
    entryHigh = entryCenter * 1.002;

    const technicalStop = Math.max(
      resistance,
      ema20,
      vwap,
    );

    const maximumStop = entryHigh * 1.015;

    stopLoss = Math.min(
      technicalStop,
      maximumStop,
    );

    stopLoss = Math.max(
      stopLoss,
      entryHigh + entryCenter * 0.003,
    );

    const riskPerShare = Math.max(
      stopLoss - entryCenter,
      entryCenter * 0.005,
    );

    takeProfit =
      entryCenter - riskPerShare * 2;
  } else {
    const entryCenter = Math.max(
      currentPrice,
      resistance,
    );

    entryLow = entryCenter * 0.998;
    entryHigh = entryCenter * 1.002;

    const technicalStop = Math.min(
      support,
      ema20,
      vwap,
    );

    const maximumStop = entryLow * 0.985;

    stopLoss = Math.max(
      technicalStop,
      maximumStop,
    );

    stopLoss = Math.min(
      stopLoss,
      entryLow - entryCenter * 0.003,
    );

    const riskPerShare = Math.max(
      entryCenter - stopLoss,
      entryCenter * 0.005,
    );

    takeProfit =
      entryCenter + riskPerShare * 2;
  }

  const reasons =
    direction === "put"
      ? bearishReasons
      : direction === "call"
        ? bullishReasons
        : [];

  if (direction === "neutral") {
    warnings.push(
      "Bullish and bearish signals are evenly matched",
    );
  }

  return {
    symbol: "NVDA",
    signal,
    direction,
    confidence: Math.min(confidence, 100),
    tradeGrade,
    sentinelScore,
    bullishScore: Math.min(bullishScore, 100),
    bearishScore: Math.min(bearishScore, 100),
    currentPrice: roundPrice(currentPrice),
    entryLow: roundPrice(entryLow),
    entryHigh: roundPrice(entryHigh),
    stopLoss: roundPrice(stopLoss),
    takeProfit: roundPrice(takeProfit),
    indicators: {
      ema9: roundPrice(ema9),
      ema20: roundPrice(ema20),
      rsi14: Math.round(rsi14 * 10) / 10,
      vwap: roundPrice(vwap),
      volumeRatio:
        Math.round(volumeRatio * 100) / 100,
      support: roundPrice(support),
      resistance: roundPrice(resistance),
    },
    reasons,
    warnings,
    updatedAt: new Date().toISOString(),
  };
}
