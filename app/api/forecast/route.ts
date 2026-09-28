import OpenAI from "openai"
import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { checkRateLimit, recordUsage } from "@/lib/rate-limit"
import { buildForecastLanguageRule, detectConversationLanguage } from "@/lib/language"

export const runtime = "nodejs"
export const maxDuration = 120

function createPlantVisualFallback(
  crop: string,
  visualDescription: string,
  isHealthy: boolean,
  type: "untreated" | "treated",
): string {
  const isLoss = type === "untreated"
  const title = isLoss
    ? isHealthy
      ? "14-Day Neglected Path"
      : "14-Day Untreated Disease Loss"
    : isHealthy
      ? "14-Day Maintained Care"
      : "14-Day Treated Recovery"

  const subtitle = isLoss
    ? isHealthy
      ? `Severe decline for ${crop} if neglected`
      : `Complete pathogen damage for ${crop}`
    : isHealthy
      ? `Flourishing blooms & peak vigor for ${crop}`
      : `Full recovery & robust health for ${crop}`

  const bgGrad = isLoss
    ? "linear-gradient(135deg, #1f130b 0%, #3b180d 50%, #18181b 100%)"
    : "linear-gradient(135deg, #042f2e 0%, #065f46 50%, #022c22 100%)"

  const accentColor = isLoss ? "#ef4444" : "#10b981"
  const badgeBg = isLoss ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"
  const icon = isLoss ? "🥀" : "🌺"

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${isLoss ? "#1f130b" : "#042f2e"}" />
        <stop offset="50%" stop-color="${isLoss ? "#3b180d" : "#065f46"}" />
        <stop offset="100%" stop-color="${isLoss ? "#18181b" : "#022c22"}" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)" rx="16" />
    <circle cx="400" cy="210" r="85" fill="${badgeBg}" />
    <text x="400" y="238" font-size="64" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${icon}</text>
    <text x="400" y="340" font-size="26" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${crop}</text>
    <rect x="230" y="365" width="340" height="34" rx="17" fill="${badgeBg}" stroke="${accentColor}" stroke-width="1.5" />
    <text x="400" y="388" font-size="13" font-weight="bold" fill="${accentColor}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${title}</text>
    <text x="400" y="440" font-size="15" fill="#e2e8f0" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${subtitle}</text>
    <text x="400" y="475" font-size="12" fill="#94a3b8" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">14-Day AI Projected Outcome</text>
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export async function POST(req: Request) {
  try {
    const { crop: requestedCrop, symptom: requestedSymptom, context = "", imageUrl, deviceId } = await req.json()
    const apiKey = process.env.OPENAI_API_KEY

    // --- Step 1: Extract plant and deep causal analysis ---
    let plantDetails = {
      crop: requestedCrop || "Crop",
      variety: "",
      symptom: requestedSymptom || "Crop condition",
      flowerColor: "",
      leafDescription: "",
      healthStatus: "unknown" as "healthy" | "diseased" | "stressed" | "unknown",
      visualDescription: requestedCrop ? `a ${requestedCrop} plant` : "a crop plant",
      causesBad: [] as string[],
      causesGood: [] as string[],
    }

    let timeline = {
      day3: "",
      day7: "",
      day14: "",
      day3Treated: "",
      day7Treated: "",
      day14Treated: "",
    }

    if (apiKey) {
      const openai = new OpenAI({ apiKey })
      const languageHint = detectConversationLanguage([context])

      if (imageUrl && typeof imageUrl === "string") {
        // Inspect the uploaded photo directly with GPT-4o Vision
        try {
          const visionRes = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are an elite Agronomist and Plant Pathologist.
Analyze the user's plant photo and chat context to produce a complete 14-day prognosis model covering BOTH the BAD (neglected/untreated) and GOOD (treated/cared) paths.

${buildForecastLanguageRule(languageHint)}

Reply ONLY as JSON with these fields:
{
  "crop": "exact plant name (e.g. Protea, Leucospermum, Tomato, Maize, Pepper)",
  "commonName": "common name (e.g. Yellow Pincushion Protea)",
  "variety": "specific variety or cultivar",
  "symptom": "primary observed state (e.g. 'Vibrant healthy bloom', 'Powdery mildew', 'Aphid stress')",
  "healthStatus": "healthy | diseased | stressed",
  "flowerColor": "bloom/fruit color (e.g. vibrant yellow, orange)",
  "leafDescription": "leaf shape, texture, color",
  "visualDescription": "one detailed sentence describing exactly how this specific plant looks in the image",
  "causesBad": [
    "Specific cause 1 that will trigger rapid plant decline/death if neglected (e.g., poor drainage leading to root rot)",
    "Specific cause 2 (e.g., opportunistic sap-sucking pests, nutrient lockout)"
  ],
  "causesGood": [
    "Specific practice 1 that will ensure flourishing growth (e.g., early morning deep watering, full sunlight)",
    "Specific practice 2 (e.g., acidic well-drained soil, organic neem preventative spray)"
  ],
  "day3": "Bad path: visible stress/spores by day 3 without care (1 sentence)",
  "day7": "Bad path: severe wilting/lesions by day 7 without care (1 sentence)",
  "day14": "Bad path: worst case total decline/loss by day 14 (1 sentence)",
  "day3Treated": "Good path: immediate stabilization and fresh vigor by day 3 (1 sentence)",
  "day7Treated": "Good path: robust bud formation and leaf expansion by day 7 (1 sentence)",
  "day14Treated": "Good path: peak thriving harvest and vibrant blooms by day 14 (1 sentence)"
}`,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: `Chat context: ${context.slice(-1000)}\nInspect this plant and generate the dual 14-day prognosis with root causes:` },
                  { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
                ],
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          })

          const content = visionRes.choices[0]?.message?.content
          if (content) {
            const parsed = JSON.parse(content)
            if (parsed.crop) plantDetails.crop = parsed.commonName || parsed.crop
            if (parsed.variety) plantDetails.variety = parsed.variety
            if (parsed.symptom) plantDetails.symptom = parsed.symptom
            if (parsed.flowerColor) plantDetails.flowerColor = parsed.flowerColor
            if (parsed.leafDescription) plantDetails.leafDescription = parsed.leafDescription
            if (parsed.healthStatus) plantDetails.healthStatus = parsed.healthStatus as any
            if (parsed.visualDescription) plantDetails.visualDescription = parsed.visualDescription
            if (Array.isArray(parsed.causesBad)) plantDetails.causesBad = parsed.causesBad
            if (Array.isArray(parsed.causesGood)) plantDetails.causesGood = parsed.causesGood

            if (parsed.day3) timeline.day3 = parsed.day3
            if (parsed.day7) timeline.day7 = parsed.day7
            if (parsed.day14) timeline.day14 = parsed.day14
            if (parsed.day3Treated) timeline.day3Treated = parsed.day3Treated
            if (parsed.day7Treated) timeline.day7Treated = parsed.day7Treated
            if (parsed.day14Treated) timeline.day14Treated = parsed.day14Treated
          }
        } catch (visionErr) {
          console.warn("Vision analysis notice:", visionErr)
        }
      } else if (context && typeof context === "string" && context.length > 10) {
        // Text-only context analysis
        try {
          const parseRes = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are an expert Agronomist. Extract the plant from the chat and build a 14-day dual prognosis (bad vs good path) with causes.

${buildForecastLanguageRule(languageHint)}
Reply ONLY as JSON:
{
  "crop": "exact plant name (e.g. Protea, Tomato, Maize)",
  "commonName": "common name",
  "variety": "variety if mentioned",
  "symptom": "primary condition or symptom",
  "healthStatus": "healthy | diseased | stressed",
  "flowerColor": "flower/fruit color",
  "leafDescription": "leaf description",
  "visualDescription": "detailed sentence describing this plant",
  "causesBad": ["2 specific causes of deterioration if neglected/untreated"],
  "causesGood": ["2 specific actions that cause thriving recovery"],
  "day3": "Bad path day 3",
  "day7": "Bad path day 7",
  "day14": "Bad path day 14",
  "day3Treated": "Good path day 3",
  "day7Treated": "Good path day 7",
  "day14Treated": "Good path day 14"
}`,
              },
              { role: "user", content: context.slice(-2000) },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          })

          const content = parseRes.choices[0]?.message?.content
          if (content) {
            const parsed = JSON.parse(content)
            if (parsed.crop) plantDetails.crop = parsed.commonName || parsed.crop
            if (parsed.variety) plantDetails.variety = parsed.variety
            if (parsed.symptom) plantDetails.symptom = parsed.symptom
            if (parsed.flowerColor) plantDetails.flowerColor = parsed.flowerColor
            if (parsed.leafDescription) plantDetails.leafDescription = parsed.leafDescription
            if (parsed.healthStatus) plantDetails.healthStatus = parsed.healthStatus as any
            if (parsed.visualDescription) plantDetails.visualDescription = parsed.visualDescription
            if (Array.isArray(parsed.causesBad)) plantDetails.causesBad = parsed.causesBad
            if (Array.isArray(parsed.causesGood)) plantDetails.causesGood = parsed.causesGood

            if (parsed.day3) timeline.day3 = parsed.day3
            if (parsed.day7) timeline.day7 = parsed.day7
            if (parsed.day14) timeline.day14 = parsed.day14
            if (parsed.day3Treated) timeline.day3Treated = parsed.day3Treated
            if (parsed.day7Treated) timeline.day7Treated = parsed.day7Treated
            if (parsed.day14Treated) timeline.day14Treated = parsed.day14Treated
          }
        } catch (parseErr) {
          console.warn("Context extraction notice:", parseErr)
        }
      }
    }

    const isHealthy =
      plantDetails.healthStatus === "healthy" ||
      plantDetails.symptom.toLowerCase().includes("healthy") ||
      plantDetails.symptom.toLowerCase().includes("no visible") ||
      plantDetails.symptom.toLowerCase().includes("no signs") ||
      plantDetails.symptom.toLowerCase().includes("good health") ||
      plantDetails.symptom.toLowerCase().includes("vibrant")

    // Default causes if not populated
    if (plantDetails.causesBad.length === 0) {
      plantDetails.causesBad = isHealthy
        ? [
            `Waterlogging and stagnant soil moisture causing root suffocation in ${plantDetails.crop}.`,
            `High phosphorus fertilization or sudden direct midday sun scorch.`,
            `Undetected pest vectors (aphids/scale) causing flower bud abortion.`,
          ]
        : [
            `Untreated pathogen proliferation causing vascular blockages in ${plantDetails.crop}.`,
            `Foliar spore dissemination during humidity spikes.`,
            `Secondary fungal and bacterial decay of weakened tissue.`,
          ]
    }

    if (plantDetails.causesGood.length === 0) {
      plantDetails.causesGood = isHealthy
        ? [
            `Early morning watering directly at base; well-drained acidic soil.`,
            `Full sunlight exposure (6+ hours daily) with good air circulation.`,
            `Preventative biological organic sprays (neem / compost extract).`,
          ]
        : [
            `Targeted organic/active treatment eliminating pathogen inoculum.`,
            `Pruning of infected lower foliage to increase air flow.`,
            `Balanced macro-micronutrient support restoring plant vigor.`,
          ]
    }

    // Default timeline if not populated
    if (!timeline.day3) {
      timeline.day3 = `Minor moisture stress and petal wilting begin if ${plantDetails.crop} is neglected.`
      timeline.day7 = `Flower heads droop and leaf margins brown due to root stress or disease spread.`
      timeline.day14 = `Extensive foliage dieback and collapse of blooming vigor from prolonged neglect.`
    }
    if (!timeline.day14Treated) {
      timeline.day3Treated = `Plant stabilizes with improved turgor and active nutrient uptake.`
      timeline.day7Treated = `Strong new leaf growth and vibrant flower head preservation.`
      timeline.day14Treated = `Peak vigor, flourishing blooms, and complete long-term resilience for ${plantDetails.crop}.`
    }

    // --- Step 2: Rate limit check + DALL-E Image Generation ---
    let generatedUntreatedUrl = createPlantVisualFallback(
      plantDetails.crop,
      plantDetails.visualDescription,
      isHealthy,
      "untreated",
    )
    let generatedTreatedUrl = createPlantVisualFallback(
      plantDetails.crop,
      plantDetails.visualDescription,
      isHealthy,
      "treated",
    )
    let rateLimitInfo = { allowed: true, remaining: 0, limit: 0, used: 0, resetAt: null as Date | null }
    let imagesGenerated = false

    if (apiKey && deviceId) {
      const rl = await checkRateLimit(deviceId, "image_generation")
      rateLimitInfo = { ...rl, resetAt: rl.resetAt }

      if (rl.allowed) {
        const openai = new OpenAI({ apiKey })
        const plantDesc = plantDetails.visualDescription
        const colorNote = plantDetails.flowerColor ? `, ${plantDetails.flowerColor} colored blooms` : ""
        const leafNote = plantDetails.leafDescription ? `, ${plantDetails.leafDescription}` : ""

        const untreatedPrompt = isHealthy
          ? `Photorealistic close-up photograph of ${plantDesc}${colorNote}${leafNote} after 14 days of severe NEGLECT and no care — showing wilting, browning petals, drooping flower heads, dried leaves, in natural outdoor lighting. Clearly ${plantDetails.crop} in decline. No text or badges.`
          : `Photorealistic close-up photograph of ${plantDesc}${colorNote}${leafNote} with severe untreated ${plantDetails.symptom} after 14 days — extensive necrosis, wilting, dark lesions in an outdoor field. Clearly ${plantDetails.crop}. No text or badges.`

        const treatedPrompt = `Photorealistic close-up photograph of a thriving, flourishing ${plantDesc}${colorNote}${leafNote} in peak health after 14 days of expert care — vibrant colors, fresh open blooms, pristine glossy foliage, bright natural morning sunlight. Clearly ${plantDetails.crop}. No text or badges.`

        // Generate BOTH images in parallel using gpt-image-1 (base64 response)
        const generateImage = async (prompt: string): Promise<string | null> => {
          try {
            const res = await openai.images.generate({
              model: "gpt-image-1",
              prompt: prompt,
              n: 1,
              size: "1024x1024",
            } as any)

            // gpt-image-1 returns base64 data in b64_json field
            const imageData = res.data?.[0]
            if (imageData) {
              // Handle both URL and base64 response formats
              if ((imageData as any).b64_json) {
                return `data:image/png;base64,${(imageData as any).b64_json}`
              } else if (imageData.url) {
                return imageData.url
              }
            }
            return null
          } catch (err: any) {
            console.warn("gpt-image-1 generation error:", err?.message || err)
            return null
          }
        }

        // Run both generations in parallel for speed
        const [untreatedResult, treatedResult] = await Promise.allSettled([
          generateImage(untreatedPrompt),
          generateImage(treatedPrompt),
        ])

        if (untreatedResult.status === "fulfilled" && untreatedResult.value) {
          generatedUntreatedUrl = untreatedResult.value
          imagesGenerated = true
        }
        if (treatedResult.status === "fulfilled" && treatedResult.value) {
          generatedTreatedUrl = treatedResult.value
          imagesGenerated = true
        }

        if (imagesGenerated) {
          await recordUsage(deviceId, "image_generation")
        }
      }
    }

    // Save forecast to MongoDB
    if (deviceId) {
      try {
        const db = await getDatabase()
        if (db) {
          await db.collection("forecasts").insertOne({
            deviceId,
            crop: plantDetails.crop,
            symptom: plantDetails.symptom,
            healthStatus: plantDetails.healthStatus,
            causesBad: plantDetails.causesBad,
            causesGood: plantDetails.causesGood,
            untreatedUrl: generatedUntreatedUrl,
            treatedUrl: generatedTreatedUrl,
            createdAt: new Date(),
          })
        }
      } catch (dbErr) {
        console.warn("Could not save forecast to MongoDB:", dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      crop: plantDetails.crop,
      symptom: plantDetails.symptom,
      healthStatus: plantDetails.healthStatus,
      isHealthy,
      causesBad: plantDetails.causesBad,
      causesGood: plantDetails.causesGood,
      untreatedUrl: generatedUntreatedUrl,
      treatedUrl: generatedTreatedUrl,
      timeline,
      rateLimit: {
        imagesGenerated,
        used: rateLimitInfo.used + (imagesGenerated ? 1 : 0),
        limit: rateLimitInfo.limit,
        remaining: Math.max(0, rateLimitInfo.remaining - (imagesGenerated ? 1 : 0)),
        resetAt: rateLimitInfo.resetAt,
      },
    })
  } catch (error: any) {
    console.error("Forecast API error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to generate visual progression" },
      { status: 500 },
    )
  }
}
