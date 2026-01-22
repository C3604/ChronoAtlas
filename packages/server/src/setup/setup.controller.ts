import { Body, Controller, Get, Post } from "@nestjs/common";
import { SetupService } from "./setup.service";

@Controller("setup")
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get("status")
  getStatus() {
    return this.setupService.getStatus();
  }

  @Get("checks")
  getChecks() {
    return this.setupService.getChecks();
  }

  @Post("db/test")
  async testDb(@Body() payload: any) {
    return await this.setupService.testDatabaseConnection(payload);
  }

  @Post("config")
  async saveConfig(@Body() payload: any) {
    return await this.setupService.saveConfig(payload);
  }
}
