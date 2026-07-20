import { useState } from "react";
import { useGetAlerts, useDeleteAlert, useCreateAlert, AlertCondition } from "@workspace/api-client-react";
import { formatPrice } from "@/lib/utils";
import { Bell, Trash2, Plus, Target, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Alerts() {
  const { data: alerts, isLoading, refetch } = useGetAlerts();
  const deleteMutation = useDeleteAlert();
  const createMutation = useCreateAlert();
  const { toast } = useToast();

  const [symbol, setSymbol] = useState("");
  const [condition, setCondition] = useState<AlertCondition>("above");
  const [price, setPrice] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !price) return;
    
    createMutation.mutate(
      { data: { symbol: symbol.toUpperCase(), condition, targetPrice: Number(price), note: "" } },
      { 
        onSuccess: () => {
          setSymbol("");
          setPrice("");
          refetch();
          toast({ title: "Alert Created", description: `Alert set for ${symbol.toUpperCase()}` });
        } 
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, { onSuccess: () => refetch() });
  };

  const activeAlerts = alerts?.filter(a => a.isActive) || [];
  const triggeredAlerts = alerts?.filter(a => !a.isActive) || [];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <Bell className="w-6 h-6" /> Alerts
        </h1>
      </div>

      <form onSubmit={handleCreate} className="bg-card border border-border p-4 flex flex-wrap sm:flex-nowrap gap-4 items-end shrink-0">
        <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Symbol</label>
          <input 
            type="text" 
            placeholder="AAPL" 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-background border border-border px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-primary"
            required
          />
        </div>
        <div className="flex flex-col gap-2 w-32 shrink-0">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Condition</label>
          <select 
            value={condition}
            onChange={(e) => setCondition(e.target.value as AlertCondition)}
            className="bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary appearance-none rounded-none cursor-pointer"
          >
            <option value="above">&gt;= Above</option>
            <option value="below">&lt;= Below</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Target Price</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-muted-foreground font-mono">$</span>
            <input 
              type="number" 
              step="0.01"
              min="0"
              placeholder="0.00" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-background border border-border pl-7 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              required
            />
          </div>
        </div>
        <button 
          type="submit"
          disabled={createMutation.isPending}
          className="bg-primary text-primary-foreground px-6 py-2 text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 min-w-[120px] h-9"
        >
          {createMutation.isPending ? "Adding..." : <><Plus className="w-4 h-4" /> Add Alert</>}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="bg-card border border-border flex flex-col overflow-hidden">
          <div className="h-10 border-b border-border flex items-center px-4 bg-muted/30 shrink-0">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
              <Target className="w-4 h-4" /> Active ({activeAlerts.length})
            </h2>
          </div>
          <div className="overflow-auto flex-1 p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">Loading alerts...</div>
            ) : activeAlerts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">No active alerts.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {activeAlerts.map(alert => (
                  <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-muted/30 group">
                    <div className="flex items-center gap-4">
                      <div className="font-bold text-xl text-primary font-mono w-16">{alert.symbol}</div>
                      <div className="font-mono text-sm">
                        <span className="text-muted-foreground mr-2 uppercase text-[10px] tracking-wider">{alert.condition}</span>
                        {formatPrice(alert.targetPrice)}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(alert.id)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2"
                      title="Delete alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border flex flex-col overflow-hidden opacity-80">
          <div className="h-10 border-b border-border flex items-center px-4 bg-muted/30 shrink-0">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4" /> Triggered ({triggeredAlerts.length})
            </h2>
          </div>
          <div className="overflow-auto flex-1 p-0">
            {triggeredAlerts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">No triggered alerts.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {triggeredAlerts.map(alert => (
                  <div key={alert.id} className="p-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="font-bold text-lg text-muted-foreground font-mono w-16 line-through">{alert.symbol}</div>
                        <div className="font-mono text-sm text-muted-foreground line-through">
                          <span className="mr-2 uppercase text-[10px] tracking-wider">{alert.condition}</span>
                          {formatPrice(alert.targetPrice)}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDelete(alert.id)}
                        className="text-muted-foreground hover:text-destructive p-2"
                        title="Delete alert"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {alert.triggeredAt && (
                      <div className="text-[10px] text-muted-foreground font-mono text-right">
                        Triggered at: {new Date(alert.triggeredAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
