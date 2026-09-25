import OpenAI from "openai"
import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { checkRateLimit, recordUsage } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

// Curated fallback stock images
const FALLBACK_IMAGES = {
  untreated: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&auto=format&fit=crop&q=80",
  treated: "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=800&auto=format&fit=crop&q=80",
}

export async function POST(req: Request) {
  try {
    const { crop = "Tomato", symptom = "foliar disease", context = "", deviceId } = await req.json()
    const apiKey = process.env.OPENAI_API_KEY

    // --- Step 1: Extract DETAILED visual description from chat context ---
    let plantDetails = {
      crop,
      variety: "",
      symptom,
      flowerColor: "",
      leafDescription: "",
      healthStatus: "unknown" as "healthy" | "diseased" | "stressed" | "unknown",
      visualDescription: `a ${crop} plant`,
    }

    if (apiKey && context && typeof context === "string" && context.length > 10) {
      try {
        const openai = new OpenAI({ apiKey })
        const parseRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are analyzing an agronomy chat to extract precise visual details about the plant being discussed.
Reply ONLY as JSON with these fields:
{
  "crop": "exact species name (e.g. Leucospermum, Solanum lycopersicum)",
  "commonName": "common name (e.g. Pincushion Protea, Cherry Tomato)",
  "variety": "specific variety if mentioned",
  "symptom": "primary symptom/disease or 'healthy' if no issues found",
  "healthStatus": "healthy | diseased | stressed",
  "flowerColor": "flower/fruit color if visible (e.g. yellow, red, pink)",
  "leafDescription": "brief leaf appearance (e.g. thick leathery dark green oval leaves)",
  "visualDescription": "one sentence describing exactly how this specific plant looks based on the conversation (e.g. 'a yellow pincushion protea with round spiky flower head, thick green leaves, growing in fynbos terrain')"
}`,
            },
            {
              role: "user",
              content: context.slice(-2000),
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        })

        const content = parseRes.choices[0]?.message?.content
        if (content) {
          const parsed = JSON.parse(content)
          if (parsed.crop) plantDetails.crop = parsed.crop
          if (parsed.commonName) plantDetails.crop = `${parsed.commonName} (${parsed.crop})`
          if (parsed.variety) plantDetails.variety = parsed.variety
          if (parsed.symptom) plantDetails.symptom = parsed.symptom
          if (parsed.flowerColor) plantDetails.flowerColor = parsed.flowerColor
          if (parsed.leafDescription) plantDetails.leafDescription = parsed.leafDescription
          if (parsed.healthStatus) plantDetails.healthStatus = parsed.healthStatus as any
          if (parsed.visualDescription) plantDetails.visualDescription = parsed.visualDescription
        }
      } catch (parseErr) {
        console.warn("Context extraction notice:", parseErr)
      }
    }

    const isHealthy = plantDetails.healthStatus === "healthy" ||
      plantDetails.symptom.toLowerCase().includes("healthy") ||
      plantDetails.symptom.toLowerCase().includes("no visible") ||
      plantDetails.symptom.toLowerCase().includes("no signs")

    // --- Step 2: Generate timeline descriptions dynamically ---
    let timeline = {
      day3: "",
      day7: "",
      day14: "",
      day14Treated: "",
    }

    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey })
        const timelineRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: isHealthy
                ? `You are an expert agronomist. The farmer has a HEALTHY ${plantDetails.crop}.
Generate a realistic 14-day forecast showing what could go wrong if the plant is NEGLECTED vs kept well-maintained.
Reply ONLY as JSON:
{
  "day3": "What changes if neglected by day 3 (1 sentence)",
  "day7": "Deterioration by day 7 if neglected (1 sentence)",
  "day14": "Worst case by day 14 if fully neglected (1 sentence)",
  "day14Treated": "Best outcome by day 14 with proper ongoing care (1 sentence)"
}`
                : `You are an expert agronomist. The farmer has a ${plantDetails.crop} with ${plantDetails.symptom}.
Generate a realistic 14-day prognosis comparing untreated vs treated outcomes.
Reply ONLY as JSON:
{
  "day3": "Disease/symptom progression by day 3 without treatment (1 sentence)",
  "day7": "Deterioration by day 7 without treatment (1 sentence)",
  "day14": "Worst case by day 14 without treatment (1 sentence)",
  "day14Treated": "Recovery outcome by day 14 WITH proper treatment (1 sentence)"
}`,
            },
            { role: "user", content: `Plant: ${plantDetails.visualDescription}\nSymptom: ${plantDetails.symptom}` },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        })

        const tlContent = timelineRes.choices[0]?.message?.content
        if (tlContent) {
          const parsed = JSON.parse(tlContent)
          timeline = { ...timeline, ...parsed }
        }
      } catch (e) {
        console.warn("Timeline generation notice:", e)
      }
    }

    // Fallback timeline if AI didn't generate one
    if (!timeline.day3) {
      if (isHealthy) {
        timeline = {
          day3: "Minor stress signs appear from inconsistent watering or sun exposure changes.",
          day7: "Leaf edges brown, flower buds may abort from nutrient or water stress.",
          day14: "Significant canopy decline and vulnerability to opportunistic pathogens.",
          day14Treated: "Thriving plant with strong new growth, vibrant flowers, and robust root system.",
        }
      } else {
        timeline = {
          day3: "Symptoms spread to adjacent tissue and intensify.",
          day7: "Photosynthetic capacity drops significantly; heavy leaf deterioration.",
          day14: "Permanent vascular damage and potential crop loss.",
          day14Treated: "Pathogen arrested, healthy new growth emerging, recovery underway.",
        }
      }
    }

    // --- Step 3: Rate limit check + Generate images that MATCH the actual plant ---
    let generatedUntreatedUrl = FALLBACK_IMAGES.untreated
    let generatedTreatedUrl = FALLBACK_IMAGES.treated
    let rateLimitInfo = { allowed: true, remaining: 0, limit: 0, used: 0, resetAt: null as Date | null }
    let imagesGenerated = false

    // Check rate limit before burning API credits on image generation
    if (apiKey && deviceId) {
      const rl = await checkRateLimit(deviceId, "image_generation")
      rateLimitInfo = { ...rl, resetAt: rl.resetAt }

      if (!rl.allowed) {
        console.warn(`[RATE LIMIT] Device ${deviceId} exceeded image gen limit: ${rl.used}/${rl.limit} used. Resets at ${rl.resetAt.toISOString()}`)
        // Fall through — will use fallback stock images instead
      } else {
        const openai = new OpenAI({ apiKey })

        // Build highly specific prompts that match the user's actual plant
        const plantDesc = plantDetails.visualDescription
        const colorNote = plantDetails.flowerColor ? `, ${plantDetails.flowerColor} colored flowers` : ""
        const leafNote = plantDetails.leafDescription ? `, ${plantDetails.leafDescription}` : ""

        const untreatedPrompt = isHealthy
          ? `Photorealistic close-up photograph of ${plantDesc}${colorNote}${leafNote} that has been NEGLECTED for 14 days — showing wilting, browning leaf edges, drooping flower heads, dried stems, in a natural outdoor setting. The plant should clearly be the SAME species as described but in poor condition. No text or labels.`
          : `Photorealistic close-up photograph of ${plantDesc}${colorNote}${leafNote} with severe untreated ${plantDetails.symptom} — showing advanced disease damage, brown/black lesions, wilting, in a natural outdoor setting. The plant should clearly be the SAME species as described but severely affected. No text or labels.`

        const treatedPrompt = `Photorealistic close-up photograph of a perfectly healthy, thriving ${plantDesc}${colorNote}${leafNote} — vibrant colors, strong stems, lush foliage, beautiful blooms, in bright natural sunlight. The plant should clearly be the SAME species as described but in peak health condition. No text or labels.`

        // Generate untreated/neglected image
        try {
          const untreatedRes = await openai.images.generate({
            model: "gpt-image-1",
            prompt: untreatedPrompt,
            n: 1,
            size: "1024x1024",
            quality: "low",
          })
          if (untreatedRes.data?.[0]?.url) {
            generatedUntreatedUrl = untreatedRes.data[0].url
          } else if (untreatedRes.data?.[0]?.b64_json) {
            generatedUntreatedUrl = `data:image/png;base64,${untreatedRes.data[0].b64_json}`
          }
        } catch (e: any) {
          console.warn("Image gen (untreated) notice:", e?.message || e)
        }

        // Generate treated/healthy image
        try {
          const treatedRes = await openai.images.generate({
            model: "gpt-image-1",
            prompt: treatedPrompt,
            n: 1,
            size: "1024x1024",
            quality: "low",
          })
          if (treatedRes.data?.[0]?.url) {
            generatedTreatedUrl = treatedRes.data[0].url
          } else if (treatedRes.data?.[0]?.b64_json) {
            generatedTreatedUrl = `data:image/png;base64,${treatedRes.data[0].b64_json}`
          }
        } catch (e: any) {
          console.warn("Image gen (treated) notice:", e?.message || e)
        }

        // Record usage AFTER successful generation (counts as 1 generation for the pair)
        imagesGenerated = true
        await recordUsage(deviceId, "image_generation")
        console.log(`[RATE LIMIT] Device ${deviceId}: image gen recorded. ${rateLimitInfo.remaining - 1} remaining.`)
      }
    } else if (apiKey && !deviceId) {
      // No deviceId — still generate but can't rate-limit
      console.warn("[RATE LIMIT] No deviceId provided — skipping rate limit check")
    }

    // Save forecast to MongoDB if connected
    if (deviceId) {
      try {
        const db = await getDatabase()
        if (db) {
          await db.collection("forecasts").insertOne({
            deviceId,
            crop: plantDetails.crop,
            symptom: plantDetails.symptom,
            healthStatus: plantDetails.healthStatus,
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
