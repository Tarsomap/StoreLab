import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Confirm2faDto } from './dto/confirm-2fa.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Disable2faRecoveryDto } from './dto/disable-2fa-recovery.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse, RefreshResponse } from './interfaces/auth-response.interface';
import { Enable2faResponse, MfaRequiredResponse, Confirm2faResponse } from './interfaces/mfa-response.interface';
import { MfaService } from './mfa.service';
import { AuditLogService, AUDIT_ACTIONS } from '../audit-log/audit-log.service';

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
    private readonly mfaService: MfaService,
    @Inject(forwardRef(() => AuditLogService))
    private readonly auditLogService: AuditLogService,
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

    return this.issueTokens(user.id, user.email, user.role, user.name, user.twoFactorEnabled);
  }

  /**
   * Confere e-mail e senha e devolve os mesmos tokens do registro se estiver tudo certo.
   * Usamos a mesma mensagem para “usuário não existe” e “senha errada” para não facilitar descobrir e-mails cadastrados.
   *
   * @param dto - E-mail e senha informados na tela de login.
   * @returns JWT, refresh token e dados do usuário.
   * @throws UnauthorizedException se credenciais não baterem.
   */
  async login(dto: LoginDto): Promise<AuthResponse | MfaRequiredResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      await this.auditLogService.log(null, AUDIT_ACTIONS.LOGIN_FAILED, { email: dto.email, reason: 'Usuário não encontrado' });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Compara a senha digitada com o hash salvo, sem nunca descriptografar o hash (bcrypt só permite comparar).
    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      await this.auditLogService.log(user.id, AUDIT_ACTIONS.LOGIN_FAILED, { email: dto.email, reason: 'Senha incorreta' });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.twoFactorEnabled) {
      return { mfaRequired: true, userId: user.id };
    }

    await this.auditLogService.log(user.id, AUDIT_ACTIONS.LOGIN_SUCCESS);
    return this.issueTokens(user.id, user.email, user.role, user.name);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    await this.auditLogService.log(userId, AUDIT_ACTIONS.LOGOUT);
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
    twoFactorEnabled: boolean = false,
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
      user: { id, name, email, role, twoFactorEnabled },
    };
  }

  /**
   * Inicia o fluxo de ativação de MFA: gera secret e QR code.
   * O secret é retornado mas NÃO é ainda salvo no banco — o usuário precisa confirmar em confirm-2fa.
   *
   * @param userId - ID do usuário autenticado (extraído do JWT via decorator @CurrentUser).
   * @returns QR code em base64, secret ASCII e URL otpauth:// para importação manual.
   */
  async enable2fa(userId: string): Promise<Enable2faResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Gera secret novo.
    const { secret, otpauthUrl } = this.mfaService.generateSecret(user.email);

    // Gera QR code em base64.
    const qrCode = await this.mfaService.generateQrCodeDataUrl(otpauthUrl);

    return {
      qrCode,
      secret,
      otpauthUrl,
    };
  }

  /**
   * Confirma a ativação de MFA: valida o código TOTP e salva o secret no banco.
   *
   * @param userId - ID do usuário autenticado.
   * @param dto - Código TOTP (6 dígitos) e secret temporário do enable-2fa.
   * @throws BadRequestException se código não for válido.
   * @returns Confirmação de sucesso.
   */
  async confirm2fa(userId: string, dto: Confirm2faDto): Promise<Confirm2faResponse> {
    // Valida código contra o secret antes de salvar.
    const isValid = this.mfaService.verifyTotp(dto.code, dto.secret);
    if (!isValid) {
      throw new BadRequestException('Código TOTP inválido');
    }

    // Salva o secret permanentemente e marca 2FA como ativado.
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: dto.secret,
        twoFactorEnabled: true,
      },
    });

    await this.auditLogService.log(userId, AUDIT_ACTIONS.TWO_FA_ENABLED);

    return {
      message: 'Autenticação em duas etapas ativada com sucesso',
      success: true,
    };
  }

  async disable2fa(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await this.auditLogService.log(userId, AUDIT_ACTIONS.TWO_FA_DISABLED);
  }

  /**
   * Recuperação de acesso quando o usuário perdeu o app autenticador.
   * Valida e-mail + senha (sem exigir TOTP), desativa o 2FA e emite tokens
   * para o usuário entrar direto sem um segundo passo de login.
   *
   * @param dto - E-mail e senha da conta.
   * @returns Tokens JWT e dados do usuário com twoFactorEnabled: false.
   * @throws UnauthorizedException se credenciais inválidas.
   * @throws BadRequestException se o 2FA não estiver ativo.
   */
  async disableMfaRecovery(dto: Disable2faRecoveryDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      await this.auditLogService.log(user.id, AUDIT_ACTIONS.LOGIN_FAILED, {
        email: dto.email,
        reason: 'Senha incorreta (recuperação 2FA)',
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('O 2FA não está ativo nesta conta');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    await this.auditLogService.log(user.id, AUDIT_ACTIONS.TWO_FA_DISABLED, { via: 'recovery' });
    await this.auditLogService.log(user.id, AUDIT_ACTIONS.LOGIN_SUCCESS);

    return this.issueTokens(user.id, user.email, user.role, user.name, false);
  }

  /**
   * Verifica código TOTP durante login quando MFA está ativado.
   * Se válido, emite os tokens de acesso normais.
   *
   * @param dto - User ID e código TOTP de 6 dígitos.
   * @returns Tokens JWT e refresh token se código for válido.
   * @throws UnauthorizedException se código for inválido ou usuário não encontrado.
   */
  async verify2fa(dto: Verify2faDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
      throw new UnauthorizedException('MFA não está configurado ou usuário não existe');
    }

    // Valida código TOTP contra o secret salvo.
    const isValid = this.mfaService.verifyTotp(dto.code, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('Código TOTP inválido');
    }

    await this.auditLogService.log(user.id, AUDIT_ACTIONS.TWO_FA_VERIFIED);

    // Emite tokens normais após validação de MFA.
    await this.auditLogService.log(user.id, AUDIT_ACTIONS.LOGIN_SUCCESS);
    return this.issueTokens(user.id, user.email, user.role, user.name, user.twoFactorEnabled);
  }
}
