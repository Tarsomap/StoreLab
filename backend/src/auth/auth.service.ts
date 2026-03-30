import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse, RefreshResponse } from './interfaces/auth-response.interface';

/**
 * Regras de negócio da autenticação: criar usuário, conferir senha e emitir/renovar tokens.
 * A senha nunca é guardada em texto puro — só um “hash” (impressão digital irreversível), para que um vazamento
 * do banco não entregue a senha real. O JWT é um cartão assinado pelo servidor: o front envia em cada requisição
 * para provar quem é o usuário sem pedir senha de novo; o refresh token dura mais e serve para pedir um JWT novo
 * quando o de 1 hora expira, mantendo a sessão confortável no jogo longo.
 */
@Injectable()
export class AuthService {
  /**
   * Injeta o acesso ao banco e o serviço que assina tokens — padrão Nest para testar e trocar implementações depois.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Cria uma conta nova se o e-mail ainda não existir e já devolve tokens para o jogador entrar direto.
   *
   * @param dto - Nome, e-mail, senha e papel opcional (padrão jogador).
   * @returns JWT, refresh token e dados básicos do usuário.
   * @throws ConflictException se o e-mail já estiver cadastrado (evita duas contas iguais).
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    // bcrypt com “custo” 10 deixa o hash mais lento de adivinhar por força bruta, ainda rápido para um cadastro.
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role ?? UserRole.PLAYER,
      },
    });

    return this.issueTokens(user.id, user.email, user.role, user.name);
  }

  /**
   * Confere e-mail e senha e devolve os mesmos tokens do registro se estiver tudo certo.
   * Usamos a mesma mensagem para “usuário não existe” e “senha errada” para não facilitar descobrir e-mails cadastrados.
   *
   * @param dto - E-mail e senha informados na tela de login.
   * @returns JWT, refresh token e dados do usuário.
   * @throws UnauthorizedException se credenciais não baterem.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Compara a senha digitada com o hash salvo, sem nunca descriptografar o hash (bcrypt só permite comparar).
    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.issueTokens(user.id, user.email, user.role, user.name);
  }

  /**
   * Troca um refresh token válido por um JWT de acesso novo, sem pedir senha de novo.
   * Verificamos a assinatura com um segredo próprio do refresh e também guardamos um hash do token no banco:
   * assim, se alguém roubar um refresh antigo que foi invalidado ao fazer novo login, o servidor recusa.
   *
   * @param refreshToken - Token longo enviado pelo cliente após o login.
   * @returns Somente o novo JWT de acesso (o refresh pode ser reemitido no fluxo completo de login se desejado).
   * @throws UnauthorizedException se assinatura expirar, usuário sumir ou o token não bater com o hash salvo.
   */
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    let payload: JwtPayload;
    try {
      // Valida assinatura e prazo usando o segredo do refresh (diferente do JWT curto, por segurança em camadas).
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Confirma que o token recebido é exatamente o último emitido para esse usuário (revogação implícita ao logar de novo).
    const tokenMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!tokenMatch) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const token = this.jwtService.sign(accessPayload);

    return { token };
  }

  /**
   * Monta o par de tokens e grava o hash do refresh no usuário para validações futuras.
   *
   * @param id - Identificador do usuário (vai no campo sub do JWT, padrão do mundo JWT).
   * @param email - E-mail dentro do payload (útil para logs e telas sem nova consulta).
   * @param role - Facilitador ou jogador, para o RolesGuard decidir rotas.
   * @param name - Nome para devolver ao front no objeto user.
   */
  private async issueTokens(
    id: string,
    email: string,
    role: UserRole,
    name: string,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: id, email, role };

    // Token curto: leva id, e-mail e papel; expira rápido (ex.: 1h) para limitar janela se vazar.
    const token = this.jwtService.sign(payload);
    // Token longo: mesmas informações mínimas, mas outro segredo e prazo maior (ex.: 7 dias).
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
    });

    // No banco guardamos hash do refresh, não o texto — roubo do banco não entrega o token usável direto.
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id },
      data: { refreshTokenHash },
    });

    return {
      token,
      refreshToken,
      user: { id, name, email, role },
    };
  }
}
