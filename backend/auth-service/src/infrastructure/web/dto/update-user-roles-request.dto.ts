import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, ArrayMinSize } from 'class-validator';

const VALID_ROLES = ['DEVELOPER', 'DEVOPS_ENGINEER', 'PLATFORM_ENGINEER', 'SECURITY_ADMIN', 'ORG_ADMIN'] as const;

export class UpdateUserRolesRequestDto {
  @ApiProperty({
    example: ['DEVELOPER', 'PLATFORM_ENGINEER'],
    enum: VALID_ROLES,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(VALID_ROLES, { each: true })
  roles!: string[];
}