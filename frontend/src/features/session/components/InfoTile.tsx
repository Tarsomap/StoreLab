interface InfoTileProps {
  label: string;
  value: string;
}

/** Pequeno bloco rótulo + valor monoespaçado na grade "Sessão". */
export function InfoTile({ label, value }: InfoTileProps) {
  return (
    <div>
      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="font-mono font-semibold text-sm">{value}</p>
    </div>
  );
}
