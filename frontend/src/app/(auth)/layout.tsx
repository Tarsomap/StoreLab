/**
 * Moldura das rotas `/login` e `/register`: painel de marca à esquerda (desktop) e cartão branco com o formulário à direita.
 *
 * @param children - Conteúdo da página de auth (login ou registro).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const stores = [
    { color: 'hsl(142 71% 45%)', barPct: 100, label: 'Loja A', value: '+18,3%', delay: '0ms',   rank: '1°' },
    { color: 'hsl(38 92% 50%)',  barPct: 70,  label: 'Loja B', value: '+12,7%', delay: '110ms', rank: '2°' },
    { color: 'hsl(217 91% 60%)', barPct: 48,  label: 'Loja C', value: '+8,1%',  delay: '220ms', rank: '3°' },
    { color: 'hsl(280 68% 60%)', barPct: 28,  label: 'Loja D', value: '+4,2%',  delay: '330ms', rank: '4°' },
  ];

  const storeDots = [
    'hsl(142 71% 45%)',
    'hsl(38 92% 50%)',
    'hsl(217 91% 60%)',
    'hsl(280 68% 60%)',
  ];

  return (
    <div className="min-h-screen flex">
      {/* ── Brand Panel (40%) ── */}
      <div
        className="hidden lg:flex lg:w-2/5 shrink-0 flex-col bg-primary relative overflow-hidden"
        style={{
          backgroundImage: [
            'linear-gradient(hsl(222 47% 30% / 0.4) 1px, transparent 1px)',
            'linear-gradient(90deg, hsl(222 47% 30% / 0.4) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '40px 40px',
        }}
      >
        {/* Ambient glow blobs */}
        <div
          className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(142 71% 45% / 0.12) 0%, transparent 68%)',
            transform: 'translate(40%, -40%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(217 91% 60% / 0.12) 0%, transparent 68%)',
            transform: 'translate(-40%, 40%)',
          }}
        />

        {/* Floating geometric shapes */}
        <div
          className="absolute pointer-events-none float-shape-a"
          style={{ top: '24%', right: '28px' }}
        >
          <div
            className="w-16 h-16 rounded-2xl border border-primary-foreground/[0.09]"
            style={{ background: 'linear-gradient(135deg, hsl(142 71% 45% / 0.16), hsl(142 71% 45% / 0.03))' }}
          />
        </div>
        <div
          className="absolute pointer-events-none float-shape-b"
          style={{ top: '47%', right: '64px' }}
        >
          <div
            className="w-10 h-10 rounded-xl border border-primary-foreground/[0.08]"
            style={{ background: 'linear-gradient(135deg, hsl(38 92% 50% / 0.16), hsl(38 92% 50% / 0.03))' }}
          />
        </div>
        <div
          className="absolute pointer-events-none float-shape-c"
          style={{ top: '63%', right: '18px' }}
        >
          <div
            className="w-6 h-6 rounded-lg border border-primary-foreground/[0.07]"
            style={{ background: 'linear-gradient(135deg, hsl(280 68% 60% / 0.16), hsl(280 68% 60% / 0.03))' }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-12">
          {/* Top: brand */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 px-3.5 py-1.5 mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-accent block animate-pulse" />
              <span className="text-primary-foreground/50 text-xs font-body tracking-wide">
                Plataforma de Simulação
              </span>
            </div>

            <h1 className="font-display font-bold leading-none">
              <span className="text-6xl xl:text-7xl text-primary-foreground">Store</span>
              <span
                className="text-6xl xl:text-7xl"
                style={{ color: 'hsl(142 71% 45%)' }}
              >
                Lab
              </span>
            </h1>

            <p className="text-primary-foreground/45 font-body text-sm mt-5 leading-relaxed max-w-[280px]">
              Simulação gamificada de gestão de varejo.
            </p>
          </div>

          {/* Leaderboard visualization */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <p className="text-primary-foreground/30 text-[10px] font-body tracking-[0.15em] uppercase">
                Placar Final — Rodada 3
              </p>
            </div>

            <div className="space-y-3">
              {stores.map((store, i) => (
                <div key={i} className="flex items-center gap-3">
                  {/* Rank */}
                  <span className="text-[11px] font-mono text-primary-foreground/35 w-4 shrink-0 text-right">
                    {store.rank}
                  </span>

                  {/* Store name */}
                  <span className="text-[11px] font-body text-primary-foreground/55 w-10 shrink-0">
                    {store.label}
                  </span>

                  {/* Horizontal bar track */}
                  <div
                    className="flex-1 relative h-7 rounded-lg overflow-hidden"
                    style={{ background: 'hsl(222 47% 28% / 0.5)' }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full rounded-lg bar-rise-x"
                      style={{
                        width: `${store.barPct}%`,
                        backgroundColor: store.color,
                        opacity: 0.88,
                        animationDelay: store.delay,
                      }}
                    />
                  </div>

                  {/* EBITDA value */}
                  <span
                    className="text-[11px] font-mono shrink-0 w-12 text-right"
                    style={{ color: store.color }}
                  >
                    {store.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom footer */}
          <div className="border-t border-primary-foreground/10 pt-6 flex items-center justify-between">
            <p className="text-primary-foreground/35 text-xs font-body tracking-wide">
              4 Lojas · 3 Rodadas · 1 Campeão
            </p>
            <div className="flex gap-1.5 items-center">
              {storeDots.map((color, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color, opacity: 0.65 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Panel (60%) ── */}
      <div className="flex-1 flex items-center justify-center bg-background p-8 overflow-y-auto">
        <div className="bg-card rounded-2xl border shadow-sm p-8 w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
