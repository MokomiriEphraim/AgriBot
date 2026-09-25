import OpenAI from "openai"
import { NextResponse } from "next/server"
import { matchKB, getRegionNote } from "@/lib/knowledge-base"
import type { Region } from "@/lib/types"

export const runtime = "nodejs"

const DIAGNOSIS_PROMPT = `You are AgriBot, a friendly farming helper for small farmers.

You receive:
- A plant photo description (plant, symptom, severity)
- A knowledge base entry that matches
- The farmer's region and how long the problem has lasted

You reply in simple, warm language.

Format:
1. Likely cause (with confidence: high/medium/low)
2. What to do now (3 steps max)
3. Prevention (2 steps max)
4. When to see an extension officer

Rules:
- Never guess. If unsure, say so.
- Never recommend specific pesticide doses.
- Keep it under 100 words.
- Simple words. No jargon.
- Use the knowledge base entry as the basis for your answer`


export async function POST(req: Request) {
  try {
    const { plant, symptom, severity, region, duration, kbEntryId } = await req.json()

    // Match against knowledge base
    const kbMatch = kbEntryId
      ? (await import("@/lib/knowledge-base")).KNOWLEDGE_BASE.find((e) => e.id === kbEntryId)
      : matchKB(plant, symptom)

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      // Fallback: build answer from KB without GPT
      if (kbMatch) {
        const regionNote = getRegionNote(kbMatch, (region as Region) || "unknown")
        const answer = [
          `**Likely cause:** ${kbMatch.cause} (confidence: ${kbMatch.confidence})`,
          "",
          "**What to do now:**",
          ...kbMatch.treatment.map((t, i) => `${i + 1}. ${t}`),
          "",
          "**Prevention:**",
          ...kbMatch.prevention.map((p, i) => `${i + 1}. ${p}`),
          "",
          "If the problem continues after 7–10 days, contact your local agricultural extension officer.",
          regionNote ? `\n*For your region:* ${regionNote}` : "",
        ].filter(Boolean).join("\n")

        return NextResponse.json({ answer, confidence: kbMatch.confidence })
      }

      return NextResponse.json({
        answer: "I'm not sure what this is. Please describe the symptoms in more detail, or contact your local agricultural extension officer for help.",
        confidence: "low",
      })
    }

    const openai = new OpenAI({ apiKey })

    const kbContext = kbMatch
      ? `KB match: ${kbMatch.cause}\nTreatment: ${kbMatch.treatment.join("; ")}\nPrevention: ${kbMatch.prevention.join("; ")}`
      : "No matching knowledge base entry found."

    const regionNote = kbMatch && region ? getRegionNote(kbMatch, region as Region) : undefined

    const messages = [
      { role: "system" as const, content: DIAGNOSIS_PROMPT },
      {
        role: "user" as const,
        content: [
          `Plant: ${plant}`,
          `Symptom: ${symptom}`,
          `Severity: ${severity}`,
          `Region: ${region || "unknown"}`,
          `Duration: ${duration || "unknown"}`,
          kbContext,
          regionNote ? `Region note: ${regionNote}` : "",
          "",
          "Write the diagnosis following the format above.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ]

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 300,
      temperature: 0.3,
    })

    const answer = response.choices[0]?.message?.content || "I couldn't generate a diagnosis. Please try again."

    return NextResponse.json({
      answer,
      confidence: kbMatch?.confidence || "low",
    })
  } catch (error: any) {
    console.error("Diagnose API error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to generate diagnosis" },
      { status: 500 },
    )
  }
}
