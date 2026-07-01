import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PromoteDeploymentRequestDto {
  @ApiPropertyOptional({ default: 3000 })
  @IsOptional() @IsInt() @Min(1024) @Max(65535)
  containerPort?: number;
}