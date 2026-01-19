import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const traceId = request?.traceId;

    let status = 500;
    let code = "COMMON_500";
    let message = "系统错误";
    let data: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (payload && typeof payload === "object") {
        const typed = payload as any;
        if (typed.code) {
          code = typed.code;
          message = typed.message ?? message;
          data = typed.data ?? null;
        } else if (Array.isArray(typed.message)) {
          code = "VALID_001";
          message = "参数校验失败";
          data = { errors: typed.message };
        } else {
          message = typed.message ?? message;
        }
      } else if (typeof payload === "string") {
        message = payload;
      }
      if (!code || code === "COMMON_500") {
        if (status === 400) {
          code = "COMMON_400";
        } else if (status === 401) {
          code = "AUTH_001";
        } else if (status === 403) {
          code = "PERM_001";
        } else if (status === 404) {
          code = "COMMON_404";
        }
      }
    }

    response.status(status).json({
      code,
      message,
      data,
      traceId
    });
  }
}
