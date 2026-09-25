"use client"

import { ArrowLeft, MoreVertical, RotateCcw } from "lucide-react"
import { AgriBotAvatar } from "./agribot-logo"

interface ChatHeaderProps {
  onBack: () => void
  onReset: () => void
}

export function ChatHeader({ onBack, onReset }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 bg-primary px-3 py-3 text-primary-foreground shadow-sm">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to welcome screen"
        className="grid size-9 place-items-center rounded-full transition-colors hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground/60"
      >
        <ArrowLeft className="size-5" />
      </button>

      <AgriBotAvatar className="size-10" />

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-base font-semibold">AgriBot</p>
        <p className="truncate text-xs text-primary-foreground/70">Always here to help</p>
      </div>

      <button
        type="button"
        onClick={onReset}
        aria-label="Start a new conversation"
        className="grid size-9 place-items-center rounded-full transition-colors hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground/60"
      >
        <RotateCcw className="size-4" />
      </button>

      <span className="grid size-9 place-items-center text-primary-foreground/70" aria-hidden>
        <MoreVertical className="size-5" />
      </span>
    </header>
  )
}
