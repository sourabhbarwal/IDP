import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as k8s from '@kubernetes/client-node';
import {
  BlueGreenSwitchParams,
  CanaryParams,
  DeployRollingParams,
  DeploymentHealth,
  KubernetesClient,
} from '../../application/ports/kubernetes-client.port';

/**
 * Production implementation of KubernetesClient using @kubernetes/client-node.
 * Connects to kind locally (via KUBECONFIG) or in-cluster when deployed.
 */
@Injectable()
export class K8sClientAdapter implements KubernetesClient, OnModuleInit {
  private readonly logger = new Logger(K8sClientAdapter.name);
  private kc!: k8s.KubeConfig;
  private appsApi!: k8s.AppsV1Api;
  private coreApi!: k8s.CoreV1Api;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.kc = new k8s.KubeConfig();

    const kubeconfigPath = this.config.get<string>('kubeconfigPath');
    if (kubeconfigPath) {
      this.kc.loadFromFile(kubeconfigPath);
    } else if (process.env.KUBERNETES_SERVICE_HOST) {
      // Running inside a pod — use in-cluster service account
      this.kc.loadFromCluster();
    } else {
      // Fall back to default ~/.kube/config (what kind writes to)
      this.kc.loadFromDefault();
    }

    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  async ensureNamespace(namespace: string): Promise<void> {
    try {
      await this.coreApi.readNamespace({ name: namespace });
    } catch {
      this.logger.log(`Creating namespace ${namespace}`);
      await this.coreApi.createNamespace({
        body: {
          metadata: {
            name: namespace,
            labels: { 'managed-by': 'idp-platform' },
          },
        },
      });
    }
  }

  async applyRollingDeployment(params: DeployRollingParams): Promise<void> {
    const deploymentSpec = this.buildDeploymentManifest(
      params.deploymentName,
      params.image,
      params.replicas,
      params.containerPort,
      { app: params.deploymentName },
    );

    await this.upsertDeployment(params.namespace, params.deploymentName, deploymentSpec);
    await this.upsertService(params.namespace, params.deploymentName, params.containerPort, {
      app: params.deploymentName,
    });
  }

  async applyBlueGreenDeployment(
    params: DeployRollingParams & { color: 'blue' | 'green' },
  ): Promise<void> {
    const coloredName = `${params.deploymentName}-${params.color}`;
    const deploymentSpec = this.buildDeploymentManifest(
      coloredName,
      params.image,
      params.replicas,
      params.containerPort,
      { app: params.deploymentName, color: params.color },
    );

    await this.upsertDeployment(params.namespace, coloredName, deploymentSpec);

    // Ensure the Service exists, initially pointing at whichever color is live.
    // If the Service doesn't exist yet, default to this color being active.
    try {
      await this.coreApi.readNamespacedService({ name: params.deploymentName, namespace: params.namespace });
    } catch {
      await this.upsertService(params.namespace, params.deploymentName, params.containerPort, {
        app: params.deploymentName,
        color: params.color,
      });
    }
  }

  async switchServiceSelector(params: BlueGreenSwitchParams): Promise<void> {
    const service = await this.coreApi.readNamespacedService({
      name: params.serviceName,
      namespace: params.namespace,
    });

    service.spec = service.spec ?? {};
    service.spec.selector = { app: params.serviceName, color: params.activeColorLabel };

    await this.coreApi.replaceNamespacedService({
      name: params.serviceName,
      namespace: params.namespace,
      body: service,
    });

    this.logger.log(
      `Switched Service ${params.serviceName} in ${params.namespace} to color=${params.activeColorLabel}`,
    );
  }

  async applyCanaryDeployment(params: CanaryParams): Promise<void> {
    const canaryName = `${params.deploymentName}-canary`;
    const deploymentSpec = this.buildDeploymentManifest(
      canaryName,
      params.image,
      params.canaryReplicas,
      params.containerPort,
      { app: params.deploymentName, track: 'canary' },
    );

    await this.upsertDeployment(params.namespace, canaryName, deploymentSpec);

    // Service selects on `app` only (not `track`), so it load-balances
    // across both stable and canary pods automatically.
  }

