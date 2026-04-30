# Autenticação Avançada — StoreLab

**Última atualização:** 26 de Abril de 2026  
**Status:** ✅ Implementado e funcional

---

## Visão Geral

Este documento cobre todas as funcionalidades de autenticação além do fluxo básico de JWT/refresh token, implementadas em duas etapas:

- **Etapa 1 (14/04/2026):** Implementação inicial do 2FA (TOTP)
- **Etapa 2 (26/04/2026):** Correção de bugs, logout com log, desativação de 2FA, e sistema de Audit Logs

---

## Endpoints de Autenticação — Tabela Completa

| Endpoint | Método | Guard | Descrição |
|---|---|---|---|
| `/auth/register` | POST | ❌ | Cadastro |
| `/auth/login` | POST | ❌ | Login — retorna tokens ou `{ mfaRequired, userId }` |
| `/auth/refresh` | POST | ❌ | Renova JWT com refresh token |
| `/auth/logout` | POST | ✅ JWT | Invalida refresh token + registra log |
| `/auth/enable-2fa` | POST | ✅ JWT | Gera QR code e secret temporário |
| `/auth/confirm-2fa` | POST | ✅ JWT | Valida código TOTP e salva secret |
| `/auth/verify-2fa` | POST | ❌ | Valida código no login com 2FA ativo |
| `/auth/disable-2fa` | POST | ✅ JWT | Desativa 2FA e limpa secret |
| `/audit-logs` | GET | ✅ JWT + FACILITATOR | Lista logs filtrados por sessão/loja |

---

## 1. Schema do Banco de Dados

**Arquivo:** `backend/prisma/schema.prisma`

### Campos adicionados ao model `User`

```prisma
model User {
  // ... campos existentes ...
  twoFactorEnabled  Boolean  @default(false)
  twoFactorSecret   String?
  auditLogs         AuditLog[]
}
```

### Novo model `AuditLog`

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String   // LOGIN_SUCCESS | LOGIN_FAILED | LOGOUT | TWO_FA_ENABLED | TWO_FA_DISABLED | TWO_FA_VERIFIED
  metadata  Json?    // contexto extra: { email?, reason? }
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

**Migrations:**
- `20260414160207_add_mfa_fields` — adicionou `twoFactorEnabled` e `twoFactorSecret`
- `add_audit_log` (db push) — adicionou `AuditLog`

---

## 2. Interfaces e Tipos

### Backend — `auth-response.interface.ts`

`AuthUser` foi atualizado para incluir `twoFactorEnabled`:

```typescript
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  twoFactorEnabled: boolean; // adicionado na Etapa 2
}
```

### Backend — `mfa-response.interface.ts`

```typescript
export interface Enable2faResponse {
  qrCode: string;      // Data URL base64 (PNG)
  secret: string;      // Secret ASCII base32
  otpauthUrl: string;  // otpauth://totp/StoreLab (email)?secret=...
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  userId: string;
}

export interface Confirm2faResponse {
  message: string;
  success: boolean;
}
```

### Frontend — `mfa-types.ts`

```typescript
export interface Verify2faResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    twoFactorEnabled: boolean; // adicionado na Etapa 2
  };
}
```

---

## 3. DTOs

**Localização:** `backend/src/auth/dto/`

| Arquivo | Campos |
|---|---|
| `enable-2fa.dto.ts` | vazio — servidor gera tudo |
| `confirm-2fa.dto.ts` | `code: string` (6 dígitos), `secret: string` |
| `verify-2fa.dto.ts` | `userId: string` (UUID), `code: string` (6 dígitos) |

---

## 4. MFA Service

**Arquivo:** `backend/src/auth/mfa.service.ts`

| Método | Descrição |
|---|---|
| `generateSecret(email)` | Gera secret TOTP de 32 chars (base32) via `speakeasy` |
| `generateQrCodeDataUrl(url)` | Gera PNG base64 do QR code via `qrcode` |
| `verifyTotp(code, secret, window=1)` | Valida código com janela de ±1 período (~90s) |

