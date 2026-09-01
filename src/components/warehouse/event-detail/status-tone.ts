// Shared pill/banner tone system for the Event Detail View, built entirely
// from the app's existing 5-color palette (no new hues introduced):
//   neutral   → muted        ("Not Started", "No Dispatch Yet", empty states)
//   progress  → accent       ("In Production", "In Transit", "Pending")
//   positive  → primary      ("Ready", "On Track", "Confirmed", "Matched")
//   caution   → destructive/soft ("Attention Needed", "Delayed", "Short")
//   critical  → destructive/solid ("Blocked", "Pahabol", "Unavailable")
export type Tone = 'neutral' | 'progress' | 'positive' | 'caution' | 'critical'

export const toneClasses: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  progress: 'bg-accent text-accent-foreground',
  positive: 'bg-primary/15 text-primary',
  caution: 'bg-destructive/15 text-destructive',
  critical: 'bg-destructive text-background',
}

export const toneDot: Record<Tone, string> = {
  neutral: 'bg-muted-foreground',
  progress: 'bg-accent-foreground',
  positive: 'bg-primary',
  caution: 'bg-destructive',
  critical: 'bg-background',
}
