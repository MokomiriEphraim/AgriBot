"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, MessageCircleQuestion, Plus, Sparkles, Sprout } from "lucide-react"
import { ChatInput } from "./chat-input"
import { ChatMessage } from "./chat-message"
import { ChatCenterHero } from "./chat-center-hero"
import { CropProgressionCard, type ProgressionData } from "./crop-progression-card"
import { LeafBackdrop } from "./leaf-backdrop"
import { MENU_CATEGORIES, type MenuCategory } from "./quick-menu"
import { TypingIndicator } from "./typing-indicator"
import { ForecastProgress } from "./forecast-progress"
import { AgriBotIcon } from "./agribot-logo"
import { getDeviceInfo, type DeviceInfo } from "@/lib/device"

interface Message {
  id: string
  role: "bot" | "user"
  time: string
  text?: string
  image?: string
  stream?: boolean
  progression?: ProgressionData
}

let idCounter = 0
const nextId = () => `m${idCounter++}`
const now = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

/**
 * Pure greetings, in every language AgriBot supports. A greeting-only
 * conversation must not reveal the 14-day button.
 *
 * Kept deliberately short and high-confidence: a false positive here silently
 * hides a feature from a farmer who is genuinely asking about a crop. "we" and
 * "bo" were both removed for exactly that reason — they are real English/common
 * words that would swallow messages like "we need help with my tomatoes".
 */
const GREETING_PATTERN =
  /^\s*(hi|hey|hello|yo|hoi|ahoy|howzit|habari|sawubona|shosha|ngubani|molo|mhloniphi|ndiyabulela|shono|thobela|bohloko|kia ora|ke a kgotso|goeie\s?(dag|môre|morgen|oggend)|groot\s?(dag|more)|dumela|ndoza|nkosi|kahle|mhlan|yebo|thata)\b/i

/** A real greeting is short. Long text that merely opens with a marker is a question. */
const GREETING_MAX_LENGTH = 40

function isGreetingOnly(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.length <= GREETING_MAX_LENGTH && GREETING_PATTERN.test(trimmed)
}

function hasCropContext(messages: Message[], currentMsg?: Message): boolean {
  // If an image was uploaded anywhere in the conversation
  if (messages.some((m) => Boolean(m.image))) return true

  const textToCheck = currentMsg?.text || messages.map((m) => m.text || "").join(" ")
  const lower = textToCheck.toLowerCase()

  // Exclude simple greetings and generic intro text
  if (
    lower.includes("welcome to agribot") ||
    lower.includes("how can i assist your farm") ||
    lower.startsWith("👋")
  ) {
    return false
  }

  const cropKeywords = [
    "plant species",
    "health assessment",
    "visual health",
    "action steps",
    "treatment plan",
    "blight",
    "mildew",
    "chlorosis",
    "infestation",
    "aphid",
    "pathogen",
    "caterpillar",
    "fungal",
    "bacterial",
    "deficiency",
    "wilt",
    "rot",
    "rust",
    "protea",
    "tomato",
    "maize",
    "corn",
    "pepper",
    "potato",
    "cassava",
  ]

  if (cropKeywords.some((k) => lower.includes(k))) return true

  // Language-neutral fallback. The keyword list above is English-only, so a
  // farmer chatting in isiXhosa or isiZulu would otherwise never unlock the
  // button. The system prompt requires the model to name the crop in English
  // (brackets), so the list usually wins — this covers the rest, and guards
  // against regressions in that prompt rule.
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.text || "")
    .join(" ")

  if (!userText.trim()) return false
  if (isGreetingOnly(userText)) return false

  return userText.trim().length > 12
}

const CACHE_KEY_PREFIX = "agribot_chat_cache_v2_"

