import { Leaf, Sprout } from "lucide-react"

// Subtle decorative leaf watermarks behind the chat, matching the mockup.
export function LeafBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Leaf className="absolute -right-6 top-24 size-40 rotate-12 text-accent/[0.06]" />
      <Sprout className="absolute -left-8 top-1/2 size-36 -rotate-12 text-accent/[0.06]" />
      <Leaf className="absolute bottom-28 right-4 size-28 -rotate-45 text-accent/[0.05]" />
      <Leaf className="absolute left-6 top-10 size-20 rotate-45 text-accent/[0.05]" />
    </div>
  )
}
