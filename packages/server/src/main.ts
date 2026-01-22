import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { TraceIdMiddleware } from "./common/middleware/trace-id.middleware";
import { CsrfMiddleware } from "./common/middleware/csrf.middleware";
import { isSetupCompleted, readAppConfig } from "./config/app-config";

const bootstrap = async () => {
  const configSnapshot = readAppConfig();
  const rootModule = isSetupCompleted(configSnapshot)
    ? (await import("./app.module")).AppModule
    : (await import("./setup/setup-app.module")).SetupAppModule;
  const app = await NestFactory.create(rootModule, { cors: false });
  const config = app.get(ConfigService);

  const origin = config.get<string>("WEB_ORIGIN") || config.get<string>("APP_URL") || "";
  app.enableCors({
    origin,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]
  });

  app.use(cookieParser());
  app.use(new TraceIdMiddleware().use);
  const csrfMiddleware = new CsrfMiddleware(config);
  app.use(csrfMiddleware.use.bind(csrfMiddleware));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = Number(config.get("PORT"));
  await app.listen(port);
  console.log(`服务已启动：http://localhost:${port}`);
};

bootstrap().catch((error) => {
  console.error("启动失败：", error);
  process.exit(1);
});
