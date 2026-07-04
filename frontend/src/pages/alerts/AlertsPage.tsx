import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { alertService, AlertEvent, AlertRule } from '../../services/alert.service';

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const [activeAlerts, setActiveAlerts] = useState<AlertEvent[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRule, setNewRule] = useState<{
    name: string;
    promqlExpression: string;
    severity: 'critical' | 'warning' | 'info';
    forDuration: string;
    description: string;
  }>({
    name: '',
    promqlExpression: '',
    severity: 'warning',
    forDuration: '5m',
    description: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setError(null);
      const [alertsRes, rulesRes] = await Promise.allSettled([
        alertService.getActiveAlerts(),
        alertService.listRules(),
      ]);

      if (alertsRes.status === 'fulfilled') setActiveAlerts(alertsRes.value.data);
      if (rulesRes.status === 'fulfilled') setRules(rulesRes.value.data.content);
    } catch {
      setError('Alert service unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    setAcknowledging(id);
    try {
      await alertService.acknowledge(id);
      setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silently fail — refetch will fix state
    } finally {
      setAcknowledging(null);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.promqlExpression) return;
    setCreating(true);
    try {
      const { data } = await alertService.createRule(newRule);
      setRules((prev) => [data, ...prev]);
      setShowCreateForm(false);
      setNewRule({
        name: '',
        promqlExpression: '',
        severity: 'warning',
        forDuration: '5m',
        description: '',
      });
    } catch {
      // show error inline
    } finally {
      setCreating(false);
    }
  };

  const firingCritical = activeAlerts.filter(
    (a) => a.severity === 'critical' && a.status === 'firing',
  ).length;
  const firingWarning = activeAlerts.filter((a) => a.severity === 'warning' && a.status === 'firing')
    .length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">IDP Platform</span>
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-medium">Alerts</span>
        <div className="ml-auto flex items-center gap-3">
          {firingCritical > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium animate-pulse">
              {firingCritical} Critical
            </span>
          )}
          {firingWarning > 0 && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full font-medium">
              {firingWarning} Warning
            </span>
          )}
          <span className="text-sm text-gray-400">{user?.email}</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Active alerts and notification rules · Auto-refreshes every 30s
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
            ⚠️ {error} — start alert-service (port 3008) to see live alerts
          </div>
        )}

        {/* Active Alerts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Alerts
              {activeAlerts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-sm rounded-full">
                  {activeAlerts.length}
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 animate-pulse">
              Loading alerts...
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-500 font-medium">No active alerts</p>
              <p className="text-gray-400 text-sm mt-1">All systems operating normally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl border p-4 flex items-start justify-between gap-4 ${
                    SEVERITY_COLOR[alert.severity] ?? 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        SEVERITY_DOT[alert.severity] ?? 'bg-gray-400'
                      } ${alert.status === 'firing' ? 'animate-pulse' : ''}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{alert.alertName}</span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded font-medium border ${
                            SEVERITY_COLOR[alert.severity]
                          }`}
                        >
                          {alert.severity}
                        </span>
                        {alert.acknowledgedBy && (
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                            acknowledged
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        {alert.namespace && <span>📍 {alert.namespace}</span>}
                        <span>⏱ {formatDuration(alert.durationMs)} ago</span>
                        <span>🕐 {new Date(alert.startsAt).toLocaleTimeString()}</span>
                      </div>
                      {Object.keys(alert.annotations).length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          {alert.annotations['summary'] ??
                            alert.annotations['description'] ??
                            ''}
                        </p>
                      )}
                    </div>
                  </div>
                  {!alert.acknowledgedBy && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledging === alert.id}
                      className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white/50 disabled:opacity-50 shrink-0"
                    >
                      {acknowledging === alert.id ? 'ACKing...' : 'Acknowledge'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alert Rules */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Alert Rules ({rules.length})</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
            >
              {showCreateForm ? 'Cancel' : '+ New Rule'}
            </button>
          </div>

          {/* Create Rule Form */}
          {showCreateForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
              <h3 className="font-semibold text-gray-900 mb-4">Create Alert Rule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="HighErrorRate"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    value={newRule.severity}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        severity: e.target.value as 'critical' | 'warning' | 'info',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PromQL Expression *
                  </label>
                  <input
                    value={newRule.promqlExpression}
                    onChange={(e) => setNewRule({ ...newRule, promqlExpression: e.target.value })}
                    placeholder='sum(rate(http_requests_total{status=~"5.."}[5m])) > 0.05'
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">For Duration</label>
                  <input
                    value={newRule.forDuration}
                    onChange={(e) => setNewRule({ ...newRule, forDuration: e.target.value })}
                    placeholder="5m"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="What does this rule detect?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCreateRule}
                  disabled={creating || !newRule.name || !newRule.promqlExpression}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm rounded-lg"
                >
                  {creating ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </div>
          )}

          {/* Rules list */}
          {rules.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">
                No alert rules defined. Create your first rule above.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Rule Name', 'Expression', 'Severity', 'Duration', 'Status', 'Created'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{rule.name}</p>
                        {rule.description && (
                          <p className="text-gray-400 text-xs">{rule.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 block max-w-xs truncate">
                          {rule.promqlExpression}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded border font-medium ${SEVERITY_COLOR[rule.severity]}`}>
                          {rule.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {rule.forDuration}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            rule.enabled
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(rule.createdAt).toLocaleDateString()}
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
