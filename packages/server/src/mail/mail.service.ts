import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailerService } from "@nestjs-modules/mailer";
import fs from "fs";
import path from "path";
import { SmtpSettingsService } from "../settings/smtp-settings.service";

const SMTP_TRANSPORTER = "smtp_dynamic";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private lastTransportKey = "";

  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
    private readonly smtpSettings: SmtpSettingsService
  ) {}

  async sendTextMail(to: string, subject: string, text: string) {
    const outputMode = this.config.get<string>("MAIL_DEV_OUTPUT") ?? "log";
    const outDir = this.config.get<string>("MAIL_DEV_DIR") ?? "mail_outbox";
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    const settings = await this.smtpSettings.getActiveSettings();
    const hasTransport = Boolean(settings);

    if (!isProd && outputMode !== "off") {
      if (outputMode === "file") {
        fs.mkdirSync(outDir, { recursive: true });
        const safeSubject = subject.replace(/[^a-zA-Z0-9-_]+/g, "_");
        const fileName = `${Date.now()}_${safeSubject}.txt`;
        const filePath = path.join(outDir, fileName);
        fs.writeFileSync(filePath, `To: ${to}\nSubject: ${subject}\n\n${text}`, "utf-8");
        this.logger.log(`邮件已写入本地文件：${filePath}`);
      } else {
        this.logger.log(`开发模式邮件：to=${to} subject=${subject}\n${text}`);
      }
      if (!hasTransport) {
        return;
      }
    }

    if (!hasTransport) {
      this.logger.warn("未配置 SMTP，邮件未发送");
      return;
    }

    this.ensureTransporter(settings!);
    await this.mailer.sendMail({
      to,
      subject,
      text,
      from: settings?.fromAddress || "no-reply@chronoatlas.local",
      transporterName: SMTP_TRANSPORTER
    });
  }

  private ensureTransporter(
    settings: NonNullable<Awaited<ReturnType<SmtpSettingsService["getActiveSettings"]>>>
  ) {
    const auth = settings.username && settings.password
      ? { user: settings.username, pass: settings.password }
      : undefined;
    const key = [
      settings.host,
      settings.port,
      settings.secure ? "1" : "0",
      settings.username ?? "",
      settings.password ?? ""
    ].join("|");

    if (key === this.lastTransportKey) {
      return;
    }

    this.mailer.addTransporter(SMTP_TRANSPORTER, {
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth
    });
    this.lastTransportKey = key;
  }
}
