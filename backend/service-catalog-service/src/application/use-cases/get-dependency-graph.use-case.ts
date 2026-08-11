import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface GraphNode {
  id:     string;
  name:   string;
  type:   string;
  status: string;
}

export interface GraphEdge {
  source:         string;
  target:         string;
  dependencyType: string;
  description:    string | null;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Builds the full platform dependency graph from catalog.service_dependencies.
 * Returns all nodes (services) and edges (dependencies) for the frontend
 * graph renderer.
 */
@Injectable()
export class GetDependencyGraphUseCase {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async execute(focusServiceId?: string): Promise<DependencyGraph> {
    // Get all services (nodes)
    const services = await this.db.query(
      `SELECT id, name, type, status
       FROM catalog.services
       WHERE deleted_at IS NULL
       ORDER BY name`,
    ) as Array<{ id: string; name: string; type: string; status: string }>;

    // Get all dependencies (edges)
    const deps = await this.db.query(
      `SELECT
         sd.service_id    AS source,
         sd.dependency_id AS target,
         sd.dependency_type,
         sd.description
       FROM catalog.service_dependencies sd
       JOIN catalog.services s1 ON s1.id = sd.service_id    AND s1.deleted_at IS NULL
       JOIN catalog.services s2 ON s2.id = sd.dependency_id AND s2.deleted_at IS NULL`,
    ) as Array<{
      source: string; target: string;
      dependency_type: string; description: string | null;
    }>;

    let nodes = services.map((s) => ({
      id:     s.id,
      name:   s.name,
      type:   s.type,
      status: s.status,
    }));

    let edges = deps.map((d) => ({
      source:         d.source,
      target:         d.target,
      dependencyType: d.dependency_type,
      description:    d.description,
    }));

    // If focusServiceId is set, filter to only that service's neighbourhood
    if (focusServiceId) {
      const connectedIds = new Set<string>([focusServiceId]);
      edges.forEach((e) => {
        if (e.source === focusServiceId) connectedIds.add(e.target);
        if (e.target === focusServiceId) connectedIds.add(e.source);
      });

      nodes = nodes.filter((n) => connectedIds.has(n.id));
      edges = edges.filter(
        (e) => connectedIds.has(e.source) && connectedIds.has(e.target),
      );
    }

    return { nodes, edges };
  }
}