import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const traceId = req?.traceId;
    return next.handle().pipe(
      map((data) => ({
        code: "OK",
        message: "OK",
        data: data ?? null,
        traceId
      }))
    );
  }
}