**Dependências instaladas:**
```
speakeasy ^3.2.1
qrcode ^1.5.3
@types/speakeasy ^2.0.9
@types/qrcode ^1.5.2
```

---

## 5. Auth Service

**Arquivo:** `backend/src/auth/auth.service.ts`

### `login()` — corrigido na Etapa 2

Na implementação original este método **não verificava** `twoFactorEnabled` e sempre emitia tokens. Corrigido:

```typescript
async login(dto: LoginDto): Promise<AuthResponse | MfaRequiredResponse> {
  // ...valida email e senha...

  // LOGIN_FAILED é registrado no AuditLog se email não existir ou senha errada

  if (user.twoFactorEnabled) {
    return { mfaRequired: true, userId: user.id }; // frontend redireciona para verify-2fa
  }

  // LOGIN_SUCCESS é registrado no AuditLog
  return this.issueTokens(...);
}
```

### `issueTokens()` — atualizado na Etapa 2

Agora recebe e retorna `twoFactorEnabled` no objeto `user`:

```typescript
private async issueTokens(
  id, email, role, name,
  twoFactorEnabled: boolean = false
): Promise<AuthResponse>
// Retorna: { token, refreshToken, user: { id, name, email, role, twoFactorEnabled } }
```

### `enable2fa(userId)` — Etapa 1

Gera secret e QR code. **Não salva no banco** — o usuário precisa confirmar primeiro.

### `confirm2fa(userId, dto)` — Etapa 1

Valida o código TOTP. Se válido, salva `twoFactorSecret` e seta `twoFactorEnabled = true`. Registra `TWO_FA_ENABLED` no AuditLog.

### `verify2fa(dto)` — Etapa 1

Valida código TOTP no login. Se válido, emite tokens. Registra `TWO_FA_VERIFIED` e `LOGIN_SUCCESS` no AuditLog.

### `logout(userId)` — Etapa 2 (novo)

Invalida o refresh token no banco (`refreshTokenHash = null`) e registra `LOGOUT` no AuditLog.

### `disable2fa(userId)` — Etapa 2 (novo)

Seta `twoFactorEnabled = false` e `twoFactorSecret = null`. Registra `TWO_FA_DISABLED` no AuditLog.

---

## 6. Auth Controller

**Arquivo:** `backend/src/auth/auth.controller.ts`

Todos os endpoints novos ou alterados em relação ao MVP original:

```typescript
// Alterado na Etapa 2: tipo de retorno agora inclui MfaRequiredResponse
@Post('login')
login(@Body() dto): Promise<AuthResponse | MfaRequiredResponse>

// Novos na Etapa 1:
@Post('enable-2fa')  @UseGuards(JwtAuthGuard)
@Post('confirm-2fa') @UseGuards(JwtAuthGuard)
@Post('verify-2fa')  // sem guard — usuário ainda não tem JWT

// Novos na Etapa 2:
@Post('logout')      @UseGuards(JwtAuthGuard)  @HttpCode(204)
@Post('disable-2fa') @UseGuards(JwtAuthGuard)  @HttpCode(204)
```

---

## 7. Audit Log Module

**Etapa 2 — totalmente novo.**

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `backend/src/audit-log/audit-log.service.ts` | `log()` e `findAll()` |
| `backend/src/audit-log/audit-log.controller.ts` | `GET /audit-logs` |
| `backend/src/audit-log/audit-log.module.ts` | módulo com `forwardRef` |

### Ações registradas

| Ação | Quando |
|---|---|
| `LOGIN_SUCCESS` | Login bem-sucedido (com ou sem 2FA) |
| `LOGIN_FAILED` | Email não encontrado ou senha errada |
| `LOGOUT` | Chamada ao `POST /auth/logout` |
| `TWO_FA_ENABLED` | 2FA confirmado e ativado |
| `TWO_FA_DISABLED` | 2FA desativado pelo usuário |
| `TWO_FA_VERIFIED` | Código TOTP validado no login |

