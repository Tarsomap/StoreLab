---
paths:
  - "backend/src/**/*.ts"
---

# Backend Rules — NestJS

## Padrões obrigatórios
- Controllers: apenas validação de input e chamada ao service. ZERO lógica de negócio.
- Services: toda lógica aqui. Injetar dependências via constructor.
- DTOs: usar class-validator decorators (@IsString, @IsInt, @Min, etc.)
- Prisma: usar PrismaService injetável (não instanciar PrismaClient direto)
- Respostas: sempre tipar com interfaces. Nunca retornar entidades Prisma raw.
- Erros: usar exceções NestJS (NotFoundException, ForbiddenException, etc.)

## PrismaService
Criar em `src/common/prisma.service.ts`:
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

## Guards
- JwtAuthGuard: protege rotas autenticadas
- RolesGuard: verifica UserRole (FACILITATOR vs PLAYER)
- StoreRoleGuard: verifica StoreRole dentro da loja

## Convenções
- Nomes de arquivo: kebab-case (auth.service.ts, create-session.dto.ts)
- Imports: usar path aliases quando configurado
- NUNCA usar `any` — usar `unknown` se necessário e fazer type narrowing
