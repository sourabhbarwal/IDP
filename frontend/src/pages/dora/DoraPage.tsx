import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doraService, DoraResponse, DoraLevel, DoraTrend } from '../../services/dora.service';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<DoraLevel, {
  badge: string; glow: string; icon: string; label: string;
}> = {
  ELITE:  { badge: 'bg-violet-100 text-violet-700 border-violet-300', glow: 'shadow-violet-100', icon: '🏆', label: 'Elite' },
  HIGH:   { badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', glow: 'shadow-emerald-100', icon: '✅', label: 'High' },
  MEDIUM: { badge: 'bg-yellow-100 text-yellow-700 border-yellow-300', glow: 'shadow-yellow-100', icon: '⚡', label: 'Medium' },
  LOW:    { badge: 'bg-red-100 text-red-700 border-red-300', glow: 'shadow-red-100', icon: '⚠️', label: 'Low' },
};

const METRIC_ICONS: Record<string, string> = {
  deploymentFrequency: '🚀',
  leadTime:            '⏱',
  changeFailureRate:   '💥',
  mttr:                '🔧',
};

const METRIC_LABELS: Record<string, string> = {
  deploymentFrequency: 'Deployment Frequency',
  leadTime:            'Lead Time for Changes',
  changeFailureRate:   'Change Failure Rate',
  mttr:                'Mean Time to Recovery',
};

const METRIC_HELP: Record<string, string> = {
  deploymentFrequency: 'How often you successfully deploy to production. Higher is better.',
  leadTime:            'Average time from deployment start to completion. Lower is better.',
  changeFailureRate:   'Percentage of deployments that fail or are rolled back. Lower is better.',
  mttr:                'Average time from alert fired to acknowledged/resolved. Lower is better.',
};

// ── Bar Chart (pure CSS, no library) ─────────────────────────────────────────

function TrendBar({ day, deployments, failures, maxValue }: {
  day: string; deployments: number; failures: number; maxValue: number;
}) {
  const total    = deployments + failures;
  const pctGood  = maxValue > 0 ? (deployments / maxValue) * 100 : 0;
  const pctBad   = maxValue > 0 ? (failures    / maxValue) * 100 : 0;
  const shortDay = day.slice(5); // MM-DD

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      {/* Bar */}
      <div className="w-full flex flex-col justify-end h-24 gap-px">
        {pctBad > 0 && (
          <div
            className="w-full bg-red-400 rounded-sm"
            style={{ height: `${pctBad}%` }}
            title={`${failures} failed`}
          />
        )}
        {pctGood > 0 && (
          <div
            className="w-full bg-primary-500 rounded-sm"
            style={{ height: `${pctGood}%` }}
            title={`${deployments} succeeded`}
          />
        )}
        {total === 0 && (
          <div className="w-full bg-gray-100 rounded-sm h-1" />
        )}
      </div>
      {/* Label */}
      <span className="text-xs text-gray-400 truncate w-full text-center">{shortDay}</span>
    </div>
  );
}

