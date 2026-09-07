import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TickerItem {
    id: string
    title: string
    subtitle: string
    tone: 'rose' | 'amber' | 'sky' | 'emerald'
    icon: LucideIcon
    actionLabel?: string
    onAction?: () => void
}

type TabKey = 'urgent' | 'highlight' | 'softAlert'

interface ExecutiveOngoingAlertsProps {
    urgent: TickerItem[]
    highlight: TickerItem[]
    softAlert: TickerItem[]
}

const toneStyles: Record<TickerItem['tone'], string> = {
    sky: 'text-sky-400',
    rose: 'text-rose-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
}

const TABS: { key: TabKey; label: string }[] = [
    { key: 'urgent', label: 'Urgent' },
    { key: 'highlight', label: 'Highlight' },
    { key: 'softAlert', label: 'Soft Alert' },
]

export function ExecutiveOngoingAlerts({ urgent, highlight, softAlert }: ExecutiveOngoingAlertsProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('urgent')
    const prevUrgentIds = useRef<string[]>(urgent.map((i) => i.id))

    // A NEW Urgent item (one not seen on the previous render) auto-switches
    // the ticker back to the Urgent tab, even if the user is elsewhere.
    useEffect(() => {
        const currentIds = urgent.map((i) => i.id)
        const hasNewItem = currentIds.some((id) => !prevUrgentIds.current.includes(id))
        if (hasNewItem) {
            setActiveTab('urgent')
        }
        prevUrgentIds.current = currentIds
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urgent])

    const itemsByTab: Record<TabKey, TickerItem[]> = { urgent, highlight, softAlert }
    const items = itemsByTab[activeTab]
    const isEmpty = items.length === 0

    return (
        <section className="flex h-[24rem] flex-col rounded-xl border border-border bg-card p-5 text-card-foreground">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                    Ongoing Alerts
                </h2>
                <div
                    className="inline-flex rounded-md border border-border p-0.5"
                    role="tablist"
                    aria-label="Ongoing alerts tabs"
                >
                    {TABS.map((tab) => {
                        const count = itemsByTab[tab.key].length
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    'flex items-center gap-1.5 rounded px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] transition',
                                    activeTab === tab.key
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span
                                        className={cn(
                                            'flex size-4 items-center justify-center rounded-full text-[0.55rem] font-bold',
                                            activeTab === tab.key
                                                ? 'bg-primary-foreground/20'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {isEmpty ? (
                <p className="mt-4 text-xs italic text-muted-foreground">Nothing to flag right now.</p>
            ) : (
                <ul key={activeTab} className="admin-fade mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
                    {items.map((item) => {
                        const Icon = item.icon
                        return (
                            <li
                                key={item.id}
                                className="flex flex-col gap-2 border-t border-border/60 py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-start gap-2.5">
                                    <Icon
                                        className={cn('mt-0.5 size-4 shrink-0', toneStyles[item.tone])}
                                        aria-hidden="true"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                                        <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                                            {item.subtitle}
                                        </p>
                                    </div>
                                </div>

                                {item.onAction && (
                                    <button
                                        type="button"
                                        onClick={item.onAction}
                                        className="inline-flex w-full shrink-0 items-center justify-center rounded-md border border-border px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-muted sm:w-auto"
                                    >
                                        {item.actionLabel || 'Open'}
                                    </button>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}