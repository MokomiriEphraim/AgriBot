"use client"

import { Bug, Pill, ShieldCheck, UserCheck, type LucideIcon } from "lucide-react"
import type { QuickOption } from "@/lib/types"
import { cn } from "@/lib/utils"

interface QuickOptionItem {
  id: QuickOption
  label: string
  icon: LucideIcon
  color: string
}

const OPTIONS: QuickOptionItem[] = [
  { id: "diagnose", label: "Diagnose", icon: Bug, color: "text-emerald-600 dark:text-emerald-400" },
  { id: "treatment", label: "Treatment", icon: Pill, color: "text-blue-600 dark:text-blue-400" },
  { id: "prevention", label: "Prevention", icon: ShieldCheck, color: "text-amber-600 dark:text-amber-400" },
  { id: "expert", label: "Talk to expert", icon: UserCheck, color: "text-purple-600 dark:text-purple-400" },
]

interface QuickOptionsProps {
  onSelect: (option: QuickOption) => void
  disabled?: boolean
}

export function QuickOptions({ onSelect, disabled }: QuickOptionsProps) {
  return (
    <div className="flex items-end gap-2">
      <div className="max-w-[88%] space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-card-foreground shadow-sm transition-all",
                "hover:border-accent hover:bg-secondary hover:scale-[1.02] active:scale-[0.98]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <opt.icon className={cn("size-4 shrink-0", opt.color)} />
              <span className="leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
