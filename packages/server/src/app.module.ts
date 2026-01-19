import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { MailerModule } from "@nestjs-modules/mailer";
import fs from "fs";
import path from "path";
import { envValidationSchema } from "./config/env.validation";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { LegacyModule } from "./legacy/legacy.module";
import { MailModule } from "./mail/mail.module";
import { SettingsModule } from "./settings/settings.module";

const resolveEnvPath = () => {
  const cwd = process.cwd();
  const direct = path.resolve(cwd, ".env");
  if (fs.existsSync(direct)) {
    return direct;
  }
  const parent = path.resolve(cwd, "..", ".env");
  if (fs.existsSync(parent)) {
    return parent;
  }
  const grandParent = path.resolve(cwd, "..", "..", ".env");
  if (fs.existsSync(grandParent)) {
    return grandParent;
  }
  return undefined;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvPath(),
      validationSchema: envValidationSchema
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const ttl = Number(config.get("RATE_LIMIT_TTL") ?? 60);
        const limit = Number(config.get("RATE_LIMIT_LIMIT") ?? 30);
        return {
          throttlers: [{ ttl, limit }]
        };
      }
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const sslEnabled = String(config.get("PG_SSL") ?? "false").toLowerCase() === "true";
        return {
          type: "postgres",
          host: config.get("PG_HOST"),
          port: Number(config.get("PG_PORT")),
          username: config.get("PG_USER"),
          password: config.get("PG_PASSWORD"),
          database: config.get("PG_DATABASE"),
          schema: config.get("PG_SCHEMA") ?? "public",
          ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
          synchronize: false,
          autoLoadEntities: true
        };
      }
    }),
    MailerModule.forRoot({
      transport: {
        streamTransport: true,
        newline: "windows",
        buffer: true
      },
      defaults: { from: "no-reply@chronoatlas.local" },
      preview: false
    }),
    SettingsModule,
    MailModule,
    AuthModule,
    UsersModule,
    LegacyModule
  ]
})
export class AppModule {}
