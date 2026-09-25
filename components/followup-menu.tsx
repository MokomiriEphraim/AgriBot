"use client"

import { Bug, Home, Leaf, Landmark, CloudSun, Tractor, type LucideIcon } from "lucide-react"

export interface FollowupOption {
  id: string
  label: string
  icon: LucideIcon
}

const FOLLOWUP_OPTIONS: FollowupOption[] = [
  { id: "pests-diseases", label: "Pest identification", icon: Bug },
  { id: "crop-problems", label: "Other crop problems", icon: Leaf },
  { id: "planting-growing", label: "Farming practices", icon: Tractor },
  { id: "weather-advice", label: "Weather advice", icon: CloudSun },
  { id: "soil-nutrients", label: "Agricultural services", icon: Landmark },
]

interface FollowupMenuProps {
  onSelect: (id: string) => void
  onMainMenu: () => void
}

export function FollowupMenu({ onSelect, onMainMenu }: FollowupMenuProps) {
  return (
    <div className="space-y-2 pl-11">
      {FOLLOWUP_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-card-foreground shadow-sm transition-colors hover:border-accent hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <opt.icon className="size-4 shrink-0 text-accent" />
          {opt.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onMainMenu}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Home className="size-4" />
        Back to main menu
      </button>
    </div>
  )
}
