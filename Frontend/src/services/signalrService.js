import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from './api';

const HUB_URL = `${API_BASE_URL}/hubs/workbridge`;

class SignalRService {
  constructor() {
    this._connection = null;
    this._startPromise = null;
    this._handlers = new Map();
    this._reconnectCallbacks = new Set();
  }

  _buildConnection() {
    return new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => localStorage.getItem('token') || '',
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.ServerSentEvents |
                   signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }

  async start() {
    if (this._connection?.state === signalR.HubConnectionState.Connected) return;
    if (this._startPromise) return this._startPromise;

    this._startPromise = (async () => {
      if (this._connection) {
        await this._connection.stop();
      }

      this._connection = this._buildConnection();

      this._handlers.forEach((callbacks, event) => {
        callbacks.forEach((callback) => this._connection.on(event, callback));
      });

      this._connection.onreconnecting(() => {
        console.info('[SignalR] Reconnecting...');
      });

      this._connection.onreconnected(() => {
        console.info('[SignalR] Reconnected.');
        this._reconnectCallbacks.forEach((cb) => cb());
      });

      this._connection.onclose((err) => {
        if (err) console.warn('[SignalR] Connection closed with error:', err);
      });

      await this._connection.start();
      console.info('[SignalR] Connected.');
    })();

    try {
      await this._startPromise;
    } catch (err) {
      console.error('[SignalR] Failed to connect:', err);
    } finally {
      this._startPromise = null;
    }
  }

  async stop() {
    this._handlers.clear();
    this._reconnectCallbacks.clear();
    this._startPromise = null;
    if (this._connection) {
      try { await this._connection.stop(); } catch { /* ignore */ }
      this._connection = null;
    }
  }

  get isConnected() {
    return this._connection?.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Register a handler for a server-sent event.
   * Safe to call before connection is started.
   */
  on(event, callback) {
    const callbacks = this._handlers.get(event) || new Set();
    const alreadyRegistered = callbacks.has(callback);
    callbacks.add(callback);
    this._handlers.set(event, callbacks);
    if (!alreadyRegistered) {
      this._connection?.on(event, callback);
    }
  }

  /**
   * Remove a handler.
   */
  off(event, callback) {
    const callbacks = this._handlers.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) this._handlers.delete(event);
    }
    this._connection?.off(event, callback);
  }

  onReconnected(callback) {
    this._reconnectCallbacks.add(callback);
  }

  offReconnected(callback) {
    this._reconnectCallbacks.delete(callback);
  }

  /**
   * Invoke a server-side hub method.
   */
  async invoke(method, ...args) {
    if (!this.isConnected) {
      await this.start();
    }
    if (!this.isConnected) return;
    try {
      await this._connection.invoke(method, ...args);
    } catch (err) {
      console.error(`[SignalR] invoke(${method}) failed:`, err);
    }
  }
}

// Export as a singleton
export const signalRService = new SignalRService();
