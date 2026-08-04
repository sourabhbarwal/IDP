import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const REALTIME_URL =
  import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}`
    : 'http://localhost:3013';

export interface RealtimeNotification {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  serviceName?: string;
  payload: Record<string, unknown>;
  timestamp: string;
  read: boolean;
}

export interface UseRealtimeOptions {
  onAlert?:      (n: RealtimeNotification) => void;
  onDeployment?: (n: RealtimeNotification) => void;
  onCritical?:   (n: RealtimeNotification) => void;
}

export function useRealtimeNotifications(options: UseRealtimeOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected]       = useState(false);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount]   = useState(0);

  const addNotification = useCallback((raw: Record<string, unknown>) => {
    const notification: RealtimeNotification = {
      id:          (raw['id'] as string) ?? crypto.randomUUID(),
      type:        raw['type'] as string,
      severity:    (raw['severity'] as 'info' | 'warning' | 'critical') ?? 'info',
      serviceName: raw['serviceName'] as string | undefined,
      payload:     (raw['payload'] as Record<string, unknown>) ?? {},
      timestamp:   (raw['timestamp'] as string) ?? new Date().toISOString(),
      read:        false,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);
    return notification;
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(REALTIME_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Realtime] Connected');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('[Realtime] Disconnected');
    });

    socket.on('system:connected', (data: Record<string, unknown>) => {
      console.log('[Realtime] Authenticated:', data['email']);
    });

    const alertEvents = ['alert:fired', 'alert:resolved', 'alert:acknowledged'];
    alertEvents.forEach((eventType) => {
      socket.on(eventType, (raw: Record<string, unknown>) => {
        const n = addNotification({ ...raw, type: eventType });
        options.onAlert?.(n);
      });
    });

    const deployEvents = [
      'deployment:started',
      'deployment:succeeded',
      'deployment:failed',
      'deployment:rolled_back',
    ];
    deployEvents.forEach((eventType) => {
      socket.on(eventType, (raw: Record<string, unknown>) => {
        const n = addNotification({ ...raw, type: eventType });
        options.onDeployment?.(n);
      });
    });

    socket.on('notification:critical', (raw: Record<string, unknown>) => {
      const n = addNotification({ ...raw });
      options.onCritical?.(n);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { connected, notifications, unreadCount, markAllRead, markRead };
}