### Query com filtros

`GET /audit-logs?sessionId=X&storeId=Y`

- `storeId` fornecido → retorna logs de todos os usuários membros daquela loja
- `sessionId` fornecido → retorna logs de todos os usuários em qualquer loja da sessão
- Nenhum filtro → retorna os últimos 200 logs globais

**Proteção:** JWT obrigatório + role `FACILITATOR`.

### Dependência circular

`AuthModule` → `AuditLogModule` (para usar `AuditLogService`)  
`AuditLogModule` → `AuthModule` (para usar os guards)

Resolvido com `forwardRef()` em ambos os módulos e `@Inject(forwardRef(() => AuditLogService))` no construtor do `AuthService`.

---

## 8. Auth Module

**Arquivo:** `backend/src/auth/auth.module.ts`

```typescript
// Etapa 1: adicionado MfaService
// Etapa 2: adicionado forwardRef(() => AuditLogModule)
imports: [PassportModule, JwtModule.register({...}), forwardRef(() => AuditLogModule)]
providers: [AuthService, MfaService, JwtStrategy, JwtAuthGuard, RolesGuard]
exports: [JwtModule, AuthService, JwtAuthGuard, RolesGuard]
```

---

## 9. Frontend — Auth Store

**Arquivo:** `frontend/src/stores/authStore.ts`

### Tipo `AuthUser` — atualizado na Etapa 2

```typescript
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  twoFactorEnabled: boolean; // adicionado
}
```

### Actions adicionadas

| Action | Etapa | Descrição |
|---|---|---|
| `enable2fa()` | 1 | Chama `POST /auth/enable-2fa`, retorna QR + secret |
| `confirm2fa(code, secret)` | 1 → corrigida em 2 | Chama `POST /auth/confirm-2fa`; **agora** atualiza `user.twoFactorEnabled = true` no store |
| `verify2fa(userId, code)` | 1 | Chama `POST /auth/verify-2fa`, salva tokens e usuário |
| `logout()` | atualizada em 2 | **Agora** chama `POST /auth/logout` antes de limpar o store |
| `disable2fa()` | 2 | Chama `POST /auth/disable-2fa`, atualiza `user.twoFactorEnabled = false` |

### Bug corrigido na Etapa 2

`confirm2fa()` não atualizava o estado local após sucesso. O frontend continuava mostrando o formulário de ativação mesmo após o 2FA ter sido ativado no banco. Corrigido:

```typescript
confirm2fa: async (code, secret) => {
  const data = await api.post('/auth/confirm-2fa', { code, secret });
  const current = get().user;
  if (current) set({ user: { ...current, twoFactorEnabled: true } }); // correção
  return data;
},
```

---

## 10. Frontend — Componentes

### `MfaSetupForm.tsx` — Etapa 1, corrigido na Etapa 2

Formulário de ativação do 2FA. Estados: `idle` → `loaded` → `confirming`.

**Bug corrigido:** O componente era renderizado incondicionalmente no dashboard. Agora só aparece se `!user.twoFactorEnabled`.

### `MfaVerifyForm.tsx` — Etapa 1

Formulário de verificação do código TOTP durante o login. Renderizado na página de login quando o backend retorna `{ mfaRequired: true, userId }`.

### `ActivityLogsSection.tsx` — Etapa 2 (novo)

Seção de logs de atividade no dashboard do facilitador.

- Filtro por sessão (select)
- Filtro por loja (select dependente da sessão selecionada — carregado via `GET /sessions/:id/status`)
- Tabela: jogador (nome + email), evento (badge com cor semântica), data e hora (formato `pt-BR` com segundos)
- Badges: `LOGIN_SUCCESS` verde, `LOGIN_FAILED` vermelho, `LOGOUT` cinza, `TWO_FA_ENABLED` azul, `TWO_FA_DISABLED` vermelho, `TWO_FA_VERIFIED` azul

