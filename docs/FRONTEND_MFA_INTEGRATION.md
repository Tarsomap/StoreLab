# Frontend — Integração MFA e Audit Logs

**Data:** 18/05/2026  
**Responsável:** Frente de Autenticação

---

## Contexto

O backend de MFA (2FA TOTP) e Audit Logs estava 100% implementado (ver [`docs/MFA_IMPLEMENTATION.md`](MFA_IMPLEMENTATION.md)), mas os componentes de frontend existiam sem estar conectados a nenhuma página. Esta sessão mapeou o gap e realizou a integração.

---

## Gap identificado

| Componente | Arquivo | Situação antes |
|---|---|---|
| `MfaSetupForm` | `features/auth/components/MfaSetupForm.tsx` | Existia, não importado em nenhuma page |
| `MfaVerifyForm` | `features/auth/components/MfaVerifyForm.tsx` | Existia e **já estava** integrado no login ✅ |
| `ActivityLogsSection` | `features/auth/components/ActivityLogsSection.tsx` | Existia, não importado em nenhuma page |

---

## Alterações realizadas

### 1. `frontend/src/app/dashboard/page.tsx`

- **Import adicionado (linha 19):** `ActivityLogsSection` de `@/features/auth/components/ActivityLogsSection`
- **JSX adicionado (linha ~252):** `<ActivityLogsSection>` renderizado após a seção "Histórico", passando `sessions.map(s => ({ id: s.id, name: s.name }))` como prop

### 2. `frontend/src/app/dashboard/perfil/page.tsx` *(arquivo novo)*

- **Rota:** `/dashboard/perfil`
- **Conteúdo:** Card com `MfaSetupForm` para ativar o 2FA
- **Acessível por:** facilitador via sidebar "Minha Conta"

### 3. `frontend/src/components/layout/app-shell.tsx`

- **Import adicionado (linha 13):** ícone `Settings` do lucide
- **Link adicionado na sidebar desktop (quando fora de sessão):** "Minha Conta" → `/dashboard/perfil`
- **Link adicionado no menu mobile (quando fora de sessão):** mesmo link

---

## Observação sobre o `MFA_IMPLEMENTATION.md`

A seção 11 do documento original (`docs/MFA_IMPLEMENTATION.md`) descreve o `MfaSetupForm` sendo renderizado condicionalmente **dentro do `dashboard/page.tsx`**, junto com um badge de status e botão "Desativar 2FA".

A implementação atual colocou o `MfaSetupForm` em uma **página separada** (`/dashboard/perfil`), o que é mais limpo e escalável. Se quiser seguir o documento original, seria necessário:

1. Remover a `perfil/page.tsx`
2. Adicionar no `dashboard/page.tsx` uma seção "Segurança da Conta" com lógica condicional baseada em `user.twoFactorEnabled`
3. Expor o `disable2fa()` do `authStore` nessa seção

---

## Fluxo completo após a integração

```
Login com 2FA ainda não ativado:
  → /login → credenciais válidas → redireciona ao dashboard
  → sidebar: "Minha Conta" → /dashboard/perfil → MfaSetupForm
  → Escaneia QR code → digita código → 2FA ativado

Próximo login:
  → /login → credenciais válidas → backend retorna { mfaRequired, userId }
  → MfaVerifyForm aparece no login → digita código → acesso liberado

Logs de atividade:
  → /dashboard → seção "Logs de Atividade" no final da página
  → Filtra por sessão → filtra por loja → visualiza tabela
```
