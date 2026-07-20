import { useLocation } from "wouter";
import { useGetQuote, useGetHistory, GetHistoryInterval, GetHistoryRange } from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { formatPrice, formatPercent, getColorClass, formatVolume } from "@/lib/utils";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export function Chart() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const symbol = searchParams.get("symbol")?.toUpperCase() || "SPY";

  const [interval, setIntervalVal] = useState<GetHistoryInterval>("1d");
  const [range, setRange] = useState<GetHistoryRange>("1mo");

  const { data: quote } = useGetQuote(symbol, { query: { enabled: !!symbol, refetchInterval: 10000 } });
  const { data: history, isLoading } = useGetHistory(
    { symbol, interval, range }, 
    { query: { enabled: !!symbol } }
  );

  const chartData = useMemo(() => {
    if (!history?.candles) return [];
    
    // Calculate SMAs
    const data = history.candles.map((c, i, arr) => {
      const getSMA = (period: number) => {
        if (i < period - 1) return null;
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += arr[i - j].close;
        }
        return sum / period;
      };

      const isUp = c.close >= c.open;

      return {
        ...c,
        timeLabel: new Date(c.timestamp * 1000).toLocaleString(undefined, {
          month: 'short', day: 'numeric',
          ...(interval.includes('m') || interval.includes('h') ? { hour: '2-digit', minute: '2-digit' } : {})
        }),
        sma20: getSMA(20),
        sma50: getSMA(50),
        isUp,
        wickTop: c.high,
        wickBottom: c.low,
        bodyTop: Math.max(c.open, c.close),
        bodyBottom: Math.min(c.open, c.close),
      };
    });

    return data;
  }, [history, interval]);

  const CustomCandle = (props: any) => {
    const { x, y, width, height, isUp, wickTop, wickBottom, bodyTop, bodyBottom } = props;
    if (x === undefined || y === undefined) return null;
    
    const fill = isUp ? "var(--color-success)" : "var(--color-destructive)";
    const yRatio = height / (wickTop - wickBottom);
    
    const yWickTop = y;
    const yBodyTop = y + (wickTop - bodyTop) * yRatio;
    const hBody = (bodyTop - bodyBottom) * yRatio;
    const yWickBottom = y + height;

    const wickX = x + width / 2;

    return (
      <g>
        {/* Wick */}
        <line x1={wickX} y1={yWickTop} x2={wickX} y2={yWickBottom} stroke={fill} strokeWidth={1} />
        {/* Body */}
        <rect x={x} y={yBodyTop} width={width} height={Math.max(1, hBody)} fill={fill} />
      </g>
    );
  };

  const domainPad = (dataMin: number, dataMax: number) => {
    const range = dataMax - dataMin;
    return [dataMin - range * 0.05, dataMax + range * 0.05];
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Quote Header */}
      <div className="flex items-center justify-between bg-card border border-border p-4 shrink-0">
        <div className="flex items-end gap-4">
          <h1 className="text-3xl font-bold font-mono text-primary m-0 leading-none">{symbol}</h1>
          {quote && (
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-mono leading-none">{formatPrice(quote.price)}</span>
              <span className={`text-lg font-mono leading-none ${getColorClass(quote.change)}`}>
                {quote.change > 0 ? "+" : ""}{formatPrice(quote.change).replace('$', '')} ({formatPercent(quote.changePercent)})
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col text-right font-mono text-xs text-muted-foreground gap-1">
          {quote && (
            <>
              <div>VOL: <span className="text-primary">{formatVolume(quote.volume)}</span></div>
              <div className="flex gap-4">
                <span>O: {formatPrice(quote.open)}</span>
                <span>H: {formatPrice(quote.high)}</span>
                <span>L: {formatPrice(quote.low)}</span>
                <span>C: {formatPrice(quote.previousClose)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chart Controls */}
      <div className="flex gap-4 bg-card border border-border p-2 shrink-0">
        <div className="flex bg-muted/50 border border-border p-0.5 font-mono text-xs">
          {["1m", "5m", "15m", "1h", "1d"].map((i) => (
            <button
              key={i}
              className={`px-3 py-1 hover:bg-muted ${interval === i ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}
              onClick={() => setIntervalVal(i as GetHistoryInterval)}
            >
              {i.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex bg-muted/50 border border-border p-0.5 font-mono text-xs">
          {["1d", "5d", "1mo", "3mo", "1y"].map((r) => (
            <button
              key={r}
              className={`px-3 py-1 hover:bg-muted ${range === r ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}
              onClick={() => setRange(r as GetHistoryRange)}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 bg-card border border-border relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-muted-foreground">
            Loading chart data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 60, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis 
                dataKey="timeLabel" 
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
                tickMargin={10}
                minTickGap={30}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                orientation="right"
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => val.toFixed(2)}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 0, fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                itemStyle={{ color: 'var(--color-primary)' }}
                labelStyle={{ color: 'var(--color-muted-foreground)', marginBottom: '8px' }}
              />
              
              <Bar 
                dataKey="wickTop" 
                shape={<CustomCandle />} 
                isAnimationActive={false}
              />
              
              <Line type="monotone" dataKey="sma20" stroke="var(--color-chart-3)" strokeWidth={1} dot={false} isAnimationActive={false} name="SMA(20)" />
              <Line type="monotone" dataKey="sma50" stroke="var(--color-chart-4)" strokeWidth={1} dot={false} isAnimationActive={false} name="SMA(50)" />
              
              {quote && quote.previousClose && (
                <ReferenceLine y={quote.previousClose} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
