import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthResponse, RefreshResponse } from './interfaces/auth-response.interface';

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
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
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
}
