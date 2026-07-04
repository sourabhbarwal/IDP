import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { CostAnalysisService } from '../../application/cost-analysis.service';

@ApiTags('cost')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/cost')
export class CostController {
  constructor(private readonly costService: CostAnalysisService) {}

  @Get('services')
  @ApiOperation({ summary: 'Get cost analysis for all platform services' })
  async getAllServiceCosts() {
    return this.costService.getAllServiceCosts();
  }

  @Get('services/:serviceName')
  @ApiOperation({ summary: 'Get cost analysis for a specific service' })
  async getServiceCost(@Param('serviceName') serviceName: string) {
    const namespace = `dev-${serviceName}`;
    return this.costService.getServiceCost(serviceName, namespace);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Platform-wide cost totals, idle and oversized services' })
  async getSummary() {
    return this.costService.getPlatformTotals();
  }
}