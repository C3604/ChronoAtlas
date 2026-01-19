import { NestMiddleware } from "@nestjs/common";
import crypto from "crypto";

export class TraceIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const headerId = req.headers["x-trace-id"];
    const traceId = typeof headerId === "string" && headerId.trim()
      ? headerId.trim()
      : crypto.randomUUID();
    req.traceId = traceId;
    res.setHeader("x-trace-id", traceId);
    next();
  }
}
