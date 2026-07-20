import { useState } from "react";
import { useGetWatchlist, useSearchSymbols, useAddToWatchlist, useRemoveFromWatchlist, useGetQuote } from "@workspace/api-client-react";
import { formatPrice, formatPercent, getColorClass, formatVolume } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { Search, X, TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";

function WatchlistRow({ item, onRemove }: { item: { id: number; symbol: string; name: string }, onRemove: (id: number) => void }) {
  const [, setLocation] = useLocation();
  const { data: quote } = useGetQuote(item.symbol, { query: { enabled: !!item.symbol, refetchInterval: 5000 } });

  return (
    <tr 
      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer group"
      onClick={() => setLocation(`/chart?symbol=${item.symbol}`)}
    >
      <td className="px-4 py-3 align-middle">
        <div className="font-bold text-primary font-mono">{item.symbol}</div>
        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.name}</div>
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">
        {quote ? formatPrice(quote.price) : "—"}
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">
        <div className={getColorClass(quote?.change)}>
          {quote ? (quote.change > 0 ? "+" : "") + formatPrice(quote.change).replace('$', '') : "—"}
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">
        <div className={getColorClass(quote?.changePercent)}>
          {quote ? formatPercent(quote.changePercent) : "—"}
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm text-muted-foreground">
        {quote ? formatVolume(quote.volume) : "—"}
      </td>
      <td className="px-4 py-3 align-middle text-right w-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
          className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 p-1"
          title="Remove from watchlist"
        >
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

export function Watchlist() {
  const { data: watchlist, isLoading, refetch } = useGetWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const addMutation = useAddToWatchlist();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data: searchResults } = useSearchSymbols({ q: debouncedSearch }, { query: { enabled: debouncedSearch.length > 0 } });

  const handleAdd = (symbol: string, name: string) => {
    addMutation.mutate(
      { data: { symbol, name } },
      { 
        onSuccess: () => {
          setSearch("");
          refetch();
        }
      }
    );
  };

  const handleRemove = (id: number) => {
    removeMutation.mutate(
      { id },
      { onSuccess: () => refetch() }
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <Activity className="w-6 h-6" /> Watchlist
        </h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full bg-card border border-border h-8 pl-9 pr-3 text-sm focus:outline-none focus:border-primary font-mono placeholder:font-sans transition-colors"
            placeholder="Add symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.length > 0 && searchResults && (
            <div className="absolute top-full left-0 w-full mt-1 bg-card border border-border shadow-lg z-50 max-h-60 overflow-y-auto">
              {searchResults.map((res) => (
                <button
                  key={`${res.exchange}-${res.symbol}`}
                  className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between"
                  onClick={() => handleAdd(res.symbol, res.name)}
                >
                  <span className="font-bold font-mono text-primary">{res.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{res.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border sticky top-0 z-10 backdrop-blur">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-normal text-muted-foreground uppercase tracking-wider">Symbol</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Change</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">% Change</th>
                <th className="px-4 py-2 text-right text-xs font-normal text-muted-foreground uppercase tracking-wider">Volume</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground font-mono text-sm">
                    Loading watchlist...
                  </td>
                </tr>
              ) : !watchlist || watchlist.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="w-8 h-8 opacity-20" />
                      <p className="font-mono text-sm">Watchlist is empty</p>
                      <p className="text-xs opacity-60">Search and add symbols to track them</p>
                    </div>
                  </td>
                </tr>
              ) : (
                watchlist.map((item) => (
                  <WatchlistRow key={item.id} item={item} onRemove={handleRemove} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
