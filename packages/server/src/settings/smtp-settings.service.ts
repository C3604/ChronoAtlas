import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SmtpSettingEntity } from "./entities/smtp-setting.entity";
import { UpdateSmtpSettingsDto } from "./dto/update-smtp-settings.dto";

@Injectable()
export class SmtpSettingsService {
  private readonly primaryId = 1;

  constructor(
    @InjectRepository(SmtpSettingEntity)
    private readonly smtpRepo: Repository<SmtpSettingEntity>
  ) {}

  async getSettings(): Promise<SmtpSettingEntity | null> {
    return await this.smtpRepo.findOne({ where: { id: this.primaryId } });
  }

  async getActiveSettings(): Promise<SmtpSettingEntity | null> {
    const settings = await this.getSettings();
    if (!settings || !settings.enabled) {
      return null;
    }
    if (!settings.host || !settings.port) {
      return null;
    }
    return settings;
  }

  async upsertSettings(dto: UpdateSmtpSettingsDto): Promise<SmtpSettingEntity> {
    const current = await this.getSettings();
    const next =
      current ??
      this.smtpRepo.create({
        id: this.primaryId,
        enabled: false,
        host: "",
        port: 587,
        secure: false
      });

    if (dto.enabled !== undefined) {
      next.enabled = dto.enabled;
    }
    if (dto.host !== undefined) {
      next.host = dto.host.trim();
    }
    if (dto.port !== undefined) {
      next.port = dto.port;
    }
    if (dto.secure !== undefined) {
      next.secure = dto.secure;
    }
    if (dto.username !== undefined) {
      const value = dto.username.trim();
      next.username = value ? value : null;
    }
    if (dto.password !== undefined) {
      const value = dto.password.trim();
      next.password = value ? value : null;
    }
    if (dto.fromAddress !== undefined) {
      const value = dto.fromAddress.trim();
      next.fromAddress = value ? value : null;
    }

    return await this.smtpRepo.save(next);
  }
}
