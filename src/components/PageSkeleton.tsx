// Shown instantly by Next.js (via each route's loading.tsx) while the real
// page's server component is still fetching data. Deliberately fetches
// nothing itself — that's the whole point, it has to render with zero
// network delay so a click always gets an immediate visual response.
export default function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header style={{ borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.92)" }}>
        <div className="container flex items-center gap-4" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <div className="w-9 h-9 rounded-lg skeleton" />
          <div className="stack" style={{ gap: 6 }}>
            <div className="skeleton" style={{ height: 12, width: 90 }} />
            <div className="skeleton" style={{ height: 9, width: 70 }} />
          </div>
        </div>
        <div className="container" style={{ paddingBottom: 12 }}>
          <div className="skeleton" style={{ height: 10, width: 260 }} />
        </div>
      </header>
      <main className="flex-1">
        <div className="container" style={{ paddingTop: "var(--sp-6)", paddingBottom: "var(--sp-8)" }}>
          <div className="stack-lg">
            <div className="stack" style={{ gap: 8 }}>
              <div className="skeleton" style={{ height: 11, width: 140 }} />
              <div className="skeleton" style={{ height: 26, width: 220 }} />
            </div>
            <div className="card">
              <div className="bd stack">
                {Array.from({ length: rows }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 16, width: `${85 - i * 8}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
