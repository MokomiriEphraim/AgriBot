"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Clock, Shield, Sparkles, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProgressionData {
  crop: string
  symptom: string
  untreatedUrl: string
  treatedUrl: string
  isHealthy?: boolean
  healthStatus?: string
  timeline?: {
    day3: string
    day7: string
    day14: string
    day14Treated: string
  }
  rateLimit?: {
    imagesGenerated: boolean
    used: number
    limit: number
    remaining: number
    resetAt: string | null
  }
}

export function CropProgressionCard({
  data,
  onApplyTreatment,
}: {
  data: ProgressionData
  onApplyTreatment?: () => void
}) {
  const [activeTab, setActiveTab] = useState<"untreated" | "treated">("untreated")
  const [selectedDay, setSelectedDay] = useState<"day3" | "day7" | "day14">("day14")

  const isHealthy = data.isHealthy ?? false
  const untreatedLabel = isHealthy ? "Neglected Path" : "Untreated Path (Loss)"
  const treatedLabel = isHealthy ? "Well-Maintained" : "Treated Path (Recovery)"
  const untreatedOutcome = isHealthy ? "Outcome: Plant Decline & Stress" : "Outcome: 100% Crop Loss"
  const treatedOutcome = isHealthy ? "Outcome: Thriving & Healthy" : "Outcome: Full Harvest Recovery"

  const timeline = data.timeline || {
    day3: "Brown spots and fungal spores expand across adjoining leaves.",
    day7: "Severe defoliation, blackening stems, flowers abort.",
    day14: "Total canopy necrosis and rot — 100% crop lost.",
    day14Treated: "Complete pathogen recovery, lush green foliage, thriving harvest.",
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-lg bg-emerald-950 text-emerald-400">
            <Clock className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Crop Time-Machine Prognosis
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Visualizing the 14-day outcome for your {data.crop}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
          <Sparkles className="size-3" />
          AI Forecast
        </span>
      </div>

      {/* Rate Limit Badge */}
      {data.rateLimit && (
        <div className="flex items-center justify-end gap-1.5 border-b border-border/40 bg-muted/30 px-4 py-1.5">
          <Shield className="size-3 text-muted-foreground" />
          {data.rateLimit.remaining > 0 ? (
            <span className="text-[10px] text-muted-foreground">
              🖼️ {data.rateLimit.remaining}/{data.rateLimit.limit} image generations remaining today
            </span>
          ) : (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Daily image limit reached — using stock photos
              {data.rateLimit.resetAt && ` · Resets ${new Date(data.rateLimit.resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          )}
        </div>
      )}

      {/* View Switcher: Untreated vs Treated */}
      <div className="p-3 pb-0">
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("untreated")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all",
              activeTab === "untreated"
                ? "bg-red-950/80 text-red-200 shadow-xs ring-1 ring-red-500/30"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TrendingDown className="size-3.5 text-red-400" />
            <span>{untreatedLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("treated")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all",
              activeTab === "treated"
                ? "bg-emerald-950/90 text-emerald-200 shadow-xs ring-1 ring-emerald-500/30"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TrendingUp className="size-3.5 text-emerald-400" />
            <span>{treatedLabel}</span>
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div className="p-3">
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-border bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeTab === "untreated" ? data.untreatedUrl : data.treatedUrl}
            alt={activeTab === "untreated" ? "Untreated dying plant" : "Treated healthy plant"}
            className="size-full object-cover transition-all duration-500"
          />

          {/* Outcome Overlay Badge */}
          <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between rounded-lg bg-black/80 p-2 text-white backdrop-blur-md">
            <div className="flex items-center gap-2">
              {activeTab === "untreated" ? (
                <AlertTriangle className="size-4 shrink-0 text-red-400" />
              ) : (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              )}
              <span className="text-xs font-semibold">
                {activeTab === "untreated" ? untreatedOutcome : treatedOutcome}
              </span>
            </div>
            <span className="text-[10px] text-zinc-300 font-mono">Day 14</span>
          </div>
        </div>

        {/* Timeline Progression Details */}
        <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-xs">
          {activeTab === "untreated" ? (
            <>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDay("day3")}
                  className={cn(
                    "flex-1 rounded-md py-1 text-[11px] font-medium transition-all",
                    selectedDay === "day3"
                      ? "bg-red-500/20 text-red-600 dark:text-red-300 font-bold"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  Day 3
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay("day7")}
                  className={cn(
                    "flex-1 rounded-md py-1 text-[11px] font-medium transition-all",
                    selectedDay === "day7"
                      ? "bg-red-500/20 text-red-600 dark:text-red-300 font-bold"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  Day 7
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay("day14")}
                  className={cn(
                    "flex-1 rounded-md py-1 text-[11px] font-medium transition-all",
                    selectedDay === "day14"
                      ? "bg-red-500/20 text-red-600 dark:text-red-300 font-bold"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  Day 14
                </button>
              </div>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {selectedDay === "day3" && `🚨 ${timeline.day3}`}
                {selectedDay === "day7" && `⚠️ ${timeline.day7}`}
                {selectedDay === "day14" && `❌ ${timeline.day14}`}
              </p>
            </>
          ) : (
            <p className="text-emerald-700 dark:text-emerald-300 text-xs leading-relaxed">
              ✨ <strong>{isHealthy ? "14-Day Care Projection:" : "14-Day Treatment Effect:"}</strong> {timeline.day14Treated}
            </p>
          )}
        </div>

        {/* Action Prompt */}
        {onApplyTreatment && activeTab === "untreated" && (
          <button
            type="button"
            onClick={onApplyTreatment}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <CheckCircle2 className="size-4" />
            {isHealthy ? "Show Best Care Tips to Keep This Plant Thriving" : "Show Step-by-Step Treatment to Save This Crop"}
          </button>
        )}
      </div>
    </div>
  )
}
