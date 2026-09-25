"use client"

import { ArrowUp, Mic, MicOff, Plus, X } from "lucide-react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (text: string, image?: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ChatInput({
  onSend,
  placeholder = "Ask AgriBot anything...",
  disabled,
}: ChatInputProps) {
  const [value, setValue] = useState("")
  const [attachedImage, setAttachedImage] = useState<{ url: string; name: string } | null>(null)
  const [isListening, setIsListening] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function submit() {
    const text = value.trim()
    if ((!text && !attachedImage) || disabled) return
    onSend(text || "Please analyze this attached crop photo and diagnose any problems.", attachedImage?.url)
    setValue("")
    setAttachedImage(null)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachedImage({ url: reader.result, name: file.name })
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
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-1.5"
    >
      {/* Attached Photo Preview */}
      {attachedImage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-card p-1.5 pl-2 shadow-2xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedImage.url}
                alt={attachedImage.name}
                className="size-full object-cover"
              />
            </div>
            <p className="truncate text-xs font-medium text-foreground">
              {attachedImage.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            title="Remove image"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileSelect}
            disabled={disabled}
            aria-hidden
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            aria-label="Attach a photo of your crop"
            title="Attach a photo of your crop"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            <Plus className="size-4" />
          </button>

          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={attachedImage ? "Add message with photo..." : placeholder}
            disabled={disabled}
            aria-label="Message AgriBot"
            className="flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />

          <button
            type="button"
            onClick={toggleVoice}
            title={isListening ? "Listening..." : "Voice input"}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              isListening && "animate-pulse bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
            )}
          >
            {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={disabled || !canSubmit}
          aria-label="Send message"
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full transition-all",
            canSubmit
              ? "bg-primary text-primary-foreground shadow-sm hover:scale-105"
              : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed",
          )}
        >
          <ArrowUp className="size-4 stroke-[2.5]" />
        </button>
      </div>
    </form>
  )
}
