import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { LocalStrategy } from "./strategies/local.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshTokenEntity } from "./entities/refresh-token.entity";
import { EmailVerificationTokenEntity } from "./entities/email-verification-token.entity";
import { PasswordResetTokenEntity } from "./entities/password-reset-token.entity";
import { UsersModule } from "../users/users.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    UsersModule,
    MailModule,
    TypeOrmModule.forFeature([
      RefreshTokenEntity,
      EmailVerificationTokenEntity,
      PasswordResetTokenEntity
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: config.get<string>("JWT_EXPIRES_IN") ?? "15m",
          issuer: config.get<string>("JWT_ISSUER") ?? "chronoatlas",
          audience: config.get<string>("JWT_AUDIENCE") ?? "chronoatlas-web"
        }
      })
    })
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}
