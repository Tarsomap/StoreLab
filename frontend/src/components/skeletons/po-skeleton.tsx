/** Layout de carregamento do Plano Operacional (duas colunas + cartões). */
export function POSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10 animate-pulse">
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="h-8 w-24 rounded-lg bg-muted" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5 items-start">
        <div className="rounded-xl border border-border/80 overflow-hidden">
          <div className="h-12 border-b bg-muted/50" />
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-md bg-muted" />
            ))}
          </div>
        </div>
        <div className="h-64 rounded-xl border border-border/80 bg-muted/30" />
      </div>
    </div>
  );
}
