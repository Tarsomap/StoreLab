/** Layout de carregamento da página de gestão de sessão (facilitador). */
export function SessionSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
      <div className="flex gap-2">
        <div className="h-8 w-24 rounded-md bg-muted" />
        <div className="h-8 w-40 rounded-md bg-muted" />
      </div>
      <div className="h-36 rounded-xl border bg-card p-5 space-y-3">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-6 w-3/4 max-w-md rounded bg-muted" />
        <div className="flex gap-2 pt-2">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="h-8 w-8 rounded-full bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-40 rounded-xl border bg-card" />
        <div className="h-40 rounded-xl border bg-card" />
      </div>
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-48 rounded-xl border bg-card" />
        <div className="h-48 rounded-xl border bg-card" />
      </div>
    </div>
  );
}
