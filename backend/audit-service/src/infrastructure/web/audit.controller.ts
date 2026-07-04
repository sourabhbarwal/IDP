import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { AuditQueryService } from '../../application/audit-query.service';
import { buildPageResponse } from '@idp/common';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditQuery: AuditQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Query unified audit trail across all services' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'result', required: false, enum: ['SUCCESS', 'FAILURE'] })
  @ApiQuery({ name: 'schema', required: false, description: 'auth|catalog|repository|deployment|alert' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  async query(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('result') result?: 'SUCCESS' | 'FAILURE',
    @Query('schema') schema?: string,
    @Query('page') page = 0,
    @Query('size') size = 50,
  ) {
    const { items, total } = await this.auditQuery.query({
      userId, action, resourceType, result,
      sourceSchema: schema,
      page: Number(page),
      size: Math.min(Number(size), 200),
    });

    return buildPageResponse(
      items.map((e) => ({
        id: e.id,
        userId: e.userId,
        action: e.action,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        result: e.result,
        ipAddress: e.ipAddress,
        metadata: e.metadata,
        sourceSchema: e.sourceSchema,
        createdAt: e.createdAt.toISOString(),
      })),
      Number(page),
      Math.min(Number(size), 200),
      total,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get action counts grouped by service schema' })
  async summary() {
    return this.auditQuery.getActionSummary();
  }
}