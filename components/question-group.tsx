"use client"

import { ChevronDown, Leaf, MapPin, Sprout, type LucideIcon } from "lucide-react"

interface Option {
  value: string
  label: string
}

interface QuestionSelectProps {
  icon: LucideIcon
  label: string
  placeholder: string
  value?: string
  options: Option[]
  onChange: (value: string) => void
}

function QuestionSelect({ icon: Icon, label, placeholder, value, options, onChange }: QuestionSelectProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-card-foreground">
        <Icon className="size-4 text-accent" />
        {label}
      </div>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-input bg-background py-2 pl-3 pr-9 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}

interface QuestionGroupProps {
  crop?: string
  symptom?: string
  region?: string
  cropOptions: Option[]
  symptomOptions: Option[]
  regionOptions: Option[]
  onCrop: (v: string) => void
  onSymptom: (v: string) => void
  onRegion: (v: string) => void
}

export function QuestionGroup({
  crop,
  symptom,
  region,
  cropOptions,
  symptomOptions,
  regionOptions,
  onCrop,
  onSymptom,
  onRegion,
}: QuestionGroupProps) {
  return (
    <div className="space-y-2 pl-11">
      <QuestionSelect
        icon={Sprout}
        label="What crop are you growing?"
        placeholder="Select a crop"
        value={crop}
        options={cropOptions}
        onChange={onCrop}
      />
      <QuestionSelect
        icon={Leaf}
        label="What symptom are you seeing?"
        placeholder="Select a symptom"
        value={symptom}
        options={symptomOptions}
        onChange={onSymptom}
      />
      <QuestionSelect
        icon={MapPin}
        label="Which climate are you in?"
        placeholder="Select your climate"
        value={region}
        options={regionOptions}
        onChange={onRegion}
      />
    </div>
  )
}
