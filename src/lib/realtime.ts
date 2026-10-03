import * as signalR from '@microsoft/signalr'
import { API_BASE_URL, getAuthToken } from './apiConfig'

let hubConnection: signalR.HubConnection | null = null
let connectionPromise: Promise<signalR.HubConnection | null> | null = null

/**
 * Initializes and starts the SignalR Operations Hub connection.
 * Uses `accessTokenFactory` to attach current JWT auth token.
 * Enables automatic reconnects and fallback transport support.
 */
export async function getRealtimeConnection(): Promise<signalR.HubConnection | null> {
  if (typeof window === 'undefined') return null

  if (hubConnection && hubConnection.state === signalR.HubConnectionState.Connected) {
    return hubConnection
  }

  if (connectionPromise) {
    return connectionPromise
  }

  connectionPromise = (async () => {
    try {
      const token = getAuthToken()
      const hubUrl = `${API_BASE_URL}/hubs/operations`

      const conn = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => getAuthToken() ?? token ?? '',
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount >= 10) return null
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000)
          },
        })
        .configureLogging(signalR.LogLevel.Warning)
        .build()

      conn.on('operationalDataChanged', (payload: any) => {
        const domain = payload?.domain || payload?.Domain || ''
        window.dispatchEvent(
          new CustomEvent('lumiere:realtime_invalidation', {
            detail: { eventName: domain ? `${domain}Updated` : 'OperationInvalidated', data: payload },
          })
        )
        if (domain) {
          window.dispatchEvent(
            new CustomEvent(`lumiere:${domain.toLowerCase()}updated`, {
              detail: payload,
            })
          )
        }
      })

      const realtimeEvents = [
        'ManningUpdated',
        'WarehouseDispatchUpdated',
        'DamageReportCreated',
        'DamageReportUpdated',
        'DamageReportVerdictIssued',
        'GroundCrewDeclarationUpdated',
        'ProductionTaskUpdated',
        'DeficitQueueUpdated',
        'CanvasStatusChanged',
        'EventStatusChanged',
        'PartialEgressEscalated',
        'InventoryUpdated',
        'OperationInvalidated',
      ]

      realtimeEvents.forEach((eventName) => {
        conn.on(eventName, (data: unknown) => {
          // Dispatch generic invalidation event
          window.dispatchEvent(
            new CustomEvent('lumiere:realtime_invalidation', {
              detail: { eventName, data },
            })
          )
          // Dispatch specific event
          window.dispatchEvent(
            new CustomEvent(`lumiere:${eventName.toLowerCase()}`, {
              detail: data,
            })
          )
        })
      });

      conn.onreconnecting((error) => {
        console.warn('[Realtime] SignalR reconnecting...', error)
      })

      conn.onreconnected((connectionId) => {
        console.log('[Realtime] SignalR reconnected. ConnectionId:', connectionId)
        window.dispatchEvent(new CustomEvent('lumiere:realtime_reconnected'))
      })

      conn.onclose((error) => {
        console.warn('[Realtime] SignalR connection closed:', error)
        hubConnection = null
        connectionPromise = null
      })

      await conn.start()
      console.log('[Realtime] SignalR connected to /hubs/operations')
      hubConnection = conn
      return conn
    } catch (err) {
      console.warn('[Realtime] SignalR connection initialization failed (checkpoint polling fallback active):', err)
      hubConnection = null
      connectionPromise = null
      return null
    }
  })()

  return connectionPromise
}

/**
 * Gracefully disconnects the SignalR hub connection.
 */
export async function stopRealtimeConnection(): Promise<void> {
  if (hubConnection) {
    try {
      await hubConnection.stop()
    } catch {
      // Ignore disconnect errors
    } finally {
      hubConnection = null
      connectionPromise = null
    }
  }
}
