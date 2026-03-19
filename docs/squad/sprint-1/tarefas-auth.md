# 🔐 Sprint 1 — Tarefas: Autenticação

> **Épico:** Autenticação e Gestão de Usuários
> **User Stories:** US-01, US-02, US-03, US-04
> **Estimativa total:** 1–2 semanas
>
> Leia [`docs/agent/CONTEXT.md`](../../agent/CONTEXT.md) antes de começar.

---

## Visão geral

Esse é o ponto de entrada de todo o sistema. Sem autenticação funcionando, nenhuma outra feature pode ser desenvolvida.

O sistema tem **dois perfis**:
- `FACILITATOR` — cria sessões, controla rodadas, vê tudo
- `PLAYER` — entra em uma sessão via código, escolhe papel na loja

O fluxo de autenticação usa **JWT (1h) + Refresh Token (7 dias)**. Senhas sempre com **bcrypt (custo 10)**.

---

## TASK-01 — Modelo de usuário e seed inicial

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante

### O que fazer

1. Criar o model `User` no `schema.prisma`:

```prisma
model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(PLAYER)
  createdAt    DateTime @default(now())

  storeMembers StoreMember[]
  sessions     Session[] @relation("FacilitatorSessions")
}

enum Role {
  FACILITATOR
  PLAYER
}
```

2. Rodar a migration:
```bash
npx prisma migrate dev --name create-user
```

3. Gerar o Prisma Client:
```bash
npx prisma generate
```

### Por que assim?
`passwordHash` nunca armazena a senha em texto puro — só o hash gerado pelo bcrypt. O campo `role` define o que o usuário pode fazer no sistema inteiro.

### Critérios de aceite
- [ ] Migration roda sem erros
- [ ] Tabela `User` criada no banco com todas as colunas
- [ ] Enum `Role` criado

---

## TASK-02 — Módulo de autenticação (backend)

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-01

### O que fazer

Criar o módulo `auth/` com os seguintes arquivos:

```
backend/src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── jwt.strategy.ts
├── jwt-auth.guard.ts
├── roles.guard.ts
├── roles.decorator.ts
└── dto/
    ├── register.dto.ts
    ├── login.dto.ts
    └── auth-response.dto.ts
```

### Endpoints a implementar

#### `POST /auth/register`
```
Body:     { name: string, email: string, password: string, role?: Role }
Response: { accessToken, refreshToken, user: { id, name, role } }
Status:   201
```

Lógica:
1. Validar email único (lançar `ConflictException` se já existir)
2. Hash da senha com `bcrypt.hash(password, 10)`
3. Salvar no banco
4. Gerar e retornar os tokens

#### `POST /auth/login`
```
Body:     { email: string, password: string }
Response: { accessToken, refreshToken, user: { id, name, role } }
Status:   200
```

Lógica:
1. Buscar usuário pelo email
2. Comparar senha com `bcrypt.compare(password, user.passwordHash)`
3. Se inválido, lançar `UnauthorizedException`
4. Gerar e retornar os tokens

#### `POST /auth/refresh`
```
Body:     { refreshToken: string }
Response: { accessToken }
Status:   200
```

Lógica:
1. Verificar e decodificar o refreshToken
2. Gerar novo accessToken
3. Se expirado ou inválido, lançar `UnauthorizedException`

### Configuração dos tokens

```typescript
// access token
jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' })

// refresh token
jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
```

### Por que JWT + Refresh Token?
O accessToken expira em 1h por segurança. O refreshToken (7 dias) permite renovar sem pedir login novamente. Os dois segredos devem ser diferentes e estar nas variáveis de ambiente — **nunca no código**.

### Critérios de aceite
- [ ] `POST /auth/register` cria usuário e retorna tokens
- [ ] E-mail duplicado retorna erro 409
- [ ] `POST /auth/login` autentica e retorna tokens
- [ ] Credenciais inválidas retornam erro 401
- [ ] `POST /auth/refresh` renova o accessToken
- [ ] Refresh token expirado retorna erro 401
- [ ] Senha nunca é salva em texto puro (validar no banco)
- [ ] `JWT_SECRET` e `JWT_REFRESH_SECRET` lidos de variáveis de ambiente

---

## TASK-03 — Guards e decorator de roles

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-02

### O que fazer

Implementar os dois guards que protegerão todas as rotas do sistema:

**`JwtAuthGuard`** — verifica se o token JWT é válido. Toda rota protegida usa esse guard.

**`RolesGuard`** — verifica se o usuário tem o papel correto para acessar aquela rota.

```typescript
// Exemplo de uso nas rotas
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('FACILITATOR')
@Post('/sessions')
createSession() { ... }
```

**`@Roles()` decorator** — marca quais roles podem acessar cada endpoint.

### Por que dois guards separados?
Separa responsabilidades: um verifica autenticidade (quem é você?), o outro verifica autorização (o que você pode fazer?). Isso facilita reutilização e testes.

