import { Body, Controller, Get, Put, UseGuards, BadRequestException } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { RoleName } from "../common/roles.enum";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UpdateSmtpSettingsDto } from "./dto/update-smtp-settings.dto";
import { SmtpSettingsService } from "./smtp-settings.service";

@Controller("settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.SUPER_ADMIN)
export class SettingsController {
  constructor(private readonly smtpSettings: SmtpSettingsService) {}

  @Get("smtp")
  async getSmtpSettings() {
    const settings = await this.smtpSettings.getSettings();
    return { settings: this.toResponse(settings) };
  }

  @Put("smtp")
  async updateSmtpSettings(@Body() dto: UpdateSmtpSettingsDto) {
    const current = await this.smtpSettings.getSettings();
    const enabled = dto.enabled ?? current?.enabled ?? false;
    const host = (dto.host ?? current?.host ?? "").trim();
    const port = dto.port ?? current?.port ?? 587;

    if (enabled && !host) {
      throw new BadRequestException({ code: "SETTINGS_001", message: "启用 SMTP 时必须填写服务器地址" });
    }
    if (enabled && (!Number.isInteger(port) || port <= 0)) {
      throw new BadRequestException({ code: "SETTINGS_002", message: "启用 SMTP 时必须填写端口" });
    }

    const saved = await this.smtpSettings.upsertSettings(dto);
    return { settings: this.toResponse(saved) };
  }

  private toResponse(settings: any) {
    if (!settings) {
      return {
        enabled: false,
        host: "",
        port: 587,
        secure: false,
        username: "",
        fromAddress: "",
        hasPassword: false,
        updatedAt: null
      };
    }
    return {
      enabled: settings.enabled,
      host: settings.host ?? "",
      port: settings.port ?? 587,
      secure: settings.secure ?? false,
      username: settings.username ?? "",
      fromAddress: settings.fromAddress ?? "",
      hasPassword: Boolean(settings.password),
      updatedAt: settings.updatedAt ?? null
    };
  }
}
