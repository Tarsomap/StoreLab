# QUIZ — Módulo de Questionário

> Especificação completa do módulo de quiz do Retail Game Platform.
> O quiz impacta diretamente o CSAT de cada loja em cada rodada.

---

## Regra de Negócio

O CSAT de cada loja é calculado pela fórmula:

```
CSAT = (cashierOperators / 10) * (quizScorePercentage / 100)
```

`quizScorePercentage` é a **média percentual de acertos** de todos os membros da loja que responderam o quiz da rodada.

**Exemplo:**
- Loja A tem 4 membros que responderam
- Resultados: 80%, 60%, 100%, 70%
- quizScorePercentage = (80 + 60 + 100 + 70) / 4 = 77.5%
- Se cashierOperators = 8: CSAT = (8/10) * (77.5/100) = 0.62 = 62%

---

## Fluxo do Quiz

```
Facilitador cria perguntas da sessão/rodada
        ↓
Round inicia → jogadores veem o quiz na tela
        ↓
Cada jogador responde individualmente (10 questões, 1 tentativa)
        ↓
Backend consolida: média de acertos dos membros da loja
        ↓
QuizAnswer salvo (storeId, round, scorePercentage)
        ↓
Gerente só pode confirmar PO após todos os membros responderem
        ↓
CsatService lê QuizAnswer.scorePercentage para calcular CSAT
```

---

## Regras do Quiz

| Regra | Valor |
|---|---|
| Perguntas por sessão/rodada | 10 (constante de negócio) |
| Alternativas por pergunta | 4 |
| Tentativas por jogador | 1 por rodada |
| Quem cria as perguntas | Facilitador |
| Quem responde | Todos os membros da loja |
| Score da loja | Média percentual dos membros |
| Bloqueio de PO | PO só pode ser confirmado após todos responderem |
| Score padrão se ninguém respondeu | 0 |

---

## Prisma Schema

```prisma
model QuizQuestion {
  id          String           @id @default(uuid())
  session     Session          @relation(fields: [sessionId], references: [id])
  sessionId   String
  round       Int
  prompt      String
  order       Int
  createdAt   DateTime         @default(now())
  options     QuizOption[]
  userAnswers UserQuizAnswer[]

  @@unique([sessionId, round, order])
}

model QuizOption {
  id          String           @id @default(uuid())
  question    QuizQuestion     @relation(fields: [questionId], references: [id])
  questionId  String
  label       String
  isCorrect   Boolean          @default(false)
  userAnswers UserQuizAnswer[]
}

model UserQuizAnswer {
  id          String        @id @default(uuid())
  session     Session       @relation(fields: [sessionId], references: [id])
  sessionId   String
  store       Store         @relation(fields: [storeId], references: [id])
  storeId     String
  user        User          @relation(fields: [userId], references: [id])
  userId      String
  question    QuizQuestion  @relation(fields: [questionId], references: [id])
  questionId  String
  option      QuizOption    @relation(fields: [optionId], references: [id])
  optionId    String
  round       Int
  isCorrect   Boolean
  answeredAt  DateTime      @default(now())

  @@unique([userId, questionId, round])
}

model QuizAnswer {
  id              String   @id @default(uuid())
  store           Store    @relation(fields: [storeId], references: [id])
  storeId         String
  round           Int
  totalQuestions  Int
  correctAnswers  Int
  scorePercentage Float
  createdAt       DateTime @default(now())

  @@unique([storeId, round])
}
```

---

## Endpoints REST

### Facilitador — Criar Perguntas

```http
POST /sessions/:sessionId/quiz/questions
Authorization: Bearer <token>  (role: FACILITATOR)
Content-Type: application/json

{
  "round": 1,
  "questions": [
    {
      "prompt": "Qual indicador mede a satisfação do cliente?",
      "order": 1,
      "options": [
        { "label": "CSAT",   "isCorrect": true  },
        { "label": "EBITDA", "isCorrect": false },
        { "label": "CAPEX",  "isCorrect": false },
        { "label": "Aging",  "isCorrect": false }
      ]
    }
    // ... 9 more
  ]
}

Response 201: { questionsCreated: 10 }
```

### Facilitador — Listar Perguntas (com gabarito)

