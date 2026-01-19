import { Injectable, NestMiddleware } from "@nestjs/common";
import { handleLegacyRequest } from "./legacy-handler";

@Injectable()
export class LegacyMiddleware implements NestMiddleware {
  async use(req: any, res: any, next: () => void) {
    const rawPath = req.originalUrl ?? req.path ?? req.url ?? "";
    const path = rawPath.split("?")[0];
    if (req.method === "OPTIONS") {
      return next();
    }
    if (path.startsWith("/auth") || path.startsWith("/users") || path.startsWith("/settings")) {
      return next();
    }
    try {
      await handleLegacyRequest(req, res);
    } catch (error) {
      next();
    }
  }
}
