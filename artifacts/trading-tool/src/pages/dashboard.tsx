import { useGetDashboard } from "@workspace/api-client-react";
import { formatPrice, formatPercent, getColorClass, formatVolume } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Activity, Bell } from "lucide-react";
import { Link } from "wouter";

export function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard();

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
