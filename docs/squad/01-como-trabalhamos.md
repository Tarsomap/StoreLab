# 📘 Como Trabalhamos — Guia do Squad

> **Para quem é esse documento?**
> Para todo mundo do squad que vai escrever ou revisar código.
>
> **O que você vai aprender:**
> Como funciona nosso fluxo de desenvolvimento, como criar uma branch, commitar seu código, abrir um Pull Request e trabalhar sem bagunciar o repositório dos outros.

> ⚠️ **Importante:** este guia é uma versão didática do [`CONTRIBUTING.md`](../../CONTRIBUTING.md), que fica na raiz do repositório. O CONTRIBUTING.md é a referência oficial — em caso de conflito entre os dois documentos, ele prevalece.

---

## Glossário rápido

| Termo | O que significa |
|---|---|
| **Repositório (repo)** | A pasta do projeto que fica no GitHub. É onde todo o código do time vive. |
| **Branch** | Uma cópia isolada do projeto onde você trabalha sem afetar o código dos outros. |
| **Commit** | Um "save" do seu código com uma mensagem explicando o que você fez. |
| **Push** | Enviar seus commits do seu computador para o GitHub. |
| **Pull Request (PR)** | Um pedido para que seu código seja revisado e adicionado ao projeto principal. |
| **Merge** | Quando o código do seu PR é aprovado e integrado ao projeto principal. |
| **main** | A branch principal do projeto. Só entra código aprovado aqui. |
| **Conflito** | Quando duas pessoas mexeram no mesmo trecho de código ao mesmo tempo. Precisa ser resolvido manualmente. |

---

## 1. Nosso modelo de desenvolvimento

Usamos uma abordagem **assistida por IA + revisão humana obrigatória**.

O agente de IA gera o esqueleto do código. O squad é responsável por revisar, testar, corrigir e melhorar. **Código gerado por IA não entra no projeto sem passar pela revisão de um membro do squad.**

### O fluxo completo

```
1. Agente gera o código de um módulo
2. Responsável pelo módulo baixa o código e lê linha a linha
3. Roda localmente e testa os endpoints/telas
4. Identifica e aplica pelo menos 1 correção ou melhoria
5. Abre um PR com o que foi feito
6. Outro membro do squad revisa o PR
7. Tech Lead faz o merge
```

### O que é esperado de cada revisor

- **Ler** o código do módulo que você é responsável, linha a linha
- **Rodar** localmente e confirmar que funciona
- **Testar** os casos listados na sua issue do GitHub
- **Corrigir ou melhorar** pelo menos 1 coisa (mesmo que pequena)
- **Abrir um PR** com título no formato `review(módulo): o que foi corrigido`
- **Ser capaz de explicar** o código na apresentação final

