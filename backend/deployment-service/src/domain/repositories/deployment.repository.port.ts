import { Deployment } from '../entities/deployment.entity';
import { DeploymentStatus } from '../enums/deployment-status.enum';
import { DeploymentStrategy } from '../enums/deployment-strategy.enum';
import { EnvironmentName } from '../enums/environment-name.enum';

export const DEPLOYMENT_REPOSITORY = 'DEPLOYMENT_REPOSITORY';

export interface ListDeploymentsFilter {
  serviceId?: string;
  environment?: EnvironmentName;
  page: number;
  size: number;
}

export interface DeploymentRepository {
  findById(id: string): Promise<Deployment | null>;
  findLastSuccessful(serviceId: string, environment: EnvironmentName): Promise<Deployment | null>;
  findLatestForServiceEnv(serviceId: string, environment: EnvironmentName): Promise<Deployment | null>;
  list(filter: ListDeploymentsFilter): Promise<{ items: Deployment[]; total: number }>;
  create(params: {
    serviceId: string;
    serviceName: string;
    environment: EnvironmentName;
    namespace: string;
    imageTag: string;
    strategy: DeploymentStrategy;
    previousImageTag: string | null;
    replicas: number;
    canaryWeight: number | null;
    triggeredBy: string;
  }): Promise<Deployment>;
  updateStatus(
    id: string,
    status: DeploymentStatus,
    errorMessage?: string,
  ): Promise<void>;
}