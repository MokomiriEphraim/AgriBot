// Shared types for the AgriBot demo flow

export type Region = "tropical" | "arid" | "temperate" | "highland" | "unknown"

export type Severity = "mild" | "moderate" | "severe"

export type Confidence = "high" | "medium" | "low"

export type QuickOption = "diagnose" | "treatment" | "prevention" | "expert"

export type FlowState =
  | "idle"
  | "photo_uploaded"
  | "analyzing"
  | "options_shown"
  | "followup_region"
  | "followup_duration"
  | "answering"
  | "done"

/** What the Vision API returns from the photo */
export interface PlantAnalysis {
  plant: string
  symptom: string
  severity: Severity
}

/** A single knowledge base entry */
export interface KBEntry {
  id: string
  plant: string
  symptom: string
  cause: string
  treatment: string[]
  prevention: string[]
  confidence: Confidence
  regionNotes?: Partial<Record<Region, string>>
}

/** The conversation state tracked during a guided flow */
export interface DiagnosisState {
  analysis: PlantAnalysis | null
  selectedOption: QuickOption | null
  region: Region | null
  duration: string | null
  kbMatch: KBEntry | null
}

/** Message shown in the chat */
export interface ChatMessage {
  id: string
  role: "bot" | "user"
  time: string
  text?: string
  image?: string
  stream?: boolean
  options?: QuickOption[]
  showRegionPrompt?: boolean
  showDurationPrompt?: boolean
  showExpertPanel?: boolean
  confidence?: Confidence
}
