import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ACCESS_TOKEN_COOKIE } from "../auth.constants";
import { AuthPayload, AuthUser } from "../auth.types";

const cookieExtractor = (req: any) => {
  if (!req?.cookies) {
    return null;
  }
  return req.cookies[ACCESS_TOKEN_COOKIE] || null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken()
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET"),
      issuer: config.get<string>("JWT_ISSUER") ?? "chronoatlas",
      audience: config.get<string>("JWT_AUDIENCE") ?? "chronoatlas-web"
    });
  }

  validate(payload: AuthPayload): AuthUser {
    if (!payload?.sub) {
      throw new UnauthorizedException({ code: "AUTH_001", message: "无效的登录状态" });
    }
    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    return {
      id: payload.sub,
      email: payload.email ?? "",
      displayName: payload.displayName ?? "",
      roles
    };
  }
}
