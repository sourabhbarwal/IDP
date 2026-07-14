// import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import * as k8s from '@kubernetes/client-node';
// import {
//   BlueGreenSwitchParams,
//   CanaryParams,
//   DeployRollingParams,
//   DeploymentHealth,
//   KubernetesClient,
// } from '../../application/ports/kubernetes-client.port';

// /**
//  * Production implementation of KubernetesClient using @kubernetes/client-node v1.x.
//  * Connects to kind locally (via KUBECONFIG) or in-cluster when deployed.
//  *
//  * MIGRATION NOTE (v0.22 -> v1.x):
//  * - All calls now take a single typed request object instead of positional
//  *   arguments, e.g. readNamespacedService({ name, namespace }) instead of
//  *   readNamespacedService(name, namespace).
//  * - Responses are returned directly (no more `{ body }` wrapper).
//  * - Patch calls: the content-type header handling below (PATCH_OPTIONS) is
//  *   a best-effort reconstruction based on v1.x using `fetch` internally.
//  *   VERIFY this against the actual generated type before relying on it —
//  *   hover/Go-to-Definition on `patchNamespacedDeployment` in your editor
//  *   and confirm the second-argument shape and default content-type used.
//  *   If patches silently fail or return 415/422 against the real cluster,
//  *   this is the first place to look.
//  */

// // VERIFY: confirm this is still how v1.x expects patch content-type to be set.
// const PATCH_OPTIONS = {
//   headers: { 'Content-Type': 'application/strategic-merge-patch+json' },
// };

// @Injectable()
// export class K8sClientAdapter implements KubernetesClient, OnModuleInit {
//   private readonly logger = new Logger(K8sClientAdapter.name);
//   private kc!: k8s.KubeConfig;
//   private appsApi!: k8s.AppsV1Api;
//   private coreApi!: k8s.CoreV1Api;

//   constructor(private readonly config: ConfigService) {}

//   onModuleInit(): void {
//     this.kc = new k8s.KubeConfig();

//     const kubeconfigPath = this.config.get<string>('kubeconfigPath');
//     if (kubeconfigPath) {
//       this.kc.loadFromFile(kubeconfigPath);
//     } else if (process.env.KUBERNETES_SERVICE_HOST) {
//       this.kc.loadFromCluster();
//     } else {
//       this.kc.loadFromDefault();
//     }

//     this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
//     this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
//   }

//   async ensureNamespace(namespace: string): Promise<void> {
//     try {
//       await this.coreApi.readNamespace({ name: namespace });
//     } catch {
//       this.logger.log(`Creating namespace ${namespace}`);
//       await this.coreApi.createNamespace({
//         body: {
//           metadata: { name: namespace, labels: { 'managed-by': 'idp-platform' } },
//         },
//       });
//     }
//   }

//   async applyRollingDeployment(params: DeployRollingParams): Promise<void> {
//     const deploymentSpec = this.buildDeploymentManifest(
//       params.deploymentName,
//       params.image,
//       params.replicas,
//       params.containerPort,
//       { app: params.deploymentName },
//     );

//     await this.upsertDeployment(params.namespace, params.deploymentName, deploymentSpec);
//     await this.upsertService(params.namespace, params.deploymentName, params.containerPort, {
//       app: params.deploymentName,
//     });
//   }

//   async applyBlueGreenDeployment(
//     params: DeployRollingParams & { color: 'blue' | 'green' },
//   ): Promise<void> {
//     const coloredName = `${params.deploymentName}-${params.color}`;
//     const deploymentSpec = this.buildDeploymentManifest(
//       coloredName,
//       params.image,
//       params.replicas,
//       params.containerPort,
//       { app: params.deploymentName, color: params.color },
//     );

//     await this.upsertDeployment(params.namespace, coloredName, deploymentSpec);

//     try {
//       await this.coreApi.readNamespacedService({
//         name: params.deploymentName,
//         namespace: params.namespace,
//       });
//     } catch {
//       await this.upsertService(params.namespace, params.deploymentName, params.containerPort, {
//         app: params.deploymentName,
//         color: params.color,
//       });
//     }
//   }

//   async switchServiceSelector(params: BlueGreenSwitchParams): Promise<void> {
//     const service = await this.coreApi.readNamespacedService({
//       name: params.serviceName,
//       namespace: params.namespace,
//     });

