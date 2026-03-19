# Guia de Contribuição — Squad 14

Este documento define as convenções de trabalho em equipe no repositório. Siga estas regras para manter o histórico do Git limpo e o trabalho organizado.

---

## 1. Branches

### Nomenclatura

```
<tipo>/<descricao-curta-em-kebab-case>
```

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `feat/` | Nova funcionalidade | `feat/csat-service` |
| `fix/` | Correção de bug | `fix/ebitda-negative-value` |
| `refactor/` | Refatoração sem mudar comportamento | `refactor/demand-service` |
| `test/` | Adicionar ou corrigir testes | `test/financial-service-unit` |
| `docs/` | Apenas documentação | `docs/atualizar-backlog` |
| `chore/` | Configuração, dependencias, CI | `chore/setup-jest-coverage` |

### Regras
- **Nunca** commitar diretamente na `main`
- Toda branch parte da `main` atualizada
- Uma branch = uma responsabilidade (não misture feat com fix)
- Delete a branch após o merge

---

## 2. Commits

Seguimos o padrão **Conventional Commits**:

```
<tipo>(<escopo>): <descrição curta no imperativo>
```

### Tipos válidos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração |
| `test` | Testes |
| `docs` | Documentação |
| `chore` | Configurações, deps, build |
| `style` | Formatação, sem lógica |

### Exemplos corretos

```bash
feat(engine): adicionar CsatService com formula e validacoes
fix(demand): corrigir calculo de demandShare quando todas lojas iguais
test(financial): adicionar 15 casos de teste para EBITDA
refactor(sla): extrair seededRandom para helper separado
docs: atualizar backlog com criterios de aceitacao US-20
chore: configurar jest com coverage threshold 80%
```

### Regras
- Descrição em **português** ou **inglês** (manter consistência no PR)
- Sempre no imperativo: "adicionar" e não "adicionado"
- Máximo 72 caracteres na primeira linha
- Não terminar com ponto final

---

## 3. Pull Requests

### Quando abrir um PR
- Quando a feature/fix estiver pronta para revisão
- **Não** abra PR com código quebrado ou testes falhando

### Tamanho ideal
- PRs pequenos: até 400 linhas de diferença
- PRs grandes: justificar no corpo do PR

### Template de PR

Ao abrir um PR, preencha:

```markdown
## O que esse PR faz?
Descreva brevemente o que foi implementado.

## US relacionada
US-XX — Nome da User Story

## Como testar?
1. Passo 1
2. Passo 2

## Checklist
- [ ] Testes unitários escritos e passando
- [ ] Sem `any` solto nas interfaces
- [ ] Sem constante de negócio fora de `constants.ts`
- [ ] `npm run lint` passando
```

### Revisão
- Mínimo **1 aprovação** antes de mergear
- Resolva todos os comentários antes de mergear
- Use **Squash and Merge** para manter o histórico limpo

---

## 4. Padrões de Código

### TypeScript
- **Proibido** usar `any` — use tipos específicos ou `unknown`
- Todas as interfaces do motor ficam em `src/engine/interfaces/`
- Todas as constantes de negócio ficam em `src/engine/constants.ts`
- Não hardcode valores numéricos no meio do código

### NestJS
- Um serviço = uma responsabilidade
- Lógica de negócio apenas em `services/`, nunca em `controllers/`
- DTOs com validação via `class-validator` em todos os endpoints

### Testes
- Arquivo de teste ao lado do serviço: `csat.service.spec.ts`
- Cobertura mínima no módulo `engine/`: **80%**
- Rodar antes de abrir PR: `npm run test:cov`

---

## 5. Fluxo de Trabalho Resumido

```
1. git checkout main && git pull
2. git checkout -b feat/nome-da-feature
3. (desenvolve e commita com Conventional Commits)
4. git push origin feat/nome-da-feature
5. Abre PR na main
6. Aguarda 1 aprovação
7. Squash and Merge
8. Delete a branch
```

---

## 6. Dúvidas Frequentes

**Posso commitar direto na main em emergência?**
Não. Abra um PR e peça revisão urgente no grupo do squad.

**Meu PR está conflitando. O que faço?**
```bash
git checkout main && git pull
git checkout minha-branch
git rebase main
# resolve conflitos
git push --force-with-lease
```

**Esqueci de criar branch e commitei na main. O que faço?**
```bash
git checkout -b feat/nome-da-feature  # cria branch no commit atual
git checkout main
git reset --hard origin/main          # volta main para o remoto
git checkout feat/nome-da-feature     # volta para sua branch
```
