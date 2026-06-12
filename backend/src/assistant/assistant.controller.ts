import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { AskAssistantDto } from "./dto/ask-assistant.dto";
import { AssistantAskResponse } from "./interfaces/assistant.interface";
import { AssistantService } from "./assistant.service";

@Controller("assistant")
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post("ask")
  async ask(
    @Body() dto: AskAssistantDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AssistantAskResponse> {
    return this.assistantService.ask(dto, user);
  }
}
