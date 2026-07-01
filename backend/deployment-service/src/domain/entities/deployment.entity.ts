import { DeploymentStrategy } from '../enums/deployment-strategy.enum';
import { DeploymentStatus } from '../enums/deployment-status.enum';
import { EnvironmentName } from '../enums/environment-name.enum';

export interface DeploymentProps {
  id: string;
  serviceId: string;
  serviceName: string;
  environment: EnvironmentName;
  namespace: string;
  imageTag: string;
  strategy: DeploymentStrategy;
  status: DeploymentStatus;
  previousImageTag: string | null;
  replicas: number;
  canaryWeight: number | null;
  errorMessage: string | null;
  triggeredBy: string;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

/**
 * Deployment domain entity — a single deploy/rollback/promote action
 * against one environment. The aggregate root for the deployment-service
 * bounded context.
 */
export class Deployment {
  readonly id: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly environment: EnvironmentName;
  readonly namespace: string;
  readonly imageTag: string;
  readonly strategy: DeploymentStrategy;
  readonly status: DeploymentStatus;
  readonly previousImageTag: string | null;
  readonly replicas: number;
  readonly canaryWeight: number | null;
  readonly errorMessage: string | null;
  readonly triggeredBy: string;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly createdAt: Date;

  constructor(props: DeploymentProps) {
    this.id = props.id;
    this.serviceId = props.serviceId;
    this.serviceName = props.serviceName;
    this.environment = props.environment;
    this.namespace = props.namespace;
    this.imageTag = props.imageTag;
    this.strategy = props.strategy;
    this.status = props.status;
    this.previousImageTag = props.previousImageTag;
    this.replicas = props.replicas;
    this.canaryWeight = props.canaryWeight;
    this.errorMessage = props.errorMessage;
    this.triggeredBy = props.triggeredBy;
    this.startedAt = props.startedAt;
    this.completedAt = props.completedAt;
    this.createdAt = props.createdAt;
  }

  isTerminal(): boolean {
    return [
      DeploymentStatus.SUCCEEDED,
      DeploymentStatus.FAILED,
      DeploymentStatus.ROLLED_BACK,
    ].includes(this.status);
  }

  canRollback(): boolean {
    return this.status === DeploymentStatus.SUCCEEDED && this.previousImageTag !== null;
  }

  durationMs(): number | null {
    if (!this.completedAt) return null;
    return this.completedAt.getTime() - this.startedAt.getTime();
  }
}