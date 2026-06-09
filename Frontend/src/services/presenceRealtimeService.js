import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from './api';
import { getVisitorId } from '../utils/presence';

const HUB_URL = `${API_BASE_URL}/hubs/presence`;

class PresenceRealtimeService {
  constructor() {
    this._connection = null;
    this._startPromise = null;
    this._handlers = new Map();
    this._token = '';
  }

  _buildConnection() {
    const visitorId = encodeURIComponent(getVisitorId());

    return new signalR.HubConnectionBuilder()
      .withUrl(`${HUB_URL}?visitorId=${visitorId}`, {
        accessTokenFactory: () => localStorage.getItem('token') || '',
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.ServerSentEvents |
                   signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }

  async start() {
    const nextToken = localStorage.getItem('token') || '';

    if (
      this._connection?.state === signalR.HubConnectionState.Connected &&
      this._token === nextToken
    ) {
      return;
    }

    if (this._startPromise) return this._startPromise;

    this._startPromise = (async () => {
      if (this._connection) {
        try { await this._connection.stop(); } catch { /* ignore */ }
      }

      this._token = nextToken;
      this._connection = this._buildConnection();

      this._handlers.forEach((callbacks, event) => {
        callbacks.forEach((callback) => this._connection.on(event, callback));
      });

      await this._connection.start();
    })();

    try {
      await this._startPromise;
    } catch (error) {
      console.warn('[Presence] Realtime connection failed:', error);
    } finally {
      this._startPromise = null;
    }
  }

  async stop() {
    this._startPromise = null;
    this._token = '';
    if (this._connection) {
      try { await this._connection.stop(); } catch { /* ignore */ }
      this._connection = null;
    }
  }

  on(event, callback) {
    const callbacks = this._handlers.get(event) || new Set();
    const alreadyRegistered = callbacks.has(callback);
    callbacks.add(callback);
    this._handlers.set(event, callbacks);

    if (!alreadyRegistered) {
      this._connection?.on(event, callback);
    }
  }

  off(event, callback) {
    const callbacks = this._handlers.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) this._handlers.delete(event);
    }

    this._connection?.off(event, callback);
  }
}

export const presenceRealtimeService = new PresenceRealtimeService();
