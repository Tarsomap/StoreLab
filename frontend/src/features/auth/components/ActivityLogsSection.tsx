"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Activity } from "lucide-react";
import { useActivityLogs } from "../hooks/use-activity-logs";
import { useSessionStores } from "@/features/session/hooks/use-session-stores";

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Login realizado",
  LOGIN_FAILED: "Falha no login",
  LOGOUT: "Logout",
  TWO_FA_ENABLED: "2FA ativado",
  TWO_FA_DISABLED: "2FA desativado",
  TWO_FA_VERIFIED: "2FA verificado",
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: "bg-accent/10 text-accent border border-accent/20",
  LOGIN_FAILED: "bg-destructive/10 text-destructive border border-destructive/20",
  LOGOUT: "bg-muted text-muted-foreground border border-border",
  TWO_FA_ENABLED: "bg-primary/10 text-primary border border-primary/20",
  TWO_FA_DISABLED: "bg-destructive/10 text-destructive border border-destructive/20",
  TWO_FA_VERIFIED: "bg-primary/10 text-primary border border-primary/20",
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

interface SessionOption {
  id: string;
  name: string;
}

interface ActivityLogsSectionProps {
  sessions: SessionOption[];
}

export function ActivityLogsSection({ sessions }: ActivityLogsSectionProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  const { data: stores } = useSessionStores(selectedSessionId);
  const { data: logs, isLoading: logsLoading } = useActivityLogs({
    sessionId: selectedSessionId,
    storeId: selectedStoreId || undefined,
  });

  return (
    <section className="space-y-4" aria-labelledby="activity-logs-heading">
      <h3
        id="activity-logs-heading"
        className="font-display text-xl font-bold text-foreground"
      >
        Logs de Atividade
      </h3>
      <Card className="shadow-sm border rounded-xl transition-colors duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
            <CardTitle className="font-display text-base font-semibold text-foreground">
              Historico de autenticacao dos jogadores
            </CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            Filtre por sessao e loja para acompanhar logins, logouts e eventos de 2FA.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Selecione uma sessao" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedStoreId}
              onValueChange={setSelectedStoreId}
              disabled={stores.length === 0}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todas as lojas" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((st) => (
                  <SelectItem key={st.storeId} value={st.storeId}>
                    {st.storeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedSessionId && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Selecione uma sessao para ver os logs.
            </div>
          )}

          {selectedSessionId && logsLoading && (
            <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">
              Carregando logs...
            </div>
          )}

          {selectedSessionId && !logsLoading && logs.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum log encontrado para os filtros selecionados.
            </div>
          )}

          {selectedSessionId && !logsLoading && logs.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Jogador</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Evento</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Data e hora</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        {log.user ? (
                          <div>
                            <p className="font-medium text-foreground">{log.user.name}</p>
                            <p className="text-xs text-muted-foreground">{log.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {(log.metadata?.email as string) ?? "-"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground border border-border"}`}
                        >
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
