import { useState } from "react";
import { useScanStocks, ScanStocksParams } from "@workspace/api-client-react";
import { formatPrice, formatPercent, getColorClass, formatVolume } from "@/lib/utils";
import { Cpu, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "wouter";

export function Scanner() {
  const [params, setParams] = useState<ScanStocksParams>({ preset: "gainers" });
  const { data: results, isLoading, isFetching } = useScanStocks(params, { query: { keepPreviousData: true } });

  const presets = [
    { id: "gainers", label: "Top Gainers" },
    { id: "losers", label: "Top Losers" },
    { id: "active", label: "Most Active" },
    { id: "gap_up", label: "Gap Up" },
    { id: "gap_down", label: "Gap Down" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <Cpu className="w-6 h-6" /> Scanner
        </h1>
      </div>

      <div className="flex gap-2 font-mono text-sm overflow-x-auto shrink-0 pb-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setParams({ preset: preset.id })}
            className={`px-4 py-2 border border-border whitespace-nowrap transition-colors ${
              params.preset === preset.id 
                ? "bg-primary text-primary-foreground font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <div className="border-l border-border mx-2" />
        <button 
          onClick={() => setParams({ minVolume: 1000000, minPrice: 10, maxPrice: 100 })}
          className={`px-4 py-2 border border-border whitespace-nowrap transition-colors ${
            !params.preset ? "bg-primary text-primary-foreground font-bold" : "bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          Custom Filter (Vol {'>'} 1M, $10-$100)
        </button>
      </div>

      <div className="bg-card border border-border flex-1 overflow-hidden flex flex-col relative">
        {(isLoading || isFetching) && (
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 overflow-hidden">
            <div className="h-full bg-primary animate-[pulse_1.5s_ease-in-out_infinite] w-1/3" />
          </div>
        )}
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border sticky top-0 z-10 backdrop-blur">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-normal text-muted-foreground uppercase tracking-wider">Symbol</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">% Change</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Change</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Volume</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Market Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading && !results ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground font-mono text-sm">
                    Scanning market...
                  </td>
                </tr>
              ) : !results || results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <p className="font-mono text-sm">No results found for current criteria</p>
                  </td>
                </tr>
              ) : (
                results.map((result) => (
                  <tr key={result.symbol} className="hover:bg-muted/30 group">
                    <td className="px-4 py-3 align-middle">
                      <Link href={`/chart?symbol=${result.symbol}`} className="font-bold text-primary font-mono hover:underline inline-flex items-center gap-1">
                        {result.symbol} <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{result.name}</div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm">
                      {formatPrice(result.price)}
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm">
                      <div className={`inline-flex items-center justify-end gap-1 px-2 py-0.5 ${result.changePercent > 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {result.changePercent > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {formatPercent(result.changePercent)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm">
                      <span className={getColorClass(result.change)}>
                        {result.change > 0 ? "+" : ""}{formatPrice(result.change).replace('$', '')}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm">
                      {formatVolume(result.volume)}
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm text-muted-foreground">
                      {result.marketCap ? formatVolume(result.marketCap) : "—"}
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