//     service.spec = service.spec ?? {};
//     service.spec.selector = { app: params.serviceName, color: params.activeColorLabel };

//     await this.coreApi.replaceNamespacedService({
//       name: params.serviceName,
//       namespace: params.namespace,
//       body: service,
//     });

//     this.logger.log(
//       `Switched Service ${params.serviceName} in ${params.namespace} to color=${params.activeColorLabel}`,
//     );
//   }

//   async applyCanaryDeployment(params: CanaryParams): Promise<void> {
//     const canaryName = `${params.deploymentName}-canary`;
//     const deploymentSpec = this.buildDeploymentManifest(
//       canaryName,
//       params.image,
//       params.canaryReplicas,
//       params.containerPort,
//       { app: params.deploymentName, track: 'canary' },
//     );

//     await this.upsertDeployment(params.namespace, canaryName, deploymentSpec);
//   }

//   async promoteCanary(namespace: string, deploymentName: string): Promise<void> {
//     const canaryName = `${deploymentName}-canary`;
//     const canary = await this.appsApi.readNamespacedDeployment({
//       name: canaryName,
//       namespace,
//     });

//     const image = canary.spec?.template?.spec?.containers?.[0]?.image;
//     const replicas = canary.spec?.replicas ?? 1;

//     if (!image) {
//       throw new Error(`Canary deployment ${canaryName} has no container image to promote`);
//     }

//     // VERIFY: see PATCH_OPTIONS note at top of file.
//     await this.appsApi.patchNamespacedDeployment(
//       {
//         name: deploymentName,
//         namespace,
//         body: {
//           spec: {
//             replicas,
//             template: { spec: { containers: [{ name: deploymentName, image }] } },
//           },
//         },
//       },
//       PATCH_OPTIONS,
//     );

//     await this.removeCanary(namespace, deploymentName);
//   }

//   async removeCanary(namespace: string, deploymentName: string): Promise<void> {
//     const canaryName = `${deploymentName}-canary`;
//     try {
//       await this.appsApi.deleteNamespacedDeployment({ name: canaryName, namespace });
//     } catch (err) {
//       this.logger.warn(`Canary ${canaryName} already removed or not found: ${err}`);
//     }
//   }

//   async getDeploymentHealth(namespace: string, deploymentName: string): Promise<DeploymentHealth> {
//     try {
//       const deployment = await this.appsApi.readNamespacedDeployment({
//         name: deploymentName,
//         namespace,
//       });

//       const desired = deployment.spec?.replicas ?? 0;
//       const ready = deployment.status?.readyReplicas ?? 0;

//       return {
//         desiredReplicas: desired,
//         readyReplicas: ready,
//         isHealthy: desired > 0 && ready === desired,
//       };
//     } catch {
//       return { desiredReplicas: 0, readyReplicas: 0, isHealthy: false };
//     }
//   }

//   async rollbackDeployment(namespace: string, deploymentName: string, previousImage: string): Promise<void> {
//     // VERIFY: see PATCH_OPTIONS note at top of file.
//     await this.appsApi.patchNamespacedDeployment(
//       {
//         name: deploymentName,
//         namespace,
//         body: {
//           spec: {
//             template: { spec: { containers: [{ name: deploymentName, image: previousImage }] } },
//           },
//         },
//       },
//       PATCH_OPTIONS,
//     );
//   }

//   async scaleDeployment(namespace: string, deploymentName: string, replicas: number): Promise<void> {
//     // VERIFY: see PATCH_OPTIONS note at top of file.
//     await this.appsApi.patchNamespacedDeployment(
//       {
//         name: deploymentName,
//         namespace,
//         body: { spec: { replicas } },
//       },
//       PATCH_OPTIONS,
//     );
//   }

//   // ── Private helpers ─────────────────────────────────────────────────────────

