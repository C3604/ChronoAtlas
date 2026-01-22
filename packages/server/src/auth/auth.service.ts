import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Repository } from "typeorm";
import { Response } from "express";
import { UsersService } from "../users/users.service";
import { RoleName } from "../common/roles.enum";
import { MailService } from "../mail/mail.service";
import { ACCESS_TOKEN_COOKIE, DEFAULT_CSRF_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth.constants";
import { AuthPayload } from "./auth.types";
import { RefreshTokenEntity } from "./entities/refresh-token.entity";
import { EmailVerificationTokenEntity } from "./entities/email-verification-token.entity";
import { PasswordResetTokenEntity } from "./entities/password-reset-token.entity";

const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token, "utf-8").digest("hex");
};

const parseDurationToMs = (value: string, fallbackMs: number) => {
  if (!value) {
    return fallbackMs;
  }
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  const match = /^(\d+)([smhd])$/.exec(trimmed);
  if (!match) {
    return fallbackMs;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier =
    unit === "s"
      ? 1000
      : unit === "m"
        ? 60 * 1000
        : unit === "h"
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;
  return amount * multiplier;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly emailTokenRepo: Repository<EmailVerificationTokenEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly resetTokenRepo: Repository<PasswordResetTokenEntity>
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }
    if (!user.isActive) {
      throw new ForbiddenException({ code: "AUTH_004", message: "账号已被禁用" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async register(params: { email: string; displayName: string; password: string }) {
    const result = await this.usersService.createUser({
      email: params.email,
      displayName: params.displayName,
      password: params.password,
      roles: [RoleName.USER],
      isActive: true
    });
    if (!result.ok) {
      throw new BadRequestException({ code: "AUTH_005", message: "邮箱已被注册" });
    }
    await this.sendVerifyEmail(result.user.id);
    return { user: this.toUserResponse(result.user), emailSent: true };
  }

  async login(userId: string, res: Response, req: any) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException({ code: "AUTH_001", message: "需要登录" });
    }
    if (!user.isActive) {
      throw new ForbiddenException({ code: "AUTH_004", message: "账号已被禁用" });
    }
    const accessToken = this.createAccessToken(user);
    const { token: refreshToken } = await this.createRefreshToken(user, req);
    const csrfToken = this.generateCsrfToken();
    this.setAuthCookies(res, accessToken, refreshToken, csrfToken);
    await this.usersService.updateLastLogin(user);
    return { user: this.toUserResponse(user) };
  }

  async refresh(res: Response, req: any) {
    const token = this.readRefreshToken(req);
    if (!token) {
      throw new UnauthorizedException({ code: "AUTH_001", message: "需要登录" });
    }
    const tokenHash = this.hashRefreshToken(token);
    const record = await this.refreshRepo.findOne({
      where: { tokenHash },
      relations: ["user"]
    });
    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException({ code: "AUTH_003", message: "登录状态已失效" });
    }
    if (!record.user.isActive) {
      throw new ForbiddenException({ code: "AUTH_004", message: "账号已被禁用" });
    }

    const { token: nextRefreshToken, entity: nextEntity } = await this.createRefreshToken(
      record.user,
      req
    );
    record.revokedAt = new Date();
    record.replacedByTokenId = nextEntity.id;
    await this.refreshRepo.save(record);

    const accessToken = this.createAccessToken(record.user);
    const csrfToken = this.generateCsrfToken();
    this.setAuthCookies(res, accessToken, nextRefreshToken, csrfToken);
    return { user: this.toUserResponse(record.user) };
  }

  async logout(res: Response, req: any) {
    const token = this.readRefreshToken(req);
    if (token) {
      const tokenHash = this.hashRefreshToken(token);
      const record = await this.refreshRepo.findOne({ where: { tokenHash }, relations: ["user"] });
      if (record && !record.revokedAt) {
        record.revokedAt = new Date();
        await this.refreshRepo.save(record);
      }
    }
    this.clearAuthCookies(res);
    return { ok: true };
  }

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const record = await this.emailTokenRepo.findOne({
      where: { tokenHash },
      relations: ["user"]
    });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({ code: "AUTH_006", message: "验证链接已失效" });
    }
    record.usedAt = new Date();
    record.user.emailVerified = true;
    await this.emailTokenRepo.save(record);
    await this.usersService.setEmailVerified(record.user);
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && user.isActive) {
      await this.sendResetPasswordEmail(user.id);
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);
    const record = await this.resetTokenRepo.findOne({
      where: { tokenHash },
      relations: ["user"]
    });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({ code: "AUTH_007", message: "重置链接已失效" });
    }
    await this.usersService.updatePassword(record.user, newPassword);
    record.usedAt = new Date();
    await this.resetTokenRepo.save(record);
    await this.revokeAllRefreshTokens(record.user.id);
    return { ok: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({ code: "COMMON_404", message: "用户不存在" });
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException({ code: "AUTH_008", message: "当前密码不正确" });
    }
    await this.usersService.updatePassword(user, newPassword);
    await this.revokeAllRefreshTokens(user.id);
    return { ok: true };
  }

  async updateProfile(userId: string, displayName: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({ code: "COMMON_404", message: "用户不存在" });
    }
    const updated = await this.usersService.updateUser(user, { displayName });
    return { user: this.toUserResponse(updated) };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({ code: "COMMON_404", message: "用户不存在" });
    }
    return { user: this.toUserResponse(user) };
  }

  private createAccessToken(user: { id: string; email: string; displayName: string; roles: any[] }) {
    const payload: AuthPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles.map((role) => role.name)
    };
    return this.jwtService.sign(payload);
  }

  private getAccessTokenTtlMs() {
    const raw = this.config.get<string>("JWT_EXPIRES_IN") ?? "15m";
    return parseDurationToMs(raw, 15 * 60 * 1000);
  }

  private getRefreshTokenTtlMs() {
    const raw = this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d";
    return parseDurationToMs(raw, 7 * 24 * 60 * 60 * 1000);
  }

  private getEmailVerifyTtlMs() {
    const raw = this.config.get<string>("EMAIL_VERIFY_TTL_MINUTES") ?? "1440";
    return parseDurationToMs(`${raw}m`, 24 * 60 * 60 * 1000);
  }

  private getResetPasswordTtlMs() {
    const raw = this.config.get<string>("PASSWORD_RESET_TTL_MINUTES") ?? "30";
    return parseDurationToMs(`${raw}m`, 30 * 60 * 1000);
  }

  private getCookieOptions(maxAgeMs: number, httpOnly: boolean) {
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    return {
      httpOnly,
      secure: isProd,
      sameSite: "lax" as const,
      path: "/",
      maxAge: maxAgeMs
    };
  }

  private generateCsrfToken() {
    return crypto.randomBytes(16).toString("hex");
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string, csrfToken: string) {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, this.getCookieOptions(this.getAccessTokenTtlMs(), true));
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      this.getCookieOptions(this.getRefreshTokenTtlMs(), true)
    );
    const csrfCookieName = this.config.get<string>("CSRF_COOKIE_NAME") ?? DEFAULT_CSRF_COOKIE;
    res.cookie(csrfCookieName, csrfToken, this.getCookieOptions(this.getAccessTokenTtlMs(), false));
  }

  private clearAuthCookies(res: Response) {
    const csrfCookieName = this.config.get<string>("CSRF_COOKIE_NAME") ?? DEFAULT_CSRF_COOKIE;
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
    res.clearCookie(csrfCookieName, { path: "/" });
  }

  private readRefreshToken(req: any) {
    if (!req?.cookies) {
      return null;
    }
    return req.cookies[REFRESH_TOKEN_COOKIE] ?? null;
  }

  private async createRefreshToken(user: any, req: any) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashRefreshToken(token);
    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());
    const userAgent = String(req.headers?.["user-agent"] ?? "").slice(0, 300);
    const ip = String(req.ip ?? req.socket?.remoteAddress ?? "").slice(0, 64);
    const entity = this.refreshRepo.create({
      user,
      tokenHash,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ip || null
    });
    const saved = await this.refreshRepo.save(entity);
    return { token, entity: saved };
  }

  private async revokeAllRefreshTokens(userId: string) {
    await this.refreshRepo
      .createQueryBuilder()
      .update(RefreshTokenEntity)
      .set({ revokedAt: new Date() })
      .where("userId = :userId AND revokedAt IS NULL", { userId })
      .execute();
  }

  private hashRefreshToken(token: string) {
    const secret = this.config.get<string>("JWT_REFRESH_SECRET") ?? "refresh_secret";
    return crypto.createHmac("sha256", secret).update(token, "utf-8").digest("hex");
  }

  private async sendVerifyEmail(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + this.getEmailVerifyTtlMs());
    await this.emailTokenRepo.save(this.emailTokenRepo.create({ user, tokenHash, expiresAt }));
    const appUrl =
      this.config.get<string>("APP_URL") ?? this.config.get<string>("WEB_ORIGIN") ?? "";
    const link = `${appUrl.replace(/\/$/, "")}/verify-email?token=${token}`;
    const text = `您好，欢迎使用 ChronoAtlas。\n\n请点击以下链接完成邮箱验证：\n${link}\n\n链接有效期有限，请尽快完成验证。`;
    await this.mailService.sendTextMail(user.email, "ChronoAtlas 邮箱验证", text);
  }

  private async sendResetPasswordEmail(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + this.getResetPasswordTtlMs());
    await this.resetTokenRepo.save(this.resetTokenRepo.create({ user, tokenHash, expiresAt }));
    const appUrl =
      this.config.get<string>("APP_URL") ?? this.config.get<string>("WEB_ORIGIN") ?? "";
    const link = `${appUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
    const text = `您正在重置 ChronoAtlas 的账号密码。\n\n请点击以下链接设置新密码：\n${link}\n\n如果不是您本人操作，请忽略此邮件。`;
    await this.mailService.sendTextMail(user.email, "ChronoAtlas 重置密码", text);
  }

  private toUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles?.map((role: any) => role.name) ?? [],
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    };
  }
}
