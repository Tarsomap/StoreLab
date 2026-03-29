export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const bars = [
    { color: 'hsl(142 71% 45%)', glow: 'hsl(142 71% 45% / 0.3)', pct: 78, label: 'Loja A', value: '+18,3%' },
    { color: 'hsl(38 92% 50%)',  glow: 'hsl(38 92% 50% / 0.3)',  pct: 62, label: 'Loja B', value: '+12,7%' },
    { color: 'hsl(217 91% 60%)', glow: 'hsl(217 91% 60% / 0.3)', pct: 45, label: 'Loja C', value: '+8,1%'  },
    { color: 'hsl(280 68% 60%)', glow: 'hsl(280 68% 60% / 0.3)', pct: 31, label: 'Loja D', value: '+4,2%'  },
  ];

  return (
    <div className="min-h-screen flex">
      {/* ── Brand Panel ── */}
      <div
        className="hidden lg:flex lg:w-[460px] xl:w-[520px] shrink-0 flex-col bg-primary relative overflow-hidden"
        style={{
          backgroundImage: [
            'linear-gradient(hsl(222 47% 32% / 0.3) 1px, transparent 1px)',
            'linear-gradient(90deg, hsl(222 47% 32% / 0.3) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '40px 40px',
        }}
      >
        {/* Ambient glow blobs */}
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(142 71% 45% / 0.07) 0%, transparent 70%)',
            transform: 'translate(35%, -35%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(217 91% 60% / 0.07) 0%, transparent 70%)',
            transform: 'translate(-35%, 35%)',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Top */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 px-3 py-1 mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-accent block" />
              <span className="text-primary-foreground/50 text-xs font-body tracking-wide">
                Plataforma de Simulação
              </span>
            </div>

            <h1 className="font-display font-bold text-primary-foreground leading-[0.95]">
              <span className="block text-5xl xl:text-6xl">Retail</span>
              <span className="block text-5xl xl:text-6xl">Game</span>
              <span className="block text-3xl xl:text-4xl text-accent mt-2">Platform</span>
            </h1>

            <p className="text-primary-foreground/45 font-body text-sm mt-5 leading-relaxed max-w-[260px]">
              Simulação gamificada de gestão de varejo competitivo entre lojas.
            </p>
          </div>

          {/* Competition bars */}
          <div>
            <p className="text-primary-foreground/30 text-[10px] font-body tracking-[0.15em] uppercase mb-5">
              EBITDA Acumulado — Rodada 3
            </p>
            <div className="flex items-end gap-3 h-44">
              {bars.map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] font-mono text-primary-foreground/50">
                    {bar.value}
                  </span>
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${bar.pct}%`,
                      backgroundColor: bar.color,
                      boxShadow: `0 -10px 28px ${bar.glow}`,
                    }}
                  />
                  <span className="text-[11px] font-body text-primary-foreground/35">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-primary-foreground/10 pt-6">
            <p className="text-primary-foreground/35 text-xs font-body tracking-wide">
              4 Lojas &nbsp;·&nbsp; 3 Rodadas &nbsp;·&nbsp; 1 Campeão
            </p>
          </div>
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="flex-1 flex items-center justify-center bg-background p-8 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
