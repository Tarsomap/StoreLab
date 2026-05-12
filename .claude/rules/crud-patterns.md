---
paths:
  - "backend/src/**/*.dto.ts"
  - "backend/src/**/*.service.ts"
  - "backend/src/**/*.controller.ts"
  - "frontend/src/features/**/*.ts"
  - "frontend/src/features/**/*.tsx"
---

# CRUD Patterns — Retail Game Platform

Padrões consolidados após a entrega do CRUD de Sessions (PRs #56 backend + #57 frontend). Use estas convenções ao criar novos endpoints REST e suas respectivas UIs.

## Backend — DELETE com cascade manual

### Quando usar cascade manual em vez de `onDelete: Cascade`
- Quando a entidade tem **relações compartilhadas com outros módulos** (ex: o engine grava em `SlaEvent` e `RoundResult`; mudar o schema afeta esses módulos)
- Quando a ordem de delete envolve filtros não-triviais (ex: filtrar `OperationalPlan` por `store.sessionId`)
- Quando se quer **observabilidade da operação** (logar a transação, validar contagem antes/depois)

### Estrutura padrão do método `remove`
```ts
async remove(id: string, userId: string): Promise<{ deleted: true }> {
  const entity = await this.prisma.session.findUnique({ where: { id } });
  if (!entity) throw new NotFoundException('Sessão não encontrada');
  if (entity.facilitatorId !== userId) {
    throw new ForbiddenException('Apenas o facilitador dono pode excluir');
  }
  // Regra de status, se aplicável
  if (!CAN_DELETE_STATUSES.includes(entity.status)) {
    throw new BadRequestException(
      'Só é possível excluir em SETUP ou FINISHED. ...'
    );
  }

  await this.prisma.$transaction(async (tx) => {
    // Folhas → raiz. Sempre nessa ordem.
    // Documente a árvore de FK em comentário se for não-trivial.
  });

  return { deleted: true };
}
```

### Regras invioláveis
1. Sempre validar **existência + autorização + regra de status** antes do delete
2. Sempre dentro de `$transaction` — falha parcial é pior que falha total
3. Ordem **folhas → raiz**, nunca o contrário
4. Mensagens de erro em **PT-BR**, orientando o que o usuário pode fazer
5. Resposta `{ deleted: true }` em sucesso (booleano consistente entre módulos)
6. **Nunca** usar `onDelete: Cascade` em FK que outros módulos consomem

## Backend — PATCH parcial com regras por status

### DTO
```ts
export class UpdateXDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() @IsPositive() campoRestrito?: number;
}
```
- Todos os campos `@IsOptional()`
- Validações `@Min`, `@IsPositive` etc continuam aplicáveis quando o campo vem

### Service
```ts
async update(id: string, dto: UpdateXDto, userId: string): Promise<XSummary> {
  // 1. find + autorização (mesmo padrão do remove)
  // 2. Validar regra de status:
  const hasRestrictedFields = dto.campoRestrito !== undefined;
  if (hasRestrictedFields && !isInEditableStatus(entity)) {
    throw new BadRequestException(
      `Fora de SETUP, apenas o nome pode ser editado.`
    );
  }
  // 3. $transaction com "wipe and replace" para coleções (ex: categoryConfigs)
  // 4. session.update com spread condicional
  // 5. Retornar toSummary(updated)
}
```

### Wipe and replace para coleções aninhadas
Para campos do tipo `categoryConfigs: CategoryConfigDto[]`:
- `deleteMany` por `entityId` (apaga todos os anteriores)
- `createMany` com os novos (só se array tiver itens)
- Nunca tentar diff inteligente — gera bugs e complexidade

## Backend — Controller

```ts
@Patch(':id')
@UseGuards(RolesGuard)
@Roles(UserRole.FACILITATOR)
update(@Param('id') id, @Body() dto, @CurrentUser() user) {
  return this.service.update(id, dto, user.sub);
}

@Delete(':id')
@UseGuards(RolesGuard)
@Roles(UserRole.FACILITATOR)
remove(@Param('id') id, @CurrentUser() user) {
  return this.service.remove(id, user.sub);
}
```
- Método se chama `remove`, não `delete` (palavra reservada em TS)
- Não esquecer de importar `Delete` de `@nestjs/common`

## Frontend — Hooks de mutação

### Padrão de hook (referência: `use-advance-session.ts`)
```ts
export function useDeleteX(id: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.delete<{ deleted: true }>(`/x/${id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao excluir';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
```
- Shape do retorno: `{ mutate, isLoading, error }` (consistente entre todos os hooks)
- Em erro: salvar mensagem em estado E re-lançar (o componente decide se fecha modal)
- Sem React Query / SWR — manter padrão `useState` caseiro do projeto

## Frontend — Permissões espelhadas

Cada feature com regras de status deve ter um arquivo `lib/X-permissions.ts`:
```ts
export function canDeleteX(status: XStatus | string): boolean { ... }
export function canEditFullX(status: XStatus | string): boolean { ... }

export const RESTRICTED_FIELD_TOOLTIP = '...';
export const DELETE_BLOCKED_TOOLTIP = '...';
```
- Regras espelham 1:1 o backend (mesma fonte: mensagens duplicadas, comportamentos sincronizados)
- Tooltips em constantes — fácil de revisar e traduzir

## Frontend — UI destrutiva

### Confirmação de DELETE
- `AlertDialog` (não `Dialog`) — semântica de operação destrutiva
- Título objetivo: "Excluir X?"
- Descrição com **aviso de cascade explícito**: o que mais será apagado
- Botão "Excluir" em variant `destructive`
- Toast de sucesso/erro via `sonner`

### Edição com campos restritos
- Campos restritos: `disabled` + `Tooltip` com mensagem explicando
- Tooltip do Radix não dispara em elementos disabled → envolver em `<span tabIndex={0}>`
- Botão "Salvar" desabilitado se nada mudou (compare valores atuais com originais)

### Menu de ações (kebab)
- `DropdownMenu` com `MoreVertical` do lucide
- Itens "Editar" e "Excluir"
- Item Excluir desabilitado quando regra de status não permite — com texto auxiliar explicando ("Disponível em SETUP ou FINISHED")
- Dentro de cards clicáveis: wrap em `<div onClick={e => e.stopPropagation()}>`

## Convenções gerais

1. **Zero `api.*` em `app/`** — todas as chamadas via hook em `features/X/hooks/`
2. **Mensagens em PT-BR** orientando o que fazer (não só "erro 400")
3. **Pages ≤ 250 linhas** — extrair pra `features/X/components/` se ultrapassar
4. **1 PR = 1 responsabilidade** (CONTRIBUTING.md)
5. **Squash and Merge** na main
6. **Validação manual antes de operações destrutivas** — script shell ou roteiro de teste no PR

## Anti-padrões observados

- ❌ Usar `onDelete: Cascade` no schema quando relações são compartilhadas
- ❌ Misturar `find + delete` sem transação
- ❌ DTO com campos obrigatórios em endpoint PATCH (use `@IsOptional`)
- ❌ Mensagens de erro só em inglês
- ❌ Tooltip direto no elemento disabled (não dispara)
- ❌ Click em kebab disparando navegação do card pai
- ❌ Form salvando mesmo sem alteração (Salvar não diferenciado)