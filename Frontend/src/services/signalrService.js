import * as signalR from '@microsoft/signalr';

const HUB_URL = 'http://localhost:5029/hubs/workbridge';

class SignalRService {
  constructor() {
    this._connection = null;
    this._isStarting = false;
    this._pendingHandlers = []; // handlers registered before connection is ready
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
    if (this._isStarting) return;

    this._isStarting = true;

    try {
      if (this._connection) {
        await this._connection.stop();
      }

      this._connection = this._buildConnection();

      // Re-attach any handlers that were registered before the connection was built
      this._pendingHandlers.forEach(({ event, callback }) => {
        this._connection.on(event, callback);
      });

      this._connection.onreconnecting(() => {
        console.info('[SignalR] Reconnecting...');
      });

      this._connection.onreconnected(() => {
        console.info('[SignalR] Reconnected.');
      });

      this._connection.onclose((err) => {
        if (err) console.warn('[SignalR] Connection closed with error:', err);
      });

      await this._connection.start();
      console.info('[SignalR] Connected.');
    } catch (err) {
      console.error('[SignalR] Failed to connect:', err);
    } finally {
      this._isStarting = false;
    }
  }

  async stop() {
    this._pendingHandlers = [];
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
    // Store so we can re-attach after reconnects
    this._pendingHandlers.push({ event, callback });
    this._connection?.on(event, callback);
  }

  /**
   * Remove a handler.
   */
  off(event, callback) {
    this._pendingHandlers = this._pendingHandlers.filter(
      (h) => !(h.event === event && h.callback === callback)
    );
    this._connection?.off(event, callback);
  }

  /**
   * Invoke a server-side hub method.
   */
  async invoke(method, ...args) {
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
