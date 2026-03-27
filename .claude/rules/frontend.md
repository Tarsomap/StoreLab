---
paths:
  - "frontend/src/**/*.tsx"
  - "frontend/src/**/*.ts"
---

# Frontend Rules — Next.js 14

## Stack
- Next.js 14 App Router (não Pages Router)
- Tailwind CSS + shadcn/ui para componentes
- Zustand para estado global (auth, socket, session)
- Socket.io-client para tempo real

## Padrões
- Componentes: functional components com hooks
- Estado local: useState/useReducer para UI state
- Estado global: Zustand stores em `src/stores/`
- API calls: fetch wrapper em `src/lib/api.ts` com token auto-refresh
- Socket: hook `useSocket` em `src/hooks/useSocket.ts`

## Rotas protegidas
- Middleware Next.js para verificar JWT
- Redirect para /login se não autenticado
- Role-based: facilitador → /dashboard, jogador → /store/[id]/plan

## Convenções
- Componentes: PascalCase (SessionCard.tsx)
- Hooks: camelCase com prefixo use (useSession.ts)
- Stores: camelCase (authStore.ts)
- NUNCA usar `any`
