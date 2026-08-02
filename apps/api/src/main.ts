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
  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook("onSend", (_request, reply, payload, done) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
    reply.header("Cross-Origin-Resource-Policy", "same-site");
    if ((process.env.ENABLE_HSTS ?? "false").toLowerCase() === "true") {
      reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    done(null, payload);
  });

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
