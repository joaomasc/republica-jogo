import { defineConfig } from 'prisma/config';

/**
 * Configuração do Prisma 7. Defina DATABASE_URL (veja .env.example);
 * o padrão aponta para o PostgreSQL do docker-compose.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://republica:republica@localhost:5432/republica',
  },
});
