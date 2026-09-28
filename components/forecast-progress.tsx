"use client"

import { useEffect, useState, useRef } from "react"
import { Sparkles, ScanSearch, ImagePlus, CheckCircle2, Cpu } from "lucide-react"

interface ForecastStage {
  label: string
  icon: React.ReactNode
  minPercent: number
  maxPercent: number
  durationMs: number
}

const STAGES: ForecastStage[] = [
  {
    label: "Preparing plant analysis...",
    icon: <Cpu className="size-4" />,
    minPercent: 0,
    maxPercent: 12,
    durationMs: 1800,
  },
  {
    label: "AI Vision inspecting your plant...",
    icon: <ScanSearch className="size-4" />,
    minPercent: 12,
    maxPercent: 35,
    durationMs: 6000,
  },
  {
    label: "Identifying species & health status...",
    icon: <Sparkles className="size-4" />,
    minPercent: 35,
    maxPercent: 48,
    durationMs: 3000,
  },
  {
    label: "Generating neglected path image...",
    icon: <ImagePlus className="size-4" />,
    minPercent: 48,
    maxPercent: 72,
    durationMs: 12000,
  },
  {
    label: "Generating treated path image...",
    icon: <ImagePlus className="size-4" />,
    minPercent: 72,
    maxPercent: 92,
    durationMs: 12000,
  },
  {
    label: "Finalizing prognosis report...",
    icon: <CheckCircle2 className="size-4" />,
    minPercent: 92,
    maxPercent: 99,
    durationMs: 5000,
  },
]

interface ForecastProgressProps {
  /** Set to true when the API call has completed — triggers a fast race to 99% */
  apiDone?: boolean
}

export function ForecastProgress({ apiDone = false }: ForecastProgressProps) {
  const [percent, setPercent] = useState(0)
  const [stageIndex, setStageIndex] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const percentRef = useRef(0)

  // When apiDone fires, race the bar up to 99%
  useEffect(() => {
    if (!apiDone) return

    setFinishing(true)

    // Quickly animate from current percent to 99
    const startPercent = percentRef.current
    const target = 99
    const animDuration = 600 // ms — fast and satisfying
    const startTime = Date.now()

    const raceInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animDuration, 1)
      // Ease-out quint for a snappy rush
      const eased = 1 - Math.pow(1 - progress, 5)
      const current = Math.round(startPercent + (target - startPercent) * eased)
      setPercent(current)
      percentRef.current = current

      if (progress >= 1) {
        clearInterval(raceInterval)
        setPercent(99)
        percentRef.current = 99
        // Jump to last stage
        setStageIndex(STAGES.length - 1)
      }
    }, 16)

    return () => clearInterval(raceInterval)
  }, [apiDone])

  useEffect(() => {
    const startTime = Date.now()

    // Elapsed seconds counter
    const secInterval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    // Stage-based progress animation
    let currentStage = 0
    let stageStartTime = Date.now()
    let stopped = false

    const progressInterval = setInterval(() => {
      // If the API is done, the race-to-99 effect handles the rest
      if (stopped) return

      if (currentStage >= STAGES.length) {
        // All stages done on timer — hold at max and wait for apiDone
        stopped = true
        return
      }

      const stage = STAGES[currentStage]
      const elapsed = Date.now() - stageStartTime
      const progress = Math.min(elapsed / stage.durationMs, 1)

      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentPercent = Math.round(
        stage.minPercent + (stage.maxPercent - stage.minPercent) * eased,
      )

      setPercent(currentPercent)
      percentRef.current = currentPercent

      if (progress >= 1) {
        currentStage++
        stageStartTime = Date.now()
        setStageIndex(currentStage)
      }
    }, 50)

    return () => {
      clearInterval(secInterval)
      clearInterval(progressInterval)
    }
  }, [])

  const currentStage = STAGES[Math.min(stageIndex, STAGES.length - 1)]
  const displayPercent = Math.min(percent, 99)

  // Determine the finishing label
  const finishingLabel = finishing && displayPercent >= 99
  const stageLabel = finishingLabel
    ? "Almost there — rendering your results..."
    : currentStage.label

  return (
    <div className="mx-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 bg-gradient-to-r from-emerald-950/40 via-card to-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="grid size-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
                {finishingLabel ? (
                  <CheckCircle2 className="size-4 animate-bounce" />
                ) : (
                  <Sparkles className="size-4 animate-spin [animation-duration:3s]" />
                )}
              </div>
              {/* Pulsing glow ring */}
              <div className="absolute -inset-1 animate-pulse rounded-xl bg-emerald-500/10 [animation-duration:2s]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">
                {finishingLabel ? "Prognosis Ready!" : "Generating 14-Day Prognosis"}
              </h4>
              <p className="text-[10px] text-muted-foreground">
                {finishingLabel
                  ? "Loading your visual forecast now"
                  : "AI is creating your visual forecast"}
              </p>
            </div>
          </div>

          {/* Time counter */}
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={`text-lg font-bold tabular-nums transition-colors duration-300 ${
                displayPercent >= 99
                  ? "text-green-400"
                  : "text-emerald-400"
              }`}
            >
              {displayPercent}%
            </span>
            <span className="text-[10px] tabular-nums text-muted-foreground">{elapsedSec}s elapsed</span>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-3 px-4 py-3.5">
          {/* Main Progress Bar */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/60">
            {/* Animated gradient fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${displayPercent}%`,
                background:
                  displayPercent >= 99
                    ? "linear-gradient(90deg, #059669, #10b981, #22c55e, #4ade80)"
                    : "linear-gradient(90deg, #059669, #10b981, #34d399, #10b981)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2s infinite linear",
              }}
            />
            {/* Shine overlay */}
            <div
              className="absolute inset-y-0 left-0 rounded-full opacity-40"
              style={{
                width: `${displayPercent}%`,
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite linear",
              }}
            />
          </div>

          {/* Current Stage */}
          <div
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all duration-500 ${
              finishingLabel
                ? "border-green-500/30 bg-green-950/20"
                : "border-border/40 bg-secondary/30"
            }`}
          >
            <div
              className={`animate-pulse [animation-duration:1.5s] ${
                finishingLabel ? "text-green-400" : "text-emerald-400"
              }`}
            >
              {finishingLabel ? <CheckCircle2 className="size-4" /> : currentStage.icon}
            </div>
            <span className="text-xs font-medium text-foreground/80">{stageLabel}</span>
          </div>

          {/* Stage dots - show completed stages */}
          <div className="flex items-center justify-center gap-1.5 pt-0.5">
            {STAGES.map((stage, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  finishingLabel
                    ? "w-6 bg-green-500"
                    : idx < stageIndex
                      ? "w-6 bg-emerald-500"
                      : idx === stageIndex
                        ? "w-8 bg-emerald-400 animate-pulse"
                        : "w-3 bg-muted-foreground/20"
                }`}
                title={stage.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

