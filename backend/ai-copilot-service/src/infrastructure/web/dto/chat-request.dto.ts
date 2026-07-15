import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CopilotMode } from '../../../domain/enums/copilot-mode.enum';

export class HistoryMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsEnum(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class ChatRequestDto {
  @ApiProperty({ enum: CopilotMode, default: CopilotMode.CHAT })
  @IsEnum(CopilotMode)
  mode!: CopilotMode;

  @ApiProperty({ example: 'Why is my auth-service showing high error rates?' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ type: [HistoryMessageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryMessageDto)
  history?: HistoryMessageDto[];

  @ApiPropertyOptional({ example: 'auth-service', description: 'Required for DEPLOYMENT mode' })
  @IsOptional()
  @IsString()
  serviceName?: string;
}