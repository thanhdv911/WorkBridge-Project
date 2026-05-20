import { useEffect, useState, useRef } from 'react';
import { signalRService } from '../services/signalrService';

/**
 * useSignalR — manages the lifecycle of the SignalR connection.
 *
 * - Starts the connection when the user is logged in.
 * - Stops the connection when the user logs out or the component unmounts.
 * - Exposes helpers to register/unregister event handlers and invoke hub methods.
 *
 * Usage:
 *   const { isConnected, on, off, invoke } = useSignalR();
 */
export function useSignalR() {
  const [isConnected, setIsConnected] = useState(signalRService.isConnected);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const connect = async () => {
      await signalRService.start();
      if (!cancelled) setIsConnected(signalRService.isConnected);
    };

    connect();

    // Poll connection state every 3 s so badge/indicator updates if WS drops
    const poll = setInterval(() => {
      if (!cancelled) setIsConnected(signalRService.isConnected);
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      // We intentionally do NOT stop the connection here so it persists
      // across page navigations. Call signalRService.stop() only on logout.
    };
  }, [token]);

  return {
    isConnected,
    on: (event, callback) => signalRService.on(event, callback),
    off: (event, callback) => signalRService.off(event, callback),
    invoke: (method, ...args) => signalRService.invoke(method, ...args),
  };
}