export function AgriBotChat({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastApiDone, setForecastApiDone] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [initialChecking, setInitialChecking] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialize and register device with MongoDB on mount
  useEffect(() => {
    const info = getDeviceInfo()
    setDeviceInfo(info)

    // 1. FAST-PATH: Load cached messages immediately (0ms) so user never waits
    try {
      const cached = localStorage.getItem(CACHE_KEY_PREFIX + info.deviceId)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          setInitialChecking(false)
        }
      }
    } catch (e) {
      console.warn("Local cache read error:", e)
    }

    // 2. BACKGROUND SYNC: Register device and sync history from MongoDB
    fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: info.deviceId,
        hardwareInfo: info,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setInitialChecking(false)
        if (data?.history && Array.isArray(data.history) && data.history.length > 0) {
          setMessages(data.history)
          try {
            localStorage.setItem(CACHE_KEY_PREFIX + info.deviceId, JSON.stringify(data.history))
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.warn("Session init error:", err)
        setInitialChecking(false)
      })
  }, [])

  // Auto-persist messages locally so page reload is instantaneous
  const updateMessages = (updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => {
      const next = updater(prev)
      if (deviceInfo?.deviceId) {
        try {
          localStorage.setItem(CACHE_KEY_PREFIX + deviceInfo.deviceId, JSON.stringify(next))
        } catch (e) {}
      }
      return next
    })
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading, forecastLoading])

  async function triggerForecast(customCrop?: string, customSymptom?: string, customMessages?: Message[]) {
    setForecastLoading(true)
    setForecastApiDone(false)

    const msgsToUse = customMessages || messages

    // Find the last image in the conversation
    const lastImageMsg = [...msgsToUse].reverse().find((m) => Boolean(m.image))
    const lastImageUrl = lastImageMsg?.image

    // Compile recent chat context to extract crop and symptoms accurately
    const chatContext = msgsToUse
      .slice(-8)
      .map((m) => `${m.role === "bot" ? "AgriBot" : "Farmer"}: ${m.text || "[uploaded plant photo]"}`)
      .join("\n\n")

    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop: customCrop,
          symptom: customSymptom,
          context: chatContext,
          imageUrl: lastImageUrl,
          deviceId: deviceInfo?.deviceId,
        }),
      })

      if (!res.ok) throw new Error("Failed to load forecast")
      const data = await res.json()

      // Signal the progress bar that the API is done — it races to 99%
      setForecastApiDone(true)

      // Give the user ~800ms to see the 99% completion before swapping in the card
      await new Promise((resolve) => setTimeout(resolve, 800))

      setForecastLoading(false)
      setForecastApiDone(false)
      updateMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "bot",
          time: now(),
          text: `⏱️ **14-Day Visual Prognosis for ${data.crop} (${data.symptom}):**\nGenerated dynamically based on your plant's condition:`,
          progression: data,
        },
      ])
    } catch (err) {
      console.error(err)
      setForecastLoading(false)
      setForecastApiDone(false)
    }
  }

  async function sendMessage(userText: string, image?: string) {
    const trimmed = userText.trim()
    if (!trimmed && !image) return

    const userMsg: Message = {
      id: nextId(),
      role: "user",
      time: now(),
      text: trimmed || (image ? "Please analyze this crop photo and diagnose any problems." : ""),
      image,
    }

    const updatedMessages = [...messages, userMsg]
    updateMessages(() => updatedMessages)
    setLoading(true)

    try {
      const botMsgId = nextId()

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role === "bot" ? "assistant" : "user",
            content: m.text || "",
            image: m.image,
          })),
          deviceId: deviceInfo?.deviceId,
          hardwareInfo: deviceInfo,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error("Failed to get response from AgriBot AI server")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ""

      setLoading(false)

      // Add bot message that will stream incoming chunks
      updateMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          role: "bot",
          time: now(),
          text: "",
          stream: false,
        },
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulatedText += chunk

        updateMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId ? { ...msg, text: accumulatedText } : msg,
          ),
        )
      }
    } catch (err: any) {
      console.error("Chat error:", err)
      setLoading(false)
      updateMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "bot",
          time: now(),
          text: "I had trouble processing that request. Please check your internet connection and verify your OPENAI_API_KEY in .env.local.",
          stream: false,
        },
      ])
    }
  }

  function handleCategory(cat: MenuCategory) {
    const categoryPrompts: Record<string, string> = {
      "crop-problems": "I need help diagnosing a crop problem. What are the key symptoms to look for and immediate actions I should take?",
      "pests-diseases": "I need guidance on identifying and treating crop pests and plant diseases. What are the recommended biological and chemical solutions?",
      "planting-growing": "I need agronomic advice for crop planting, spacing, and optimal growth management.",
      "soil-nutrients": "I need advice on soil testing, pH balance, and managing nutrient deficiencies.",
      "irrigation": "I need advice on irrigation scheduling, water requirements, and preventing water stress.",
      "weather-advice": "I need weather-adaptive farming recommendations for temperature, rain, and humidity management.",
    }

    const prompt = categoryPrompts[cat.id] || `I need agronomic advice regarding ${cat.label.toLowerCase()}.`
    sendMessage(prompt)
  }

  function handleOther() {
    sendMessage("Can you help me with a farming question?")
  }

  async function resetChat() {
    if (deviceInfo?.deviceId) {
      try {
        localStorage.removeItem(CACHE_KEY_PREFIX + deviceInfo.deviceId)
      } catch (e) {}
      fetch(`/api/session?deviceId=${deviceInfo.deviceId}`, {
        method: "DELETE",
      }).catch(() => {})
    }
    setMessages([])
    setLoading(false)
  }

  const isLanding = messages.length === 0

  return (
    <div className="flex h-full flex-col bg-background lg:flex-row">
      {/* Desktop-only sidebar. `hidden` below lg keeps it out of the mobile
          layout entirely, so the phone view is unaffected. */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-950 p-2 ring-1 ring-emerald-500/30">
            <AgriBotIcon className="size-full" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-sidebar-foreground">
              AgriBot
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Crop health assistant
            </p>
          </div>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={resetChat}
            disabled={isLanding}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sidebar-primary px-3 py-2.5 text-sm font-semibold text-sidebar-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="size-4" />
            New chat
          </button>
        </div>

        <nav className="mt-6 min-h-0 flex-1 overflow-y-auto px-3">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ask about
          </p>
          <ul className="space-y-1">
            {MENU_CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => handleCategory(cat)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <cat.icon className="size-4 shrink-0 text-accent" />
                  <span className="truncate">{cat.label}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={handleOther}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <MessageCircleQuestion className="size-4 shrink-0 text-accent" />
                <span className="truncate">Other farming questions</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="space-y-2.5 border-t border-sidebar-border px-5 py-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <Camera className="size-3.5 shrink-0 text-accent" />
            Diagnose a crop from a photo
          </p>
          <p className="flex items-center gap-2">
            <Sparkles className="size-3.5 shrink-0 text-accent" />
            14-day untreated vs treated prognosis
          </p>
          <p className="flex items-center gap-2">
            <Sprout className="size-3.5 shrink-0 text-accent" />
            Replies in all 11 official SA languages
          </p>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        <LeafBackdrop />

        {initialChecking && isLanding ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-muted-foreground">Loading session...</p>
            </div>
          </div>
        ) : isLanding ? (
          <ChatCenterHero
            onSend={(text, image) => sendMessage(text, image)}
            onSelectCategory={handleCategory}
            onOther={handleOther}
          />
        ) : (
          <div className="relative space-y-4 px-3 py-6 lg:mx-auto lg:w-full lg:max-w-3xl lg:px-6">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Conversation
                </span>
                {hasCropContext(messages) && (
                  <button
                    type="button"
                    onClick={() => triggerForecast()}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all"
                  >
                    <Sparkles className="size-2.5 text-emerald-600" />
                    Predict 14-Day
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={resetChat}
                className="text-xs font-medium text-primary hover:underline transition-all"
              >
                + New Chat
              </button>
            </div>

            {messages.map((m) => (
              <div key={m.id} className="space-y-2.5">
                <ChatMessage
                  role={m.role}
                  time={m.time}
                  image={m.image}
                  stream={m.stream}
                >
                  {m.text}
                </ChatMessage>

                {/* Render Interactive Crop Time-Machine Prognosis Card if present */}
                {m.progression && (
                  <div className="pl-1 sm:pl-2">
                    <CropProgressionCard
                      data={m.progression}
                      onApplyTreatment={() =>
                        sendMessage("Please give me the exact step-by-step treatment plan and dosage to save this crop.")
                      }
                    />
                  </div>
                )}

                {/* 1-Click Prognosis Trigger on Bot messages with actual crop context */}
                {m.role === "bot" &&
                  !m.progression &&
                  m.text &&
                  hasCropContext(messages, m) && (
                    <div className="flex pl-1">
                      <button
                        type="button"
                        onClick={() => triggerForecast()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary transition-all hover:bg-primary/15 active:scale-95 shadow-2xs"
                      >
                        <Sparkles className="size-3 text-emerald-600" />
                        <span>🔮 Predict 14-Day Outcome for this Crop</span>
                      </button>
                    </div>
                  )}
              </div>
            ))}

            {forecastLoading && <ForecastProgress apiDone={forecastApiDone} />}
            {loading && !forecastLoading && <TypingIndicator />}
          </div>
        )}
      </div>

      {!isLanding && (
        <div className="border-t border-border bg-background px-3 py-3 lg:mx-auto lg:w-full lg:max-w-3xl lg:px-6">
          <ChatInput
            onSend={(text, image) => sendMessage(text, image)}
            placeholder="Ask AgriBot anything..."
            disabled={loading || forecastLoading}
          />
        </div>
      )}
      </div>
    </div>
  )
}
