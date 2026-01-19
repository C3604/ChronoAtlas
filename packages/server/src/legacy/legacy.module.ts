import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { LegacyMiddleware } from "./legacy.middleware";

@Module({
  providers: [LegacyMiddleware]
})
export class LegacyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LegacyMiddleware).forRoutes("*");
  }
}
