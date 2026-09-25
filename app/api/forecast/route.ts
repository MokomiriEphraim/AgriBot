import OpenAI from "openai"
import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { checkRateLimit, recordUsage } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

function createPlantVisualFallback(crop: string, visualDescription: string, isHealthy: boolean, type: "untreated" | "treated"): string {
  const isLoss = type === "untreated"
  const title = isLoss ? (isHealthy ? "14-Day Neglected Outcome" : "14-Day Untreated Disease Loss") : (isHealthy ? "14-Day Well-Maintained Care" : "14-Day Treated Recovery")
  const subtitle = isLoss
    ? (isHealthy ? `Significant decline for ${crop} if neglected` : `Severe untreated damage for ${crop}`)
    : (isHealthy ? `Peak vigor and flourishing blooms for ${crop}` : `Complete recovery and restoration for ${crop}`)
  
  const bgGrad = isLoss
    ? "linear-gradient(135deg, #2b110b 0%, #451a03 50%, #1c1917 100%)"
    : "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #022c22 100%)"
  
  const accentColor = isLoss ? "#ef4444" : "#10b981"
  const badgeBg = isLoss ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"
  const icon = isLoss ? "🥀" : "🌺"

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${isLoss ? '#1f130b' : '#042f2e'}" />
        <stop offset="50%" stop-color="${isLoss ? '#3b180d' : '#065f46'}" />
        <stop offset="100%" stop-color="${isLoss ? '#18181b' : '#022c22'}" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)" rx="16" />
    <circle cx="400" cy="220" r="90" fill="${badgeBg}" />
    <text x="400" y="245" font-size="70" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${icon}</text>
    <text x="400" y="360" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${crop}</text>
    <rect x="250" y="380" width="300" height="34" rx="17" fill="${badgeBg}" stroke="${accentColor}" stroke-width="1.5" />
    <text x="400" y="403" font-size="14" font-weight="bold" fill="${accentColor}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${title}</text>
    <text x="400" y="450" font-size="16" fill="#e2e8f0" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${subtitle}</text>
    <text x="400" y="480" font-size="13" fill="#94a3b8" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">14-Day Visual Projection</text>
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export async function POST(req: Request) {
  try {
    const { crop: requestedCrop, symptom: requestedSymptom, context = "", imageUrl, deviceId } = await req.json()
    const apiKey = process.env.OPENAI_API_KEY

    // --- Step 1: Extract DETAILED visual description from Image or Chat context ---
    let plantDetails = {
      crop: requestedCrop || "Crop",
      variety: "",
      symptom: requestedSymptom || "Crop condition",
      flowerColor: "",
      leafDescription: "",
      healthStatus: "unknown" as "healthy" | "diseased" | "stressed" | "unknown",
      visualDescription: requestedCrop ? `a ${requestedCrop} plant` : "a farm crop",
    }

    if (apiKey) {
      const openai = new OpenAI({ apiKey })

      if (imageUrl && typeof imageUrl === "string") {
        // If an image URL is provided, inspect the real image with Vision
        try {
          const visionRes = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are analyzing a plant photo to extract precise visual details for a 14-day growth/prognosis model.
Reply ONLY as JSON with these fields:
{
  "crop": "exact plant name (e.g. Protea, Leucospermum, Tomato, Maize, Pepper)",
  "commonName": "common name (e.g. Yellow Pincushion Protea)",
  "variety": "specific variety if visible",
  "symptom": "primary condition, symptom, or 'healthy' if in good health",
  "healthStatus": "healthy | diseased | stressed",
  "flowerColor": "flower or fruit color (e.g. vibrant yellow, red, none)",
  "leafDescription": "brief leaf appearance (e.g. dense oval leaves with red-tipped margins)",
  "visualDescription": "detailed sentence describing this exact plant in the image (e.g. 'a vibrant yellow pincushion protea (Leucospermum) with spiky flower heads and thick green foliage growing in mountainous landscape')"
}`,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: `Context: ${context.slice(-1000)}\nIdentify this plant and its exact visual condition:` },
                  { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
                ],
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          })

          const content = visionRes.choices[0]?.message?.content
          if (content) {
            const parsed = JSON.parse(content)
            if (parsed.crop) plantDetails.crop = parsed.crop
            if (parsed.commonName) plantDetails.crop = parsed.commonName
            if (parsed.variety) plantDetails.variety = parsed.variety
            if (parsed.symptom) plantDetails.symptom = parsed.symptom
            if (parsed.flowerColor) plantDetails.flowerColor = parsed.flowerColor
            if (parsed.leafDescription) plantDetails.leafDescription = parsed.leafDescription
            if (parsed.healthStatus) plantDetails.healthStatus = parsed.healthStatus as any
            if (parsed.visualDescription) plantDetails.visualDescription = parsed.visualDescription
          }
        } catch (visionErr) {
          console.warn("Vision extraction notice:", visionErr)
        }
      } else if (context && typeof context === "string" && context.length > 10) {
        // Otherwise extract from text context
        try {
          const parseRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are analyzing an agronomy chat to extract precise visual details about the plant being discussed.
Reply ONLY as JSON with these fields:
{
  "crop": "exact plant name (e.g. Protea, Tomato, Maize, Pepper)",
  "commonName": "common name (e.g. Pincushion Protea, Beefsteak Tomato)",
  "variety": "specific variety if mentioned",
  "symptom": "primary symptom/disease or 'healthy' if in good health",
  "healthStatus": "healthy | diseased | stressed",
  "flowerColor": "flower/fruit color if mentioned",
  "leafDescription": "brief leaf appearance",
  "visualDescription": "one sentence describing this specific plant based on the chat"
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
            if (parsed.commonName) plantDetails.crop = parsed.commonName
            if (parsed.variety) plantDetails.variety = parsed.variety
            if (parsed.symptom) plantDetails.symptom = parsed.symptom
            if (parsed.flowerColor) plantDetails.flowerColor = parsed.flowerColor
            if (parsed.leafDescription) plantDetails.leafDescription = parsed.leafDescription
            if (parsed.healthStatus) plantDetails.healthStatus = parsed.healthStatus as any
            if (parsed.visualDescription) plantDetails.visualDescription = parsed.visualDescription
          }
        } catch (parseErr) {
          console.warn("Context text extraction notice:", parseErr)
        }
      }
    }

    const isHealthy =
      plantDetails.healthStatus === "healthy" ||
      plantDetails.symptom.toLowerCase().includes("healthy") ||
      plantDetails.symptom.toLowerCase().includes("no visible") ||
      plantDetails.symptom.toLowerCase().includes("no signs") ||
      plantDetails.symptom.toLowerCase().includes("good health")

    // --- Step 2: Generate timeline descriptions dynamically for this EXACT plant ---
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

    // Dynamic fallback timeline tailored to this specific plant
    if (!timeline.day3) {
      if (isHealthy) {
        timeline = {
          day3: `Minor moisture stress or petal wilting may begin if ${plantDetails.crop} is neglected.`,
          day7: `Flower heads droop and leaf tips turn brown due to lack of proper soil moisture or drainage for ${plantDetails.crop}.`,
          day14: `Severe foliage dieback, aborted flower buds, and stunted root vigor from prolonged neglect.`,
          day14Treated: `Thriving ${plantDetails.crop} with vibrant blooms, lush foliage, and strong root resilience.`,
        }
      } else {
        timeline = {
          day3: `Early symptoms of ${plantDetails.symptom} begin expanding across foliage.`,
          day7: `Photosynthetic capacity drops; noticeable leaf chlorosis and lesions on ${plantDetails.crop}.`,
          day14: `Severe vascular collapse, extensive defoliation, and high risk of crop loss for ${plantDetails.crop}.`,
          day14Treated: `Pathogen arrested, healthy new foliage emerging, and full vigor restored for ${plantDetails.crop}.`,
        }
      }
    }

    // --- Step 3: Rate limit check + Generate images matching the EXACT plant ---
    let generatedUntreatedUrl = createPlantVisualFallback(plantDetails.crop, plantDetails.visualDescription, isHealthy, "untreated")
    let generatedTreatedUrl = createPlantVisualFallback(plantDetails.crop, plantDetails.visualDescription, isHealthy, "treated")
    let rateLimitInfo = { allowed: true, remaining: 0, limit: 0, used: 0, resetAt: null as Date | null }
    let imagesGenerated = false

    if (apiKey && deviceId) {
      const rl = await checkRateLimit(deviceId, "image_generation")
      rateLimitInfo = { ...rl, resetAt: rl.resetAt }

      if (!rl.allowed) {
        console.warn(`[RATE LIMIT] Device ${deviceId} exceeded image gen limit: ${rl.used}/${rl.limit} used.`)
      } else {
        const openai = new OpenAI({ apiKey })
        const plantDesc = plantDetails.visualDescription
        const colorNote = plantDetails.flowerColor ? `, ${plantDetails.flowerColor} colored blooms` : ""
        const leafNote = plantDetails.leafDescription ? `, ${plantDetails.leafDescription}` : ""

        const untreatedPrompt = isHealthy
          ? `Photorealistic close-up photograph of ${plantDesc}${colorNote}${leafNote} that has been completely NEGLECTED for 14 days — wilting, browning petal edges, dry drooping foliage, in an outdoor setting. The plant is clearly ${plantDetails.crop} suffering from neglect. No text or labels.`
          : `Photorealistic close-up photograph of ${plantDesc}${colorNote}${leafNote} with severe untreated ${plantDetails.symptom} — showing disease lesions, wilting, dying tissue in an outdoor setting. The plant is clearly ${plantDetails.crop}. No text or labels.`

        const treatedPrompt = `Photorealistic close-up photograph of a perfectly healthy, thriving ${plantDesc}${colorNote}${leafNote} in peak blooming condition — vibrant colors, fresh petals, lush green leaves, in bright natural morning sunlight. The plant is clearly ${plantDetails.crop}. No text or labels.`

        // Generate untreated image
        try {
          const untreatedRes = await openai.images.generate({
            model: "dall-e-3",
            prompt: untreatedPrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
          })
          if (untreatedRes.data?.[0]?.url) {
            generatedUntreatedUrl = untreatedRes.data[0].url
            imagesGenerated = true
          }
        } catch (e1: any) {
          console.warn("DALL-E 3 untreated attempt notice:", e1?.message || e1)
          try {
            const fbRes = await openai.images.generate({
              model: "dall-e-2",
              prompt: untreatedPrompt.slice(0, 950),
              n: 1,
              size: "512x512",
            })
            if (fbRes.data?.[0]?.url) {
              generatedUntreatedUrl = fbRes.data[0].url
              imagesGenerated = true
            }
          } catch (e2: any) {
            console.warn("DALL-E 2 untreated attempt notice:", e2?.message || e2)
          }
        }

        // Generate treated image
        try {
          const treatedRes = await openai.images.generate({
            model: "dall-e-3",
            prompt: treatedPrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
          })
          if (treatedRes.data?.[0]?.url) {
            generatedTreatedUrl = treatedRes.data[0].url
            imagesGenerated = true
          }
        } catch (e3: any) {
          console.warn("DALL-E 3 treated attempt notice:", e3?.message || e3)
          try {
            const fbRes2 = await openai.images.generate({
              model: "dall-e-2",
              prompt: treatedPrompt.slice(0, 950),
              n: 1,
              size: "512x512",
            })
            if (fbRes2.data?.[0]?.url) {
              generatedTreatedUrl = fbRes2.data[0].url
              imagesGenerated = true
            }
          } catch (e4: any) {
            console.warn("DALL-E 2 treated attempt notice:", e4?.message || e4)
          }
        }

        if (imagesGenerated) {
          await recordUsage(deviceId, "image_generation")
          console.log(`[RATE LIMIT] Device ${deviceId}: image gen recorded.`)
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
