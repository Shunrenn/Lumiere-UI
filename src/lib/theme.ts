import { useEffect, useState } from 'react'

// Shared theme engine — single source of truth for the app-wide dark/light class on <html>.
//
// Storage contract (kept byte-compatible with the existing per-page `useDarkMode` hooks in
// ConsoleSidebar.tsx and DesignCanvasHubPage.tsx, and with the blocking anti-FOUC script in
// index.html, so nothing else needs to change):
//   - `lumiere-dark` = 'true' | 'false'  -> explicit Light/Dark choice
//   - `lumiere-dark` absent              -> "System" (follow OS prefers-color-scheme)
//
// `lumiere-theme-mode` additionally records the *explicit* selection ('light' | 'dark' | 'system')
// so UI that offers a 3-way toggle (this login page) can show which of the three is active — the
// legacy key alone can't distinguish "System, which currently resolves to light" from "Light".
export const THEME_MODE_KEY = 'lumiere-theme-mode'
export const THEME_DARK_KEY = 'lumiere-dark'

export type ThemeMode = 'light' | 'dark' | 'system'

export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(THEME_MODE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  // Back-compat: pages that predate the 3-way toggle only ever wrote the legacy key.
  const legacy = localStorage.getItem(THEME_DARK_KEY)
  if (legacy === 'true') return 'dark'
  if (legacy === 'false') return 'light'
  return 'system'
}

export function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return getSystemPrefersDark()
}

export const THEME_CHANGE_EVENT = 'lumiere-theme-change'

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === 'undefined') return
  const isDark = resolveIsDark(mode)
  document.documentElement.classList.toggle('dark', isDark)
  localStorage.setItem(THEME_MODE_KEY, mode)
  // Keep the legacy key in sync so the binary toggles elsewhere in the app read the same state.
  if (mode === 'system') localStorage.removeItem(THEME_DARK_KEY)
  else localStorage.setItem(THEME_DARK_KEY, String(isDark))

  // Dispatch custom event to notify other instances in the same tab
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: mode }))
  }
}

/** 3-way theme hook — Light / Dark / System, with live updates while "System" is active and the OS setting changes, and event sync. */
export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredThemeMode())

  useEffect(() => {
    applyThemeMode(mode)
  }, [mode])

  // Sync state between instances in the same tab
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>
      if (customEvent.detail !== mode) {
        setModeState(customEvent.detail)
      }
    }
    window.addEventListener(THEME_CHANGE_EVENT, handleCustomChange)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleCustomChange)
  }, [mode])

  // Sync state between tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_MODE_KEY && e.newValue) {
        setModeState(e.newValue as ThemeMode)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const isDark = getSystemPrefersDark()
      document.documentElement.classList.toggle('dark', isDark)
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: 'system' }))
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [mode])

  return { mode, setMode: setModeState }
}

/** 
 * Backward-compatible useDarkMode binary hook wrapper over the 3-way useThemeMode.
 * Returns { dark: boolean, toggle: () => void }
 */
export function useDarkMode() {
  const { mode, setMode } = useThemeMode()
  const dark = resolveIsDark(mode)

  const toggle = () => {
    if (mode === 'system') {
      setMode(getSystemPrefersDark() ? 'light' : 'dark')
    } else {
      setMode(mode === 'dark' ? 'light' : 'dark')
    }
  }

  return { dark, toggle }
}
