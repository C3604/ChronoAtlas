import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { Client } from "pg";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { ResponseInterceptor } from "../src/common/interceptors/response.interceptor";
import { CsrfMiddleware } from "../src/common/middleware/csrf.middleware";
import { TraceIdMiddleware } from "../src/common/middleware/trace-id.middleware";

const requiredEnvKeys = ["PG_HOST", "PG_USER", "PG_PASSWORD", "PG_DATABASE"];
const hasDatabase = requiredEnvKeys.every((key) => Boolean(process.env[key]));
const describeIf = hasDatabase ? describe : describe.skip;

const ensureEnv = () => {
  process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test_jwt_secret_1234567890";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test_refresh_secret_1234567890";
  process.env.APP_URL = process.env.APP_URL ?? "http://localhost:5173";
  process.env.MAIL_DEV_OUTPUT = "file";
  process.env.MAIL_DEV_DIR = process.env.MAIL_DEV_DIR ?? "mail_outbox_test";
};

const getMailOutbox = () => path.resolve(__dirname, "..", process.env.MAIL_DEV_DIR ?? "mail_outbox_test");

const clearOutbox = () => {
  const dir = getMailOutbox();
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    fs.unlinkSync(path.join(dir, file));
  }
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
};

const waitForToken = async () => {
  const dir = getMailOutbox();
  const start = Date.now();
  while (Date.now() - start < 5000) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      if (files.length > 0) {
        const latest = files
          .map((file) => ({ file, mtime: fs.statSync(path.join(dir, file)).mtimeMs }))
          .sort((a, b) => a.mtime - b.mtime)
          .pop();
        if (latest) {
          const content = fs.readFileSync(path.join(dir, latest.file), "utf-8");
          const match = /token=([a-f0-9]+)/i.exec(content);
          if (match) {
            return match[1];
          }
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("token_not_found");
};

const runMigration = async (client: Client) => {
  const sqlPath = path.resolve(__dirname, "..", "migrations", "0001-auth.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  await client.query(sql);
};

const cleanupTestUsers = async (client: Client) => {
  await client.query("DELETE FROM users WHERE email LIKE 'e2e_%'");
};

describeIf("Auth e2e", () => {
  let app: INestApplication;
  let client: Client;

  beforeAll(async () => {
    ensureEnv();
    const sslEnabled = String(process.env.PG_SSL ?? "false").toLowerCase() === "true";
    client = new Client({
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT ?? 5432),
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
    });
    await client.connect();
    await runMigration(client);
    await cleanupTestUsers(client);

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
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
    await app.init();
  });

  afterAll(async () => {
    await cleanupTestUsers(client);
    await client.end();
    clearOutbox();
    await app.close();
  });

  it("register login refresh reset flow", async () => {
    clearOutbox();
    const email = `e2e_${Date.now()}@chronoatlas.local`;
    const password = "Test1234";
    const newPassword = "NewTest1234";

    const register = await request(app.getHttpServer()).post("/auth/register").send({
      email,
      displayName: "Test User",
      password
    });
    expect(register.status).toBe(201);
    expect(register.body.code).toBe("OK");
    expect(register.body.data.user.email).toBe(email);

    const verifyToken = await waitForToken();
    const verify = await request(app.getHttpServer()).post("/auth/verify-email").send({
      token: verifyToken
    });
    expect(verify.status).toBe(201);
    expect(verify.body.data.ok).toBe(true);

    const agent = request.agent(app.getHttpServer());
    const login = await agent.post("/auth/login").send({ email, password });
    expect(login.status).toBe(201);
    expect(login.body.data.user.email).toBe(email);

    const me = await agent.get("/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);

    const refresh = await agent.post("/auth/refresh");
    expect(refresh.status).toBe(201);
    expect(refresh.headers["set-cookie"]).toBeDefined();

    clearOutbox();
    const forgot = await request(app.getHttpServer()).post("/auth/forgot-password").send({ email });
    expect(forgot.status).toBe(201);
    const resetToken = await waitForToken();

    const reset = await request(app.getHttpServer()).post("/auth/reset-password").send({
      token: resetToken,
      newPassword
    });
    expect(reset.status).toBe(201);

    const loginAfterReset = await agent.post("/auth/login").send({ email, password: newPassword });
    expect(loginAfterReset.status).toBe(201);
  });
});
