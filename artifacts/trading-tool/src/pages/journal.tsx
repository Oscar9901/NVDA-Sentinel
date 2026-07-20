import { useGetTrades, useGetTradeStats } from "@workspace/api-client-react";
import { formatPrice, formatPercent, getColorClass } from "@/lib/utils";
import { BookOpen } from "lucide-react";

export function Journal() {
  const { data: trades, isLoading: tradesLoading } = useGetTrades();
  const { data: stats, isLoading: statsLoading } = useGetTradeStats();

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <BookOpen className="w-6 h-6" /> Trade Journal
        </h1>
      </div>

      {stats && (
        <div className="bg-card border border-border p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Performance Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Win Rate</div>
              <div className="text-lg font-mono font-bold text-primary">{formatPercent(stats.winRate)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total P&L</div>
              <div className={`text-lg font-mono font-bold ${getColorClass(stats.totalPnl)}`}>{formatPrice(stats.totalPnl)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Profit Factor</div>
              <div className="text-lg font-mono font-bold text-primary">{stats.profitFactor.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Trades</div>
              <div className="text-lg font-mono font-bold text-primary">{stats.totalTrades}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Win</div>
              <div className="text-lg font-mono font-bold text-success">{formatPrice(stats.avgWin)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Loss</div>
              <div className="text-lg font-mono font-bold text-destructive">{formatPrice(stats.avgLoss)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Largest Win</div>
              <div className="text-lg font-mono font-bold text-success">{formatPrice(stats.largestWin)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Largest Loss</div>
              <div className="text-lg font-mono font-bold text-destructive">{formatPrice(stats.largestLoss)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border sticky top-0 z-10 backdrop-blur">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-normal text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-normal text-muted-foreground uppercase tracking-wider">Symbol</th>
                <th className="px-4 py-2 text-center text-xs font-normal text-muted-foreground uppercase tracking-wider">Side</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Fees</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Realized P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tradesLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground font-mono text-sm">
                    Loading trades...
                  </td>
                </tr>
              ) : !trades || trades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <p className="font-mono text-sm">No trades recorded</p>
                  </td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 align-middle text-muted-foreground font-mono text-xs">
                      {new Date(trade.tradedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="font-bold text-primary font-mono">{trade.symbol}</div>
                      <div className="text-[10px] bg-muted inline-block px-1 text-muted-foreground uppercase">{trade.assetType}</div>
                    </td>
                    <td className="px-4 py-3 align-middle text-center font-mono text-xs uppercase tracking-wider">
                      <span className={`px-2 py-0.5 ${trade.side === 'buy' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm">
                      {trade.quantity}
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm">
                      {formatPrice(trade.price)}
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm text-muted-foreground">
                      {trade.fees ? formatPrice(trade.fees) : "—"}
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm">
                      {trade.pnl !== undefined && trade.pnl !== null ? (
                        <span className={getColorClass(trade.pnl)}>
                          {trade.pnl > 0 ? "+" : ""}{formatPrice(trade.pnl)}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
