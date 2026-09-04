import { useState } from 'react'
import { X, Sliders, Info, Check } from 'lucide-react'
import {
  getBespokeSubCategoryConfigs,
  updateBespokeSubCategoryConfig,
  type BespokeSubCategoryConfig,
} from '@/lib/warehouse-catalog'

interface SubCategorySettingsModalProps {
  onClose: () => void
}

export function SubCategorySettingsModal({ onClose }: SubCategorySettingsModalProps) {
  const [configs, setConfigs] = useState<Record<string, BespokeSubCategoryConfig>>(getBespokeSubCategoryConfigs())
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleUpdate = (subCategory: string, val: number) => {
    const clamped = Math.max(1, Math.min(10, val))
    updateBespokeSubCategoryConfig(subCategory, clamped)
    setConfigs({ ...getBespokeSubCategoryConfigs() })
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sliders className="size-5" />
            </span>
            <div>
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-primary">Sub-Category Configuration</p>
              <h2 className="font-serif text-lg font-medium text-foreground">Parallel Worker Limits (Diminishing Returns)</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Informational Guidance */}
        <div className="border-b border-border bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
          <Info className="size-4 shrink-0 text-primary mt-0.5" />
          <p className="leading-relaxed">
            Sets the <code className="font-mono text-foreground font-semibold">maxParallelWorkers</code> cap per bespoke
            sub-category. Adding crew beyond this limit will not reduce unit build duration, preventing unrealistic linear
            scaling.
          </p>
        </div>

        {/* Config List */}
        <div className="max-h-80 overflow-y-auto p-6 space-y-4 text-xs">
          {Object.values(configs).map((cfg) => (
            <div
              key={cfg.subCategory}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-background p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground text-sm">{cfg.subCategory}</p>
                {cfg.description && (
                  <p className="text-[0.65rem] text-muted-foreground mt-0.5">{cfg.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="text-[0.6rem] font-bold uppercase text-muted-foreground">Max Parallel Crew:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={cfg.maxParallelWorkers}
                    onChange={(e) => handleUpdate(cfg.subCategory, Number(e.target.value) || 1)}
                    className="w-16 rounded-md border border-input bg-card px-2.5 py-1.5 text-center font-mono font-bold text-sm text-foreground outline-none focus:border-primary"
                  />
                  <span className="text-[0.65rem] text-muted-foreground">workers</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
          <div>
            {savedSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="size-3.5" /> Changes saved to engine
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