  async promoteCanary(namespace: string, deploymentName: string): Promise<void> {
    const canaryName = `${deploymentName}-canary`;
    const canary = await this.appsApi.readNamespacedDeployment({
      name: canaryName,
      namespace,
    });

    const image = canary.spec?.template?.spec?.containers?.[0]?.image;
    const replicas = canary.spec?.replicas ?? 1;

    if (!image) {
      throw new Error(`Canary deployment ${canaryName} has no container image to promote`);
    }

    // Update stable deployment with the canary's image, then remove canary
    await this.appsApi.patchNamespacedDeployment(
      {
        name: deploymentName,
        namespace,
        body: {
          spec: {
            replicas,
            template: { spec: { containers: [{ name: deploymentName, image }] } },
          },
        },
      },
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } },
    );

    await this.removeCanary(namespace, deploymentName);
  }

  async removeCanary(namespace: string, deploymentName: string): Promise<void> {
    const canaryName = `${deploymentName}-canary`;
    try {
      await this.appsApi.deleteNamespacedDeployment({ name: canaryName, namespace });
    } catch (err) {
      this.logger.warn(`Canary ${canaryName} already removed or not found: ${err}`);
    }
  }

  async getDeploymentHealth(namespace: string, deploymentName: string): Promise<DeploymentHealth> {
    try {
      const deployment = await this.appsApi.readNamespacedDeployment({
        name: deploymentName,
        namespace,
      });

      const desired = deployment.spec?.replicas ?? 0;
      const ready = deployment.status?.readyReplicas ?? 0;

      return {
        desiredReplicas: desired,
        readyReplicas: ready,
        isHealthy: desired > 0 && ready === desired,
      };
    } catch {
      return { desiredReplicas: 0, readyReplicas: 0, isHealthy: false };
    }
  }

  async rollbackDeployment(namespace: string, deploymentName: string, previousImage: string): Promise<void> {
    await this.appsApi.patchNamespacedDeployment(
      {
        name: deploymentName,
        namespace,
        body: {
          spec: {
            template: { spec: { containers: [{ name: deploymentName, image: previousImage }] } },
          },
        },
      },
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } },
    );
  }

  async scaleDeployment(namespace: string, deploymentName: string, replicas: number): Promise<void> {
    await this.appsApi.patchNamespacedDeployment(
      { name: deploymentName, namespace, body: { spec: { replicas } } },
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } },
    );
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private buildDeploymentManifest(
    name: string,
    image: string,
    replicas: number,
    containerPort: number,
    labels: Record<string, string>,
  ): k8s.V1Deployment {
    return {
      metadata: { name, labels },
      spec: {
        replicas,
        selector: { matchLabels: labels },
        template: {
          metadata: { labels },
          spec: {
            securityContext: { runAsNonRoot: true, runAsUser: 1000 },
            containers: [
              {
                name,
                image,
                ports: [{ containerPort }],
                resources: {
                  requests: { cpu: '100m', memory: '128Mi' },
                  limits: { cpu: '500m', memory: '512Mi' },
                },
                livenessProbe: {
                  httpGet: { path: '/health', port: containerPort as unknown as object },
                  initialDelaySeconds: 15,
                },
                readinessProbe: {
                  httpGet: { path: '/health/ready', port: containerPort as unknown as object },
                  initialDelaySeconds: 5,
                },
              },
            ],
          },
        },
      },
    };
  }

  private async upsertDeployment(
    namespace: string,
    name: string,
    spec: k8s.V1Deployment,
  ): Promise<void> {
    try {
      await this.appsApi.readNamespacedDeployment({ name, namespace });
      await this.appsApi.replaceNamespacedDeployment({ name, namespace, body: spec });
      this.logger.log(`Updated Deployment ${name} in ${namespace}`);
    } catch {
      await this.appsApi.createNamespacedDeployment({ namespace, body: spec });
      this.logger.log(`Created Deployment ${name} in ${namespace}`);
    }
  }

  private async upsertService(
    namespace: string,
    name: string,
    containerPort: number,
    selector: Record<string, string>,
  ): Promise<void> {
    const serviceSpec: k8s.V1Service = {
      metadata: { name },
      spec: {
        selector,
        ports: [{ port: 80, targetPort: containerPort as unknown as object }],
        type: 'ClusterIP',
      },
    };

    try {
      await this.coreApi.readNamespacedService({ name, namespace });
      await this.coreApi.replaceNamespacedService({ name, namespace, body: serviceSpec });
    } catch {
      await this.coreApi.createNamespacedService({ namespace, body: serviceSpec });
    }
  }
}