import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { readRuntimeConfig } from "../config/app-config";
import { SetupModule } from "./setup.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      ignoreEnvVars: true,
      load: [() => readRuntimeConfig()]
    }),
    SetupModule
  ]
})
export class SetupAppModule {}
