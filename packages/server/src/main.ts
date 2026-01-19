import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { TraceIdMiddleware } from "./common/middleware/trace-id.middleware";
import { CsrfMiddleware } from "./common/middleware/csrf.middleware";

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  app.use(cookieParser());
  app.use(new TraceIdMiddleware().use);
  app.use(new CsrfMiddleware(config).use);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const origin = config.get<string>("WEB_ORIGIN") ?? "http://localhost:5173";
  app.enableCors({
    origin,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]
  });

  const port = Number(config.get("PORT") ?? 3000);
  await app.listen(port);
  console.log(`服务已启动：http://localhost:${port}`);
};

bootstrap().catch((error) => {
  console.error("启动失败：", error);
  process.exit(1);
});
