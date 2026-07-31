import { ValidationPipe } from "@nestjs/common";
import multipart from "@fastify/multipart";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  const port = Number.parseInt(process.env.PORT ?? "3001", 10);

  await app.register(multipart, {
    limits: { files: 1, fileSize: 8 * 1024 * 1024 }
  });
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000"
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
