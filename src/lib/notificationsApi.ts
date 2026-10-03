import { API_BASE_URL, getAuthToken } from './apiConfig'

export interface NotificationDto {
  id: string
  userId?: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  readAt?: string | null
  type?: string
  eventId?: string
  referenceId?: string
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function normalizeNotificationDto(raw: any): NotificationDto {
  if (!raw) {
    return {
      id: '',
      title: 'Notification',
      message: '',
      isRead: true,
      createdAt: new Date().toISOString(),
    }
  }

  const id = String(raw.id ?? raw.Id ?? '')
  const userId = raw.userId ?? raw.UserId ?? undefined
  const title = raw.title ?? raw.Title ?? 'Notification'
  const message = raw.message ?? raw.Message ?? raw.body ?? raw.Body ?? raw.text ?? raw.Text ?? ''
  const isRead = Boolean(raw.isRead ?? raw.IsRead ?? raw.read ?? raw.Read ?? false)
  const createdAt = raw.createdAt ?? raw.CreatedAt ?? raw.timestamp ?? raw.Timestamp ?? new Date().toISOString()
  const readAt = raw.readAt ?? raw.ReadAt ?? null
  const type = raw.type ?? raw.Type ?? undefined
  const eventId = raw.eventId ?? raw.EventId ?? undefined
  const referenceId = raw.referenceId ?? raw.ReferenceId ?? undefined

  return {
    id,
    userId,
    title,
    message,
    isRead,
    createdAt,
    readAt,
    type,
    eventId,
    referenceId,
  }
}

/**
 * GET /api/notifications
 * Returns CURRENT authenticated user's persistent notifications, newest first.
 */
export async function fetchNotificationsApi(): Promise<NotificationDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!res.ok) {
      if (res.status === 401) {
        return []
      }
      throw new Error(`HTTP ${res.status}: Failed to fetch notifications`)
    }

    const data = await res.json()
    if (!Array.isArray(data)) {
      return []
    }

    return data.map(normalizeNotificationDto).sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeB - timeA
    })
  } catch (err) {
    console.warn('[notificationsApi] fetchNotificationsApi error:', err)
    throw err
  }
}

/**
 * PATCH /api/notifications/{id}/read
 * Marks CURRENT user's notification read. Idempotent.
 */
export async function markNotificationReadApi(notificationId: string): Promise<boolean> {
  if (!notificationId) return false
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.warn(`[notificationsApi] markNotificationReadApi HTTP ${res.status}:`, body)
      return false
    }

    return true
  } catch (err) {
    console.warn('[notificationsApi] markNotificationReadApi network error:', err)
    return false
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all CURRENT user's unread notifications read.
 */
export async function markAllNotificationsReadApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.warn(`[notificationsApi] markAllNotificationsReadApi HTTP ${res.status}:`, body)
      return false
    }

    return true
  } catch (err) {
    console.warn('[notificationsApi] markAllNotificationsReadApi network error:', err)
    return false
  }
}
