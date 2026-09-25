import { useState, useEffect } from 'react'
import { Sparkles, X, LayoutGrid, ShieldCheck, Palette, HardHat, PackageCheck, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface WelcomeContent {
  badge: string
  title: string
  description: string
  icon: typeof Sparkles
  shortcuts: { title: string; desc: string }[]
}

export function WelcomeModal() {
  const {
    adminName,
    adminEmail,
    isAdmin,
    isExecutive,
    isPlanner,
    isGroundCrew,
    isProductionManager,
    isInventoryOfficer,
    isManningOfficer,
  } = useAuth()

  const [isOpen, setIsOpen] = useState(false)

  // Unique storage key per logged-in account email
  const storageKey = adminEmail
    ? `lumiere-welcome-seen-${adminEmail.toLowerCase().trim()}`
    : null

  useEffect(() => {
    if (!storageKey) return
    const hasSeen = localStorage.getItem(storageKey) === 'true'
    if (!hasSeen) {
      setIsOpen(true)
    }
  }, [storageKey])

  const handleDismiss = () => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, 'true')
      } catch {
        // Fallback if localStorage is restricted
      }
    }
    setIsOpen(false)
  }

  if (!isOpen) return null

  // Determine role-specific welcome text & shortcuts
  let content: WelcomeContent

  if (isAdmin) {
    content = {
      badge: 'Admin Governance',
      title: 'Welcome to Lumière Admin',
      description:
        'You have full system oversight across user account provisioning, role-based access control (RBAC), and security telemetry. Manage credentials, configure sub-roles, and review real-time audit trails.',
      icon: ShieldCheck,
      shortcuts: [
        {
          title: '6-Digit PIN Security',
          desc: 'High-stakes role creation and deletions require your account confirmation PIN.',
        },
        {
          title: 'Security Audit Logs',
          desc: 'Inspect cross-account authentication logs and lockouts under Security Audit.',
        },
      ],
    }
  } else if (isExecutive) {
    content = {
      badge: 'Executive Console',
      title: 'Welcome to Executive Operations',
      description:
        'Your console provides high-level oversight for Lumière event portfolios, post-event damage verdicts, and system logs. Monitor high-value client assets and issue sign-offs.',
      icon: LayoutGrid,
      shortcuts: [
        {
          title: 'Damage Verdicts',
          desc: 'Evaluate post-event photographic damage reports and issue official verdicts in Damage Validation.',
        },
        {
          title: 'Operations Registry',
          desc: 'Track operational readiness and production stages across all active event portfolios.',
        },
      ],
    }
  } else if (isPlanner) {
    content = {
      badge: 'Design & Planning',
      title: 'Welcome to Event Canvas',
      description:
        'Design bespoke event spaces, craft floor plans, and build mood boards using the Konva design canvas. Access real-time decor stock availability while placing assets.',
      icon: Palette,
      shortcuts: [
        {
          title: 'Canvas Mode Toggle',
          desc: 'Switch between Vertical/Flowy stacked view and Horizontal/Thumbnail filmstrip mode in the canvas toolbar.',
        },
        {
          title: 'Real-Time Inventory',
          desc: 'Drag decor elements onto your workspace with live stock checks directly from the warehouse.',
        },
      ],
    }
  } else if (isGroundCrew) {
    content = {
      badge: 'Field Operations PWA',
      title: 'Welcome to Ground Crew Field Ops',
      description:
        'Streamline venue setups, asset check-ins, and field task completions directly from your mobile portal. Touch-optimized 44px controls ensure effortless outdoor usage.',
      icon: HardHat,
      shortcuts: [
        {
          title: 'Sticky Offline Banner',
          desc: 'If network connectivity drops, a high-contrast top banner alerts you. Your changes auto-sync when reconnected.',
        },
        {
          title: 'Outdoor Field Usability',
          desc: 'Tap targets and high-contrast typography are optimized for sunlight visibility on-site.',
        },
      ],
    }
  } else {
    // Warehouse Operations / WOM Sub-roles (Production Manager, Inventory Officer, Manning Officer)
    const subTitle = isProductionManager
      ? 'Production Manager'
      : isInventoryOfficer
        ? 'Inventory Officer'
        : isManningOfficer
          ? 'Manning Officer'
          : 'Warehouse Operations'

    content = {
      badge: `Warehouse · ${subTitle}`,
      title: `Welcome to ${subTitle}`,
      description:
        'Orchestrate asset inventory, dispatch manifests, replenishment requisitions, and production prep jobs. Track physical stock counts and manage fleet logistics.',
      icon: PackageCheck,
      shortcuts: [
        {
          title: 'Inventory & Replenishment',
          desc: 'Monitor shortage thresholds and route purchase requisitions for low-stock decor items.',
        },
        {
          title: 'Dispatch Manifests',
          desc: 'Oversee loading, transit, and return manifests across active venue deployments.',
        },
      ],
    }
  }

  const IconComponent = content.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl text-left glow-card">
        {/* Top bar with badge and close button */}
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="size-3" />
            {content.badge}
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close welcome modal"
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Header Icon + Title */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <IconComponent className="size-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-medium tracking-tight text-foreground sm:text-2xl">
              {content.title}
            </h2>
            <p className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider">
              {adminName || adminEmail}
            </p>
          </div>
        </div>

        {/* Scope Description */}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {content.description}
        </p>

        {/* Role-specific Shortcuts / Tips */}
        <div className="mt-4 space-y-2.5 rounded-xl border border-border bg-muted/30 p-3.5">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Workspace Tips &amp; Shortcuts
          </p>
          {content.shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div>
                <span className="font-semibold text-foreground">{s.title}: </span>
                <span className="text-muted-foreground">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="button-primary mt-5 w-full justify-center text-xs font-bold uppercase tracking-wider"
        >
          Explore Workspace
        </button>
      </div>
    </div>
  )
}
