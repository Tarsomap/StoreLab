# 🔐 Sprint 1 — Revisão: Autenticação e Usuários

> **Issue GitHub:** [#39 — [REVIEW] Módulo de Autenticação](https://github.com/Tarsomap/retail-game-platform/issues/39)
> **Módulos:** `backend/src/auth/` e `backend/src/users/`
> **Área:** Backend
>
> Leia [`docs/agent/ARCHITECTURE.md`](../../agent/ARCHITECTURE.md) — seção Auth — antes de começar.

---

## O que o agente gerou

O agente de IA gerou o código completo dos módulos `auth/` e `users/`, incluindo:
- Endpoints de register, login e refresh
- Guards JWT e de roles
- Hash de senha com bcrypt
- Diferenciação entre `FACILITATOR` e `PLAYER`

**Seu trabalho não é implementar — é revisar, testar e melhorar.**

---

## Como começar

```bash
# 1. Atualizar a main
git checkout main && git pull

# 2. Criar sua branch de revisão
git checkout -b review/auth

# 3. Instalar dependências e subir o servidor
cd backend
npm install
cp .env.example .env  # preencher as variáveis
npx prisma migrate dev
npm run start:dev
```

---

## Checklist de revisão

### 📚 Leitura do código
- [ ] Ler linha a linha `backend/src/auth/auth.service.ts`
- [ ] Confirmar que a senha é salva como hash (nunca em texto puro)
- [ ] Confirmar que `JWT_SECRET` e `JWT_REFRESH_SECRET` vêm de variáveis de ambiente
- [ ] Confirmar que o `JwtAuthGuard` e o `RolesGuard` estão aplicados corretamente

### 🧪 Testes manuais (use Insomnia, Postman ou Thunder Client)
- [ ] `POST /auth/register` — criar usuário com dados válidos
- [ ] `POST /auth/register` com e-mail duplicado — deve retornar **erro 409**
- [ ] `POST /auth/login` — login com credenciais corretas
- [ ] `POST /auth/login` com senha errada — deve retornar **erro 401**
- [ ] `POST /auth/refresh` — renovar o accessToken
- [ ] `POST /auth/refresh` com token expirado — deve retornar **erro 401**
- [ ] Rota protegida sem token — deve retornar **401**
- [ ] Rota de FACILITATOR acessada por PLAYER — deve retornar **403**
- [ ] Verificar no banco que a senha está salva como hash

### ✍️ Contribuição obrigatória
- [ ] Identificar e aplicar pelo menos **1 melhoria real** no código
- [ ] Escrever o **README de setup** do módulo (como rodar, quais variáveis são necessárias)

---

## Variáveis de ambiente necessárias

```
# backend/.env
JWT_SECRET=
JWT_REFRESH_SECRET=
DATABASE_URL=

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> 🚨 Nunca commitar o `.env` com valores reais. Use sempre o `.env.example`.

---

## Entrega

- [ ] PR aberto com título: `review(auth): [o que foi corrigido/melhorado]`
- [ ] PR linkado à issue #39 (`Fecha #39` na descrição)
- [ ] Pelo menos 1 aprovação antes do merge
