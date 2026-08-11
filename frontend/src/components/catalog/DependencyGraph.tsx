import { useRef, useState } from 'react';

interface GraphNode {
  id:     string;
  name:   string;
  type:   string;
  status: string;
}

interface GraphEdge {
  source:         string;
  target:         string;
  dependencyType: string;
  description:    string | null;
}

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  focusId?: string;
}

const TYPE_COLORS: Record<string, string> = {
  NODEJS:      '#3b82f6',
  FASTAPI:     '#10b981',
  GO:          '#06b6d4',
  SPRINGBOOT:  '#f59e0b',
};

const EDGE_COLORS: Record<string, string> = {
  HARD:  '#ef4444',
  SOFT:  '#f59e0b',
  ASYNC: '#8b5cf6',
};

const NODE_W = 140;
const NODE_H = 48;
const PAD    = 80;

/**
 * Pure-SVG dependency graph — no D3 or external library.
 * Uses a simple layered layout: services with no incoming deps on the left,
 * their dependents to the right, etc.
 */
export function DependencyGraph({ nodes, edges, focusId }: DependencyGraphProps) {
  const [selected, setSelected] = useState<string | null>(focusId ?? null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No services registered yet. Register services to see the dependency graph.
      </div>
    );
  }

  // Simple layout: assign columns based on topological sort approximation
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  edges.forEach((e) => inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1));

  const columns: string[][] = [];
  const assigned = new Set<string>();

  // Column 0: nodes with no incoming edges
  const col0 = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  if (col0.length > 0) { columns.push(col0); col0.forEach((id) => assigned.add(id)); }

  // Remaining columns
  let remaining = nodes.filter((n) => !assigned.has(n.id));
  while (remaining.length > 0) {
    const nextCol = remaining.map((n) => n.id).slice(0, Math.max(1, Math.ceil(remaining.length / 2)));
    columns.push(nextCol);
    nextCol.forEach((id) => assigned.add(id));
    remaining = remaining.filter((n) => !assigned.has(n.id));
  }

  // Position nodes
  const positions = new Map<string, { x: number; y: number }>();
  columns.forEach((col, colIdx) => {
    col.forEach((id, rowIdx) => {
      positions.set(id, {
        x: PAD + colIdx * (NODE_W + PAD),
        y: PAD + rowIdx * (NODE_H + PAD),
      });
    });
  });

  const svgW = PAD + columns.length * (NODE_W + PAD);
  const maxRows = Math.max(...columns.map((c) => c.length));
  const svgH = PAD + maxRows * (NODE_H + PAD);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Determine highlighted nodes
  const highlighted = new Set<string>();
  if (selected) {
    highlighted.add(selected);
    edges.forEach((e) => {
      if (e.source === selected) highlighted.add(e.target);
      if (e.target === selected) highlighted.add(e.source);
    });
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="font-medium text-gray-500">Dependency type:</span>
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <svg width="20" height="8">
              <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2"
                strokeDasharray={type === 'ASYNC' ? '4 2' : undefined} />
            </svg>
            <span className="text-gray-600">{type}</span>
          </div>
        ))}
        <span className="text-gray-400 ml-2">Click a node to highlight connections</span>
      </div>

      {/* SVG Graph */}
      <div className="overflow-auto border border-gray-200 rounded-xl bg-gray-50">
        <svg
          ref={svgRef}
          width={svgW}
          height={svgH}
          className="block"
        >
          {/* Edges */}
          {edges.map((edge, i) => {
            const from = positions.get(edge.source);
            const to   = positions.get(edge.target);
            if (!from || !to) return null;

            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            const cx = (x1 + x2) / 2;

            const isHighlighted =
              !selected ||
              (highlighted.has(edge.source) && highlighted.has(edge.target));

            const color = EDGE_COLORS[edge.dependencyType] ?? '#6b7280';

            return (
              <g key={i} opacity={isHighlighted ? 1 : 0.15}>
                <path
                  d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray={edge.dependencyType === 'ASYNC' ? '6 3' : undefined}
                />
                {/* Arrow head */}
                <polygon
                  points={`${x2},${y2} ${x2 - 8},${y2 - 5} ${x2 - 8},${y2 + 5}`}
                  fill={color}
                />
                {/* Tooltip on hover */}
                {edge.description && (
                  <title>{edge.description}</title>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos   = positions.get(node.id);
            if (!pos) return null;

            const isSelected    = selected === node.id;
            const isHighlighted = !selected || highlighted.has(node.id);
            const color         = TYPE_COLORS[node.type] ?? '#6b7280';

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(selected === node.id ? null : node.id)}
                opacity={isHighlighted ? 1 : 0.2}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill="white"
                  stroke={isSelected ? color : '#e5e7eb'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  filter="url(#shadow)"
                />
                {/* Left color bar */}
                <rect
                  x={0} y={0}
                  width={5} height={NODE_H}
                  rx={8}
                  fill={color}
                />
                {/* Service name */}
                <text
                  x={14} y={20}
                  fontSize={11}
                  fontWeight="600"
                  fill="#1f2937"
                  fontFamily="monospace"
                >
                  {node.name.length > 16 ? node.name.slice(0, 15) + '…' : node.name}
                </text>
                {/* Type badge */}
                <text
                  x={14} y={36}
                  fontSize={9}
                  fill="#9ca3af"
                  fontFamily="sans-serif"
                >
                  {node.type} · {node.status}
                </text>
                <title>{node.name}</title>
              </g>
            );
          })}

          {/* Drop shadow filter */}
          <defs>
            <filter id="shadow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.08" />
            </filter>
          </defs>
        </svg>
      </div>

      {/* Selected node details */}
      {selected && nodeById.get(selected) && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm">
          <p className="font-semibold text-gray-900 mb-2">
            {nodeById.get(selected)?.name}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Depends on:</p>
              {edges.filter((e) => e.source === selected).length === 0
                ? <p className="text-xs text-gray-400">No outgoing dependencies</p>
                : edges.filter((e) => e.source === selected).map((e) => (
                  <p key={e.target} className="text-xs text-gray-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: EDGE_COLORS[e.dependencyType] }} />
                    {nodeById.get(e.target)?.name ?? e.target}
                    <span className="text-gray-400">({e.dependencyType})</span>
                  </p>
                ))
              }
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Depended on by:</p>
              {edges.filter((e) => e.target === selected).length === 0
                ? <p className="text-xs text-gray-400">Nothing depends on this service</p>
                : edges.filter((e) => e.target === selected).map((e) => (
                  <p key={e.source} className="text-xs text-gray-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: EDGE_COLORS[e.dependencyType] }} />
                    {nodeById.get(e.source)?.name ?? e.source}
                  </p>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}