import { DependencyType } from '../enums/dependency-type.enum';

export interface ServiceDependencyProps {
  id:             string;
  serviceId:      string;
  serviceName:    string;
  dependencyId:   string;
  dependencyName: string;
  dependencyType: DependencyType;
  description:    string | null;
  createdAt:      Date;
}

export class ServiceDependency {
  readonly id:             string;
  readonly serviceId:      string;
  readonly serviceName:    string;
  readonly dependencyId:   string;
  readonly dependencyName: string;
  readonly dependencyType: DependencyType;
  readonly description:    string | null;
  readonly createdAt:      Date;

  constructor(props: ServiceDependencyProps) {
    this.id             = props.id;
    this.serviceId      = props.serviceId;
    this.serviceName    = props.serviceName;
    this.dependencyId   = props.dependencyId;
    this.dependencyName = props.dependencyName;
    this.dependencyType = props.dependencyType;
    this.description    = props.description;
    this.createdAt      = props.createdAt;
  }

  isHard():  boolean { return this.dependencyType === DependencyType.HARD; }
  isSoft():  boolean { return this.dependencyType === DependencyType.SOFT; }
  isAsync(): boolean { return this.dependencyType === DependencyType.ASYNC; }
}