import { useAuth } from '@/lib/auth'

export function LogoutModal() {
  const { confirmLogout, setConfirmLogout, logout } = useAuth()

  if (!confirmLogout) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 pointer-events-auto">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-card p-6 shadow-2xl">
        <div>
          <h2 className="text-lg font-bold text-foreground">Sign out?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You'll need to sign back in to access the console.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmLogout(false)}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmLogout(false)
              logout()
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
