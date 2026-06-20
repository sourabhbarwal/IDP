export interface ServiceVersionProps {
  id: string;
  serviceId: string;
  version: string;
  changelog: string | null;
  deployedAt: Date | null;
  environment: string | null;
  createdAt: Date;
  createdBy: string;
}

export class ServiceVersion {
  readonly id!: string;
  readonly serviceId!: string;
  readonly version!: string;
  readonly changelog!: string | null;
  readonly deployedAt!: Date | null;
  readonly environment!: string | null;
  readonly createdAt!: Date;
  readonly createdBy!: string;

  constructor(props: ServiceVersionProps) {
    Object.assign(this, props);
  }
}