### Critérios de aceite
- [ ] Rota sem token retorna 401
- [ ] Rota com token válido mas role errada retorna 403
- [ ] Rota com token válido e role correta passa normalmente
- [ ] Guards aplicados globalmente via `APP_GUARD` ou por módulo

---

## TASK-04 — Tela de cadastro (frontend)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-02

### O que fazer

Criar a página `/register` em Next.js com o formulário de cadastro.

**Campos:**
- Nome completo
- E-mail
- Senha (mínimo 8 caracteres)
- Confirmar senha
- Papel: Facilitador ou Jogador (dropdown)

**Comportamentos:**
- Validação client-side antes de enviar (campos vazios, e-mail inválido, senhas não conferem)
- Loading state no botão enquanto aguarda resposta da API
- Erro de e-mail duplicado exibido abaixo do campo de e-mail
- Sucesso: redireciona para `/dashboard` se Facilitador, `/lobby` se Jogador

**Componentes a usar:** `shadcn/ui` — `Input`, `Button`, `Select`, `Label`, `Alert`

### Por que validação client-side também?
A validação no backend é obrigatória (nunca confie no frontend). A validação no frontend é para UX — evita chamadas desnecessárias à API e dá feedback imediato ao usuário.

### Critérios de aceite
- [ ] Formulário renderiza corretamente em desktop e tablet
- [ ] Validações client-side funcionam antes do envio
- [ ] Erro de e-mail duplicado exibido corretamente
- [ ] Loading state ativo durante a requisição
- [ ] Redirect correto após sucesso (por role)
- [ ] Nenhuma senha exposta em logs ou estado do React

---

## TASK-05 — Tela de login (frontend)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-02

### O que fazer

Criar a página `/login` com o formulário de login.

**Campos:**
- E-mail
- Senha
- Checkbox "Lembrar-me" (opcional — extende o refresh token para 14 dias no localStorage)

**Comportamentos:**
- Validação client-side (campos vazios, formato de e-mail)
- Loading state no botão
- Erro genérico para credenciais inválidas: *"E-mail ou senha incorretos"* (nunca diga qual dos dois está errado — é uma prática de segurança)
- Sucesso: armazena tokens e redireciona conforme role

**Armazenamento de tokens:**
```
accessToken  → memória (estado Zustand) — não persiste no localStorage
refreshToken → localStorage (ou cookie httpOnly se possível)
```

### Por que não salvar o accessToken no localStorage?
O localStorage é acessível por qualquer script na página. Se houver um XSS, o token seria roubado. O accessToken deve viver apenas em memória e ser renovado via refreshToken quando a página recarregar.

### Critérios de aceite
- [ ] Login funcional com e-mail e senha
- [ ] Mensagem de erro genérica para credenciais inválidas
- [ ] Tokens armazenados conforme especificado
- [ ] Redirect correto após sucesso
- [ ] Checkbox "Lembrar-me" funciona
- [ ] Página `/login` redireciona para `/dashboard` se já estiver autenticado

---

## TASK-06 — Cliente HTTP e interceptor de token (frontend)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-05

### O que fazer

Criar o cliente HTTP centralizado em `frontend/src/lib/api-client.ts`.

**Responsabilidades:**
1. Adicionar automaticamente o `Authorization: Bearer <token>` em todas as requisições
2. Interceptar respostas `401` e tentar renovar o token via `POST /auth/refresh`
3. Se o refresh falhar, redirecionar para `/login`

```typescript
// Exemplo de estrutura
const apiClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL })

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // tentar refresh...
    }
    return Promise.reject(error)
  }
)
```

### Por que centralizar?
Se você não centralizar, vai precisar adicionar o token manualmente em cada chamada — e quando a lógica de refresh mudar, vai precisar atualizar em dezenas de lugares. Um cliente centralizado resolve tudo em um lugar.

### Critérios de aceite
- [ ] Todas as requisições autenticadas incluem o token automaticamente
- [ ] Resposta 401 dispara o fluxo de refresh automaticamente
- [ ] Refresh bem-sucedido repete a requisição original
- [ ] Refresh falho redireciona para `/login`
- [ ] `NEXT_PUBLIC_API_URL` lido de variável de ambiente

---

## Ordem de execução sugerida

```
TASK-01 (schema)
    └── TASK-02 (endpoints auth)
          ├── TASK-03 (guards)
          ├── TASK-04 (tela cadastro)
          └── TASK-05 (tela login)
                    └── TASK-06 (cliente HTTP)
```

---

## Variáveis de ambiente necessárias

Adicionar no `.env` do backend:
```
JWT_SECRET=
JWT_REFRESH_SECRET=
DATABASE_URL=
```

Adicionar no `.env.local` do frontend:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> 🚨 **Nunca commitar o `.env` no repositório.** Já está no `.gitignore`. Use o `.env.example` para documentar as variáveis sem os valores reais.
