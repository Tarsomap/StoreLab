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

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  // ─── Connection lifecycle ────────────────────────────────────────────────────

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

  handleDisconnect(socket: Socket): void {
    this.logger.log(`Disconnected: ${socket.id}`);
  }

  // ─── Client → Server events ──────────────────────────────────────────────────

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

  @SubscribeMessage('join:store')
  handleJoinStore(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { storeId: string },
  ): void {
    const room = `store:${payload.storeId}`;
    void socket.join(room);
    this.logger.log(`${socket.id} joined ${room}`);
  }

  // ─── Server → Client emit methods ────────────────────────────────────────────

  /** Emitted to store room when any PO decision changes */
  emitPlanUpdated(storeId: string, plan: unknown): void {
    this.emitToRoom(`store:${storeId}`, 'plan:updated', { plan });
  }

  /** Emitted to facilitator room when a store confirms its PO */
  emitStoreConfirmed(sessionId: string, storeId: string): void {
    this.emitToRoom(`facilitator:${sessionId}`, 'store:confirmed', { storeId });
  }

  /** Emitted to session room when a round starts */
  emitRoundStarted(sessionId: string, round: number): void {
    this.emitToRoom(`session:${sessionId}`, 'round:started', { round });
  }

  /** Emitted to session room after the engine finishes calculating a round */
  emitRoundResults(sessionId: string, results: unknown[]): void {
    this.emitToRoom(`session:${sessionId}`, 'round:results', { results });
  }

  /** Emitted to session room when the session reaches FINISHED */
  emitSessionFinished(sessionId: string, finalResults: unknown[]): void {
    this.emitToRoom(`session:${sessionId}`, 'session:finished', { finalResults });
  }

  /** Emitted to store room when an SLA event occurs for that store */
  emitSlaEvent(storeId: string, slaEvent: unknown): void {
    this.emitToRoom(`store:${storeId}`, 'sla:event', { slaEvent });
  }

  /** Emitted to store room when a player submits their quiz answers */
  emitQuizPlayerAnswered(
    storeId: string,
    payload: { userId: string; storeId: string; round: number; answered: number; total: number },
  ): void {
    this.emitToRoom(`store:${storeId}`, 'quiz:player-answered', payload);
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private emitToRoom(room: string, event: string, data: unknown): void {
    if (this.server) {
      this.server.to(room).emit(event, data);
    }
  }
}
