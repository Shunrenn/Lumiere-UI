import { Info } from 'lucide-react'

type Status = 'Urgent' | 'Action' | 'Healthy' | 'In Progress' | 'Scheduled'

interface ChecklistItem {
  title: string
  description: string
  status: Status
}

const statusStyles: Record<Status, string> = {
  Urgent: 'bg-rose-100 text-rose-700',
  Action: 'bg-amber-100 text-amber-800',
  Healthy: 'bg-emerald-100 text-emerald-700',
  'In Progress': 'bg-sky-100 text-sky-700',
  Scheduled: 'bg-violet-100 text-violet-700',
}

const items: ChecklistItem[] = [
  {
    title: 'SSL Certificate Renewal Due',
    description:
      'Wildcard cert *.lumiere.events expires 28 May 2025. Renewal request initiated via LetsEncrypt pipeline — confirm DNS propagation by 22 May.',
    status: 'Urgent',
  },
  {
    title: 'Quarterly Role & Permission Audit',
    description:
      'Access control review window opens 15 May. All department heads must confirm or revoke inherited permissions for contract staff by EOD 17 May.',
    status: 'Action',
  },
  {
    title: 'Database Replication Node Added',
    description:
      'Node DB-R3 (Frankfurt) is live and replicating from primary. Read throughput across EU region improved 38%. Zero sync errors in last 72h.',
    status: 'Healthy',
  },
  {
    title: 'Two-Factor Auth Rollout — Phase 2',
    description:
      'Phase 2 mandates 2FA for all Manning Officers and Venue Leads from 20 May. Enforcement policy to be pushed via admin portal before deployment window.',
    status: 'In Progress',
  },
  {
    title: 'Backup Integrity Verification',
    description:
      'Monthly cold storage restoration test scheduled 16 May 02:00 UTC. Estimated 4h window. Non-critical environments only. Ops team notified.',
    status: 'Scheduled',
  },
]

export function AdminChecklist() {
  return (
    <section className="rounded-xl border border-border bg-card p-7">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        System Administration
      </p>
      <h2 className="mt-2 font-serif text-3xl font-medium leading-tight text-card-foreground text-balance">
        Admin Infrastructure
        <br />
        Notes &amp; Checklist
      </h2>

      <ul className="mt-6 divide-y divide-border">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <Info className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-card-foreground">{item.title}</h3>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] ${statusStyles[item.status]}`}
                >
                  {item.status}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
