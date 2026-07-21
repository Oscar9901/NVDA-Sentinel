import { useState } from "react";
import {
  useGetPortfolioPositions,
  useGetPortfolioSummary,
  useGetQuote,
  useAddPosition,
  useDeletePosition,
  Position,
} from "@workspace/api-client-react";
import { formatPrice, formatPercent, getColorClass } from "@/lib/utils";
import { Briefcase, Plus, X, ChevronDown } from "lucide-react";

function PositionRow({ position, onClose }: { position: Position; onClose: (id: number) => void }) {
  const { data: quote } = useGetQuote(position.symbol, {
    query: { enabled: !!position.symbol, refetchInterval: 10000 },
  });

  const currentPrice = quote?.price ?? position.avgCost;
  const marketValue = currentPrice * position.quantity;
  const costBasis = position.avgCost * position.quantity;
  const unrealizedPnl = marketValue - costBasis;
  const unrealizedPnlPercent = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 group">
      <td className="px-4 py-3 align-middle">
        <div className="font-bold text-primary font-mono">{position.symbol}</div>
        <div className="text-[10px] bg-muted inline-block px-1 mt-1 text-muted-foreground uppercase">
          {position.assetType}
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">{position.quantity}</td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">{formatPrice(position.avgCost)}</td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">
        {quote ? formatPrice(quote.price) : "—"}
      </td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">{formatPrice(marketValue)}</td>
      <td className="px-4 py-3 align-middle text-right font-mono text-sm">
        <div className={getColorClass(unrealizedPnl)}>
          {unrealizedPnl > 0 ? "+" : ""}
          {formatPrice(unrealizedPnl)}
        </div>
        <div className={`text-xs ${getColorClass(unrealizedPnlPercent)}`}>
          {formatPercent(unrealizedPnlPercent)}
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-right w-10">
        <button
          onClick={() => onClose(position.id)}
          className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 p-1"
          title="Remove position"
        >
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function AddPositionForm({ onSuccess }: { onSuccess: () => void }) {
  const addMutation = useAddPosition();
  const [form, setForm] = useState({
    symbol: "",
    name: "",
    quantity: "",
    avgCost: "",
    assetType: "stock" as "stock" | "option",
    notes: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.quantity || !form.avgCost) {
      setError("Symbol, quantity, and avg cost are required.");
      return;
    }
    setError("");
    addMutation.mutate(
      {
        data: {
          symbol: form.symbol.toUpperCase(),
          name: form.name || form.symbol.toUpperCase(),
          quantity: parseFloat(form.quantity),
          avgCost: parseFloat(form.avgCost),
          assetType: form.assetType,
          notes: form.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          setForm({ symbol: "", name: "", quantity: "", avgCost: "", assetType: "stock", notes: "" });
          onSuccess();
        },
        onError: () => setError("Failed to add position."),
      }
    );
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Add Position</h2>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <input
          className="bg-muted border border-border h-8 px-3 text-sm font-mono focus:outline-none focus:border-primary uppercase col-span-1"
          placeholder="Symbol *"
          value={form.symbol}
          onChange={set("symbol")}
        />
        <input
          className="bg-muted border border-border h-8 px-3 text-sm focus:outline-none focus:border-primary col-span-2"
          placeholder="Name (optional)"
          value={form.name}
          onChange={set("name")}
        />
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
          placeholder="Avg Cost *"
          type="number"
          min="0"
          step="any"
          value={form.avgCost}
          onChange={set("avgCost")}
        />
        <select
          className="bg-muted border border-border h-8 px-3 text-sm focus:outline-none focus:border-primary"
          value={form.assetType}
          onChange={set("assetType")}
        >
          <option value="stock">Stock</option>
          <option value="option">Option</option>
        </select>
      </div>
      {error && <p className="text-destructive text-xs mt-2 font-mono">{error}</p>}
      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={addMutation.isPending}
          className="bg-primary text-primary-foreground px-4 h-8 text-sm font-mono uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-3 h-3" />
          {addMutation.isPending ? "Adding..." : "Add Position"}
        </button>
      </div>
    </form>
  );
}

export function Portfolio() {
  const { data: positions, isLoading, refetch } = useGetPortfolioPositions();
  const { data: summary, refetch: refetchSummary } = useGetPortfolioSummary();
  const deleteMutation = useDeletePosition();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleClose = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          refetch();
          refetchSummary();
        },
      }
    );
  };

  const handleAdded = () => {
    setShowAddForm(false);
    refetch();
    refetchSummary();
  };

  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto h-full">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <Briefcase className="w-6 h-6" /> Portfolio
        </h1>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 bg-card border border-border px-3 h-8 text-sm font-mono uppercase tracking-wider hover:border-primary transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Position
          <ChevronDown className={`w-3 h-3 transition-transform ${showAddForm ? "rotate-180" : ""}`} />
        </button>
      </div>

      {showAddForm && <AddPositionForm onSuccess={handleAdded} />}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
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
            <div className={`text-xl font-mono font-bold ${getColorClass(summary.totalPnl)}`}>
              {summary.totalPnl > 0 ? "+" : ""}{formatPrice(summary.totalPnl)}
            </div>
            <div className={`text-xs font-mono mt-1 ${getColorClass(summary.totalPnlPercent)}`}>
              {formatPercent(summary.totalPnlPercent)}
            </div>
          </div>
          <div className="bg-card border border-border p-4 flex flex-col justify-between">
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Day P&L</div>
            <div className={`text-xl font-mono font-bold ${getColorClass(summary.dayPnl)}`}>
              {summary.dayPnl > 0 ? "+" : ""}{formatPrice(summary.dayPnl)}
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
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground font-mono text-sm">
                    Loading portfolio...
                  </td>
                </tr>
              ) : !positions || positions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <p className="font-mono text-sm">No open positions</p>
                    <p className="text-xs opacity-60 mt-1">Use "Add Position" to track your holdings</p>
                  </td>
                </tr>
              ) : (
                positions.map(position => (
                  <PositionRow key={position.id} position={position} onClose={handleClose} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
