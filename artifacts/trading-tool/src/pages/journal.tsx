import { useState } from "react";
import {
  useGetTrades,
  useGetTradeStats,
  useCreateTrade,
  useDeleteTrade,
} from "@workspace/api-client-react";
import { formatPrice, formatPercent, getColorClass } from "@/lib/utils";
import { BookOpen, Plus, X, ChevronDown } from "lucide-react";

function AddTradeForm({ onSuccess }: { onSuccess: () => void }) {
  const createMutation = useCreateTrade();
  const [form, setForm] = useState({
    symbol: "",
    side: "buy" as "buy" | "sell",
    quantity: "",
    price: "",
    fees: "",
    pnl: "",
    notes: "",
    assetType: "stock" as "stock" | "option",
    tradedAt: new Date().toISOString().slice(0, 16),
  });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.quantity || !form.price) {
      setError("Symbol, quantity, and price are required.");
      return;
    }
    setError("");
    createMutation.mutate(
      {
        data: {
          symbol: form.symbol.toUpperCase(),
          side: form.side,
          quantity: parseFloat(form.quantity),
          price: parseFloat(form.price),
          fees: form.fees ? parseFloat(form.fees) : 0,
          pnl: form.pnl ? parseFloat(form.pnl) : undefined,
          notes: form.notes || undefined,
          assetType: form.assetType,
          tradedAt: new Date(form.tradedAt).toISOString(),
        },
      },
      {
        onSuccess: () => {
          setForm({
            symbol: "",
            side: "buy",
            quantity: "",
            price: "",
            fees: "",
            pnl: "",
            notes: "",
            assetType: "stock",
            tradedAt: new Date().toISOString().slice(0, 16),
          });
          onSuccess();
        },
        onError: () => setError("Failed to log trade."),
      }
    );
  };

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Log Trade</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <input
          className="bg-muted border border-border h-8 px-3 text-sm font-mono focus:outline-none focus:border-primary uppercase"
          placeholder="Symbol *"
          value={form.symbol}
          onChange={set("symbol")}
        />
        <select
          className="bg-muted border border-border h-8 px-3 text-sm font-mono focus:outline-none focus:border-primary"
          value={form.side}
          onChange={set("side")}
        >
          <option value="buy">BUY</option>
          <option value="sell">SELL</option>
        </select>
        <input
          className="bg-muted border border-border h-8 px-3 text-sm font-mono focus:outline-none focus:border-primary"
          placeholder="Qty *"
          type="number"
          min="0"
          step="any"
          value={form.quantity}
          onChange={set("quantity")}
        />
        <input
          className="bg-muted border border-border h-8 px-3 text-sm font-mono focus:outline-none focus:border-primary"
          placeholder="Price *"
          type="number"
          min="0"
          step="any"
          value={form.price}
          onChange={set("price")}
        />
        <input
          className="bg-muted border border-border h-8 px-3 text-sm font-mono focus:outline-none focus:border-primary"
          placeholder="Fees"
          type="number"
          min="0"
          step="any"
          value={form.fees}
          onChange={set("fees")}
        />
        <input
          className="bg-muted border border-border h-8 px-3 text-sm font-mono focus:outline-none focus:border-primary"
          placeholder="Realized P&L"
          type="number"
          step="any"
          value={form.pnl}
          onChange={set("pnl")}
        />
        <select
          className="bg-muted border border-border h-8 px-3 text-sm focus:outline-none focus:border-primary"
          value={form.assetType}
          onChange={set("assetType")}
        >
          <option value="stock">Stock</option>
          <option value="option">Option</option>
        </select>
        <input
          className="bg-muted border border-border h-8 px-3 text-sm font-mono focus:outline-none focus:border-primary"
          type="datetime-local"
          value={form.tradedAt}
          onChange={set("tradedAt")}
        />
      </div>
      <div className="mt-3">
        <input
          className="w-full bg-muted border border-border h-8 px-3 text-sm focus:outline-none focus:border-primary"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={set("notes")}
        />
      </div>
      {error && <p className="text-destructive text-xs mt-2 font-mono">{error}</p>}
      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-primary text-primary-foreground px-4 h-8 text-sm font-mono uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-3 h-3" />
          {createMutation.isPending ? "Logging..." : "Log Trade"}
        </button>
      </div>
    </form>
  );
}

export function Journal() {
  const { data: trades, isLoading: tradesLoading, refetch } = useGetTrades({ limit: 100 });
  const { data: stats, refetch: refetchStats } = useGetTradeStats();
  const deleteMutation = useDeleteTrade();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          refetch();
          refetchStats();
        },
      }
    );
  };

  const handleAdded = () => {
    setShowAddForm(false);
    refetch();
    refetchStats();
  };

  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto h-full">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <BookOpen className="w-6 h-6" /> Trade Journal
        </h1>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 bg-card border border-border px-3 h-8 text-sm font-mono uppercase tracking-wider hover:border-primary transition-colors"
        >
          <Plus className="w-3 h-3" />
          Log Trade
          <ChevronDown className={`w-3 h-3 transition-transform ${showAddForm ? "rotate-180" : ""}`} />
        </button>
      </div>

      {showAddForm && <AddTradeForm onSuccess={handleAdded} />}

      {stats && (
        <div className="bg-card border border-border p-4 shrink-0">
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
                <th className="px-4 py-2 text-left text-xs font-normal text-muted-foreground uppercase tracking-wider">Notes</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tradesLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground font-mono text-sm">
                    Loading trades...
                  </td>
                </tr>
              ) : !trades || trades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <p className="font-mono text-sm">No trades recorded</p>
                    <p className="text-xs opacity-60 mt-1">Use "Log Trade" to record your trades</p>
                  </td>
                </tr>
              ) : (
                trades.map(trade => (
                  <tr key={trade.id} className="hover:bg-muted/30 group">
                    <td className="px-4 py-3 align-middle text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {new Date(trade.tradedAt).toLocaleDateString(undefined, {
                        month: "numeric", day: "numeric", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="font-bold text-primary font-mono">{trade.symbol}</div>
                      <div className="text-[10px] bg-muted inline-block px-1 text-muted-foreground uppercase">
                        {trade.assetType}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-center font-mono text-xs uppercase tracking-wider">
                      <span
                        className={`px-2 py-0.5 ${
                          trade.side === "buy"
                            ? "bg-success/20 text-success"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm">{trade.quantity}</td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm">{formatPrice(trade.price)}</td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm text-muted-foreground">
                      {trade.fees ? formatPrice(trade.fees) : "—"}
                    </td>
                    <td className="px-4 py-3 align-middle text-right font-mono text-sm">
                      {trade.pnl !== undefined && trade.pnl !== null ? (
                        <span className={getColorClass(trade.pnl)}>
                          {trade.pnl > 0 ? "+" : ""}
                          {formatPrice(trade.pnl)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-muted-foreground max-w-[200px] truncate">
                      {trade.notes || ""}
                    </td>
                    <td className="px-4 py-3 align-middle w-10">
                      <button
                        onClick={() => handleDelete(trade.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 p-1"
                        title="Delete trade"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
