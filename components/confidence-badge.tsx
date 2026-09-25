import { CircleCheck, AlertTriangle, XCircle } from "lucide-react"
import type { Confidence } from "@/lib/types"
import { cn } from "@/lib/utils"

const CONFIDENCE_CONFIG: Record<Confidence, { icon: typeof CircleCheck; label: string; color: string; bg: string }> = {
  high: {
    icon: CircleCheck,
    label: "High confidence",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950",
  },
  medium: {
    icon: AlertTriangle,
    label: "Medium confidence",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950",
  },
  low: {
    icon: XCircle,
    label: "Low confidence",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950",
  },
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const config = CONFIDENCE_CONFIG[confidence]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.bg,
        config.color,
      )}
    >
      <Icon className="size-3.5" />
      {config.label}
    </div>
  )
}
