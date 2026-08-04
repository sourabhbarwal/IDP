import { createContext, useContext, ReactNode } from 'react';
import { useRealtimeNotifications, UseRealtimeOptions } from '../hooks/useRealtimeNotifications';

type RealtimeContextValue = ReturnType<typeof useRealtimeNotifications>;

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Mounts the WebSocket connection ONLY while an authenticated user is
 * inside this provider (i.e. inside ProtectedRoute). Connection opens
 * on mount, closes on unmount (e.g. on logout / route leave).
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const value = useRealtimeNotifications({
    onCritical: (n) => {
      if (Notification.permission === 'granted') {
        new Notification(`🚨 ${n.payload['alertName'] ?? 'Critical Alert'}`, {
          body: String(n.payload['summary'] ?? 'A critical alert has fired'),
          icon: '/favicon.ico',
        });
      }
    },
  } satisfies UseRealtimeOptions);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

/** Access the shared realtime connection/notifications from any page nav. */
export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within RealtimeProvider (inside ProtectedRoute)');
  }
  return ctx;
}