> 📌 Sua issue de revisão está na aba [Issues do GitHub](https://github.com/Tarsomap/retail-game-platform/issues). Ela contém exatamente o que você precisa testar e os critérios de aceite.

---

## 2. Fluxo básico de trabalho

Todo trabalho segue esse caminho, sem exceção:

```
1. Pegar a tarefa (issue atribuída a você)
2. Criar uma branch para ela
3. Revisar, corrigir e testar
4. Commitar as mudanças
5. Enviar para o GitHub (push)
6. Abrir um Pull Request
7. Aguardar revisão
8. Fazer merge
```

> ⚠️ **Regra de ouro:** nunca escreva código diretamente na branch `main`. Sempre crie uma branch separada.

---

## 3. Criando sua branch

Antes de começar qualquer tarefa, rode esses comandos no terminal:

```bash
# 1. Garante que você está na main atualizada
git checkout main
git pull

# 2. Cria sua branch e já entra nela
git checkout -b review/nome-do-modulo
```

### Como nomear sua branch

Siga esse padrão: `tipo/descricao-curta`

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `review/` | Você está revisando código gerado pelo agente | `review/auth` |
| `feat/` | Você está criando algo novo que o agente não gerou | `feat/tela-login` |
| `fix/` | Você está corrigindo um bug | `fix/calculo-ebitda-errado` |
| `test/` | Você está escrevendo testes | `test/csat-service` |
| `docs/` | Você só mexeu em documentação | `docs/atualizar-guia` |

> 💡 Use letras minúsculas e hífen no lugar de espaço. Nunca use acento ou caractere especial no nome da branch.

---

## 4. Salvando seu trabalho (commits)

Depois de escrever ou corrigir código, você salva assim:

```bash
# Ver o que você modificou
git status

# Adicionar os arquivos que quer salvar
git add nome-do-arquivo.ts
# ou adicionar tudo de uma vez:
git add .

# Fazer o commit com uma mensagem
git commit -m "review(auth): corrigir validacao de email duplicado"
```

### Como escrever a mensagem do commit

Siga esse formato: `tipo(onde): o que você fez`

**Exemplos corretos:**
```
review(auth): corrigir validacao de email duplicado
review(engine): adicionar testes para calculo de juros
fix(plans): bloquear confirmacao sem quiz respondido
test(csat): adicionar casos extremos
docs: atualizar guia do squad
```

**Regras simples:**
- Escreva no infinitivo: "corrigir", "adicionar", "criar" — não "corrigido", "adicionado"
- Máximo 70 caracteres na mensagem
- Sem ponto final

> 💡 **Por que isso importa?** Quando algo quebrar no futuro, a mensagem do commit é o que vai te ajudar a encontrar onde o problema começou. Mensagem ruim = detetive sem pista.

---

## 5. Enviando para o GitHub (push)

```bash
# Enviar sua branch para o GitHub
git push origin review/nome-do-modulo
```

Depois disso, o GitHub vai te mostrar um link para abrir o Pull Request. Clique nele.

---

## 6. Abrindo o Pull Request

Quando abrir o PR no GitHub, preencha assim:

**Título:** `review(módulo): o que foi corrigido/melhorado`

**Descrição:** copie e preencha esse modelo:

```
## O que esse PR faz?
(descreva em 1-2 frases o que você revisou e o que foi corrigido)

## Issue relacionada
Fecha #XX

## O que foi testado?
- [ ] Endpoint/tela X testado e funcionando
- [ ] Cenário de erro Y testado
- [ ] ...

## O que foi corrigido ou melhorado?
(descreva a melhoria que você aplicou)

## Checklist
- [ ] Rodei o projeto localmente e está funcionando
- [ ] Não tem nenhum `console.log` esquecido no código
- [ ] Não usei `any` como tipo no TypeScript
- [ ] Os testes estão passando (npm test)
```

> ⚠️ **Antes de abrir o PR:** rode `npm test` no seu computador e confirme que tudo está passando. PR com teste quebrado não é aprovado.

---

## 7. Revisão e merge

- Seu PR precisa de **pelo menos 1 aprovação** antes de fazer merge
- Se alguém deixar um comentário pedindo mudança, faça a mudança, commite e o PR atualiza automaticamente
- Quem faz o merge usa a opção **"Squash and Merge"** no GitHub (junta todos os seus commits em um só)
- Depois do merge, delete a branch — o GitHub vai te oferecer um botão para isso

---

## 8. Situações que podem acontecer

### "Minha branch está desatualizada"
Isso acontece quando alguém fez merge de outro PR enquanto você trabalhava.

```bash
git checkout main
git pull
git checkout review/minha-branch
git rebase main
# Se aparecer conflito, resolva os arquivos e depois:
git rebase --continue
git push --force-with-lease
```

### "Commitei na main sem querer"
```bash
# 1. Cria uma branch no ponto atual (salva seu trabalho)
git checkout -b review/minha-branch

# 2. Volta a main para o estado do GitHub
git checkout main
git reset --hard origin/main

# 3. Volta para sua branch e continua
git checkout review/minha-branch
```

### "Quero desfazer meu último commit (mas manter o código)"
```bash
git reset --soft HEAD~1
# Seu código continua lá, só o commit foi desfeito
```

---

## 9. Comandos que você vai usar todo dia

```bash
git status                    # Ver o que mudou
git pull                      # Atualizar sua branch com o GitHub
git add .                     # Adicionar tudo para o próximo commit
git commit -m "mensagem"      # Salvar com mensagem
git push origin minha-branch  # Enviar para o GitHub
git log --oneline             # Ver histórico de commits resumido
```

---

> 💬 **Dúvida? Problema com Git?** Chama no grupo do squad antes de tentar resolver sozinho por muito tempo. Git tem comportamentos que confundem até desenvolvedor experiente — não tem vergonha nenhuma em pedir ajuda.