//   private buildDeploymentManifest(
//     name: string,
//     image: string,
//     replicas: number,
//     containerPort: number,
//     labels: Record<string, string>,
//   ): k8s.V1Deployment {
//     return {
//       metadata: { name, labels },
//       spec: {
//         replicas,
//         selector: { matchLabels: labels },
//         template: {
//           metadata: { labels },
//           spec: {
//             securityContext: { runAsNonRoot: true, runAsUser: 1000 },
//             containers: [
//               {
//                 name,
//                 image,
//                 ports: [{ containerPort }],
//                 resources: {
//                   requests: { cpu: '100m', memory: '128Mi' },
//                   limits: { cpu: '500m', memory: '512Mi' },
//                 },
//                 livenessProbe: {
//                   httpGet: { path: '/health', port: containerPort },
//                   initialDelaySeconds: 15,
//                 },
//                 readinessProbe: {
//                   httpGet: { path: '/health/ready', port: containerPort },
//                   initialDelaySeconds: 5,
//                 },
//               },
//             ],
//           },
//         },
//       },
//     };
//   }

//   private async upsertDeployment(
//     namespace: string,
//     name: string,
//     spec: k8s.V1Deployment,
//   ): Promise<void> {
//     try {
//       await this.appsApi.readNamespacedDeployment({ name, namespace });
//       await this.appsApi.replaceNamespacedDeployment({ name, namespace, body: spec });
//       this.logger.log(`Updated Deployment ${name} in ${namespace}`);
//     } catch {
//       await this.appsApi.createNamespacedDeployment({ namespace, body: spec });
//       this.logger.log(`Created Deployment ${name} in ${namespace}`);
//     }
//   }

//   private async upsertService(
//     namespace: string,
//     name: string,
//     containerPort: number,
//     selector: Record<string, string>,
//   ): Promise<void> {
//     const serviceSpec: k8s.V1Service = {
//       metadata: { name },
//       spec: {
//         selector,
//         ports: [{ port: 80, targetPort: containerPort }],
//         type: 'ClusterIP',
//       },
//     };

//     try {
//       await this.coreApi.readNamespacedService({ name, namespace });
//       await this.coreApi.replaceNamespacedService({ name, namespace, body: serviceSpec });
//     } catch {
//       await this.coreApi.createNamespacedService({ namespace, body: serviceSpec });
//     }
//   }
// }

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
 * Production implementation of KubernetesClient using @kubernetes/client-node v1.x.
 * Connects to kind locally (via KUBECONFIG) or in-cluster when deployed.
 *
 * MIGRATION NOTE (v0.22 -> v1.x):
 * - All calls now take a single typed request object instead of positional
 *   arguments, e.g. readNamespacedService({ name, namespace }) instead of
 *   readNamespacedService(name, namespace).
 * - Responses are returned directly (no more `{ body }` wrapper).
 * - Patch calls: confirmed via ObjectParamAPI.d.ts that
 *   AppsV1ApiPatchNamespacedDeploymentRequest has no contentType field, and
 *   the optional second argument is `ConfigurationOptions` (a client-level
 *   config override), not a headers bag. The generated client sets the
 *   strategic-merge-patch content-type internally for patch* calls — do not
 *   pass a second argument for this. STILL VERIFY against kind: run
 *   scaleDeployment() against a real deployment and confirm it returns 200,
 *   not 415/422, before trusting this in production.
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
      this.kc.loadFromCluster();
    } else {
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
          metadata: { name: namespace, labels: { 'managed-by': 'idp-platform' } },
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

    try {
      await this.coreApi.readNamespacedService({
        name: params.deploymentName,
        namespace: params.namespace,
      });
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

    await this.appsApi.patchNamespacedDeployment({
      name: deploymentName,
      namespace,
      body: {
        spec: {
          replicas,
          template: { spec: { containers: [{ name: deploymentName, image }] } },
        },
      },
    });

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
    await this.appsApi.patchNamespacedDeployment({
      name: deploymentName,
      namespace,
      body: {
        spec: {
          template: { spec: { containers: [{ name: deploymentName, image: previousImage }] } },
        },
      },
    });
  }

  async scaleDeployment(namespace: string, deploymentName: string, replicas: number): Promise<void> {
    await this.appsApi.patchNamespacedDeployment({
      name: deploymentName,
      namespace,
      body: { spec: { replicas } },
    });
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
                  httpGet: { path: '/health', port: containerPort },
                  initialDelaySeconds: 15,
                },
                readinessProbe: {
                  httpGet: { path: '/health/ready', port: containerPort },
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
        ports: [{ port: 80, targetPort: containerPort }],
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