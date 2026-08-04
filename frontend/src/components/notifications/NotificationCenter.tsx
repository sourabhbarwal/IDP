import { useState } from 'react';
import { RealtimeNotification } from '../../hooks/useRealtimeNotifications';

const SEVERITY_STYLES = {
  critical: 'bg-red-500',
  warning:  'bg-yellow-500',
  info:     'bg-blue-400',
};

const TYPE_ICONS: Record<string, string> = {
  'alert:fired':           '🚨',
  'alert:resolved':        '✅',
  'alert:acknowledged':    '👍',
  'deployment:started':    '🚀',
  'deployment:succeeded':  '✅',
  'deployment:failed':     '❌',
  'deployment:rolled_back':'↩️',
};

function timeAgo(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const diffS  = Math.floor(diffMs / 1000);
  if (diffS < 60)  return `${diffS}s ago`;
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60)  return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  return `${diffH}h ago`;
}

interface NotificationCenterProps {
  connected:     boolean;
  notifications: RealtimeNotification[];
  unreadCount:   number;
  onMarkAllRead: () => void;
  onMarkRead:    (id: string) => void;
}

export function NotificationCenter({
  connected, notifications, unreadCount, onMarkAllRead, onMarkRead,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open && unreadCount > 0) onMarkAllRead(); }}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title={connected ? 'Live notifications' : 'Notifications (disconnected)'}
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500
                           rounded-full text-white text-xs flex items-center
                           justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        <span className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full
          ${connected ? 'bg-emerald-400' : 'bg-gray-300'}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl
                          border border-gray-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3
                            border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full
                  text-xs font-medium
                  ${connected
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-50 text-gray-400'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full
                    ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                  {connected ? 'Live' : 'Offline'}
                </span>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-96">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-3xl mb-2">🔔</div>
                  <p className="text-gray-400 text-sm">No notifications yet</p>
                  <p className="text-gray-300 text-xs mt-1">
                    {connected
                      ? 'Listening for alerts and deployments...'
                      : 'Connect to see live notifications'}
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onMarkRead(n.id)}
                    className={`px-4 py-3 border-b border-gray-50 cursor-pointer
                                hover:bg-gray-50 transition-colors
                                ${!n.read ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0
                        ${SEVERITY_STYLES[n.severity]}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                            {TYPE_ICONS[n.type] ?? '📌'}
                            <span className="font-mono text-xs text-gray-600">{n.type}</span>
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">
                            {timeAgo(n.timestamp)}
                          </span>
                        </div>

                        {n.serviceName && (
                          <p className="text-xs text-gray-500 mt-0.5">{n.serviceName}</p>
                        )}

                        {Boolean(n.payload['summary']) && (
                          <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                            {String(n.payload['summary'])}
                          </p>
                        )}

                        {Boolean(n.payload['alertName']) && !n.payload['summary'] && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            {String(n.payload['alertName'])}
                          </p>
                        )}
                      </div>

                      {!n.read && (
                        <div className="w-1.5 h-1.5 bg-primary-500 rounded-full shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400 text-center">
                  Last {notifications.length} notifications · stored in memory
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}