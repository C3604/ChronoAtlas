import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { AuthUser } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @UseGuards(ThrottlerGuard)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  async login(@Req() req: any, @Res({ passthrough: true }) res: Response, @Body() _dto: LoginDto) {
    const user = req.user;
    return this.authService.login(user.id, res, req);
  }

  @Post("logout")
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res, req);
  }

  @Post("refresh")
  @UseGuards(ThrottlerGuard)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(res, req);
  }

  @Post("verify-email")
  @UseGuards(ThrottlerGuard)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post("forgot-password")
  @UseGuards(ThrottlerGuard)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @UseGuards(ThrottlerGuard)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req: { user: AuthUser }, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: { user: AuthUser }, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto.displayName);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: { user: AuthUser }) {
    return this.authService.getMe(req.user.id);
  }
}
