import { useState } from "react";
import { useGetOptionChain, useGetQuote } from "@workspace/api-client-react";
import { formatPrice, formatNumber } from "@/lib/utils";
import { Search } from "lucide-react";

export function Options() {
  // Read symbol from URL params, fall back to NVDA
  const searchParams = new URLSearchParams(window.location.search);
  const initialSymbol = searchParams.get("symbol")?.toUpperCase() || "NVDA";

  const [symbolInput, setSymbolInput] = useState(initialSymbol);
  const [symbol, setSymbol] = useState(initialSymbol);

  const { data: quote } = useGetQuote(symbol, {
  query: {
    queryKey: ["/api/market/quote", symbol],
    enabled: !!symbol,
  },
});

  // First query — get available expiry dates
  const { data: chainBase } = useGetOptionChain(
  { symbol },
  {
    query: {
      queryKey: ["/api/market/options", { symbol }],
      enabled: !!symbol,
    },
  }
);
  const availableDates = chainBase?.expiryDates || [];
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (availableDates.length > 0 && !selectedDate) {
    setSelectedDate(availableDates[0]);
  }

  // Second query — get chain for selected expiry
  const { data: chain, isLoading } = useGetOptionChain(
  { symbol, expiry: selectedDate || undefined },
  {
    query: {
      queryKey: [
        "/api/market/options",
        { symbol, expiry: selectedDate || undefined },
      ],
      enabled: !!symbol && !!selectedDate,
    },
  }
);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbolInput.trim()) {
      setSymbol(symbolInput.toUpperCase());
      setSelectedDate(null);
    }
  };

  const selectedExpiryData = chain?.options?.find(o => o.date === selectedDate);
  const underlyingPrice = quote?.price || chain?.underlyingPrice || 0;

  const strikes = new Set<number>();
  selectedExpiryData?.calls.forEach(c => strikes.add(c.strike));
  selectedExpiryData?.puts.forEach(p => strikes.add(p.strike));
  const sortedStrikes = Array.from(strikes).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center shrink-0">
        <form onSubmit={handleSearch} className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full bg-card border border-border h-9 pl-9 pr-3 text-sm focus:outline-none focus:border-primary font-mono uppercase"
            placeholder="Symbol..."
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
          />
        </form>

        {quote && (
          <div className="bg-card border border-border px-4 py-1.5 flex items-baseline gap-3">
            <span className="font-bold text-primary">{symbol}</span>
            <span className="font-mono">{formatPrice(underlyingPrice)}</span>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex bg-card border border-border font-mono text-sm max-w-full overflow-x-auto">
          {availableDates.slice(0, 7).map(date => (
            <button
              key={date}
              className={`px-4 py-2 whitespace-nowrap border-r border-border hover:bg-muted ${selectedDate === date ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}
              onClick={() => setSelectedDate(date)}
            >
              {date}
            </button>
          ))}
          {availableDates.length > 7 && (
            <select
              className="bg-transparent text-muted-foreground outline-none px-2 cursor-pointer hover:bg-muted"
              value={selectedDate || ""}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              <option value="" disabled>More dates...</option>
              {availableDates.slice(7).map(date => (
                <option key={date} value={date} className="bg-card">{date}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex-1 bg-card border border-border overflow-hidden flex flex-col">
        <div className="h-8 border-b border-border flex bg-muted/30">
          <div className="flex-1 text-center font-bold text-xs uppercase tracking-widest leading-8 text-primary border-r border-border bg-success/10">Calls</div>
          <div className="w-24 text-center font-bold text-xs uppercase tracking-widest leading-8">Strike</div>
          <div className="flex-1 text-center font-bold text-xs uppercase tracking-widest leading-8 text-primary border-l border-border bg-destructive/10">Puts</div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs font-mono">
            <thead className="bg-card border-b border-border sticky top-0 z-10 text-muted-foreground">
              <tr>
                <th className="font-normal px-2 py-2 text-right">Delta</th>
                <th className="font-normal px-2 py-2 text-right">Vol</th>
                <th className="font-normal px-2 py-2 text-right">OI</th>
                <th className="font-normal px-2 py-2 text-right">Bid</th>
                <th className="font-normal px-2 py-2 text-right border-r border-border">Ask</th>
                <th className="font-bold px-2 py-2 text-center w-24 bg-muted/30 text-primary">Strike</th>
                <th className="font-normal px-2 py-2 text-left border-l border-border">Bid</th>
                <th className="font-normal px-2 py-2 text-left">Ask</th>
                <th className="font-normal px-2 py-2 text-left">OI</th>
                <th className="font-normal px-2 py-2 text-left">Vol</th>
                <th className="font-normal px-2 py-2 text-left">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={11} className="py-12 text-center text-muted-foreground">Loading option chain...</td></tr>
              ) : !selectedExpiryData ? (
                <tr><td colSpan={11} className="py-12 text-center text-muted-foreground">Select an expiry date above.</td></tr>
              ) : (
                sortedStrikes.map(strike => {
                  const call = selectedExpiryData.calls.find(c => c.strike === strike);
                  const put = selectedExpiryData.puts.find(p => p.strike === strike);
                  const isAtm = Math.abs(strike - underlyingPrice) < (strike * 0.015);
                  return (
                    <tr key={strike} className={`hover:bg-muted/30 ${isAtm ? 'bg-primary/5' : ''}`}>
                      <td className={`px-2 py-1 text-right ${call?.inTheMoney ? 'bg-success/5' : ''}`}>{(call?.delta || 0).toFixed(2)}</td>
                      <td className={`px-2 py-1 text-right ${call?.inTheMoney ? 'bg-success/5' : ''}`}>{formatNumber(call?.volume)}</td>
                      <td className={`px-2 py-1 text-right text-muted-foreground ${call?.inTheMoney ? 'bg-success/5' : ''}`}>{formatNumber(call?.openInterest)}</td>
                      <td className={`px-2 py-1 text-right text-success ${call?.inTheMoney ? 'bg-success/5' : ''}`}>{call?.bid?.toFixed(2) ?? '—'}</td>
                      <td className={`px-2 py-1 text-right text-success border-r border-border ${call?.inTheMoney ? 'bg-success/5' : ''}`}>{call?.ask?.toFixed(2) ?? '—'}</td>
                      <td className={`px-2 py-1 text-center font-bold w-24 bg-muted/30 ${isAtm ? 'text-primary border-x border-primary/20' : ''}`}>{strike.toFixed(2)}</td>
                      <td className={`px-2 py-1 text-left text-destructive border-l border-border ${put?.inTheMoney ? 'bg-destructive/5' : ''}`}>{put?.bid?.toFixed(2) ?? '—'}</td>
                      <td className={`px-2 py-1 text-left text-destructive ${put?.inTheMoney ? 'bg-destructive/5' : ''}`}>{put?.ask?.toFixed(2) ?? '—'}</td>
                      <td className={`px-2 py-1 text-left text-muted-foreground ${put?.inTheMoney ? 'bg-destructive/5' : ''}`}>{formatNumber(put?.openInterest)}</td>
                      <td className={`px-2 py-1 text-left ${put?.inTheMoney ? 'bg-destructive/5' : ''}`}>{formatNumber(put?.volume)}</td>
                      <td className={`px-2 py-1 text-left ${put?.inTheMoney ? 'bg-destructive/5' : ''}`}>{(put?.delta || 0).toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
