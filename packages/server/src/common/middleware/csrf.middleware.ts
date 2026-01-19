import { ConfigService } from "@nestjs/config";
import { NestMiddleware } from "@nestjs/common";
import crypto from "crypto";

const safePaths = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/verify-email",
  "/auth/forgot-password",
  "/auth/reset-password"
]);

const shouldSkip = (method: string, path: string) => {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }
  return safePaths.has(path);
};

const parseCookie = (cookieHeader?: string) => {
  const result: Record<string, string> = {};
  if (!cookieHeader) {
    return result;
  }
  cookieHeader.split(";").forEach((pair) => {
    const [rawKey, ...rest] = pair.split("=");
    const key = rawKey.trim();
    if (!key) {
      return;
    }
    result[key] = decodeURIComponent(rest.join("=").trim());
  });
  return result;
};

export class CsrfMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: any, res: any, next: () => void) {
    const method = String(req.method ?? "GET").toUpperCase();
    const rawPath = req.originalUrl ?? req.path ?? req.url ?? "";
    const path = rawPath.split("?")[0];
    if (shouldSkip(method, path)) {
      return next();
    }
    const cookieName = this.config.get<string>("CSRF_COOKIE_NAME") ?? "csrf_token";
    const cookies = req.cookies ?? parseCookie(req.headers?.cookie);
    const cookieToken = cookies[cookieName];
    const headerToken = req.headers["x-csrf-token"];
    const traceId = req.traceId ?? crypto.randomUUID();

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      res.status(403).json({
        code: "AUTH_010",
        message: "CSRF 校验失败",
        data: null,
        traceId
      });
      return;
    }
    next();
  }
}
