import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Chave interna usada pelo RolesGuard para achar a lista de papéis permitidos na rota.
 */
export const ROLES_KEY = 'roles';

/**
 * Marca um handler ou controller como acessível só para os papéis listados (ex.: só FACILITATOR).
 * O Nest grava isso como metadado; o RolesGuard lê depois. Assim a regra fica declarada junto da rota,
 * fácil de ler, sem misturar “quem pode” dentro do corpo do método.
 *
 * @param roles - Um ou mais valores de UserRole permitidos para essa rota.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
