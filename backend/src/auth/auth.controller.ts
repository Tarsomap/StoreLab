import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Confirm2faDto } from './dto/confirm-2fa.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { AuthResponse, RefreshResponse } from './interfaces/auth-response.interface';
import { Enable2faResponse, Confirm2faResponse, MfaRequiredResponse } from './interfaces/mfa-response.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';

interface AuthenticatedRequest {
  user: JwtPayload;
}

/**
 * Endpoints HTTP públicos de autenticação (sem JWT ainda): cadastro, login e renovação de token.
 * O front chama essas rotas antes de acessar o resto do jogo; as rotas protegidas usam guards em outros controllers.
 */
@Controller('auth')
export class AuthController {
  /**
   * Recebe o AuthService: o controller só expõe URLs; a lógica fica no serviço (mais fácil de testar e reaproveitar).
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Cria usuário e já retorna tokens — fluxo comum para o jogador começar sem um passo extra de login.
   *
   * @param dto - Dados validados do corpo JSON.
   */
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  /**
   * Autentica e devolve tokens. Usamos 200 OK explicitamente porque POST de login não cria recurso novo no sentido REST estrito.
   *
   * @param dto - E-mail e senha.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse | MfaRequiredResponse> {
    return this.authService.login(dto);
  }

  /**
   * Emite um JWT novo a partir de um refresh token válido, para o usuário não precisar digitar senha a cada hora.
   *
   * @param dto - Corpo com o refresh token guardado no cliente.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<RefreshResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * Inicia o fluxo de ativação de MFA: gera um secret TOTP e QR code.
   * Requer autenticação JWT (usuário logado).
   *
   * @param req - Requisição com usuário extraído do JWT (via JwtAuthGuard).
   * @returns QR code em base64, secret ASCII e URL otpauth para importação.
   */
  @Post('enable-2fa')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  enable2fa(@Request() req: AuthenticatedRequest): Promise<Enable2faResponse> {
    return this.authService.enable2fa(req.user.sub);
  }

  /**
   * Confirma a ativação de MFA: valida código TOTP e salva o secret permanentemente.
   * Requer autenticação JWT.
   *
   * @param req - Requisição com usuário extraído do JWT.
   * @param dto - Código TOTP (6 dígitos) e secret temporário do enable-2fa.
   * @returns Confirmação de sucesso.
   */
  @Post('confirm-2fa')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  confirm2fa(
    @Request() req: AuthenticatedRequest,
    @Body() dto: Confirm2faDto,
  ): Promise<Confirm2faResponse> {
    return this.authService.confirm2fa(req.user.sub, dto);
  }

  /**
   * Valida código TOTP durante login quando MFA está ativado.
   * Endpoint público (sem guard) porque o usuário ainda não tem JWT válido neste ponto.
   *
   * @param dto - User ID e código TOTP de 6 dígitos.
   * @returns JWT e refresh token se código for válido.
   */
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  verify2fa(@Body() dto: Verify2faDto): Promise<AuthResponse> {
    return this.authService.verify2fa(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Request() req: AuthenticatedRequest): Promise<void> {
    return this.authService.logout(req.user.sub);
  }

  @Post('disable-2fa')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  disable2fa(@Request() req: AuthenticatedRequest): Promise<void> {
    return this.authService.disable2fa(req.user.sub);
  }
}
