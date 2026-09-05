import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, Folder, FolderOpen, Lock, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { MaskedPinInput } from '@/components/admin/MaskedPinInput'
import { useNav } from '@/lib/nav'
import { useAuth } from '@/lib/auth'
import { usePortal } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { AdminDestinationId } from '@/lib/admin-destinations'
import {
  ACCESS_LEVELS,
  addChildToTree,
  countDescendants,
  DEFAULT_ENABLED_SUBROLES,
  findNode,
  findPath,
  GROUND_CREW_PARENT,
  GROUND_MODULES,
  isLeafNode,
  isNodeConfigured,
  mapTree,
  PARENT_MODULES,
  PARENT_ROLES,
  removeFromTree,
  STRUCTURAL_ROLES,
  type AccessLevel,
  type ModulePermission,
  type SubRole,
  type SubRoleNode,
} from '@/lib/rbac'
import { SECURITY_EVENTS, type SecurityEvent } from '@/lib/security-events'

// Translucent, dark-mode-friendly treatments for each access level chip.
const levelStyles: Record<AccessLevel, string> = {
  View: 'bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/25',
  Interact: 'bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/25',
  Modify: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/25',
  None: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
}

// High-stakes RBAC actions (create / delete a sub-role) are gated by the
// signed-in admin's own per-account 6-digit confirmation PIN (see
// lib/auth.tsx), not a shared constant. Locking out this confirmation never
// touches the Admin account itself — Admin is the top-level authority, so
// there is nobody above them to perform an account-level unlock.
const PIN_LOCKOUT_MS = 5 * 60 * 1000

/* ----------------------------- Edit / confirmation types ----------------------------- */

type PinAction =
  | { type: 'create'; parentId: string; name: string }
  | { type: 'delete'; parentId: string; subRoleId: string; name: string }
  // Ground Crew's recursive tree — parentId null means a new top-level tier.
  | { type: 'tree-create'; parentId: string | null; name: string }
  | { type: 'tree-delete'; nodeId: string; name: string; descendantCount: number }

// Shared shape consumed by AckConfirmModal — both the flat (WOM) and tree
// (Ground Crew) save flows produce this, differing only in the extra field
// each keeps privately for knowing where to write the change back to.
interface AckChangeSummary {
  name: string
  newName?: string
  changes: { module: string; from: AccessLevel; to: AccessLevel }[]
}

interface AckAction extends AckChangeSummary {
  parentId: string
  subRoleId: string
}

interface TreeAckAction extends AckChangeSummary {
  nodeId: string
  // Immediate parent node id in the tree (or null at the top level) — used
  // only for duplicate-name scoping on save, not for display.
  parentId: string | null
}

