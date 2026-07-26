import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';

const WS_URL = 'ws://127.0.0.1:8000/ws';
const RECONNECT_INTERVAL_MS = 2000;

export function useWebSocket() {
  const wsRef = useRef(null);
  const setConnected = useAppStore((state) => state.setConnected);
  const updateFromWebSocket = useAppStore((state) => state.updateFromWebSocket);

  useEffect(() => {
    let reconnectTimer = null;
    let isComponentMounted = true;

    function connect() {
      if (!isComponentMounted) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isComponentMounted) return;
          console.log('[GCI HMI] Connected to Telemetry Stream at', WS_URL);
          setConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isComponentMounted) return;
          try {
            const payload = JSON.parse(event.data);
            updateFromWebSocket(payload);
          } catch (err) {
            console.error('[GCI HMI] Failed to parse WebSocket payload:', err);
          }
        };

        ws.onerror = (err) => {
          console.warn('[GCI HMI] WebSocket error occurred:', err);
        };

        ws.onclose = () => {
          if (!isComponentMounted) return;
          console.warn('[GCI HMI] Connection lost. Reconnecting in 2s...');
          setConnected(false);
          reconnectTimer = setTimeout(connect, RECONNECT_INTERVAL_MS);
        };
      } catch (e) {
        console.error('[GCI HMI] WebSocket connection error:', e);
        setConnected(false);
        reconnectTimer = setTimeout(connect, RECONNECT_INTERVAL_MS);
      }
    }

    connect();

    return () => {
      isComponentMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [setConnected, updateFromWebSocket]);
}
