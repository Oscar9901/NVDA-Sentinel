import { useGetDashboard } from "@workspace/api-client-react";
import { formatPrice, formatPercent, getColorClass, formatVolume } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Activity, Bell } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

type NvdaSignal = {
  symbol: string;
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

export function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard();


  const {
    data: nvdaSignal,
    isLoading: signalLoading,
    error: signalError,
  } = useQuery<NvdaSignal>({
    queryKey: ["nvda-signal"],
    queryFn: async () => {
      const response = await fetch("/api/signals/nvda");

      if (!response.ok) {
        throw new Error("Failed to load NVDA signal");
      }

      return response.json();
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <div className="h-full flex items-center justify-center font-mono text-muted-foreground">Loading terminal data...</div>;
  }

  if (error || !dashboard) {
    return <div className="h-full flex items-center justify-center font-mono text-destructive">Error loading dashboard</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Portfolio Value</div>
          <div className="text-2xl font-mono font-bold">{formatPrice(dashboard.portfolioValue)}</div>
        </div>
        <div className="bg-card border border-border p-4 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Open P&L</div>
          <div className="flex items-baseline gap-2 font-mono">
            <div className={`text-2xl font-bold ${getColorClass(dashboard.portfolioPnl)}`}>
              {formatPrice(dashboard.portfolioPnl)}
            </div>
            <div className={`text-sm ${getColorClass(dashboard.portfolioPnlPercent)}`}>
              {formatPercent(dashboard.portfolioPnlPercent)}
            </div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Day P&L</div>
          <div className="flex items-baseline gap-2 font-mono">
            <div className={`text-2xl font-bold ${getColorClass(dashboard.dayPnl)}`}>
              {formatPrice(dashboard.dayPnl)}
            </div>
            <div className={`text-sm ${getColorClass(dashboard.dayPnlPercent)}`}>
              {formatPercent(dashboard.dayPnlPercent)}
            </div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Active Alerts</div>
          <div className="flex items-baseline gap-2 font-mono">
            <div className="text-2xl font-bold">{dashboard.activeAlerts}</div>
            {dashboard.triggeredAlerts > 0 && (
              <div className="text-sm text-destructive flex items-center">
                <Bell className="w-3 h-3 mr-1" />
                {dashboard.triggeredAlerts} triggered
              </div>
            )}
          </div>
        </div>
      </div>
            <div className="bg-card border border-border">
        <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-muted/30">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            NVDA Signal Center
          </h2>

          {nvdaSignal && (
            <span className="text-[10px] text-muted-foreground font-mono">
              Updated {new Date(nvdaSignal.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {signalLoading ? (
          <div className="p-6 text-sm text-muted-foreground font-mono">
            Analyzing NVDA...
          </div>
        ) : signalError || !nvdaSignal ? (
          <div className="p-6 text-sm text-destructive font-mono">
            Unable to load NVDA signal.
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                     Direction
                   </div>

                   <div
                     className={`text-3xl font-bold uppercase font-mono ${
                       nvdaSignal.direction === "call"
                         ? "text-success"
                         : nvdaSignal.direction === "put"
                           ? "text-destructive"
                           : "text-muted-foreground"
                      }`}
                    >
                      {nvdaSignal.direction === "call"
                        ? "CALL"
                        : nvdaSignal.direction === "put"
                          ? "PUT"
                          : "NEUTRAL"}
                    </div>

                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-2">
                      Signal
                    </div>

                    <div className="text-lg font-bold font-mono uppercase">
                      {nvdaSignal.signal}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Confidence
                    </div>
                    <div className="text-2xl font-bold font-mono">
                      {nvdaSignal.confidence}%
                    </div>
                  </div>

                 <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Sentinel Score
                    </div>
                    <div className="text-2xl font-bold font-mono">
                      {nvdaSignal.sentinelScore}/100
                    </div>
                  </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Current Price
                </div>
                <div className="text-xl font-bold font-mono">
                  {formatPrice(nvdaSignal.currentPrice)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              <div className="border border-border p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Suggested Entry
                </div>
                <div className="font-mono font-bold">
                  {formatPrice(nvdaSignal.entryLow)} –{" "}
                  {formatPrice(nvdaSignal.entryHigh)}
                </div>
              </div>

              <div className="border border-border p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Stop Loss
                </div>
                <div className="font-mono font-bold text-destructive">
                  {formatPrice(nvdaSignal.stopLoss)}
                </div>
              </div>

              <div className="border border-border p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Take Profit
                </div>
                <div className="font-mono font-bold text-success">
                  {formatPrice(nvdaSignal.takeProfit)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-2">
                  Confirmations
                </div>

                {nvdaSignal.reasons.length === 0 ? (
                  <div className="text-sm text-muted-foreground font-mono">
                    No bullish confirmations.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {nvdaSignal.reasons.map((reason) => (
                      <div key={reason} className="text-sm text-success font-mono">
                        ✓ {reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-2">
                  Warnings
                </div>

                <div className="space-y-1">
                  {nvdaSignal.warnings.map((warning) => (
                    <div
                      key={warning}
                      className="text-sm text-destructive font-mono"
                    >
                      ⚠ {warning}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border">
            <div className="h-10 border-b border-border flex items-center px-4 justify-between bg-muted/30">
              <h2 className="text-sm font-bold uppercase tracking-wider">Top Market Movers</h2>
              <Link href="/scanner" className="text-xs text-muted-foreground hover:text-primary transition-colors">View Scanner →</Link>
            </div>
            <div className="p-0">
              <table className="w-full text-sm font-mono text-right">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                  <tr>
                    <th className="font-normal px-4 py-2 text-left">Symbol</th>
                    <th className="font-normal px-4 py-2">Price</th>
                    <th className="font-normal px-4 py-2">Change</th>
                    <th className="font-normal px-4 py-2">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {dashboard.topMovers.map((mover) => (
                    <tr key={mover.symbol} className="hover:bg-muted/30 group">
                      <td className="px-4 py-2 text-left">
                        <Link href={`/chart?symbol=${mover.symbol}`} className="font-bold text-primary hover:underline">{mover.symbol}</Link>
                      </td>
                      <td className="px-4 py-2">{formatPrice(mover.price)}</td>
                      <td className={`px-4 py-2 ${getColorClass(mover.change)}`}>
                        <div className="flex justify-end items-center gap-1">
                          {mover.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {formatPercent(mover.changePercent)}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{formatVolume(mover.volume)}</td>
                    </tr>
                  ))}
                  {dashboard.topMovers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No market movers data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border">
            <div className="h-10 border-b border-border flex items-center px-4 justify-between bg-muted/30">
              <h2 className="text-sm font-bold uppercase tracking-wider">Recent Trades</h2>
              <Link href="/journal" className="text-xs text-muted-foreground hover:text-primary transition-colors">View Log →</Link>
            </div>
            <div className="p-0 max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm font-mono">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border sticky top-0">
                  <tr>
                    <th className="font-normal px-4 py-2 text-left">Symbol</th>
                    <th className="font-normal px-4 py-2 text-right">Qty</th>
                    <th className="font-normal px-4 py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {dashboard.recentTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 text-left">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1 uppercase ${trade.side === 'buy' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                            {trade.side}
                          </span>
                          <span className="font-bold text-primary">{trade.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">{trade.quantity}</td>
                      <td className="px-4 py-2 text-right">{formatPrice(trade.price)}</td>
                    </tr>
                  ))}
                  {dashboard.recentTrades.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No recent trades.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
