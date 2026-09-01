import { useCallback, useRef, useState } from 'react'

// Briefly flashes a clickable card/panel (ring + glow) before running its
// navigation action, so the user sees which control they activated before
// the route change unmounts it. Used across the System Dashboard's clickable
// stat cards, the User Distribution donut, and the Live Security Feed panel.
const FLASH_DURATION_MS = 250

export function useClickFlash(action?: () => void) {
  const [flashing, setFlashing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback(() => {
    if (!action) return
    setFlashing(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setFlashing(false)
      action()
    }, FLASH_DURATION_MS)
  }, [action])

  return { flashing, trigger }
}
