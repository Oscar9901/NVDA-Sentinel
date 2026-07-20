export default function NotFound() {
  return (
    <div className="h-full flex items-center justify-center font-mono">
      <div className="text-center bg-card border border-border p-12">
        <h1 className="text-6xl font-bold text-destructive mb-4">404</h1>
        <p className="text-xl text-primary mb-2">SYSTEM OFFLINE</p>
        <p className="text-sm text-muted-foreground uppercase tracking-wider">The requested module could not be found.</p>
      </div>
    </div>
  );
}
