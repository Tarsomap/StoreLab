import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/**
 * Conteúdo mínimo extraído do JWT na conexão WebSocket (id, e-mail e papel).
 * Espelha o payload do login para sabermos se o socket é facilitador ou jogador sem consultar o banco a cada mensagem.
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface FacilitatorNotificationPayload {
  type: 'PLAN_CONFIRMED' | 'QUIZ_PROGRESS' | 'QUIZ_FINISHED';
  sessionId: string;
  storeId: string;
  userId?: string;
  round?: number;
  answered?: number;
  total?: number;
  timestamp: string;
}

interface TimerUpdatePayload {
  action: 'STARTED' | 'PAUSED' | 'STOPPED';
  sessionId: string;
  timerDuration: number | null;
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  elapsedBeforePause: number;
  timestamp: string;
}

/**
 * Porta de entrada Socket.io do StoreLab: mantém uma “linha aberta” entre o servidor e o navegador do jogador.
 *
 * Por que WebSocket e não só HTTP: em HTTP cada atualização exigiria o front ficar perguntando de novo e de novo (enquete)
 * ou o usuário atualizar a página. Com a linha aberta, o servidor **empurra** avisos na hora — rodada começou, plano mudou,
 * resultado saiu — e todos que estão na mesma “sala” veem ao mesmo tempo, como um rádio da partida.
 *
 * Salas (rooms): `session:{id}` reúne quem acompanha a partida; `facilitator:{id}` é um subconjunto só dos facilitadores
 * daquela sessão; `store:{id}` reúne quem está focado naquela loja (time editando PO ou quiz).
 *
 * CORS: em produção restringimos ao domínio do front (`FRONTEND_URL`); sem essa variável (dev local), liberamos qualquer origem.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL ?? '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  /**
   * JwtService reutiliza o mesmo segredo do REST para provar que o socket pertence a um usuário já autenticado.
   */
  constructor(private readonly jwtService: JwtService) {}

  // ─── Ciclo de vida da conexão (linha telefônica ligada / desligada) ─────────

  /**
   * Chamado quando o navegador abre o WebSocket: exigimos o mesmo token do login (no auth ou na query).
   *
   * Por que fechar sem token ou com token inválido: senão qualquer um ouviria eventos da partida sem estar logado —
   * seria vazar informação de jogo e quebrar a mesma confiança do REST. Guardamos userId e userRole no `socket.data`
   * para decidir salas extras (ex.: facilitador) sem reler o JWT a cada evento.
   */
  handleConnection(socket: Socket): void {
    const token =
      (socket.handshake.auth?.token as string) ??
      (socket.handshake.query?.token as string);

    if (!token) {
      this.logger.warn(`Connection rejected — no token: ${socket.id}`);
      socket.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      socket.data.userId = payload.sub;
      socket.data.userRole = payload.role;
      this.logger.log(`Connected: ${socket.id} (user=${payload.sub})`);
    } catch {
      this.logger.warn(`Connection rejected — invalid token: ${socket.id}`);
      socket.disconnect();
    }
  }

  /**
   * Chamado quando o jogador fecha a aba ou cai a internet — só registramos para diagnóstico; o Socket.io limpa a sala sozinho.
   */
  handleDisconnect(socket: Socket): void {
    this.logger.log(`Disconnected: ${socket.id}`);
  }

  // ─── Eventos do cliente → servidor (o front “liga” para entrar numa sala) ───

  /**
   * O cliente avisa que quer ouvir tudo da **sessão** informada (entra na sala `session:{sessionId}`).
   *
   * **Quem deve chamar:** qualquer tela ligada à partida (facilitador ou jogador que já entrou no jogo).
   * **Quem recebe broadcasts dessa sala depois:** todos os sockets que mandaram join para essa mesma sessão.
   * Se o usuário for **facilitador**, entra também em `facilitator:{sessionId}` para receber avisos só do painel mestre
   * (ex.: loja confirmou PO), sem poluir o celular de todo jogador com detalhe operacional do facilitador.
   */
  @SubscribeMessage('join:session')
  handleJoinSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { sessionId: string },
  ): void {
    const room = `session:${payload.sessionId}`;
    void socket.join(room);

    if (socket.data.userRole === 'FACILITATOR') {
      void socket.join(`facilitator:${payload.sessionId}`);
    }

    this.logger.log(`${socket.id} joined ${room}`);
  }

  /**
   * O cliente pede para ouvir eventos **da loja** (sala `store:{storeId}`) — típico do time montando plano ou quiz juntos.
   *
   * **Quem recebe:** só sockets que deram join nessa loja (colegas do mesmo time + telas abertas naquela unidade),
   * não necessariamente todos da sessão inteira, para não vazar edição de uma loja para outra.
   */
  @SubscribeMessage('join:store')
  handleJoinStore(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { storeId: string },
  ): void {
    const room = `store:${payload.storeId}`;
    void socket.join(room);
    this.logger.log(`${socket.id} joined ${room}`);
  }

  // ─── Emissões servidor → cliente (servidor fala na sala) ────────────────────

  /**
   * **Quando dispara:** alguém altera decisões do plano operacional colaborativo (PO) da loja.
   * **Quem recebe:** todos conectados na sala `store:{storeId}` (time da loja vendo a mesma tabela ao vivo).
   * **Por que aqui:** edição colaborativa precisa refletir na hora; HTTP só com polling deixaria a sensação de atraso ou conflito.
   */
  emitPlanUpdated(storeId: string, plan: unknown): void {
    this.emitToRoom(`store:${storeId}`, 'plan:updated', { plan });
  }

  /**
   * **Quando dispara:** uma loja **confirma** o plano operacional — marco para o facilitador saber que aquele time fechou a etapa.
   * **Quem recebe:** apenas sockets na sala `facilitator:{sessionId}` (facilitadores daquela partida), não todos os jogadores,
   * para o painel mestre atualizar listas de status sem encher o chat da loja com ruído administrativo.
   */
  emitStoreConfirmed(sessionId: string, storeId: string): void {
    this.emitToRoom(`facilitator:${sessionId}`, 'store:confirmed', { storeId });
    this.emitFacilitatorNotification({
      type: 'PLAN_CONFIRMED',
      sessionId,
      storeId,
      timestamp: new Date().toISOString(),
    });
  }

  emitFacilitatorNotification(
    payload: FacilitatorNotificationPayload,
  ): void {
    this.emitToRoom(
      `facilitator:${payload.sessionId}`,
      'facilitator:notification',
      payload,
    );
  }

  emitTimerUpdate(payload: TimerUpdatePayload): void {
    this.emitToRoom(`session:${payload.sessionId}`, 'session:timer_updated', payload);
    this.emitToRoom(`facilitator:${payload.sessionId}`, 'session:timer_updated', payload);
  }

  /**
   * **Quando dispara:** a sessão avança de estado para uma **rodada ativa** (1, 2 ou 3) — após o facilitador destravar a fase.
   * **Quem recebe:** todos em `session:{sessionId}` (toda a sala da partida alinhada na mesma contagem regressiva mental).
   */
  emitRoundStarted(sessionId: string, round: number): void {
    this.emitToRoom(`session:${sessionId}`, 'round:started', { round });
  }

  /**
   * **Quando dispara:** o motor terminou de calcular a rodada e os resultados foram gravados.
   * **Quem recebe:** todos em `session:{sessionId}` — ranking e números aparecem nas telas sem F5.
   * **Por que WebSocket:** resultado é evento único e urgente; enfileirar requisições GET manualmente seria mais lento e propenso a “ainda não atualizou”.
   */
  emitRoundResults(sessionId: string, results: unknown[]): void {
    this.emitToRoom(`session:${sessionId}`, 'round:results', { results });
  }

  /**
   * **Quando dispara:** a sessão chega ao estado **FINISHED** (fim de jogo).
   * **Quem recebe:** todos em `session:{sessionId}` com o payload de resultado final (ex.: pódio).
   * Assim jogadores e facilitador veem o encerramento ao mesmo tempo, fechando a experiência como apresentação ao vivo.
   */
  emitSessionFinished(sessionId: string, finalResults: unknown[]): void {
    this.emitToRoom(`session:${sessionId}`, 'session:finished', { finalResults });
  }

  /**
   * **Quando dispara:** o motor registrou um **incidente de SLA** (CAPEX não implementado sorteado) para aquela loja.
   * **Quem recebe:** sala `store:{storeId}` — o time sente o “apagão” ou perda na hora, reforçando a consequência da decisão.
   * Não vai para a sessão inteira para não dar spoiler estratégico às outras equipes antes da hora.
   */
  emitSlaEvent(storeId: string, slaEvent: unknown): void {
    this.emitToRoom(`store:${storeId}`, 'sla:event', { slaEvent });
  }

  /**
   * **Quando dispara:** o motor calculou os eventos aleatórios da rodada para uma loja.
   * **Quem recebe:** sala `store:{storeId}` — o time vê quais eventos os afetaram nesta rodada.
   * Não vai para a sessão inteira para não revelar informações estratégicas às outras equipes.
   */
  emitRandomEvents(storeId: string, payload: { round: number; events: unknown[] }): void {
    this.emitToRoom(`store:${storeId}`, 'random:events', payload);
  }

  /**
   * **Quando dispara:** um jogador **envia respostas** do quiz (ou progresso parcial contabilizado no serviço que chama isto).
   * **Quem recebe:** colegas na mesma loja (`store:{storeId}`) — útil para mostrar “fulano já respondeu” no grupo.
   * **Quem não recebe:** outras lojas e quem não entrou na sala da loja (precisa ter feito `join:store`).
   */
  emitQuizPlayerAnswered(
    storeId: string,
    payload: { userId: string; storeId: string; round: number; answered: number; total: number },
  ): void {
    this.emitToRoom(`store:${storeId}`, 'quiz:player-answered', payload);
  }

  // ─── Interno ────────────────────────────────────────────────────────────────

  /**
   * Envia um evento nomeado para todos os sockets que estão na sala indicada (quem não entrou na sala simplesmente não escuta).
   */
  private emitToRoom(room: string, event: string, data: unknown): void {
    if (this.server) {
      this.server.to(room).emit(event, data);
    }
  }
}
