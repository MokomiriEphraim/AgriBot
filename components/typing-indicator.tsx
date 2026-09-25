import { Sparkles } from "lucide-react"

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-xs font-medium text-muted-foreground animate-in fade-in duration-300" aria-label="AgriBot is thinking" role="status">
      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 shadow-2xs backdrop-blur-xs">
        <Sparkles className="size-3.5 text-emerald-500 animate-spin [animation-duration:2.5s]" />
        <span className="text-foreground/80">AgriBot is analyzing...</span>
        <div className="flex items-center gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-duration:0.8s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms] [animation-duration:0.8s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms] [animation-duration:0.8s]" />
        </div>
      </div>
    </div>
  )
}
