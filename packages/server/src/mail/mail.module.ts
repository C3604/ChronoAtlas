import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { SettingsModule } from "../settings/settings.module";
import { MailService } from "./mail.service";

@Module({
  imports: [MailerModule, SettingsModule],
  providers: [MailService],
  exports: [MailService]
})
export class MailModule {}
