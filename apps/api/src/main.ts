import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // `rawBody` keeps the untouched request bytes alongside the parsed body.
  // Razorpay signs the exact payload it sent, so the webhook has to hash the
  // raw text — re-serialising the parsed JSON reorders keys and the HMAC no
  // longer matches.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Bulk CSV imports post the whole sheet as a JSON string, which blows past
  // the 100kb express default at a few hundred rows.
  app.useBodyParser('json', { limit: '8mb', rawBody: true });

  // Serve locally stored uploads (videos, thumbnails) at /uploads/*.
  // Not under the /api prefix so the web app can reference stable URLs.
  const uploadDir = config.get<string>('UPLOAD_DIR')
    ? resolve(config.get<string>('UPLOAD_DIR') as string)
    : resolve(process.cwd(), 'uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  const port = Number(config.get('PORT') ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`poozari API listening on http://localhost:${port}/api`);
}

void bootstrap();
