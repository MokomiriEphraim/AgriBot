"use client"

import { useState } from "react"
import { AgriBotChat } from "@/components/agribot-chat"
import { WelcomeScreen } from "@/components/welcome-screen"

export default function Page() {
  const [started, setStarted] = useState(false)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-primary/10 p-0 sm:p-6">
      <div className="relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-background shadow-2xl sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] sm:rounded-[2rem] sm:ring-1 sm:ring-border">
        {started ? (
          <AgriBotChat onBack={() => setStarted(false)} />
        ) : (
          <WelcomeScreen onStart={() => setStarted(true)} />
        )}
      </div>
    </main>
  )
}
