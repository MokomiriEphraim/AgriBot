// AgriBot client-side diagnosis engine
// Matches a draft (crop + symptom text) against the knowledge base.
// Kept for backwards compatibility; the new demo flow uses matchKB() directly.

import { KNOWLEDGE_BASE, type KBEntry } from "./knowledge-base"
import type { Region } from "./types"

export interface Draft {
  crop?: string
  symptom?: string
  symptomText?: string
  region?: Region
}

export interface Diagnosis {
  entry: KBEntry
  confidence: "low" | "medium" | "high"
  regionNote?: string
}

function scoreEntry(entry: KBEntry, crop: string | undefined, symptomText: string): number {
  let score = 0
  const t = symptomText.toLowerCase()

  if (crop && entry.plant === crop) score += 5
  if (entry.plant === "other") score += 1

  // Check symptom keywords
  const symptomWords = t.split(/\s+/)
  for (const word of symptomWords) {
    if (word.length < 3) continue
    if (entry.symptom.includes(word)) score += 3
    if (entry.cause.toLowerCase().includes(word)) score += 1
  }

  return score
}

export function diagnose(draft: Draft): Diagnosis | null {
  const symptomText = draft.symptomText ?? draft.symptom ?? ""
  const scored = KNOWLEDGE_BASE.map((entry) => ({
    entry,
    score: scoreEntry(entry, draft.crop, symptomText),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null

  const top = scored[0]
  const runnerUp = scored[1]

  let confidence: Diagnosis["confidence"] = "medium"
  if (top.score >= 9) confidence = "high"
  else if (top.score <= 3) confidence = "low"
  if (runnerUp && top.score - runnerUp.score <= 1) {
    confidence = confidence === "high" ? "medium" : "low"
  }

  return { entry: top.entry, confidence }
}

export function cropLabel(id?: string): string {
  return KNOWLEDGE_BASE.find((c) => c.plant === id)?.plant ?? "your crop"
}

export function regionLabel(id?: Region): string {
  const labels: Record<string, string> = {
    tropical: "your tropical region",
    arid: "your dry region",
    temperate: "your temperate region",
    highland: "your highland area",
    unknown: "your area",
  }
  return labels[id ?? "unknown"] ?? "your area"
}
