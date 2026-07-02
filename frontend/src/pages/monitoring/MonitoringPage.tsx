import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { monitoringService, loggingService, ServiceMetrics, LogLine } from '../../services/monitoring.service';

const STATUS_COLOR = (errorRate: number) =>
  errorRate > 0.05 ? 'text-red-500' : errorRate > 0.01 ? 'text-yellow-500' : 'text-emerald-500';

const LOG_LEVEL_COLOR: Record<string, string> = {
  error: 'text-red-400',
  warn: 'text-yellow-400',
  info: 'text-blue-400',
  debug: 'text-gray-400',
};

export default function MonitoringPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [metrics, setMetrics] = useState<ServiceMetrics[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [selectedService, setSelectedService] = useState('auth-service');
  const [logSearch, setLogSearch] = useState('');
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const services = [
    'auth-service',
    'service-catalog-service',
    'repository-service',
    'template-service',
    'deployment-service',
  ];

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedService]);

  const fetchMetrics = async () => {
    try {
      setMetricsError(null);
      const { data } = await monitoringService.getAllServicesMetrics();
      setMetrics(data);
    } catch {
      setMetricsError('Monitoring service unavailable — start monitoring-service to see live metrics');
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const { data } = await loggingService.getServiceLogs(selectedService, 'dev', 50);
      setLogs(data.lines);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleLogSearch = async () => {
    if (!logSearch.trim()) return fetchLogs();
    setLogsLoading(true);
    try {
      const { data } = await loggingService.searchLogs(logSearch);
      setLogs(data.lines);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

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
        <span className="text-gray-600 font-medium">Monitoring</span>
        <div className="ml-auto text-sm text-gray-400">
          Auto-refreshes every 30s · {user?.email}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Monitoring</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Live metrics from Prometheus · Logs from Loki
            </p>
          </div>
          <div className="flex gap-3">
            <a href="http://localhost:9090" target="_blank" rel="noreferrer"
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              Open Prometheus ↗
            </a>
            <a href="http://localhost:3000" target="_blank" rel="noreferrer"
              className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
              Open Grafana ↗
            </a>
          </div>
        </div>

        {/* Metrics Error Banner */}
        {metricsError && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
            ⚠️ {metricsError}
          </div>
        )}

        {/* Services Metrics Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Health</h2>
          {metricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {services.map((s) => (
                <div key={s} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {services.map((svcName) => {
                const m = metrics.find((x) => x.service === svcName);
                return (
                  <div key={svcName} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-mono text-gray-500 truncate mb-3">{svcName}</p>
                    {m ? (
                      <>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Req/s</span>
                            <span className="font-medium">{m.requestRate.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Error %</span>
                            <span className={`font-medium ${STATUS_COLOR(m.errorRate)}`}>
                              {(m.errorRate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">p95 ms</span>
                            <span className="font-medium">{m.p95LatencyMs.toFixed(0)}</span>
                          </div>
                        </div>
                        <div className={`mt-3 text-xs font-medium ${STATUS_COLOR(m.errorRate)}`}>
                          {m.errorRate > 0.05 ? '● DEGRADED' : m.errorRate > 0.01 ? '● WARNING' : '● HEALTHY'}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">No data</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Logs Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Log Viewer</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Log toolbar */}
            <div className="p-4 border-b border-gray-100 flex gap-3">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {services.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogSearch()}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleLogSearch}
                  className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                >
                  Search
                </button>
                <button
                  onClick={() => { setLogSearch(''); fetchLogs(); }}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Log output */}
            <div className="bg-gray-950 font-mono text-xs h-96 overflow-y-auto p-4 space-y-1">
              {logsLoading ? (
                <p className="text-gray-500">Loading logs...</p>
              ) : logs.length === 0 ? (
                <p className="text-gray-500">
                  No logs found. Make sure Loki and Promtail are running and the service has generated logs.
                </p>
              ) : (
                logs.map((line, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="text-gray-600 shrink-0 w-44">
                      {new Date(line.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`shrink-0 w-12 uppercase ${LOG_LEVEL_COLOR[line.level ?? 'info'] ?? 'text-gray-400'}`}>
                      {line.level ?? 'info'}
                    </span>
                    <span className="text-gray-300 break-all">{line.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Grafana links */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Grafana Dashboards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: 'Services Overview', desc: 'Request rate, error rate, latency for all services', path: '/d/idp-services-overview' },
              { title: 'Pod Resources', desc: 'CPU and memory usage per pod', path: '/d/idp-pod-resources' },
              { title: 'Log Explorer', desc: 'Full-text log search via Loki', path: '/explore' },
            ].map((dash) => (
              
                key={dash.title}
                href={`http://localhost:3000${dash.path}`}
                target="_blank"
                rel="noreferrer"
                className="block p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <p className="font-medium text-gray-900">{dash.title}</p>
                <p className="text-gray-500 text-sm mt-0.5">{dash.desc}</p>
                <p className="text-orange-500 text-xs mt-2">Open in Grafana ↗</p>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}