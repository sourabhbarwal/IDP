interface ChecklistItem {
  key:       string;
  label:     string;
  completed: boolean;
  detail:    string | null;
}

interface ServiceHealthPanelProps {
  healthScore:     number;
  healthLevel:     string;
  activeAlerts:    number;
  failureRate:     number;
  onboardingScore: number;
  checklist:       ChecklistItem[];
}

const HEALTH_STYLES: Record<string, { bar: string; badge: string; text: string }> = {
  HEALTHY:  { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',  text: 'text-emerald-600'  },
  DEGRADED: { bar: 'bg-yellow-400',  badge: 'bg-yellow-50 text-yellow-700 border-yellow-200',    text: 'text-yellow-600'   },
  WARNING:  { bar: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700 border-orange-200',    text: 'text-orange-600'   },
  CRITICAL: { bar: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200',              text: 'text-red-600'      },
};

export function ServiceHealthPanel({
  healthScore, healthLevel, activeAlerts, failureRate, onboardingScore, checklist,
}: ServiceHealthPanelProps) {
  const style = HEALTH_STYLES[healthLevel] ?? HEALTH_STYLES['HEALTHY'];

  return (
    <div className="space-y-5">
      {/* Health Score */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Service Health</h3>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${style.badge}`}>
            {healthLevel}
          </span>
        </div>

        {/* Score bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Health Score</span>
            <span className={`font-bold text-sm ${style.text}`}>{healthScore}/100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${style.bar}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Active Alerts</p>
            <p className={`text-xl font-bold ${activeAlerts > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {activeAlerts}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Failure Rate</p>
            <p className={`text-xl font-bold ${failureRate > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
              {failureRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Onboarding Checklist</h3>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-primary-500 transition-all"
                style={{ width: `${onboardingScore}%` }}
              />
            </div>
            <span className="text-xs font-medium text-primary-600">{onboardingScore}%</span>
          </div>
        </div>

        <div className="space-y-2">
          {checklist.map((item) => (
            <div
              key={item.key}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                item.completed ? 'bg-emerald-50' : 'bg-gray-50'
              }`}
            >
              <span className={`text-base mt-0.5 shrink-0 ${
                item.completed ? 'text-emerald-500' : 'text-gray-300'
              }`}>
                {item.completed ? '✅' : '○'}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-medium ${
                  item.completed ? 'text-emerald-700' : 'text-gray-600'
                }`}>
                  {item.label}
                </p>
                {item.detail && (
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed break-all">
                    {item.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}