```http
GET /sessions/:sessionId/quiz/questions?round=1
Authorization: Bearer <token>  (role: FACILITATOR)

Response 200: [
  {
    "id": "...",
    "prompt": "...",
    "order": 1,
    "options": [
      { "id": "...", "label": "CSAT",   "isCorrect": true  },
      { "id": "...", "label": "EBITDA", "isCorrect": false }
    ]
  }
]
```

### Jogador — Buscar Quiz (sem gabarito)

```http
GET /stores/:storeId/quiz?round=1
Authorization: Bearer <token>  (role: PLAYER)

Response 200: {
  "round": 1,
  "alreadyAnswered": false,
  "questions": [
    {
      "id": "...",
      "prompt": "Qual indicador mede a satisfação do cliente?",
      "order": 1,
      "options": [
        { "id": "...", "label": "CSAT"   },
        { "id": "...", "label": "EBITDA" },
        { "id": "...", "label": "CAPEX"  },
        { "id": "...", "label": "Aging"  }
      ]
    }
  ]
}
// isCorrect field is NEVER returned to players
```

### Jogador — Submeter Respostas

```http
POST /stores/:storeId/quiz/submit
Authorization: Bearer <token>  (role: PLAYER)
Content-Type: application/json

{
  "round": 1,
  "answers": [
    { "questionId": "...", "optionId": "..." }
    // one entry per question (10 total)
  ]
}

Response 200: {
  "correctAnswers": 8,
  "totalQuestions": 10,
  "scorePercentage": 80
}

Errors:
  409 - already submitted this round
  400 - answers count != totalQuestions
  403 - user is not a member of this store
```

### Engine / Interno — Consolidar Score da Loja

```http
POST /quiz/stores/:storeId/consolidate
Authorization: internal (facilitator or engine call)

{
  "round": 1
}

Response 200: {
  "storeId": "...",
  "round": 1,
  "totalQuestions": 10,
  "correctAnswers": 8,
  "scorePercentage": 77.5
}
```

---

## Módulo NestJS — `quiz/`

```
src/quiz/
  quiz.module.ts
  quiz.controller.ts
  quiz.service.ts
  dto/
    create-questions.dto.ts
    submit-answers.dto.ts
```

### Responsabilidades do `QuizService`

```typescript
createQuestions(sessionId, round, questions[])  // facilitador
getQuestionsForFacilitator(sessionId, round)     // com isCorrect
getQuestionsForPlayer(sessionId, round)          // sem isCorrect
submitAnswers(userId, storeId, round, answers[]) // valida, salva, retorna score
consolidateStoreScore(storeId, round)            // média dos membros → QuizAnswer
hasAllMembersAnswered(storeId, round): boolean   // usado pelo PlanService no confirm
```

---

## WebSocket Events do Quiz

```
// Servidor → sala da loja (store:{storeId})
quiz:player-answered  →  { userId, storeId, round, answered: totalAnswered, total: totalMembers }
```

Emitido após cada submissão para que a interface mostre progresso (ex: "3 de 5 membros responderam").

---

## Integração com Engine

O `CsatService` deve:
1. Buscar `QuizAnswer` por `{ storeId, round }`
2. Se não existir, usar `scorePercentage = 0`
3. Calcular: `csat = (cashierOperators / 10) * (quizAnswer.scorePercentage / 100)`

```typescript
// csat.service.ts
async calculateCsat(storeId: string, round: number, cashierOperators: number): Promise<number> {
  const quizAnswer = await this.prisma.quizAnswer.findUnique({
    where: { storeId_round: { storeId, round } },
  });
  const quizScore = quizAnswer?.scorePercentage ?? 0;
  return (cashierOperators / IDEAL_OPERATORS) * (quizScore / 100);
}
```

---

## Critérios de Aceitação

- [ ] Facilitador consegue criar 10 perguntas com 4 alternativas por sessão/rodada
- [ ] Jogador busca o quiz sem ver o gabarito
- [ ] Jogador não pode responder duas vezes na mesma rodada
- [ ] Jogador não pode confirmar PO sem ter respondido o quiz
- [ ] Score da loja é a média dos membros que responderam
- [ ] `QuizAnswer` é persistido antes do engine rodar a rodada
- [ ] `CsatService` lê o `QuizAnswer` consolidado
- [ ] Evento WebSocket `quiz:player-answered` emitido após cada submissão
- [ ] Testes unitários cobrindo cálculo de média e integração com CSAT
