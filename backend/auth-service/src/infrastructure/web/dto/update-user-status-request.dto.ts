import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateUserStatusRequestDto {
  @ApiProperty({ enum: ['ACTIVE', 'DISABLED', 'LOCKED'] })
  @IsIn(['ACTIVE', 'DISABLED', 'LOCKED'])
  status!: 'ACTIVE' | 'DISABLED' | 'LOCKED';
}