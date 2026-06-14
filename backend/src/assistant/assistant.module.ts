import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ResultsModule } from "../results/results.module";
import { AssistantController } from "./assistant.controller";
import { AssistantService } from "./assistant.service";
import { LlmService } from "./llm.service";

@Module({
  imports: [AuthModule, ResultsModule],
  controllers: [AssistantController],
  providers: [AssistantService, LlmService],
})
export class AssistantModule {}
