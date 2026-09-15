import { useEffect, useRef } from 'react'

const IDLE_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes

/**
 * Custom hook to trigger logout after 20 minutes of inactivity.
 * Tracks mousemove, keydown, click, scroll, and touchstart events.
 */
export function useIdleTimeout(onIdle: () => void, enabled: boolean) {
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    if (!enabled) return

    let timeoutId: ReturnType<typeof setTimeout>

    const resetTimer = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('_lumiere_idle_expired', 'Session expired due to inactivity')
        }
        onIdleRef.current()
      }, IDLE_TIMEOUT_MS)
    }

    // Start timer on initial mount / enable
    resetTimer()

    let lastActivity = Date.now()
    const handleActivity = () => {
      const now = Date.now()
      // Throttle event handling to at most once per second
      if (now - lastActivity > 1000) {
        lastActivity = now
        resetTimer()
      }
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }))

    return () => {
      clearTimeout(timeoutId)
      events.forEach((evt) => window.removeEventListener(evt, handleActivity))
    }
  }, [enabled])
}
