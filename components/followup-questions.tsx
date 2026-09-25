"use client"

import { MapPin, Clock } from "lucide-react"
import type { Region } from "@/lib/types"
import { cn } from "@/lib/utils"

const REGIONS: { id: Region; label: string; hint: string }[] = [
  { id: "tropical", label: "Tropical / humid", hint: "Warm and wet most of the year" },
  { id: "arid", label: "Dry / arid", hint: "Low rainfall, hot and dry" },
  { id: "temperate", label: "Temperate", hint: "Distinct warm and cool seasons" },
  { id: "highland", label: "Highland / cool", hint: "Cooler high-altitude climate" },
]

const DURATIONS = [
  { id: "just-started", label: "Just started" },
  { id: "few-days", label: "A few days" },
  { id: "one-week", label: "About a week" },
  { id: "two-weeks", label: "2+ weeks" },
  { id: "long-time", label: "A long time" },
]

interface RegionPromptProps {
  onSelect: (region: Region) => void
}

export function RegionPrompt({ onSelect }: RegionPromptProps) {
  return (
    <div className="flex items-end gap-2">
      <div className="max-w-[88%] space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MapPin className="size-3.5" />
          Select your region:
        </div>
        <div className="grid grid-cols-2 gap-2">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-card-foreground shadow-sm transition-all",
                "hover:border-accent hover:bg-secondary hover:scale-[1.02] active:scale-[0.98]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <span className="leading-tight">{r.label}</span>
              <span className="text-[10px] text-muted-foreground">{r.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface DurationPromptProps {
  onSelect: (duration: string) => void
}

export function DurationPrompt({ onSelect }: DurationPromptProps) {
  return (
    <div className="flex items-end gap-2">
      <div className="max-w-[88%] space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="size-3.5" />
          How long has this been happening?
        </div>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.label)}
              className={cn(
                "rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-card-foreground shadow-2xs transition-all",
                "hover:scale-105 hover:border-primary/40 hover:bg-secondary active:scale-95",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
