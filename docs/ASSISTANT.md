# Assistente StoreLab

O Assistente StoreLab é um explicador sob demanda para jogadores e facilitadores.
Ele ajuda a entender regras do jogo, sessões, rodadas, Plano Operacional (PO),
indicadores e resultados já gravados.

Ele não substitui o motor financeiro. O motor continua sendo a única fonte de
verdade para EBITDA, CSAT, demanda, impostos e ranking.

## Arquitetura

- Backend: módulo NestJS `assistant`, com endpoint `POST /api/assistant/ask`.
- LLM: pacote `openai` usado para OpenAI e Groq.
- Provider principal: OpenAI.
- Provider reserva: Groq, via `https://api.groq.com/openai/v1`.
- Frontend: `frontend/src/features/assistant`, renderizado pelo `AppShell` em rotas autenticadas.
- Persistência: sem histórico em banco nesta versão.

O `AssistantService` monta contexto de leitura com sessão, lojas, PO, ranking e
resultados já persistidos. O `LlmService` isola a chamada ao provider e o fallback.

## Regras de comportamento

- Responde apenas sobre StoreLab, jogo, indicadores, sessão, loja, rodada, PO,
  quiz, CSAT, EBITDA, CAPEX, caixa, demanda, preço, impostos, salários,
  manutenção, licenças, SLA, ranking, quebras e aging.
- Recusa educadamente perguntas fora do escopo.
- Não recalcula indicadores.
- Não inventa números quando o dado não existe no contexto.
- Não expõe segredos técnicos nem chaves de API.
- Não importa nem chama o `EngineModule`.

## Variáveis de ambiente

Configure no `backend/.env`:

```env
ASSISTANT_PROVIDER_ORDER="openai,groq"
ASSISTANT_MAX_TOKENS="700"
ASSISTANT_TEMPERATURE="0.2"
ASSISTANT_REASONING_EFFORT="minimal"

OPENAI_API_KEY=""
ASSISTANT_MODEL="gpt-4o-mini"
ASSISTANT_FALLBACK_MODELS="gpt-4.1-mini,gpt-4o,gpt-4.1-nano,gpt-5-mini,gpt-5.4-mini,gpt-5.4-nano"

GROQ_API_KEY=""
GROQ_MODEL="llama-3.1-8b-instant"
GROQ_FALLBACK_MODELS="meta-llama/llama-4-scout-17b-16e-instruct,llama-3.3-70b-versatile,qwen/qwen3-32b,openai/gpt-oss-20b,openai/gpt-oss-120b,groq/compound-mini"
GROQ_BASE_URL="https://api.groq.com/openai/v1"
```

As chaves reais devem ficar somente em `.env` ou secret manager. Nunca colocar
chaves reais em código, frontend, docs ou commits.

## API

```http
POST /api/assistant/ask
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "sessionId": "opcional",
  "storeId": "opcional",
  "question": "Por que meu EBITDA caiu?"
}
```

Resposta:

```json
{
  "answer": "texto do assistente",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "fallbackUsed": false
}
```

`sessionId` e `storeId` são opcionais porque o frontend detecta contexto pela
rota. Sem contexto, o assistente responde perguntas gerais sobre regras do jogo.

## Frontend

O chat aparece como painel flutuante nas rotas autenticadas. Ele detecta contexto
pela URL:

- `/dashboard/session/[id]`: envia `sessionId`;
- `/store/[storeId]/plan`: envia `storeId`;
- `/store/[storeId]/quiz`: envia `storeId`;
- `/session/[id]/results`: envia `sessionId`;
- demais rotas autenticadas: envia apenas `question`.

As respostas aceitam Markdown simples para parágrafos, listas, negrito e fórmulas
curtas.

## Fallback e latência

O `LlmService` tenta os providers na ordem de `ASSISTANT_PROVIDER_ORDER`.
Erros temporários como `429`, `500`, `502`, `503` e `504` avançam para o próximo
modelo/provider. Erros de autenticação, payload inválido ou chave ausente não são
tratados como sucesso silencioso.

Se uma resposta vier com `fallbackUsed=true`, o modelo principal falhou ou não
estava disponível naquele momento. Para menor latência, mantenha modelos leves no
início das listas de fallback.

## Troubleshooting

- `Chave de API ausente para openai`: preencher `OPENAI_API_KEY` ou colocar Groq
  antes no `ASSISTANT_PROVIDER_ORDER`.
- `fallbackUsed=true`: verificar rate limit, disponibilidade do modelo e billing.
- Resposta lenta: reduzir `ASSISTANT_MAX_TOKENS` e priorizar modelos menores.
- Resposta fora de escopo: conferir termos permitidos no filtro do assistente.
- Erro de banco ao subir backend: garantir Postgres ativo e `DATABASE_URL`
  apontando para a porta correta.
- Frontend não chama API: conferir `NEXT_PUBLIC_API_URL` em `frontend/.env.local`.

## Validação manual

Com backend rodando e token válido:

```bash
curl -X POST http://localhost:3001/api/assistant/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Como funcionam as sessões e como funciona o jogo?"}'
```

Esperado: resposta explicando fluxo de sessão, rodadas, PO, papéis e ranking sem
criar números novos.
