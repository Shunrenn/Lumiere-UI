import { toneClasses, toneDot, type Tone } from '@/components/warehouse/event-detail/status-tone'

interface StateBannerProps {
  label: string
  tone: Tone
}

export function StateBanner({ label, tone }: StateBannerProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] ${toneClasses[tone]}`}
    >
      <span className={`size-2 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
      {label}
    </div>
  )
}
