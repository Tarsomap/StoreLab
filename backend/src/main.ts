import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

// Sem `override`: as variáveis reais do ambiente (Railway/Vercel) têm
// precedência sobre o `.env`. O `.env` só preenche o que faltar, evitando que
// um arquivo local sobreponha segredos definidos pela plataforma em produção.
config();

async function bootstrap() {
  // Import dinâmico do AppModule só após o dotenv carregar: alguns módulos
  // (ex.: JwtModule) leem process.env já no registro do módulo.
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}

bootstrap();
