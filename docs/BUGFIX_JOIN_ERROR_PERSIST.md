# Bugfix — Erro persistente na tela de Join

**Data:** 19/05/2026  
**Status:** ✅ Corrigido

---

## Problema

Na tela `/join`, após uma tentativa de entrada com código inválido, o banner de erro "Código de acesso inválido" permanecia visível mesmo depois que o usuário apagava o código e digitava um novo. Isso criava uma contradição visual: o `OtpInput` exibia a mensagem "Código completo — selecione seu papel abaixo" (indicando input válido) enquanto o banner de erro da tentativa anterior ainda estava na tela.

**Reprodução:**
1. Digitar um código inválido e clicar em "Entrar na loja"
2. Receber o erro "Código de acesso inválido"
3. Apagar o código e digitar um novo código de 6 caracteres
4. O banner de erro persiste mesmo com o novo código preenchido

---

## Causa

O estado `error` em `useJoinSession` só era limpo no início de uma nova submissão (`setError('')` dentro de `join()`). Nenhuma ação do usuário anterior ao submit — como digitar no `OtpInput` — disparava a limpeza do erro.

```ts
// antes: erro só era limpo ao submeter novamente
async function join(accessCode: string, role: StoreRole) {
  setError(''); // ← único ponto de limpeza
  // ...
}
```

Além disso, `reset()` (chamado ao entrar em outra loja após sucesso) não limpava o `error`, apenas o `joined`.

---

## Correção

### `features/auth/hooks/use-join-session.ts`

Adicionada função `clearError` à interface e à implementação do hook. Atualizado `reset()` para também limpar o erro.

```ts
interface UseJoinSessionResult {
  // ...campos existentes...
  clearError: () => void; // novo
}

function reset() {
  setJoined(null);
  setError(''); // adicionado
}

function clearError() {
  setError('');
}

return { ..., reset, clearError };
```

### `app/join/page.tsx`

O `onChange` do `OtpInput` agora chama `clearError()` sempre que o usuário altera algum caractere enquanto há um erro ativo.

```tsx
<OtpInput
  chars={chars}
  onChange={(newChars) => {
    if (error) clearError();
    setChars(newChars);
  }}
/>
```

---

## Comportamento após a correção

- O banner de erro desaparece imediatamente ao primeiro caractere digitado após uma tentativa falha
- `reset()` (fluxo "entrar em outra loja") também limpa o erro, evitando que ele reapareça ao voltar ao formulário
- O erro continua sendo exibido enquanto o código que falhou ainda estiver intacto no campo
