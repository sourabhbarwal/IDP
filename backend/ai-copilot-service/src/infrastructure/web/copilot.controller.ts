import {
  Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
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

  // ── Non-streaming (backward compat) ───────────────────────────────────────

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message — returns complete response (non-streaming)' })
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

  // ── Streaming via SSE ──────────────────────────────────────────────────────

  /**
   * POST /api/v1/copilot/chat/stream
   *
   * Returns a Server-Sent Events stream. Each event is a JSON object:
   *
   * Context event (first):
   *   data: {"type":"context","contextUsed":["alert-service","monitoring-service"]}
   *
   * Delta events (one per token chunk):
   *   data: {"type":"delta","content":"Hello"}
   *   data: {"type":"delta","content":" world"}
   *
   * Done event (final):
   *   data: {"type":"done","tokensUsed":128,"model":"llama3-70b-8192","durationMs":2341}
   *
   * Error event:
   *   data: {"type":"error","error":"Groq API error 429: rate limit exceeded"}
   *
   * Note: We use @Sse() with a custom POST route. NestJS @Sse() is normally
   * GET-only, so we handle the SSE headers manually on a POST endpoint.
   */
  @Post('chat/stream')
  @ApiOperation({ summary: 'Send a message — returns SSE stream of token chunks' })
  async chatStream(
    @Body() body: ChatRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    // Set SSE headers manually (since @Sse() is GET-only in NestJS)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders();

    const sendEvent = (data: object): void => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    try {
      const stream$ = this.copilot.streamChat({
        mode: body.mode,
        message: body.message,
        history: body.history ?? [],
        serviceName: body.serviceName,
        bearerToken: user.rawToken,
      });

      await new Promise<void>((resolve, reject) => {
        const subscription = stream$.subscribe({
          next: (chunk) => {
            if (chunk.contextUsed !== undefined && chunk.content === '') {
              // Context event — send which data sources were queried
              sendEvent({ type: 'context', contextUsed: chunk.contextUsed });
            } else {
              sendEvent(chunk);
            }
          },
          error: (err) => {
            sendEvent({
              type: 'error',
              error: err instanceof Error ? err.message : String(err),
            });
            res.end();
            reject(err);
          },
          complete: () => {
            res.end();
            resolve();
          },
        });

        // Clean up if client disconnects
        res.on('close', () => {
          subscription.unsubscribe();
          resolve();
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!res.writableEnded) {
        sendEvent({ type: 'error', error: message });
        res.end();
      }
    }
  }

  // ── Status ────────────────────────────────────────────────────────────────

  @Get('status')
  @SkipThrottle()
  @ApiOperation({ summary: 'Check Groq API configuration status' })
  getStatus() {
    return {
      configured: this.groq.isConfigured(),
      streaming: true,
      message: this.groq.isConfigured()
        ? 'Groq API key configured. Streaming AI Copilot ready.'
        : 'GROQ_API_KEY not set. Running in demo mode. Get a free key at console.groq.com',
    };
  }
}