export function AdminRolesPage() {
  const { navigate, intent } = useNav()
  const { hasConfirmationPin, verifyConfirmationPin } = useAuth()

  // Flat, single-company enablement of toggleable sub-roles, seeded from
  // defaults. This platform serves one company only — there is no
  // per-company enable/disable scoping.
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(DEFAULT_ENABLED_SUBROLES))

  // Live, editable copy of each parent role's sub-roles. Lifted to the
  // shared PortalContext (lib/store.tsx) — mutated in place as the Admin
  // creates, edits, and deletes sub-roles, no separate draft/staging model
  // per spec — so the System Dashboard's Pending Actions panel can surface
  // newly created sub-roles that still need permissions configured.
  const { subRolesByParent, setSubRolesByParent, groundCrewTree, setGroundCrewTree } = usePortal()

  const [expanded, setExpanded] = useState<string | null>(null)

  // Ground Crew's tree: which container nodes currently have their children
  // revealed. Multiple containers can be open at once (unlike `expanded`,
  // which is single-select for the permission-edit panel), since navigating
  // a tree of arbitrary depth requires several branches open simultaneously.
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set())

  // If we arrived here via a "configure-subrole" Pending Actions click,
  // auto-expand that sub-role's row so the admin lands straight on it. For a
  // Ground Crew tree leaf, also expand every ancestor container along the
  // way so the leaf is actually visible.
  useEffect(() => {
    if (intent?.kind === 'configure-subrole' && intent.payload?.subRoleId) {
      setExpanded(intent.payload.subRoleId)
      const path = findPath(groundCrewTree, intent.payload.subRoleId)
      if (path && path.length > 0) {
        setExpandedContainers((prev) => {
          const next = new Set(prev)
          path.forEach((ancestor) => next.add(ancestor.id))
          return next
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])

  // Unsaved edits for the currently expanded/editing sub-role rows, keyed by
  // sub-role id. Only present while a row has pending, unsaved changes.
  const [draftName, setDraftName] = useState<Record<string, string>>({})
  const [draftPerms, setDraftPerms] = useState<Record<string, { module: string; level: AccessLevel; note: string }[]>>({})
  const [nameErrors, setNameErrors] = useState<Record<string, string>>({})

  // Inline "new sub-role" creation form (one at a time, scoped to a parent).
  const [creating, setCreating] = useState<{ parentId: string; name: string } | null>(null)
  const [createError, setCreateError] = useState('')

  // Same idea, for the Ground Crew tree — `parentId: null` means a new
  // top-level tier; otherwise it nests as a child of that node.
  const [creatingUnder, setCreatingUnder] = useState<{ parentId: string | null; name: string } | null>(null)

  // Routine modify/rename confirmation (Acknowledgement — no PIN).
  const [ackAction, setAckAction] = useState<AckAction | null>(null)
  const [treeAckAction, setTreeAckAction] = useState<TreeAckAction | null>(null)

  // Shown instead of the PIN modal when create/delete is requested before
  // the admin has completed first-time PIN setup (nothing to verify against
  // yet). Setup itself lives in AdminTopBar's profile menu → Security.
  const [pinSetupNotice, setPinSetupNotice] = useState(false)

  // High-stakes create/delete confirmation (PIN).
  const [pinAction, setPinAction] = useState<PinAction | null>(null)
  const [pinValue, setPinValue] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinAttempts, setPinAttempts] = useState(0)
  const [pinLockUntil, setPinLockUntil] = useState<number | null>(null)
  const [lockTick, setLockTick] = useState(0)

  // Toast / banner for successful high-stakes actions.
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const activeSet = enabled

  const toggleSubRole = (subRoleId: string) => {
    setEnabled((prev) => {
      const set = new Set(prev)
      if (set.has(subRoleId)) set.delete(subRoleId)
      else set.add(subRoleId)
      return set
    })
  }

  /* ----------------------------- Toast ----------------------------- */

  const showToast = (message: string) => {
    setToastMessage(message)
    setToastVisible(true)
    window.setTimeout(() => setToastVisible(false), 5000)
    window.setTimeout(() => setToastMessage(''), 5600)
  }

  /* ----------------------------- Row edit handlers ----------------------------- */

  const handleNameChange = (subId: string, value: string) => {
    setDraftName((p) => ({ ...p, [subId]: value }))
    setNameErrors((p) => ({ ...p, [subId]: '' }))
  }

  // Accepts anything id + permissions-shaped — both SubRole (WOM) and
  // SubRoleNode (Ground Crew tree) satisfy this, so the row-level edit state
  // and this handler are shared across both models.
  const handlePermChange = (
    target: { id: string; permissions: ModulePermission[] },
    moduleName: string,
    level: AccessLevel,
  ) => {
    setDraftPerms((p) => {
      const base = p[target.id] ?? target.permissions.map((perm) => ({ ...perm }))
      return { ...p, [target.id]: base.map((perm) => (perm.module === moduleName ? { ...perm, level } : perm)) }
    })
  }

  const handleCancelEdit = (subId: string) => {
    setDraftName((p) => {
      const next = { ...p }
      delete next[subId]
      return next
    })
    setDraftPerms((p) => {
      const next = { ...p }
      delete next[subId]
      return next
    })
    setNameErrors((p) => {
      const next = { ...p }
      delete next[subId]
      return next
    })
  }

  const handleSaveClick = (parentId: string, sub: SubRole) => {
    const perms = draftPerms[sub.id] ?? sub.permissions
    const rawName = draftName[sub.id] ?? sub.name
    const name = rawName.trim()
    if (!name) {
      setNameErrors((p) => ({ ...p, [sub.id]: 'Name is required.' }))
      return
    }
    if (name.toLowerCase() !== sub.name.toLowerCase()) {
      const dupe = (subRolesByParent[parentId] ?? []).some(
        (s) => s.id !== sub.id && s.name.trim().toLowerCase() === name.toLowerCase(),
      )
      if (dupe) {
        setNameErrors((p) => ({ ...p, [sub.id]: 'A sub-role with this name already exists.' }))
        return
      }
    }
    setNameErrors((p) => ({ ...p, [sub.id]: '' }))
    const changes = sub.permissions
      .map((orig, i) => ({ module: orig.module, from: orig.level, to: perms[i].level }))
      .filter((c) => c.from !== c.to)
    setAckAction({
      parentId,
      subRoleId: sub.id,
      name: sub.name,
      newName: name !== sub.name ? name : undefined,
      changes,
    })
  }

  const confirmAck = () => {
    if (!ackAction) return
    const { parentId, subRoleId, newName, changes, name } = ackAction
    setSubRolesByParent((prev) => ({
      ...prev,
      [parentId]: (prev[parentId] ?? []).map((s) => {
        if (s.id !== subRoleId) return s
        return {
          ...s,
          name: newName ?? s.name,
          permissions: s.permissions.map((p) => {
            const change = changes.find((c) => c.module === p.module)
            return change ? { ...p, level: change.to } : p
          }),
          // First successful save on this sub-role's permission table clears
          // its "needs permission configuration" pending action for good —
          // this is permanent and does not reset on later routine edits.
          permissionsConfigured: true,
        }
      }),
    }))
    handleCancelEdit(subRoleId)
    showToast(`Access updated for '${newName ?? name}'.`)
    setAckAction(null)
  }

  /* ----------------------------- Ground Crew tree: save leaf ----------------------------- */

  // `immediateParentId` is the node's direct parent in the tree (or null at
  // the top level) — used only to scope the duplicate-name check to siblings.
  const handleTreeSaveClick = (immediateParentId: string | null, node: SubRoleNode) => {
    const perms = draftPerms[node.id] ?? node.permissions
    const rawName = draftName[node.id] ?? node.name
    const name = rawName.trim()
    if (!name) {
      setNameErrors((p) => ({ ...p, [node.id]: 'Name is required.' }))
      return
    }
    if (name.toLowerCase() !== node.name.toLowerCase()) {
      const siblings = immediateParentId ? findNode(groundCrewTree, immediateParentId)?.children ?? [] : groundCrewTree
      const dupe = siblings.some((s) => s.id !== node.id && s.name.trim().toLowerCase() === name.toLowerCase())
      if (dupe) {
        setNameErrors((p) => ({ ...p, [node.id]: 'A sub-role with this name already exists.' }))
        return
      }
    }
    setNameErrors((p) => ({ ...p, [node.id]: '' }))
    const changes = node.permissions
      .map((orig, i) => ({ module: orig.module, from: orig.level, to: perms[i].level }))
      .filter((c) => c.from !== c.to)
    setTreeAckAction({
      nodeId: node.id,
      parentId: immediateParentId,
      name: node.name,
      newName: name !== node.name ? name : undefined,
      changes,
    })
  }

  const confirmTreeAck = () => {
    if (!treeAckAction) return
    const { nodeId, newName, changes, name } = treeAckAction
    setGroundCrewTree((prev) =>
      mapTree(prev, nodeId, (node) => ({
        ...node,
        name: newName ?? node.name,
        permissions: node.permissions.map((p) => {
          const change = changes.find((c) => c.module === p.module)
          return change ? { ...p, level: change.to } : p
        }),
        permissionsConfigured: true,
      })),
    )
    handleCancelEdit(nodeId)
    showToast(`Access updated for '${newName ?? name}'.`)
    setTreeAckAction(null)
  }

  /* ----------------------------- Create sub-role ----------------------------- */

  const startCreate = (parentId: string) => {
    setCreating({ parentId, name: '' })
    setCreateError('')
  }

  const submitCreate = (parentId: string) => {
    if (!creating || creating.parentId !== parentId) return
    const name = creating.name.trim()
    if (!name) {
      setCreateError('Name is required.')
      return
    }
    const dupe = (subRolesByParent[parentId] ?? []).some(
      (s) => s.name.trim().toLowerCase() === name.toLowerCase(),
    )
    if (dupe) {
      setCreateError('A sub-role with this name already exists for this account type.')
      return
    }
    if (!hasConfirmationPin) {
      setPinSetupNotice(true)
      return
    }
    setCreateError('')
    setPinValue('')
    setPinError('')
    setPinAction({ type: 'create', parentId, name })
  }

  /* ----------------------------- Ground Crew tree: create node ----------------------------- */

  const startTreeCreate = (parentId: string | null) => {
    setCreatingUnder({ parentId, name: '' })
    setCreateError('')
  }

  const toggleContainer = (id: string) => {
    setExpandedContainers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Used by every "+ Add sub-role" affordance in the tree, whether the
  // target already has children (an existing container) or is currently a
  // leaf gaining its first child. Either way, its children area needs to be
  // visible so the inline create form actually shows up.
  const startTreeCreateUnder = (parentId: string) => {
    setExpandedContainers((prev) => new Set(prev).add(parentId))
    startTreeCreate(parentId)
  }

  const submitTreeCreate = () => {
    if (!creatingUnder) return
    const { parentId } = creatingUnder
    const name = creatingUnder.name.trim()
    if (!name) {
      setCreateError('Name is required.')
      return
    }
    const siblings = parentId ? findNode(groundCrewTree, parentId)?.children ?? [] : groundCrewTree
    const dupe = siblings.some((s) => s.name.trim().toLowerCase() === name.toLowerCase())
    if (dupe) {
      setCreateError('A sub-role with this name already exists at this level.')
      return
    }
    if (!hasConfirmationPin) {
      setPinSetupNotice(true)
      return
    }
    setCreateError('')
    setPinValue('')
    setPinError('')
    setPinAction({ type: 'tree-create', parentId, name })
  }

  /* ----------------------------- Delete sub-role ----------------------------- */

  const requestDelete = (parentId: string, sub: SubRole) => {
    if (!hasConfirmationPin) {
      setPinSetupNotice(true)
      return
    }
    setPinValue('')
    setPinError('')
    setPinAction({ type: 'delete', parentId, subRoleId: sub.id, name: sub.name })
  }

  /* ----------------------------- Ground Crew tree: delete node ----------------------------- */

  // Deleting a container cascades to every descendant — the PIN modal shows
  // the count so this is never a silent bulk delete.
  const requestTreeDelete = (node: SubRoleNode) => {
    if (!hasConfirmationPin) {
      setPinSetupNotice(true)
      return
    }
    setPinValue('')
    setPinError('')
    setPinAction({ type: 'tree-delete', nodeId: node.id, name: node.name, descendantCount: countDescendants(node) })
  }

  /* ----------------------------- PIN confirmation ----------------------------- */

  useEffect(() => {
    if (!pinLockUntil) return
    const id = window.setInterval(() => setLockTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [pinLockUntil])

  const lockRemainingMs = pinLockUntil ? Math.max(0, pinLockUntil - Date.now()) : 0
  const isLocked = Boolean(pinLockUntil) && lockRemainingMs > 0

  useEffect(() => {
    if (pinLockUntil && lockRemainingMs <= 0) {
      setPinLockUntil(null)
      setPinAttempts(0)
      setPinError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockTick, pinLockUntil, lockRemainingMs])

  const lockLabel = (() => {
    const totalSeconds = Math.ceil(lockRemainingMs / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  })()

  const logPinLockout = (action: PinAction) => {
    const verb = action.type === 'create' || action.type === 'tree-create' ? 'add' : 'delete'
    const now = new Date()
    const entry: SecurityEvent = {
      id: `sec-pin-${Date.now()}`,
      timestamp: now.toLocaleTimeString('en-GB'),
      date: 'May 14, 2026',
      logId: `SEC-${Math.floor(90000 + Math.random() * 9000)}`,
      employeeId: 'SYS-ROOT',
      role: 'Admin',
      action: `PIN confirmation locked after 3 failed attempts — ${verb} sub-role`,
      status: 'Blocked',
      ip: '10.0.0.1',
      terminal: 'CONSOLE',
      token: 'SYS-KEY',
      note: `Blocked while attempting to ${verb} the sub-role "${action.name}". This 5-minute cooldown applies only to this confirmation action, not the Admin account.`,
      dotColor: 'bg-rose-400',
    }
    SECURITY_EVENTS.unshift(entry)
  }

  const commitPinAction = () => {
    if (!pinAction) return
    if (pinAction.type === 'create') {
      const modules = PARENT_MODULES[pinAction.parentId] ?? []
      const newSub: SubRole = {
        id: `${pinAction.parentId}-${pinAction.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        name: pinAction.name.trim(),
        summary: 'Newly created sub-role — configure module access below.',
        domain: '—',
        permissions: modules.map((module) => ({ module, level: 'None' as AccessLevel, note: 'Not yet configured.' })),
        // Explicit false (not just omitted) so isPermissionsConfigured flags
        // this sub-role as needing setup, distinct from grandfathered
        // pre-existing sub-roles whose field is simply undefined.
        permissionsConfigured: false,
      }
      setSubRolesByParent((prev) => ({
        ...prev,
        [pinAction.parentId]: [...(prev[pinAction.parentId] ?? []), newSub],
      }))
      setExpanded(newSub.id)
      setCreating(null)
      showToast(`You have successfully added the sub-role '${pinAction.name.trim()}'`)
    } else if (pinAction.type === 'delete') {
      setSubRolesByParent((prev) => ({
        ...prev,
        [pinAction.parentId]: (prev[pinAction.parentId] ?? []).filter((s) => s.id !== pinAction.subRoleId),
      }))
      setEnabled((prev) => {
        const set = new Set(prev)
        set.delete(pinAction.subRoleId)
        return set
      })
      if (expanded === pinAction.subRoleId) setExpanded(null)
      handleCancelEdit(pinAction.subRoleId)
      showToast(`You have successfully deleted the sub-role '${pinAction.name}'`)
    } else if (pinAction.type === 'tree-create') {
      const newNode: SubRoleNode = {
        id: `ground-${pinAction.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        name: pinAction.name.trim(),
        summary: 'Newly created sub-role — configure module access below.',
        children: [],
        permissions: GROUND_MODULES.map((module) => ({ module, level: 'None' as AccessLevel, note: 'Not yet configured.' })),
        // Explicit false so isNodeConfigured flags this leaf as needing
        // setup, distinct from grandfathered sub-roles whose field is
        // simply undefined.
        permissionsConfigured: false,
      }
      setGroundCrewTree((prev) => (pinAction.parentId ? addChildToTree(prev, pinAction.parentId, newNode) : [...prev, newNode]))
      if (pinAction.parentId) {
        setExpandedContainers((prev) => new Set(prev).add(pinAction.parentId as string))
      }
      setExpanded(newNode.id)
      setCreatingUnder(null)
      showToast(`You have successfully added the sub-role '${pinAction.name.trim()}'`)
    } else {
      // tree-delete
      setGroundCrewTree((prev) => removeFromTree(prev, pinAction.nodeId))
      setEnabled((prev) => {
        const set = new Set(prev)
        set.delete(pinAction.nodeId)
        return set
      })
      if (expanded === pinAction.nodeId) setExpanded(null)
      handleCancelEdit(pinAction.nodeId)
      const cascadeNote =
        pinAction.descendantCount > 0
          ? ` and its ${pinAction.descendantCount} nested sub-role${pinAction.descendantCount === 1 ? '' : 's'}`
          : ''
      showToast(`You have successfully deleted the sub-role '${pinAction.name}'${cascadeNote}`)
    }
    setPinAction(null)
    setPinValue('')
  }

  const cancelPin = () => {
    setPinAction(null)
    setPinValue('')
    setPinError('')
  }

  const submitPin = () => {
    if (!pinAction || isLocked || pinValue.length !== 6) return
    if (verifyConfirmationPin(pinValue)) {
      commitPinAction()
      setPinAttempts(0)
    } else {
      const attempts = pinAttempts + 1
      setPinAttempts(attempts)
      setPinValue('')
      if (attempts >= 3) {
        setPinLockUntil(Date.now() + PIN_LOCKOUT_MS)
        setPinError('Too many incorrect attempts.')
        logPinLockout(pinAction)
      } else {
        setPinError(`Incorrect PIN. ${3 - attempts} attempt${3 - attempts === 1 ? '' : 's'} remaining.`)
      }
    }
  }

  // Rail navigation. Every destination now resolves to a real screen — no
  // leftover placeholder routes.
  const railSelect = (id: AdminDestinationId) => {
    if (id === 'system-dashboard') navigate('overview')
    else if (id === 'workforce') navigate('workforce')
    else if (id === 'security-audit') navigate('security-audit')
    else if (id === 'rbac') setExpanded(null)
  }

  const stickyHeader = (
    <div>
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Admin Console / Access
      </p>
      <h1 className="mt-2 font-serif text-3xl font-medium text-foreground sm:text-4xl">
        Roles &amp; Sub-Roles
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
        The five structural account types and their configurable sub-roles. Toggle sub-roles and
        open any row to edit its full permission scope, grouped by module.
      </p>
    </div>
  )

  return (
    <AdminShell activeId="rbac" onSelect={railSelect} stickyHeader={stickyHeader}>
      <div className="mb-8 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Legend
          </span>
          {ACCESS_LEVELS.map((l) => (
            <span
              key={l.level}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[0.65rem] text-muted-foreground"
            >
              <span
                className={cn('rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase', levelStyles[l.level])}
              >
                {l.label}
              </span>
              {l.hint}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Structural account types (informational, single-scope) */}
        <section>
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-medium text-foreground">
                Structural Account Types
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Informational
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground text-pretty">
              Fixed system account types with a single, non-configurable scope. These cannot be
              toggled on or off.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {STRUCTURAL_ROLES.map((role, index) => (
              <div
                key={role.id}
                className={cn(
                  'flex items-center gap-4 px-4 py-3.5 sm:px-5',
                  index !== 0 && 'border-t border-border/60',
                )}
              >
                {/* Alignment spacer to match sub-role rows' chevron column */}
                <ShieldCheck
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-card-foreground">{role.name}</p>
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-primary">
                      {role.scope}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {role.description}
                  </p>
                </div>

                {/* Static, non-toggleable indicator (replaces the on/off switch) */}
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <Lock className="size-2.5" aria-hidden="true" />
                  Fixed
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Parent roles with toggleable, editable sub-roles */}
        {PARENT_ROLES.map((parent) => {
          const subRoles = subRolesByParent[parent.id] ?? []
          return (
            <section key={parent.id}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl font-medium text-foreground">{parent.name}</h2>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground text-pretty">
                    {parent.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startCreate(parent.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  New sub-role
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {subRoles.map((sub, index) => (
                  <SubRoleRow
                    key={sub.id}
                    sub={sub}
                    first={index === 0}
                    isEnabled={activeSet.has(sub.id)}
                    isOpen={expanded === sub.id}
                    onToggleEnable={() => toggleSubRole(sub.id)}
                    onToggleExpand={() => setExpanded((cur) => (cur === sub.id ? null : sub.id))}
                    draftName={draftName[sub.id]}
                    draftPerms={draftPerms[sub.id]}
                    nameError={nameErrors[sub.id]}
                    onNameChange={(value) => handleNameChange(sub.id, value)}
                    onPermChange={(moduleName, level) => handlePermChange(sub, moduleName, level)}
                    onCancelEdit={() => handleCancelEdit(sub.id)}
                    onSaveClick={() => handleSaveClick(parent.id, sub)}
                    onDeleteClick={() => requestDelete(parent.id, sub)}
                    onToggleSelfValidation={(targetSub) => {
                      setSubRolesByParent((prev) => ({
                        ...prev,
                        [parent.id]: (prev[parent.id] ?? []).map((s) =>
                          s.id === targetSub.id ? { ...s, allowSelfValidation: !(s.allowSelfValidation !== false) } : s,
                        ),
                      }))
                      showToast(`Self-validation policy updated for '${targetSub.name}'.`)
                    }}
                  />
                ))}

                {creating?.parentId === parent.id && (
                  <div
                    className={cn(
                      'flex flex-wrap items-start gap-3 px-4 py-3.5 sm:px-5',
                      subRoles.length > 0 && 'border-t border-border/60',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <input
                        autoFocus
                        value={creating.name}
                        onChange={(e) => setCreating({ parentId: parent.id, name: e.target.value })}
                        placeholder="New sub-role name"
                        className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                      />
                      {createError && <p className="mt-1 text-[0.65rem] text-destructive">{createError}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(null)
                        setCreateError('')
                      }}
                      className="rounded-md border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => submitCreate(parent.id)}
                      disabled={!creating.name.trim()}
                      className={cn(
                        'rounded-md px-3.5 py-1.5 text-xs font-semibold transition',
                        creating.name.trim()
                          ? 'bg-primary text-primary-foreground hover:opacity-90'
                          : 'cursor-not-allowed bg-muted text-muted-foreground/50',
                      )}
                    >
                      Create sub-role
                    </button>
                  </div>
                )}
              </div>
            </section>
          )
        })}

        {/* Ground Crew: recursive tree of arbitrary depth */}
        <section>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-medium text-foreground">{GROUND_CREW_PARENT.name}</h2>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground text-pretty">
                {GROUND_CREW_PARENT.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startTreeCreate(null)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              New top-level tier
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {groundCrewTree.map((node, index) => (
              <TreeNodeRow
                key={node.id}
                node={node}
                depth={0}
                parentId={null}
                first={index === 0}
                isEnabled={activeSet.has(node.id)}
                expandedPanel={expanded}
                expandedContainers={expandedContainers}
                draftName={draftName}
                draftPerms={draftPerms}
                nameErrors={nameErrors}
                creatingUnder={creatingUnder}
                createError={createError}
                onToggleEnable={toggleSubRole}
                onTogglePanel={(id) => setExpanded((cur) => (cur === id ? null : id))}
                onToggleContainer={toggleContainer}
                onNameChange={handleNameChange}
                onPermChange={handlePermChange}
                onCancelEdit={handleCancelEdit}
                onSaveClick={handleTreeSaveClick}
                onDeleteClick={requestTreeDelete}
                onStartCreate={startTreeCreateUnder}
                onCreatingNameChange={(value) => setCreatingUnder((cur) => (cur ? { ...cur, name: value } : cur))}
                onCancelCreate={() => {
                  setCreatingUnder(null)
                  setCreateError('')
                }}
                onSubmitCreate={submitTreeCreate}
              />
            ))}

            {creatingUnder?.parentId === null && (
              <div
                className={cn(
                  'flex flex-wrap items-start gap-3 px-4 py-3.5 sm:px-5',
                  groundCrewTree.length > 0 && 'border-t border-border/60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <input
                    autoFocus
                    value={creatingUnder.name}
                    onChange={(e) => setCreatingUnder({ parentId: null, name: e.target.value })}
                    placeholder="New top-level tier name"
                    className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                  {createError && <p className="mt-1 text-[0.65rem] text-destructive">{createError}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingUnder(null)
                    setCreateError('')
                  }}
                  className="rounded-md border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitTreeCreate}
                  disabled={!creatingUnder.name.trim()}
                  className={cn(
                    'rounded-md px-3.5 py-1.5 text-xs font-semibold transition',
                    creatingUnder.name.trim()
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'cursor-not-allowed bg-muted text-muted-foreground/50',
                  )}
                >
                  Create tier
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {ackAction && (
        <AckConfirmModal action={ackAction} onCancel={() => setAckAction(null)} onConfirm={confirmAck} />
      )}

      {treeAckAction && (
        <AckConfirmModal action={treeAckAction} onCancel={() => setTreeAckAction(null)} onConfirm={confirmTreeAck} />
      )}

      {pinAction && (
        <PinConfirmModal
          action={pinAction}
          pin={pinValue}
          onPinChange={(v) => {
            setPinValue(v)
            setPinError('')
          }}
          error={pinError}
          locked={isLocked}
          lockLabel={lockLabel}
          onCancel={cancelPin}
          onSubmit={submitPin}
        />
      )}

      {pinSetupNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Set your confirmation PIN"
        >
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-2xl">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Confirmation PIN required
            </p>
            <p className="mt-3 text-sm leading-relaxed text-card-foreground">
              Creating or deleting a sub-role requires a 6-digit confirmation PIN. You haven&rsquo;t set one up yet
              — open your profile menu (top right) and choose &ldquo;Set confirmation PIN&rdquo; under Security,
              then try again.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPinSetupNotice(false)}
                className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          className={cn(
            'fixed bottom-6 right-6 z-50 max-w-sm rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg transition-opacity duration-500',
            toastVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          {toastMessage}
        </div>
      )}
    </AdminShell>
  )
}

/* ----------------------------- Sub-role row ----------------------------- */

interface SubRoleRowProps {
  sub: SubRole
  first: boolean
  isEnabled: boolean
  isOpen: boolean
  onToggleEnable: () => void
  onToggleExpand: () => void
  draftName?: string
  draftPerms?: { module: string; level: AccessLevel; note: string }[]
  nameError?: string
  onNameChange: (value: string) => void
  onPermChange: (moduleName: string, level: AccessLevel) => void
  onCancelEdit: () => void
  onSaveClick: () => void
  onDeleteClick: () => void
  onToggleSelfValidation?: (sub: SubRole) => void
}

function SubRoleRow({
  sub,
  first,
  isEnabled,
  isOpen,
  onToggleEnable,
  onToggleExpand,
  draftName,
  draftPerms,
  nameError,
  onNameChange,
  onPermChange,
  onCancelEdit,
  onSaveClick,
  onDeleteClick,
  onToggleSelfValidation,
}: SubRoleRowProps) {
  const comingSoon = !!sub.comingSoon
  const effectiveName = draftName ?? sub.name
  const effectivePerms = draftPerms ?? sub.permissions
  const permsDirty = !!draftPerms && draftPerms.some((p, i) => p.level !== sub.permissions[i].level)
  const nameDirty = !!draftName && draftName.trim() !== sub.name && draftName.trim() !== ''
  const dirty = permsDirty || nameDirty

  return (
    <Fragment>
      <div
        className={cn(
          'flex items-center gap-4 px-4 py-3.5 transition-colors sm:px-5',
          !first && 'border-t border-border/60',
          comingSoon ? 'opacity-55' : isOpen && 'bg-muted/40',
        )}
      >
        {/* Expand trigger + label */}
        <button
          type="button"
          onClick={comingSoon ? undefined : onToggleExpand}
          disabled={comingSoon}
          aria-expanded={isOpen}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 text-left',
            comingSoon ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              isOpen && 'rotate-180',
              comingSoon && 'invisible',
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-card-foreground">{sub.name}</p>
              {comingSoon ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <Lock className="size-2.5" aria-hidden="true" />
                  Coming soon
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-emerald-300">
                  Modifies: {sub.domain}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub.summary}</p>
          </div>
        </button>

        {/* On/off toggle */}
        <Toggle
          checked={isEnabled && !comingSoon}
          disabled={comingSoon}
          onChange={onToggleEnable}
          label={`${sub.name} enabled`}
        />
      </div>

      {isOpen && !comingSoon && (
        <div className="admin-fade border-t border-border/60 bg-muted/20 px-4 pb-5 pt-4 sm:px-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <label
                className="block text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                htmlFor={`subrole-name-${sub.id}`}
              >
                Sub-role name
              </label>
              <input
                id={`subrole-name-${sub.id}`}
                value={effectiveName}
                onChange={(e) => onNameChange(e.target.value)}
                className="mt-1.5 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
              {nameError && <p className="mt-1 text-[0.65rem] text-destructive">{nameError}</p>}
            </div>
            <button
              type="button"
              onClick={onDeleteClick}
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-destructive/40 px-3 py-1.5 text-[0.65rem] font-semibold text-destructive transition hover:bg-destructive/10 sm:self-end"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Delete sub-role
            </button>
          </div>

          {/* Self-Validation RBAC Configuration */}
          {(() => {
            const isSignOffCapable =
              sub.id === 'warehouse-manager' ||
              sub.id === 'inventory-officer' ||
              sub.name === 'Warehouse Manager' ||
              sub.name === 'Inventory Officer'
            return (
              <div className="mb-4 rounded-lg border border-border bg-background/60 p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-card-foreground">Self-Validation on Audit Holds</p>
                    {!isSignOffCapable && (
                      <span className="rounded bg-muted px-2 py-0.5 text-[0.55rem] font-medium text-muted-foreground">
                        Not Applicable
                      </span>
                    )}
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground leading-relaxed mt-0.5">
                    {isSignOffCapable
                      ? 'When enabled (ON), officers in this sub-role may self-validate audit holds with PIN & justification. When disabled (OFF), dual-custody is enforced.'
                      : 'Self-validation is only applicable for damage sign-off sub-roles (Warehouse Manager, Inventory Officer).'}
                  </p>
                  {sub.permanentlyEnabledViaEmergency && sub.emergencyUnblockMetadata && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-500/15 px-2.5 py-0.5 text-[0.6rem] font-semibold text-amber-300">
                      ⚠️ Permanently enabled via Emergency Unblock by {sub.emergencyUnblockMetadata.unblockedByAdminEmail}
                    </span>
                  )}
                </div>
                <div title={!isSignOffCapable ? "Self-validation is only applicable for damage sign-off sub-roles (Warehouse Manager, Inventory Officer)." : undefined}>
                  <Toggle
                    checked={isSignOffCapable && sub.allowSelfValidation !== false}
                    disabled={!isSignOffCapable}
                    onChange={() => isSignOffCapable && onToggleSelfValidation?.(sub)}
                    label="Allow Self-Validation"
                  />
                </div>
              </div>
            )
          })()}

          <p className="mb-3 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Permission detail — by module
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-background/60">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Module
                  </th>
                  <th className="px-4 py-2.5 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Access
                  </th>
                  <th className="px-4 py-2.5 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {effectivePerms.map((perm) => (
                  <tr key={perm.module} className="border-t border-border/50">
                    <td className="px-4 py-2.5 text-xs font-medium text-card-foreground">
                      {perm.module}
                    </td>
                    <td className="px-4 py-2.5">
                      <AccessLevelSelect
                        value={perm.level}
                        onChange={(level) => onPermChange(perm.module, level)}
                        label={`${sub.name} — ${perm.module} access`}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-[0.7rem] leading-relaxed text-muted-foreground">
                      {perm.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={!dirty}
              onClick={onCancelEdit}
              className={cn(
                'rounded-md border px-4 py-2 text-xs font-semibold transition',
                dirty
                  ? 'border-destructive text-destructive hover:bg-destructive/10'
                  : 'cursor-not-allowed border-border text-muted-foreground/40',
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!dirty}
              onClick={onSaveClick}
              className={cn(
                'rounded-md px-4 py-2 text-xs font-semibold transition',
                dirty
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground/40',
              )}
            >
              Save changes
            </button>
          </div>
        </div>
      )}
    </Fragment>
  )
}

/* ----------------------------- Ground Crew tree row (recursive) ----------------------------- */

// Base left padding plus per-depth indent step, in pixels — arbitrary
// nesting depth means this can't be expressed as a fixed Tailwind class, so
// indentation is the one place this component reaches for inline style.
const TREE_INDENT_BASE = 16
const TREE_INDENT_STEP = 22

interface TreeNodeRowProps {
  node: SubRoleNode
  depth: number
  parentId: string | null
  first: boolean
  isEnabled: boolean
  expandedPanel: string | null
  expandedContainers: Set<string>
  draftName: Record<string, string>
  draftPerms: Record<string, { module: string; level: AccessLevel; note: string }[]>
  nameErrors: Record<string, string>
  creatingUnder: { parentId: string | null; name: string } | null
  createError: string
  onToggleEnable: (id: string) => void
  onTogglePanel: (id: string) => void
  onToggleContainer: (id: string) => void
  onNameChange: (id: string, value: string) => void
  onPermChange: (node: SubRoleNode, moduleName: string, level: AccessLevel) => void
  onCancelEdit: (id: string) => void
  onSaveClick: (parentId: string | null, node: SubRoleNode) => void
  onDeleteClick: (node: SubRoleNode) => void
  onStartCreate: (parentId: string) => void
  onCreatingNameChange: (value: string) => void
  onCancelCreate: () => void
  onSubmitCreate: () => void
}

function TreeNodeRow({
  node,
  depth,
  parentId,
  first,
  isEnabled,
  expandedPanel,
  expandedContainers,
  draftName,
  draftPerms,
  nameErrors,
  creatingUnder,
  createError,
  onToggleEnable,
  onTogglePanel,
  onToggleContainer,
  onNameChange,
  onPermChange,
  onCancelEdit,
  onSaveClick,
  onDeleteClick,
  onStartCreate,
  onCreatingNameChange,
  onCancelCreate,
  onSubmitCreate,
}: TreeNodeRowProps) {
  const comingSoon = !!node.comingSoon
  const leaf = isLeafNode(node)
  const isPanelOpen = leaf && expandedPanel === node.id
  const isContainerOpen = expandedContainers.has(node.id)
  const effectiveName = draftName[node.id] ?? node.name
  const effectivePerms = draftPerms[node.id] ?? node.permissions
  const nameError = nameErrors[node.id]
  const permsDirty =
    leaf && !!draftPerms[node.id] && draftPerms[node.id].some((p, i) => p.level !== node.permissions[i]?.level)
  const nameDirty = !!draftName[node.id] && draftName[node.id].trim() !== node.name && draftName[node.id].trim() !== ''
  const dirty = permsDirty || nameDirty
  const pending = leaf && !comingSoon && !isNodeConfigured(node)
  const isCreatingHere = creatingUnder?.parentId === node.id
  const indent = TREE_INDENT_BASE + depth * TREE_INDENT_STEP

  return (
    <Fragment>
      <div
        className={cn(
          'flex items-center gap-3 py-3 pr-4 transition-colors sm:pr-5',
          !first && 'border-t border-border/60',
          comingSoon ? 'opacity-55' : isPanelOpen && 'bg-muted/40',
        )}
        style={{ paddingLeft: indent }}
      >
        <button
          type="button"
          onClick={comingSoon ? undefined : leaf ? () => onTogglePanel(node.id) : () => onToggleContainer(node.id)}
          disabled={comingSoon}
          aria-expanded={leaf ? isPanelOpen : isContainerOpen}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 text-left',
            comingSoon ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              (leaf ? isPanelOpen : isContainerOpen) && 'rotate-180',
              comingSoon && 'invisible',
            )}
            aria-hidden="true"
          />
          {leaf ? (
            <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : isContainerOpen ? (
            <FolderOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-card-foreground">{node.name}</p>
              {comingSoon ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <Lock className="size-2.5" aria-hidden="true" />
                  Coming soon
                </span>
              ) : leaf ? (
                pending ? (
                  <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-amber-300">
                    Needs configuration
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-emerald-300">
                    Assignable tier
                  </span>
                )
              ) : (
                <span className="rounded-full bg-sky-500/12 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-sky-300">
                  {node.children.length} nested tier{node.children.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {node.summary && <p className="mt-0.5 truncate text-xs text-muted-foreground">{node.summary}</p>}
          </div>
        </button>

        {leaf && !comingSoon && (
          <Toggle checked={isEnabled} onChange={() => onToggleEnable(node.id)} label={`${node.name} enabled`} />
        )}

        {/* Container nodes have no bottom permission panel to host a delete
            action, so they get a compact delete affordance right on the row
            itself. Leaf nodes already expose Delete inside their panel below,
            so this stays hidden for them to avoid a duplicate control. */}
        {!leaf && !comingSoon && (
          <button
            type="button"
            onClick={() => onDeleteClick(node)}
            aria-label={`Delete ${node.name}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/40 px-2.5 py-1.5 text-[0.65rem] font-semibold text-destructive transition hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        )}
      </div>

      {/* Leaf permission panel — only meaningful while this node has no children */}
      {isPanelOpen && !comingSoon && (
        <div className="admin-fade border-t border-border/60 bg-muted/20 pb-5 pt-4" style={{ paddingLeft: indent, paddingRight: '1.25rem' }}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <label
                className="block text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                htmlFor={`tree-name-${node.id}`}
              >
                Sub-role name
              </label>
              <input
                id={`tree-name-${node.id}`}
                value={effectiveName}
                onChange={(e) => onNameChange(node.id, e.target.value)}
                className="mt-1.5 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              />
              {nameError && <p className="mt-1 text-[0.65rem] text-destructive">{nameError}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onStartCreate(node.id)}
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 px-3 py-1.5 text-[0.65rem] font-semibold text-primary transition hover:bg-primary/10"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add sub-role
              </button>
              <button
                type="button"
                onClick={() => onDeleteClick(node)}
                className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-[0.65rem] font-semibold text-destructive transition hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete sub-role
              </button>
            </div>
          </div>

          <p className="mb-3 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Permission detail — by module
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-background/60">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Module
                  </th>
                  <th className="px-4 py-2.5 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Access
                  </th>
                  <th className="px-4 py-2.5 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {effectivePerms.map((perm) => (
                  <tr key={perm.module} className="border-t border-border/50">
                    <td className="px-4 py-2.5 text-xs font-medium text-card-foreground">{perm.module}</td>
                    <td className="px-4 py-2.5">
                      <AccessLevelSelect
                        value={perm.level}
                        onChange={(level) => onPermChange(node, perm.module, level)}
                        label={`${node.name} — ${perm.module} access`}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-[0.7rem] leading-relaxed text-muted-foreground">{perm.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={!dirty}
              onClick={() => onCancelEdit(node.id)}
              className={cn(
                'rounded-md border px-4 py-2 text-xs font-semibold transition',
                dirty
                  ? 'border-destructive text-destructive hover:bg-destructive/10'
                  : 'cursor-not-allowed border-border text-muted-foreground/40',
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => onSaveClick(parentId, node)}
              className={cn(
                'rounded-md px-4 py-2 text-xs font-semibold transition',
                dirty
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground/40',
              )}
            >
              Save changes
            </button>
          </div>
        </div>
      )}

      {/* Children — visible once this node is a container, or the admin just
          asked to nest a first child under what was, until now, a leaf. */}
      {isContainerOpen && !comingSoon && (
        <div className="border-t border-border/60 bg-muted/10">
          {node.children.map((child, index) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              parentId={node.id}
              first={index === 0}
              isEnabled={isEnabled}
              expandedPanel={expandedPanel}
              expandedContainers={expandedContainers}
              draftName={draftName}
              draftPerms={draftPerms}
              nameErrors={nameErrors}
              creatingUnder={creatingUnder}
              createError={createError}
              onToggleEnable={onToggleEnable}
              onTogglePanel={onTogglePanel}
              onToggleContainer={onToggleContainer}
              onNameChange={onNameChange}
              onPermChange={onPermChange}
              onCancelEdit={onCancelEdit}
              onSaveClick={onSaveClick}
              onDeleteClick={onDeleteClick}
              onStartCreate={onStartCreate}
              onCreatingNameChange={onCreatingNameChange}
              onCancelCreate={onCancelCreate}
              onSubmitCreate={onSubmitCreate}
            />
          ))}

          {isCreatingHere ? (
            <div
              className={cn(
                'flex flex-wrap items-start gap-3 py-3 pr-4 sm:pr-5',
                node.children.length > 0 && 'border-t border-border/60',
              )}
              style={{ paddingLeft: indent + TREE_INDENT_STEP }}
            >
              <div className="min-w-0 flex-1">
                <input
                  autoFocus
                  value={creatingUnder.name}
                  onChange={(e) => onCreatingNameChange(e.target.value)}
                  placeholder="New nested tier name"
                  className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
                {createError && <p className="mt-1 text-[0.65rem] text-destructive">{createError}</p>}
              </div>
              <button
                type="button"
                onClick={onCancelCreate}
                className="rounded-md border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmitCreate}
                disabled={!creatingUnder.name.trim()}
                className={cn(
                  'rounded-md px-3.5 py-1.5 text-xs font-semibold transition',
                  creatingUnder.name.trim()
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground/50',
                )}
              >
                Create tier
              </button>
            </div>
          ) : (
            <div
              className={cn('py-2.5 pr-4 sm:pr-5', node.children.length > 0 && 'border-t border-border/60')}
              style={{ paddingLeft: indent + TREE_INDENT_STEP }}
            >
              <button
                type="button"
                onClick={() => onStartCreate(node.id)}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-[0.65rem] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add sub-role
              </button>
            </div>
          )}
        </div>
      )}
    </Fragment>
  )
}

/* ----------------------------- Access level dropdown ----------------------------- */

function AccessLevelSelect({
  value,
  onChange,
  label,
}: {
  value: AccessLevel
  onChange: (level: AccessLevel) => void
  label: string
}) {
  return (
    <div className="relative inline-block">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as AccessLevel)}
        className={cn(
          'appearance-none rounded-full py-1 pl-2.5 pr-6 text-[0.55rem] font-bold uppercase tracking-[0.1em] outline-none transition focus:ring-2 focus:ring-ring/40',
          'cursor-pointer',
          levelStyles[value],
        )}
      >
        {ACCESS_LEVELS.map((l) => (
          <option key={l.level} value={l.level} className="bg-popover text-popover-foreground normal-case">
            {l.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-1.5 top-1/2 size-2.5 -translate-y-1/2 text-current"
        aria-hidden="true"
      />
    </div>
  )
}

/* ----------------------------- Acknowledgement modal (routine modify/rename) ----------------------------- */

function AckConfirmModal({
  action,
  onCancel,
  onConfirm,
}: {
  // Shared display shape — satisfied by both the flat (WOM) AckAction and
  // the tree (Ground Crew) TreeAckAction, since this modal only ever reads
  // name/newName/changes.
  action: AckChangeSummary
  onCancel: () => void
  onConfirm: () => void
}) {
  const singleSimple = action.changes.length === 1 && !action.newName

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm change"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-2xl">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Confirm change
        </p>
        {singleSimple ? (
          <p className="mt-3 text-sm leading-relaxed text-card-foreground">
            You&apos;re about to change <span className="font-semibold">{action.changes[0].module}</span>{' '}
            access for <span className="font-semibold">{action.name}</span> from{' '}
            <span className="font-semibold">{action.changes[0].from}</span> to{' '}
            <span className="font-semibold">{action.changes[0].to}</span>.
          </p>
        ) : (
          <div className="mt-3 space-y-1.5 text-sm leading-relaxed text-card-foreground">
            {action.newName && (
              <p>
                Rename <span className="font-semibold">{action.name}</span> to{' '}
                <span className="font-semibold">{action.newName}</span>.
              </p>
            )}
            {action.changes.map((c) => (
              <p key={c.module}>
                Change <span className="font-semibold">{c.module}</span> access from{' '}
                <span className="font-semibold">{c.from}</span> to <span className="font-semibold">{c.to}</span>.
              </p>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- PIN confirmation modal (create/delete) ----------------------------- */

function PinConfirmModal({
  action,
  pin,
  onPinChange,
  error,
  locked,
  lockLabel,
  onCancel,
  onSubmit,
}: {
  action: PinAction
  pin: string
  onPinChange: (value: string) => void
  error: string
  locked: boolean
  lockLabel: string
  onCancel: () => void
  onSubmit: () => void
}) {
  const isCreateAction = action.type === 'create' || action.type === 'tree-create'
  const verb = isCreateAction ? 'add' : 'delete'
  const canSubmit = pin.length === 6 && !locked
  const cascadeNote =
    action.type === 'tree-delete' && action.descendantCount > 0
      ? ` and its ${action.descendantCount} nested sub-role${action.descendantCount === 1 ? '' : 's'}`
      : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isCreateAction ? 'Confirm new sub-role' : 'Confirm sub-role deletion'}
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-2xl">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {isCreateAction ? 'Confirm new sub-role' : 'Confirm deletion'}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-card-foreground">
          Are you sure you want to {verb} the sub-role &lsquo;{action.name}&rsquo;{cascadeNote}?
        </p>
        <div className="mt-5 text-left">
          <MaskedPinInput
            id="rbac-pin-input"
            label="6-digit PIN"
            value={pin}
            onChange={onPinChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) onSubmit()
            }}
            disabled={locked}
            autoFocus
          />
        </div>
        {locked ? (
          <p className="mt-2 text-xs text-destructive">Locked — try again in {lockLabel}.</p>
        ) : error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className={cn(
              'rounded-md px-4 py-2 text-xs font-semibold transition',
              canSubmit
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'cursor-not-allowed bg-muted text-muted-foreground/50',
            )}
          >
            {isCreateAction ? 'Confirm' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Toggle switch ----------------------------- */

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        disabled
          ? 'cursor-not-allowed bg-muted'
          : checked
            ? 'bg-primary'
            : 'bg-input hover:bg-input/80',
      )}
    >
      <span
        className={cn(
          'inline-block size-4 rounded-full bg-background shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

export default AdminRolesPage
