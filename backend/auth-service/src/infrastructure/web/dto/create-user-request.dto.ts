import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray, IsEmail, IsIn, IsString,
  MinLength, ArrayMinSize, ArrayMaxSize,
} from 'class-validator';

const VALID_ROLES = ['DEVELOPER', 'DEVOPS_ENGINEER', 'PLATFORM_ENGINEER', 'SECURITY_ADMIN', 'ORG_ADMIN'] as const;

export class CreateUserRequestDto {
  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'TempPass123!',
    description: 'Temporary password — user should change on first login',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName!: string;

  @ApiProperty({
    example: ['DEVELOPER'],
    description: 'One or more roles to assign',
    enum: VALID_ROLES,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(VALID_ROLES, { each: true })
  roles!: string[];
}