function TrendChart({ trend }: { trend: DoraTrend[] }) {
  if (trend.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
        No deployment data in selected window
      </div>
    );
  }

  const maxValue = Math.max(...trend.map((d) => d.deployments + d.failures), 1);

  // Show last 30 days max — if more, sample to keep chart readable
  const display = trend.length <= 30
    ? trend
    : trend.slice(-30);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-0.5 h-28">
        {display.map((d) => (
          <TrendBar
            key={d.date}
            day={d.date}
            deployments={d.deployments}
            failures={d.failures}
            maxValue={maxValue}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 justify-end">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-primary-500 rounded-sm" />
          <span className="text-xs text-gray-500">Succeeded</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-400 rounded-sm" />
          <span className="text-xs text-gray-500">Failed</span>
        </div>
      </div>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ metricKey, metric }: {
  metricKey: string;
  metric: DoraResponse['metrics']['deploymentFrequency'];
}) {
  const levelStyle = LEVEL_STYLES[metric.level];
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-sm ${levelStyle.glow}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{METRIC_ICONS[metricKey]}</span>
          <span className="text-sm font-semibold text-gray-700">
            {METRIC_LABELS[metricKey]}
          </span>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-gray-300 hover:text-gray-500 text-xs"
          title="What is this metric?"
        >
          ?
        </button>
      </div>

      {showHelp && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed bg-gray-50 rounded-lg p-2">
          {METRIC_HELP[metricKey]}
        </p>
      )}

      {/* Value */}
      <div className="mb-3">
        <span className="text-3xl font-bold text-gray-900">{metric.value}</span>
        <span className="text-sm text-gray-400 ml-1">{metric.unit}</span>
      </div>

      {/* Level badge */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${levelStyle.badge}`}>
        {levelStyle.icon} {levelStyle.label}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 mt-2 leading-relaxed">{metric.description}</p>

      {/* Extra stats */}
      {metric.total !== undefined && metric.total > 0 && (
        <p className="text-xs text-gray-400 mt-1">{metric.total} total deployments</p>
      )}
      {metric.totalFailed !== undefined && metric.totalFailed > 0 && (
        <p className="text-xs text-red-400 mt-1">{metric.totalFailed} failed deployments</p>
      )}
      {metric.totalIncidents !== undefined && metric.totalIncidents > 0 && (
        <p className="text-xs text-gray-400 mt-1">{metric.totalIncidents} incidents resolved</p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DoraPage() {
  const [data, setData]       = useState<DoraResponse | null>(null);
  const [window, setWindow]   = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [window]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await doraService.getMetrics(window);
      setData(res);
    } catch {
      setError('DORA service unavailable — start dora-service (port 3014) to see metrics');
    } finally {
      setLoading(false);
    }
  };

  const overallStyle = data ? LEVEL_STYLES[data.overall.level] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">IDP Platform</span>
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-medium">DORA Metrics</span>

        {/* Window selector */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">Window:</span>
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setWindow(d)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                window === d
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DORA Metrics</h1>
            <p className="text-gray-500 text-sm mt-1">
              Google's 4 key DevOps Research metrics ·{' '}
              {data
                ? `${data.window.startDate} → ${data.window.endDate}`
                : `Last ${window} days`}
            </p>
          </div>

          {/* Overall level badge */}
          {data && overallStyle && (
            <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2
                             ${overallStyle.badge} shadow-lg ${overallStyle.glow}`}>
              <span className="text-2xl">{overallStyle.icon}</span>
              <div>
                <p className="text-xs font-medium opacity-70">Overall Performance</p>
                <p className="text-lg font-bold">{overallStyle.label} Performer</p>
              </div>
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* 4 metric cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-8 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-5 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {(Object.keys(data.metrics) as Array<keyof typeof data.metrics>).map((key) => (
              <MetricCard
                key={key}
                metricKey={key}
                metric={data.metrics[key]}
              />
            ))}
          </div>
        ) : null}

        {/* Overall description */}
        {data && (
          <div className={`p-4 rounded-xl border ${LEVEL_STYLES[data.overall.level].badge}`}>
            <p className="text-sm font-medium">{data.overall.description}</p>
          </div>
        )}

        {/* Deployment frequency trend chart */}
        {data && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Deployment Frequency Trend
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Daily deployment count over the last {window} days
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {data.metrics.deploymentFrequency.value}
                </p>
                <p className="text-xs text-gray-400">deploys/day avg</p>
              </div>
            </div>
            <TrendChart trend={data.trend} />
          </div>
        )}

        {/* DORA benchmark reference */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            DORA Benchmark Reference
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Level', 'Deploy Freq', 'Lead Time', 'Change Failure Rate', 'MTTR'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    level: 'ELITE' as DoraLevel,
                    freq: '>1/day', lead: '<1 hour', cfr: '<5%', mttr: '<1 hour',
                  },
                  {
                    level: 'HIGH' as DoraLevel,
                    freq: '1/week – 1/day', lead: '<1 day', cfr: '<10%', mttr: '<1 day',
                  },
                  {
                    level: 'MEDIUM' as DoraLevel,
                    freq: '1/month – 1/week', lead: '<1 week', cfr: '<15%', mttr: '<1 week',
                  },
                  {
                    level: 'LOW' as DoraLevel,
                    freq: '<1/month', lead: '>1 week', cfr: '>15%', mttr: '>1 week',
                  },
                ].map((row) => {
                  const style      = LEVEL_STYLES[row.level];
                  const isCurrent  = data?.overall.level === row.level;
                  return (
                    <tr key={row.level}
                      className={`border-b border-gray-50 ${isCurrent ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${style.badge}`}>
                            {style.icon} {style.label}
                          </span>
                          {isCurrent && (
                            <span className="text-xs text-primary-600 font-medium">← You are here</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.freq}</td>
                      <td className="px-4 py-3 text-gray-600">{row.lead}</td>
                      <td className="px-4 py-3 text-gray-600">{row.cfr}</td>
                      <td className="px-4 py-3 text-gray-600">{row.mttr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Source: Google's State of DevOps Report 2023. Elite performers deploy 973× more
            frequently and recover from incidents 6,570× faster than low performers.
          </p>
        </div>

      </main>
    </div>
  );
}