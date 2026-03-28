---
paths:
  - "frontend/src/**/*.tsx"
  - "frontend/src/**/*.ts"
---

# Frontend Rules — Retail Game Platform

## Estado Atual
Frontend compilando limpo. Todas as telas implementadas e funcionais.
Fase atual: B.1 — redesign visual (light mode only).

## Regra #1: Não Quebrar Funcionalidade
- NÃO alterar lógica de negócio, hooks, stores ou chamadas de API
- NÃO remover ou renomear props de componentes existentes
- NÃO mudar rotas ou redirects
- Após QUALQUER mudança: rodar `npm run build` e confirmar zero erros

## Design System

### Fontes
- Importar Sora, DM Sans, JetBrains Mono via next/font/google no layout.tsx
- CSS variables: --font-display, --font-body, --font-mono
- Tailwind classes: font-display, font-body, font-mono
- font-display → títulos, nomes de lojas, valores EBITDA destacados
- font-body → texto corrido, labels (padrão do body)
- font-mono → TODOS os valores monetários (R$) e percentuais (%)

### Cores
- Nunca usar cores hardcoded — sempre CSS variables ou classes Tailwind
- Nunca usar a cor padrão violet/purple do shadcn — substituir pela nossa paleta
- EBITDA positivo = text-accent (verde), negativo = text-destructive (vermelho)
- Categorias com cor consistente: Perecíveis=verde, Mercearia=âmbar, Eletro=azul, Hipel=roxo
- Ranking: 1º=ouro, 2º=prata, 3º=bronze, 4º=cinza
- Status badges: SETUP=bg-muted, ROUND_X=bg-accent, FINISHED=bg-primary

### Componentes
- Cards: bg-card rounded-xl shadow-sm border hover:shadow-md transition-shadow
- Inputs: rounded-lg, borda na cor da categoria quando aplicável
- Botões primários: bg-primary ou bg-accent, rounded-xl
- Badges de status: rounded-full, cores semânticas
- Loading states: Skeleton do shadcn/ui (NUNCA spinners genéricos)

### Formatação Brasileira
- Moeda: Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
- Data: dd/mm/aaaa
- Percentual: XX,X% (vírgula como separador decimal)

### Layout
- TopBar: h-16, bg-primary, text-primary-foreground
- Sidebar: w-[260px], bg-card, border-r (só para role FACILITATOR)
- Jogador: layout fullscreen sem sidebar
- Content area: bg-background, p-8, overflow-auto

## O que NÃO fazer
- NÃO implementar dark mode na Fase B.1 (vem na B.2)
- NÃO usar font-sans — usar font-body ou font-display
- NÃO deixar console.log no código
- NÃO usar `any` como tipo TypeScript
