# Recuperação de Acesso — 2FA sem Autenticador

**Data:** 19/05/2026  
**Status:** ✅ Implementado e funcional

---

## Contexto

Com o 2FA ativo, o facilitador precisava do código TOTP para fazer login. Se perdesse o acesso ao app autenticador (desinstalação, troca de celular, etc.), ficaria permanentemente bloqueado — pois sem o código TOTP não há como obter o JWT, e sem o JWT não há como chamar `POST /auth/disable-2fa`.

Esta implementação resolve o impasse com um endpoint de recuperação público que valida apenas e-mail + senha.

---

## Fluxo de Recuperação

```
Login → credenciais válidas → backend retorna { mfaRequired, userId }
  → MfaVerifyForm exibido
  → usuário clica "Não tenho acesso ao meu autenticador"
  → MfaRecoveryForm exibido (e-mail pré-preenchido)
  → usuário digita e-mail + senha
  → POST /auth/disable-2fa/recovery
  → backend valida senha via bcrypt
  → 2FA desativado + tokens emitidos
  → usuário entra direto no dashboard
```

---

## Backend

### Novo endpoint

| Endpoint | Método | Guard | Retorno |
|---|---|---|---|
| `/auth/disable-2fa/recovery` | POST | ❌ (público) | `AuthResponse` (tokens + user) |

### DTO — `disable-2fa-recovery.dto.ts`

**Arquivo:** `backend/src/auth/dto/disable-2fa-recovery.dto.ts`

```ts
export class Disable2faRecoveryDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

### Service — `auth.service.ts`

**Método:** `disableMfaRecovery(dto)`

Sequência de validações:

1. Busca o usuário pelo e-mail — se não encontrar, lança `UnauthorizedException('Credenciais inválidas')` (mesma mensagem que login incorreto, para não vazar quais e-mails estão cadastrados)
2. Compara a senha com bcrypt — se errada, registra log `LOGIN_FAILED` com `{ reason: 'Senha incorreta (recuperação 2FA)' }` e lança `UnauthorizedException`
3. Verifica se o 2FA está realmente ativo — se não, lança `BadRequestException('O 2FA não está ativo nesta conta')`
4. Desativa o 2FA: `twoFactorEnabled = false`, `twoFactorSecret = null`
5. Registra log `TWO_FA_DISABLED` com metadata `{ via: 'recovery' }`
6. Registra log `LOGIN_SUCCESS`
7. Chama `issueTokens()` com `twoFactorEnabled: false` e retorna `AuthResponse`

> **Por que emitir tokens direto?** Evita que o usuário precise passar pelo login novamente após desativar o 2FA. A senha já foi validada nesta mesma requisição — seria redundante pedí-la uma segunda vez.

### Controller — `auth.controller.ts`

```ts
@Post('disable-2fa/recovery')
@HttpCode(HttpStatus.OK)
disableMfaRecovery(@Body() dto: Disable2faRecoveryDto): Promise<AuthResponse> {
  return this.authService.disableMfaRecovery(dto);
}
```

---

## Frontend

### Store — `authStore.ts`

**Nova action:** `disableMfaRecovery(email, password)`

- Chama `POST /auth/disable-2fa/recovery`
- Seta `token`, `refreshToken` e `user` no store (idêntico ao `verify2fa`)
- Seta os tokens no módulo `api` via `setApiTokens`
- Grava cookie `user_role` para o middleware do Next.js decidir rotas

```ts
disableMfaRecovery: async (email, password) => {
  const data = await api.post<AuthResponse>('/auth/disable-2fa/recovery', { email, password });
  set({ token: data.token, refreshToken: data.refreshToken, user: data.user });
  setApiTokens(data.token, data.refreshToken);
  setCookie('user_role', data.user.role);
},
```

### Novo componente — `MfaRecoveryForm.tsx`

**Arquivo:** `frontend/src/features/auth/components/MfaRecoveryForm.tsx`

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `email?` | `string` | E-mail pré-preenchido vindo da tela de login |
| `onSuccess?` | `() => void` | Callback chamado após recuperação bem-sucedida |
| `onBack?` | `() => void` | Callback para voltar ao `MfaVerifyForm` |

**Comportamento:**
- Exibe campos de e-mail (editável, pré-preenchido se `email` for passado) e senha
- Botão desabilitado enquanto os dois campos estiverem vazios ou durante carregamento
- Em sucesso: `toast.success` + chama `onSuccess()`
- Em erro: exibe mensagem inline + `toast.error`
- Botão "Voltar" chama `onBack()`, retornando ao formulário de código TOTP

### Componente alterado — `MfaVerifyForm.tsx`

**Arquivo:** `frontend/src/features/auth/components/MfaVerifyForm.tsx`

**Alterações:**
- Nova prop opcional `email?: string` (repassada ao `MfaRecoveryForm`)
- Novo estado `showRecovery: boolean` (inicia `false`)
- Se `showRecovery === true`: renderiza `<MfaRecoveryForm>` no lugar do formulário TOTP
- Link "Não tenho acesso ao meu autenticador" abaixo do botão Verificar — ao clicar seta `showRecovery = true`

### Login page alterada — `(auth)/login/page.tsx`

**Arquivo:** `frontend/src/app/(auth)/login/page.tsx`

**Alteração:** passa `email={email}` para `<MfaVerifyForm>`, permitindo que o `MfaRecoveryForm` pré-preencha o campo de e-mail com o valor já digitado na tela de login.

```tsx
<MfaVerifyForm userId={mfaUserId} email={email} onSuccess={redirectAfterAuth} />
```

---

## Tabela de endpoints atualizada

Complementa a tabela em `MFA_IMPLEMENTATION.md`:

| Endpoint | Método | Guard | Descrição |
|---|---|---|---|
| `/auth/register` | POST | ❌ | Cadastro |
| `/auth/login` | POST | ❌ | Login — retorna tokens ou `{ mfaRequired, userId }` |
| `/auth/refresh` | POST | ❌ | Renova JWT com refresh token |
| `/auth/logout` | POST | ✅ JWT | Invalida refresh token + registra log |
| `/auth/enable-2fa` | POST | ✅ JWT | Gera QR code e secret temporário |
| `/auth/confirm-2fa` | POST | ✅ JWT | Valida código TOTP e salva secret |
| `/auth/verify-2fa` | POST | ❌ | Valida código no login com 2FA ativo |
| `/auth/disable-2fa` | POST | ✅ JWT | Desativa 2FA (usuário logado) |
| `/auth/disable-2fa/recovery` | POST | ❌ | **Desativa 2FA via senha (usuário bloqueado)** |

---

## Considerações de segurança

- **Sem enumeration de e-mails:** e-mail não encontrado e senha errada retornam a mesma mensagem `Credenciais inválidas`
- **Audit log em falhas:** tentativas com senha errada ficam registradas em `AuditLog` com `action: LOGIN_FAILED` e `metadata.reason: 'Senha incorreta (recuperação 2FA)'`
- **Audit log em sucesso:** desativação registrada com `metadata: { via: 'recovery' }` para distinguir de uma desativação intencional pelo painel
- **Troca implícita de refresh token:** `issueTokens()` grava um novo hash de refresh token no banco, invalidando qualquer refresh token anterior
- **Limitação conhecida:** quem souber a senha da conta consegue desativar o 2FA remotamente. Para o contexto desta plataforma (sessões acadêmicas facilitadas) isso é aceitável; em produção sensível seria necessário adicionar confirmação por e-mail
