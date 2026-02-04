import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
    abortOnError: false,
  });

  app.enableCors({
    origin: '*', // Allow all for local dev
  });

  const config = new DocumentBuilder()
    .setTitle('Prompt Testing API')
    .setDescription('API for managing and executing AI prompt tests')
    .setVersion('1.0')
    .addTag('prompts')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Backend running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api`);
}

bootstrap();
