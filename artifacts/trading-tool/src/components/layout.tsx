import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Home, Eye, BarChart2, Briefcase, BookOpen, Activity, Bell, Clock, Cpu } from "lucide-react";
import { useSearchSymbols, SearchResult } from "@workspace/api-client-react";
import { useDebounce } from "@/lib/hooks/use-debounce";

export function TopBar() {
  const [, setLocation] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { data: searchResults } = useSearchSymbols(
  { q: debouncedQuery },
  {
    query: {
      queryKey: ["/api/market/search", { q: debouncedQuery }],
      enabled: debouncedQuery.length > 0,
    },
  }
);

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbol (e.g. AAPL)..."
            className="w-full bg-background border border-border h-8 pl-9 pr-3 text-sm focus:outline-none focus:border-primary font-mono placeholder:font-sans transition-colors"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
          />
          {searchOpen && searchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-1 bg-card border border-border shadow-lg z-50 max-h-60 overflow-y-auto">
              {searchResults.map((result: SearchResult) => (
                <button
                  key={`${result.exchange}-${result.symbol}`}
                  className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between"
                  onClick={() => {
                    setLocation(`/chart?symbol=${result.symbol}`);
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold font-mono text-primary">{result.symbol}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">{result.name}</span>
                  </div>
                  <span className="text-[10px] bg-muted px-1 py-0.5 text-muted-foreground uppercase">{result.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          MARKET OPEN
        </div>
        <div className="flex items-center gap-1.5 border-l border-border pl-4">
          <Clock className="h-3.5 w-3.5" />
          {time.toLocaleTimeString('en-US', { hour12: false })} EST
        </div>
      </div>
    </header>
  );
}

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/chart", label: "Chart", icon: BarChart2 },
  { href: "/options", label: "Options", icon: Activity },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/scanner", label: "Scanner", icon: Cpu },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-16 hover:w-48 group flex flex-col bg-card border-r border-border h-full transition-all duration-200 overflow-hidden shrink-0 relative z-10">
      <div className="h-12 border-b border-border flex items-center justify-center group-hover:justify-start group-hover:px-4 shrink-0 bg-background">
        <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg leading-none tracking-tighter">
          T
        </div>
        <span className="ml-3 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          TERMINAL
        </span>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center h-10 px-4 whitespace-nowrap hover:bg-muted transition-colors ${
                isActive ? "text-primary border-l-2 border-primary bg-muted/50" : "text-muted-foreground border-l-2 border-transparent"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="ml-4 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
