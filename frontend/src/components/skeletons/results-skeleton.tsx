/** Layout de carregamento da página de ranking/resultados. */
export function ResultsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16 animate-pulse">
      <div className="space-y-2 pt-2">
        <div className="h-6 w-36 rounded-full bg-muted" />
        <div className="h-9 w-64 rounded-lg bg-muted" />
        <div className="h-5 w-full max-w-xl rounded-md bg-muted" />
      </div>

      <section>
        <div className="flex items-end justify-center gap-4 max-w-3xl mx-auto">
          <div className="flex-1 h-32 rounded-lg bg-muted" />
          <div className="flex-1 h-44 rounded-lg bg-muted" />
          <div className="flex-1 h-36 rounded-lg bg-muted" />
        </div>
      </section>

      <section className="space-y-3">
        <div className="h-7 w-56 rounded-lg bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded-lg bg-muted" />
          ))}
        </div>
      </section>
    </div>
  );
}
