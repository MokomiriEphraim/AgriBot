"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Hero */}
      <div className="relative h-[46%] w-full overflow-hidden">
        <Image
          src="/farm-hero.png"
          alt="Lush green farm field at sunrise"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 480px) 100vw, 480px"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/20 to-background" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-4 text-center">
          <Image
            src="/agribot-mascot.png"
            alt=""
            width={120}
            height={120}
            className="h-24 w-24 drop-shadow-md"
          />
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-primary">AgriBot</h1>
          <p className="mt-1 text-sm font-medium text-primary/80">
            Healthy Crops &middot; Better Yields &middot; Brighter Futures
          </p>
        </div>
      </div>

      {/* Intro card */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h2 className="text-pretty text-2xl font-bold text-foreground">Welcome to AgriBot!</h2>
        <p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
          Your farming support chatbot. Get quick, reliable advice about your crops, pests, and
          farming practices.
        </p>

        <button
          type="button"
          onClick={onStart}
          className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-primary bg-card px-8 py-3.5 text-base font-semibold text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Start Chatting
          <ArrowRight className="size-5" />
        </button>
      </div>
    </div>
  )
}
