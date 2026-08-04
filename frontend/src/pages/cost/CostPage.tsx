import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { costService, auditService, ServiceCost, PlatformTotals, AuditEntry } from '../../services/cost.service';
import { useRealtime } from '../../context/RealtimeContext';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';

const STATUS_STYLES: Record<string, { badge: string; icon: string }> = {
  OPTIMAL:    { badge: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  OVERSIZED:  { badge: 'bg-orange-100 text-orange-700',   icon: '📦' },
  UNDERSIZED: { badge: 'bg-blue-100 text-blue-700',       icon: '⚡' },
  IDLE:       { badge: 'bg-gray-100 text-gray-500',        icon: '💤' },
};

const SCHEMA_COLOR: Record<string, string> = {
  auth:       'bg-purple-100 text-purple-700',
  catalog:    'bg-blue-100 text-blue-700',
  repository: 'bg-green-100 text-green-700',
  deployment: 'bg-yellow-100 text-yellow-700',
  alert:      'bg-red-100 text-red-700',
};

function CostBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CostPage() {
  const [costs, setCosts] = useState<ServiceCost[]>([]);
  const [totals, setTotals] = useState<PlatformTotals | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState({ action: '', result: '', schema: '' });
  const { connected, notifications, unreadCount, markAllRead, markRead } = useRealtime();
  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchAudit(); }, [auditFilter]);

  const fetchAll = async () => {
    try {
      setError(null);
      const [costsRes, totalsRes] = await Promise.allSettled([
        costService.getAllServiceCosts(),
        costService.getPlatformTotals(),
      ]);
      if (costsRes.status === 'fulfilled') setCosts(costsRes.value.data);
      if (totalsRes.status === 'fulfilled') setTotals(totalsRes.value.data);
    } catch {
      setError('Cost service unavailable');
    } finally {
      setLoading(false);
    }
  };

  const fetchAudit = async () => {
    try {
      const params: Record<string, string | number> = { page: 0, size: 30 };
      if (auditFilter.action) params['action'] = auditFilter.action;
      if (auditFilter.result) params['result'] = auditFilter.result;
      if (auditFilter.schema) params['schema'] = auditFilter.schema;
      const { data } = await auditService.query(params);
      setAuditEntries(data.content);
      setAuditTotal(data.totalElements);
    } catch {
      setAuditEntries([]);
    }
  };

  const maxMonthlyCost = Math.max(...costs.map((c) => c.estimatedMonthlyCostUsd), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          </div>
          <span className="font-semibold text-gray-900">IDP Platform</span>
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-medium">Cost & Audit</span>
        <div className="ml-auto">
          <NotificationCenter
            connected={connected}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
            onMarkRead={markRead}
          />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-8">

        {error && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
            ⚠️ {error} — start cost-service (port 3011) to see cost analytics
          </div>
        )}

        {/* Summary cards */}
        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Est. Monthly Cost',
                value: `$${totals.totalMonthlyCostUsd.toFixed(2)}`,
                sub: 'All services combined',
                color: 'text-gray-900',
              },
              {
                label: 'Potential Savings',
                value: `$${totals.potentialSavingsUsd.toFixed(2)}`,
                sub: 'If rightsized',
                color: 'text-emerald-600',
              },
              {
                label: 'Idle Services',
                value: String(totals.idleServices.length),
                sub: totals.idleServices.join(', ') || 'None',
                color: totals.idleServices.length > 0 ? 'text-gray-500' : 'text-emerald-600',
              },
              {
                label: 'Oversized Services',
                value: String(totals.oversizedServices.length),
                sub: totals.oversizedServices.join(', ') || 'None',
                color: totals.oversizedServices.length > 0 ? 'text-orange-600' : 'text-emerald-600',
              },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-400 mt-1 truncate">{card.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Per-service cost table */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Per-Service Cost Analysis</h2>
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 animate-pulse">
              Querying Prometheus metrics...
            </div>
          ) : costs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-400">No cost data. Start cost-service and ensure Prometheus is running.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Service', 'CPU (cores)', 'Memory (MB)', 'Req/min', '$/hour', '$/month', 'Status', 'Recommendation'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {costs.map((c) => {
                    const styles = STATUS_STYLES[c.rightsizingStatus] ?? STATUS_STYLES['OPTIMAL'];
                    return (
                      <tr key={c.serviceName} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 font-mono text-xs">{c.serviceName}</p>
                          <p className="text-gray-400 text-xs">{c.namespace}</p>
                        </td>
                        <td className="px-4 py-3 w-24">
                          <span className="text-gray-700 font-mono text-xs">{c.usage.cpuCores.toFixed(3)}</span>
                          <CostBar value={c.usage.cpuCores} max={1} />
                        </td>
                        <td className="px-4 py-3 w-28">
                          <span className="text-gray-700 font-mono text-xs">{Math.round(c.usage.memoryMb)}</span>
                          <CostBar value={c.usage.memoryMb} max={512} />
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {c.usage.requestsPerMin.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          ${c.estimatedHourlyCostUsd.toFixed(4)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900">${c.estimatedMonthlyCostUsd.toFixed(2)}</span>
                          <CostBar value={c.estimatedMonthlyCostUsd} max={maxMonthlyCost} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${styles.badge}`}>
                            {styles.icon} {c.rightsizingStatus}
                          </span>
                          {c.wastagePercent > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">{c.wastagePercent}% waste</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                          {c.recommendations[0]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
              <p className="text-sm text-gray-500 mt-0.5">{auditTotal} total events across all services</p>
            </div>
          </div>

          {/* Audit filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3">
            <input
              placeholder="Filter by action..."
              value={auditFilter.action}
              onChange={(e) => setAuditFilter({ ...auditFilter, action: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={auditFilter.result}
              onChange={(e) => setAuditFilter({ ...auditFilter, result: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Results</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
            </select>
            <select
              value={auditFilter.schema}
              onChange={(e) => setAuditFilter({ ...auditFilter, schema: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Services</option>
              {['auth', 'catalog', 'repository', 'deployment', 'alert'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {auditEntries.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No audit events found. Start audit-service (port 3010) to view the trail.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Action', 'Resource', 'Result', 'Service', 'User', 'Time'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{entry.action}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <span className="text-gray-500">{entry.resourceType}</span>
                        {entry.resourceId && (
                          <span className="text-gray-400 ml-1 font-mono text-xs">
                            {entry.resourceId.slice(0, 8)}…
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${entry.result === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {entry.result}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${SCHEMA_COLOR[entry.sourceSchema] ?? 'bg-gray-100 text-gray-600'}`}>
                          {entry.sourceSchema}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {entry.userId ? entry.userId.slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}