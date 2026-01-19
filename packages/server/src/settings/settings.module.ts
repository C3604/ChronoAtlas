import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SmtpSettingEntity } from "./entities/smtp-setting.entity";
import { SettingsController } from "./settings.controller";
import { SmtpSettingsService } from "./smtp-settings.service";

@Module({
  imports: [TypeOrmModule.forFeature([SmtpSettingEntity])],
  controllers: [SettingsController],
  providers: [SmtpSettingsService],
  exports: [SmtpSettingsService]
})
export class SettingsModule {}
