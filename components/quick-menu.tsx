"use client"

import {
  Bug,
  CloudSun,
  Droplets,
  Leaf,
  MessageCircleQuestion,
  Sprout,
  TestTube2,
  type LucideIcon,
} from "lucide-react"

export interface MenuCategory {
  id: string
  label: string
  icon: LucideIcon
  /** short line the bot uses to introduce this topic */
  intro: string
}

export const MENU_CATEGORIES: MenuCategory[] = [
  {
    id: "crop-problems",
    label: "Crop problems",
    icon: Leaf,
    intro: "Let's figure out what's affecting your crop.",
  },
  {
    id: "pests-diseases",
    label: "Pests & diseases",
    icon: Bug,
    intro: "Pests and diseases can look similar — let's narrow it down.",
  },
  {
    id: "planting-growing",
    label: "Planting & growing",
    icon: Sprout,
    intro: "Happy to help with planting and growing. Tell me a bit more.",
  },
  {
    id: "soil-nutrients",
    label: "Soil & nutrients",
    icon: TestTube2,
    intro: "Nutrient issues often show up in the leaves. Let's check.",
  },
  {
    id: "irrigation",
    label: "Irrigation",
    icon: Droplets,
    intro: "Watering problems can mimic disease. Let's look closer.",
  },
  {
    id: "weather-advice",
    label: "Weather advice",
    icon: CloudSun,
    intro: "Weather affects a lot. Let's tie it to what you're seeing.",
  },
]

interface QuickMenuProps {
  onSelect: (category: MenuCategory) => void
  onOther: () => void
}

export function QuickMenu({ onSelect, onOther }: QuickMenuProps) {
  return (
    <div className="space-y-2 pl-11">
      <div className="grid grid-cols-2 gap-2">
        {MENU_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat)}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-card-foreground shadow-sm transition-colors hover:border-accent hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <cat.icon className="size-4 shrink-0 text-accent" />
            <span className="leading-tight">{cat.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onOther}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:border-accent hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <MessageCircleQuestion className="size-4 text-accent" />
        Other farming questions
      </button>
    </div>
  )
}