---

## 11. Dashboard do Facilitador

**Arquivo:** `frontend/src/app/dashboard/page.tsx`

### Seção "Segurança da Conta" — Etapa 1, atualizada na Etapa 2

```
Se user.twoFactorEnabled:
  → Badge "Autenticação em duas etapas ativada" (verde)
  → Botão "Desativar" (vermelho, chama disable2fa())
Senão:
  → <MfaSetupForm />
```

### Seção "Logs de Atividade" — Etapa 2 (novo)

`<ActivityLogsSection sessions={sessions} />` inserida abaixo da seção de segurança.

---

## 12. Página de Login

**Arquivo:** `frontend/src/app/(auth)/login/page.tsx`

Sem alterações na Etapa 2. Já estava preparada para o fluxo MFA desde a Etapa 1:

```typescript
const response = await api.post('/auth/login', { email, password });

if (response.mfaRequired) {
  setMfaRequired(response.userId); // renderiza MfaVerifyForm
  return;
}

// login normal
useAuthStore.setState({ token, refreshToken, user });
```

---

## Fluxos Completos

### Ativar 2FA

```
1. Usuário clica "Ativar autenticação em duas etapas"
2. POST /auth/enable-2fa → { qrCode, secret, otpauthUrl }
3. Usuário escaneia QR code com Google Authenticator
4. Usuário digita código de 6 dígitos
5. POST /auth/confirm-2fa { code, secret }
6. Backend valida código, salva secret, seta twoFactorEnabled = true
7. AuditLog: TWO_FA_ENABLED
8. Frontend: store.user.twoFactorEnabled = true → UI muda para badge + botão "Desativar"
```

### Login com 2FA ativo

```
1. POST /auth/login { email, password }
2. Backend valida senha → twoFactorEnabled = true → retorna { mfaRequired: true, userId }
3. Frontend renderiza MfaVerifyForm
4. POST /auth/verify-2fa { userId, code }
5. Backend valida código TOTP → emite tokens
6. AuditLog: TWO_FA_VERIFIED + LOGIN_SUCCESS
7. Frontend salva tokens e redireciona
```

### Desativar 2FA

```
1. Usuário clica "Desativar"
2. POST /auth/disable-2fa
3. Backend: twoFactorEnabled = false, twoFactorSecret = null
4. AuditLog: TWO_FA_DISABLED
5. Frontend: store.user.twoFactorEnabled = false → UI volta para MfaSetupForm
```

### Logout

```
1. Usuário clica em sair
2. Frontend: api.post('/auth/logout') (fire-and-forget)
3. Backend: refreshTokenHash = null + AuditLog: LOGOUT
4. Frontend: limpa store, tokens e cookie user_role
```

---

## Segurança

| Ponto | Implementação |
|---|---|
| Secret nunca retornado após ativação | `confirm2fa` retorna apenas `{ message, success }` |
| Janela TOTP de ±1 período | Aceita código atual + anterior + próximo (~90s) para tolerância de clock skew |
| 2FA sem bypass | Se `twoFactorEnabled = true`, login nunca emite tokens sem código válido |
| Logout invalida refresh token | `refreshTokenHash = null` no banco — token antigo rejeitado em `/auth/refresh` |
| AuditLog com userId nullable | Falhas de login com e-mail inexistente são registradas sem userId |

---

## Próximos Passos Sugeridos

- **Rate limiting** em `/auth/login` — bloquear após N tentativas falhas (fácil com `@nestjs/throttler`)
- **"Lembrar dispositivo"** — cookie de confiança por 30 dias para não pedir código 2FA a cada login
- **Backup codes** — 10 códigos de uso único gerados na ativação do 2FA
- **Recuperação por e-mail** — desativar 2FA via link enviado ao e-mail cadastrado
