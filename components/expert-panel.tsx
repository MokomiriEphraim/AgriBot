import { Phone, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExpertPanelProps {
  className?: string
}

export function ExpertPanel({ className }: ExpertPanelProps) {
  return (
    <div className={cn("flex items-end gap-2", className)}>
      <div className="max-w-[88%] overflow-hidden rounded-2xl rounded-bl-md bg-card shadow-sm ring-1 ring-border">
        <div className="bg-purple-50 dark:bg-purple-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-purple-600 dark:text-purple-400" />
            <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
              Talk to a Human Expert
            </p>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          <p className="text-sm text-muted-foreground">
            For complex problems, it&apos;s best to speak with a local agricultural extension officer who can inspect your crops in person.
          </p>

          <div className="rounded-xl bg-secondary/70 p-3">
            <p className="text-xs font-semibold text-secondary-foreground mb-1">
              Agricultural Extension Office
            </p>
            <a
              href="tel:+1234567890"
              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
            >
              <Phone className="size-4" />
              +123 456 7890
            </a>
            <p className="mt-1 text-xs text-muted-foreground">
              Mon–Fri, 8am–5pm
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all",
                "hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]",
              )}
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
            <a
              href="tel:+1234567890"
              className={cn(
                "flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground shadow-sm transition-all",
                "hover:bg-secondary hover:scale-[1.02] active:scale-[0.98]",
              )}
            >
              <Phone className="size-4" />
              Call Now
            </a>
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            Tip: Describe your crop problem and share a photo when you call for faster help.
          </p>
        </div>
      </div>
    </div>
  )
}
