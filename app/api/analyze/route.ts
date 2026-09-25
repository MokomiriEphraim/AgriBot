import OpenAI from "openai"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

const ANALYSIS_PROMPT = `Describe this plant photo. Be brief — identify the plant and what looks wrong.
Reply as JSON only, no markdown:
{"plant": "...", "symptom": "...", "severity": "mild|moderate|severe"}

Rules:
- plant: common name (tomato, maize, beans, potato, pepper, cassava, rice, or other)
- symptom: short description of what's wrong (e.g. "yellow leaves with brown spots")
- severity: how bad it looks (mild = minor, moderate = spreading, severe = plant may die)
- If you can't identify the plant, use "other" and describe what you see
- Never guess the cause — just describe what you see`


export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      // Fallback: return mock analysis when no API key
      return NextResponse.json({
        plant: "tomato",
        symptom: "yellow leaves with brown spots",
        severity: "moderate",
      })
    }

    const openai = new OpenAI({ apiKey })

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ANALYSIS_PROMPT },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.2,
    })

    const raw = response.choices[0]?.message?.content || ""

    // Try to parse JSON from the response (strip markdown fences if present)
    const cleaned = raw.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({
      plant: parsed.plant || "other",
      symptom: parsed.symptom || "unknown symptoms",
      severity: parsed.severity || "moderate",
    })
  } catch (error: any) {
    console.error("Analyze API error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to analyze image" },
      { status: 500 },
    )
  }
}
