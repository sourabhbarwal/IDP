import { ApiProperty } from '@nestjs/swagger';
import { CopilotResponse } from '../../../domain/entities/copilot-response.entity';

export class ChatResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() mode!: string;
  @ApiProperty() content!: string;
  @ApiProperty() contextUsed!: string[];
  @ApiProperty() tokensUsed!: number;
  @ApiProperty() modelUsed!: string;
  @ApiProperty() durationMs!: number;
  @ApiProperty() createdAt!: string;

  static fromDomain(r: CopilotResponse): ChatResponseDto {
    const dto = new ChatResponseDto();
    dto.id = r.id;
    dto.mode = r.mode;
    dto.content = r.content;
    dto.contextUsed = r.contextUsed;
    dto.tokensUsed = r.tokensUsed;
    dto.modelUsed = r.modelUsed;
    dto.durationMs = r.durationMs;
    dto.createdAt = r.createdAt.toISOString();
    return dto;
  }
}