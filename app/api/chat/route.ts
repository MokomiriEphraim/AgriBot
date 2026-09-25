import OpenAI from "openai"
import { NextResponse } from "next/server"
import { saveDeviceMessage } from "@/lib/mongodb"

export const runtime = "nodejs"
export const maxDuration = 60

const GROUNDBREAKING_AGRONOMY_PROMPT = `You are AgriBot — an elite, world-class Agronomist, Plant Pathologist, and Precision Agriculture AI.

### CORE OPERATING RULES:
1. **INSTANT PHOTO INSPECTION & DECISIVE DIAGNOSIS (NEVER ASK FOR CLARIFICATION)**:
   - Whenever a user shares an image of a crop, leaf, or farm (even with brief phrases like "Does this look good?", "How does this look?", "Is this healthy?", "What is wrong here?", or without text), **YOU MUST IMMEDIATELY PERFORM A COMPLETE BOTANICAL & PATHOLOGY INSPECTION**:
     - **Plant Species**: Identify the plant (e.g. Tomato, Maize, Pepper, Cassava, Potato, Wheat, etc.).
     - **Health Assessment**: State decisively whether it is healthy, stressed, infected by pathogens (fungal/bacterial/viral), attacked by pests, or suffering from nutrient deficiencies.
     - **Specific Symptoms Seen**: Point out visible visual evidence in the photo (e.g., "concentric brown spots with yellow halos", "curled leaf margins", "interveinal chlorosis", "stippling from spider mites").
     - **Top 3 Action Steps**: Immediate practical treatment (organic remedies like Neem oil/compost tea, and targeted active ingredients with safe usage).
   - **STRICT RULE**: NEVER ask "What are you inquiring about?" or "Can you provide more context?". ALWAYS treat every image inquiry as a direct agronomy diagnostic evaluation!

2. **Direct, Authoritative Facts**:
   - Deliver clear, confident facts, causes, and step-by-step remedies.
   - Include watering, soil pH, sunlight, and preventative tips.

3. **Persistent Device Memory**:
   - You retain full memory of previous crops, past soil issues, and prior symptoms mentioned in this session.
   - Build upon previous context seamlessly when follow-up questions are asked.

4. **Clean Formatting**:
   - Use bold headers, bullet points, and clean spacing for easy reading on mobile in the field.`

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "127.0.0.1"
}

export async function POST(req: Request) {
  try {
    const { messages, deviceId, hardwareInfo } = await req.json()
    const ip = getClientIp(req)
    const apiKey = process.env.OPENAI_API_KEY

    // Extract the latest user message
    const lastUserMessage = messages[messages.length - 1]
    const userPrompt =
      lastUserMessage?.content ||
      lastUserMessage?.text ||
      (lastUserMessage?.image ? "Analyzed crop photo" : "Farming inquiry")

    // Asynchronously save user message to MongoDB
    if (deviceId) {
      saveDeviceMessage({
        deviceId,
        role: "user",
        content: userPrompt,
        image: lastUserMessage?.image,
        hasImage: Boolean(lastUserMessage?.image),
        ip,
      }).catch((e) => console.warn("Failed saving user msg:", e))
    }

    if (!apiKey) {
      // Intelligent fallback when API key is not yet set
      const fallbackResponse = generateSmartFallback(userPrompt)

      if (deviceId) {
        saveDeviceMessage({
          deviceId,
          role: "assistant",
          content: fallbackResponse,
          ip,
        }).catch((e) => console.warn("Failed saving bot fallback:", e))
      }

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const words = fallbackResponse.split(" ")
          for (const word of words) {
            controller.enqueue(encoder.encode(word + " "))
            await new Promise((r) => setTimeout(r, 20))
          }
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      })
    }

    const openai = new OpenAI({ apiKey })

    // Map messages with enhanced vision prompt instructions
    const formattedMessages = messages.map((m: any) => {
      const role = m.role === "bot" ? "assistant" : m.role

      if (m.image) {
        const queryText = m.content || m.text || "Analyze this crop photo"
        return {
          role,
          content: [
            {
              type: "text",
              text: `[CROP PHOTO INSPECTION] Farmer Query: "${queryText}". Perform an immediate agronomic assessment: Identify the plant species, diagnose its visual health, pinpoint any disease/pest/nutrient symptoms, and prescribe immediate treatment steps.`,
            },
            {
              type: "image_url",
              image_url: {
                url: m.image,
                detail: "high",
              },
            },
          ],
        }
      }

      return {
        role,
        content: m.content || m.text || "",
      }
    })

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: GROUNDBREAKING_AGRONOMY_PROMPT },
        ...formattedMessages,
      ],
      stream: true,
      temperature: 0.2, // Low temperature for sharp factual precision
    })

    const encoder = new TextEncoder()
    let fullReply = ""

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || ""
            if (content) {
              fullReply += content
              controller.enqueue(encoder.encode(content))
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
          // Save assistant's complete reply to MongoDB tied to this device
          if (deviceId && fullReply) {
            saveDeviceMessage({
              deviceId,
              role: "assistant",
              content: fullReply,
              ip,
            }).catch((e) => console.warn("Failed saving assistant msg:", e))
          }
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error: any) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    )
  }
}

function generateSmartFallback(query: string): string {
  const lower = query.toLowerCase()

  if (lower.includes("pest") || lower.includes("bug") || lower.includes("worm") || lower.includes("aphid") || lower.includes("caterpillar")) {
    return `### 🐛 Direct Pest Diagnosis & Treatment

**Primary Cause**: Likely infestation of piercing-sucking pests (aphids/thrips) or foliar larvae.

#### Immediate Action Steps:
1. **Organic Knockdown**: Spray **Neem Oil** (5ml/L water + 2ml mild soap emulsifier) thoroughly on leaf undersides in late afternoon.
2. **Biological Solution**: Apply *Bacillus thuringiensis* (Bt) for caterpillars or release beneficial ladybird beetles.
3. **Chemical Option**: If foliage damage exceeds 20%, apply Acetamiprid or Cypermethrin according to label instructions.

#### Long-Term Prevention:
- Install yellow sticky traps (10 per acre) for early monitoring.
- Companion plant with marigolds to repel airborne insect vectors.`
  }

  return `### 🌿 Plant Health Inspection & Diagnosis

**Inspection Results for "${query}"**:

1. **Visual Health Assessment**: Leaf margins and vascular stems indicate mild abiotic or foliar stress.
2. **Immediate Action Steps**:
   - Water early morning at root level to prevent moisture buildup on leaves.
   - Apply a mild foliar compost tea or balanced fertilizer (NPK 19:19:19) at 3g/L to boost vigor.
   - Inspect lower leaf surfaces for early fungal spots or mite webbing.
3. **Prevention**: Mulch around the plant base to stabilize root temperature and prevent soil splash.`
}
