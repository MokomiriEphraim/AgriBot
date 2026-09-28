"use client"

import {
  ArrowUp,
  ChevronDown,
  Image as ImageIcon,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  X,
} from "lucide-react"
import { useRef, useState } from "react"
import { AgriBotIcon } from "./agribot-logo"
import { MENU_CATEGORIES, type MenuCategory } from "./quick-menu"
import { cn } from "@/lib/utils"

interface ChatCenterHeroProps {
  onSend: (text: string, image?: string) => void
  onSelectCategory: (cat: MenuCategory) => void
  onOther: () => void
}

export function ChatCenterHero({
  onSend,
  onSelectCategory,
  onOther,
}: ChatCenterHeroProps) {
  const [value, setValue] = useState("")
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null)
  const [isListening, setIsListening] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function submit() {
    const trimmed = value.trim()
    if (!trimmed && !attachedImage) return

    onSend(trimmed || "Please analyze this attached crop photo and diagnose any problems.", attachedImage?.url)
    setValue("")
    setAttachedImage(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachedImage({ url: reader.result, name: file.name })
        textareaRef.current?.focus()
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  function toggleVoice() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser.")
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    try {
      // @ts-expect-error Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = "en-US"
      recognition.interimResults = false

      recognition.onstart = () => setIsListening(true)
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setValue((prev) => (prev ? `${prev} ${transcript}` : transcript))
        setIsListening(false)
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)
      recognition.start()
    } catch {
      setIsListening(false)
    }
  }

  const canSubmit = Boolean(value.trim() || attachedImage)

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center sm:px-6 lg:px-10">
      {/* Bot Icon with glowing pulse ring */}
      <div className="relative mb-3">
        <div className="absolute -inset-2 rounded-full bg-primary/10 blur-md animate-pulse" />
        <div className="relative grid size-16 place-items-center rounded-2xl bg-emerald-950 p-2.5 shadow-lg ring-1 ring-emerald-500/30">
          <AgriBotIcon className="size-full drop-shadow" />
        </div>
      </div>

      {/* Main Headline */}
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
        How can I help you today?
      </h1>
      <p className="mt-1 max-w-xs text-xs font-medium text-muted-foreground sm:text-sm lg:max-w-lg lg:text-base">
        Ask any farming question or diagnose crop diseases instantly
      </p>

      {/* Center AI Input Card */}
      <div className="mt-6 w-full max-w-md rounded-2xl border border-border bg-card p-3 shadow-md transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 lg:max-w-2xl lg:p-4">
        {/* Attached Photo Thumbnail Preview */}
        {attachedImage && (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-1.5 pl-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachedImage.url}
                  alt={attachedImage.name}
                  className="size-full object-cover"
                />
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-semibold text-foreground">
                  {attachedImage.name}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  Ready to send with your message
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="mr-1 grid size-6 place-items-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
              title="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={
            attachedImage
              ? "Add instructions or question for this image..."
              : "Send a message or describe what's wrong with your crop..."
          }
          className="w-full resize-none bg-transparent px-1 pt-1 text-sm text-foreground outline-none placeholder:text-muted-foreground lg:text-base"
        />

        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
          {/* Left toolbar items */}
          <div className="flex items-center gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Attach leaf or crop photo"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>

            <div className="flex items-center gap-1 rounded-full bg-secondary/80 px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span>AgriBot AI</span>
              <ChevronDown className="size-3 opacity-60" />
            </div>
          </div>

          {/* Right toolbar items */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleVoice}
              title={isListening ? "Listening..." : "Voice input"}
              className={cn(
                "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isListening && "animate-pulse bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
              )}
            >
              {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              title="Send message"
              className={cn(
                "grid size-8 place-items-center rounded-full transition-all",
                canSubmit
                  ? "bg-primary text-primary-foreground shadow-sm hover:scale-105"
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed",
              )}
            >
              <ArrowUp className="size-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Suggestion Chips / Pills */}
      <div className="mt-5 flex w-full max-w-md flex-wrap items-center justify-center gap-2 lg:max-w-3xl">
        {MENU_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-card-foreground shadow-2xs transition-all hover:scale-105 hover:border-primary/40 hover:bg-secondary active:scale-95"
            >
              <Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
