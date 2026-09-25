import { CircleCheck, Lightbulb, MapPin, ShieldCheck } from "lucide-react"
import type { Diagnosis } from "@/lib/agribot-engine"
import { cropLabel } from "@/lib/agribot-engine"
import { AgriBotAvatar } from "./agribot-logo"

const CONFIDENCE_LABEL: Record<Diagnosis["confidence"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

export function DiagnosisCard({ diagnosis, crop }: { diagnosis: Diagnosis; crop?: string }) {
  const { entry, confidence, regionNote } = diagnosis

  return (
    <div className="flex items-end gap-2">
      <AgriBotAvatar className="size-9" />
      <div className="max-w-[88%] overflow-hidden rounded-2xl rounded-bl-md bg-card shadow-sm ring-1 ring-border">
        {/* Likely cause header */}
        <div className="bg-secondary px-4 py-3">
          <div className="flex items-start gap-2">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-accent" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground/70">
                Likely cause
              </p>
              <p className="text-pretty text-sm font-bold leading-snug text-secondary-foreground">
                {entry.likelyCause}
              </p>
            </div>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-card-foreground ring-1 ring-border">
            <ShieldCheck className="size-3.5 text-accent" />
            Confidence: {CONFIDENCE_LABEL[confidence]}
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          {/* Why */}
          <section>
            <h3 className="mb-1 text-sm font-semibold text-card-foreground">Why this happens</h3>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {entry.explanation}
            </p>
          </section>

          {/* Actions */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-card-foreground">What to do</h3>
            <ol className="space-y-2.5">
              {entry.actions.map((action, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-card-foreground">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="text-pretty">{action}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Region note */}
          {regionNote && (
            <section className="flex gap-2 rounded-xl bg-secondary/70 p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
              <p className="text-pretty text-xs leading-relaxed text-secondary-foreground">
                <span className="font-semibold">For your climate: </span>
                {regionNote}
              </p>
            </section>
          )}

          {/* Tip / disclaimer */}
          <section className="flex gap-2 rounded-xl bg-secondary/70 p-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />
            <p className="text-pretty text-xs leading-relaxed text-secondary-foreground">
              <span className="font-semibold">Tip: </span>
              If the problem continues after 7–10 days, or you&apos;re unsure, take a photo of the
              affected {cropLabel(crop).toLowerCase()} and check with your local agricultural
              extension officer for a proper inspection.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
