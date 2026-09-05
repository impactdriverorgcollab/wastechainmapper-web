export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-text">DELTAFLOW ATLAS</span>
          <span className="text-2xs text-text-dim uppercase tracking-widest">Admin</span>
        </div>
        <nav className="flex items-center gap-4 text-xs text-text-secondary">
          <a href="/admin/queue" className="hover:text-text">Verification queue</a>
          <a href="/admin/sites" className="hover:text-text">Sites</a>
          <a href="/map" className="hover:text-text">Map</a>
          <a href="/flows" className="hover:text-text">Flows</a>
          <a href="/water" className="hover:text-text">Water</a>
          <a href="/analytics" className="hover:text-text">Analytics</a>
          <a href="/admin/api-keys" className="hover:text-text">API keys</a>
        </nav>
      </header>
      {children}
    </div>
  );
}
