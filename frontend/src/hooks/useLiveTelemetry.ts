import { useEffect, useRef, useState, useCallback } from 'react';
import { LiveUpdateMessage, TrackedPerson, CameraInfo, SystemMetrics, SystemHealth, AlertItem } from '../types';

export function useLiveTelemetry(selectedCameraId: string = 'CAM-001') {
  const [data, setData] = useState<LiveUpdateMessage | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        // Switch camera if needed
        ws.send(JSON.stringify({ action: 'switch_camera', camera_id: selectedCameraId }));
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'detection_update') {
            setData(parsed);
          }
        } catch (err) {
          // ignore parsing glitch
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect in 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };
    } catch (err: any) {
      setError(err.message || 'Failed to establish WebSocket connection');
      setIsConnected(false);
    }
  }, [selectedCameraId]);

  useEffect(() => {
    connect();

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return {
    data,
    isConnected,
    error,
    reconnect: connect
  };
}
