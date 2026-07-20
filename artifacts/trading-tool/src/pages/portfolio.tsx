import { useGetPortfolioPositions, useGetPortfolioSummary, useGetQuote, Position } from "@workspace/api-client-react";
import { formatPrice, formatPercent, getColorClass } from "@/lib/utils";
import { Briefcase } from "lucide-react";

function PositionRow({ position }: { position: Position }) {
  const { data: quote } = useGetQuote(position.symbol, { query: { enabled: !!position.symbol, refetchInterval: 10000 } });
  
  const currentPrice = quote?.price || position.avgCost;
  const marketValue = currentPrice * position.quantity;
  const costBasis = position.avgCost * position.quantity;
  const unrealizedPnl = marketValue - costBasis;
  const unrealizedPnlPercent = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 group">
      <td className="px-4 py-3 align-middle">
        <div className="font-bold text-primary font-mono">{position.symbol}</div>
        <div className="text-[10px] bg-muted inline-block px-1 mt-1 text-muted-foreground uppercase">{position.assetType}</div>
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">
        {position.quantity}
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">
        {formatPrice(position.avgCost)}
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">
        {quote ? formatPrice(quote.price) : "—"}
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">
        {formatPrice(marketValue)}
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">
        <div className={getColorClass(unrealizedPnl)}>
          {unrealizedPnl > 0 ? "+" : ""}{formatPrice(unrealizedPnl)}
        </div>
        <div className={`text-xs ${getColorClass(unrealizedPnlPercent)}`}>
          {formatPercent(unrealizedPnlPercent)}
        </div>
      </td>
    </tr>
  );
}

export function Portfolio() {
  const { data: positions, isLoading } = useGetPortfolioPositions();
  const { data: summary } = useGetPortfolioSummary();

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <Briefcase className="w-6 h-6" /> Portfolio
        </h1>
        {/* Actions like Add Position could go here */}
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border p-4 flex flex-col justify-between">
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Net Liq Value</div>
            <div className="text-xl font-mono font-bold text-primary">{formatPrice(summary.totalValue)}</div>
          </div>
          <div className="bg-card border border-border p-4 flex flex-col justify-between">
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Cost Basis</div>
            <div className="text-xl font-mono font-bold text-muted-foreground">{formatPrice(summary.totalCost)}</div>
          </div>
          <div className="bg-card border border-border p-4 flex flex-col justify-between">
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Open P&L</div>
            <div className="flex items-baseline gap-2 font-mono">
              <div className={`text-xl font-bold ${getColorClass(summary.totalPnl)}`}>
                {summary.totalPnl > 0 ? "+" : ""}{formatPrice(summary.totalPnl)}
              </div>
            </div>
            <div className={`text-xs font-mono mt-1 ${getColorClass(summary.totalPnlPercent)}`}>
              {formatPercent(summary.totalPnlPercent)}
            </div>
          </div>
          <div className="bg-card border border-border p-4 flex flex-col justify-between">
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Day P&L</div>
            <div className="flex items-baseline gap-2 font-mono">
              <div className={`text-xl font-bold ${getColorClass(summary.dayPnl)}`}>
                {summary.dayPnl > 0 ? "+" : ""}{formatPrice(summary.dayPnl)}
              </div>
            </div>
            <div className={`text-xs font-mono mt-1 ${getColorClass(summary.dayPnlPercent)}`}>
              {formatPercent(summary.dayPnlPercent)}
            </div>
          </div>
          <div className="bg-card border border-border p-4 flex flex-col justify-between">
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Positions</div>
            <div className="text-xl font-mono font-bold text-primary">{summary.positionCount}</div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border sticky top-0 z-10 backdrop-blur">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-normal text-muted-foreground uppercase tracking-wider">Symbol / Asset</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Avg Cost</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Current Price</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Market Value</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Unrealized P&L</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground font-mono text-sm">
                    Loading portfolio...
                  </td>
                </tr>
              ) : !positions || positions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <p className="font-mono text-sm">No open positions</p>
                  </td>
                </tr>
              ) : (
                positions.map((position) => (
                  <PositionRow key={position.id} position={position} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
