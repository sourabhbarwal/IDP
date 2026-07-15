import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../security/jwt.strategy';
import { CopilotService } from '../../application/copilot.service';
import { GroqClientService } from '../../application/groq-client.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ApiException } from '@idp/common';

@ApiTags('copilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/copilot')
export class CopilotController {
  constructor(
    private readonly copilot: CopilotService,
    private readonly groq: GroqClientService,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message to the AI Copilot' })
  async chat(
    @Body() body: ChatRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatResponseDto> {
    try {
      const response = await this.copilot.chat({
        mode: body.mode,
        message: body.message,
        history: body.history ?? [],
        serviceName: body.serviceName,
        bearerToken: user.rawToken,
      });
      return ChatResponseDto.fromDomain(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw ApiException.badRequest(`AI Copilot error: ${message}`);
    }
  }

  @Get('status')
  @SkipThrottle()
  @ApiOperation({ summary: 'Check if Groq API is configured and reachable' })
  getStatus() {
    return {
      configured: this.groq.isConfigured(),
      message: this.groq.isConfigured()
        ? 'Groq API key is configured. AI Copilot is ready.'
        : 'GROQ_API_KEY is not set. Running in demo mode. Get a free key at console.groq.com',
    };
  }
}