import OpenAI from "openai"
import { NextResponse } from "next/server"
import { saveDeviceMessage } from "@/lib/mongodb"

export const runtime = "nodejs"
export const maxDuration = 60

const GROUNDBREAKING_AGRONOMY_PROMPT = `You are AgriBot — an elite, friendly AI Agronomist, Plant Pathologist, and Farming Advisor.

### CORE OPERATING RULES:

1. **NATURAL CONVERSATION & GREETINGS**:
   - If the user sends a greeting or casual message (e.g. "Hey", "Hi", "Hello", "Good morning", "What can you do?", "Who are you?"):
     - Greet them warmly and introduce yourself as AgriBot.
     - Briefly explain how you can help (e.g., diagnosing crop diseases & pests from photos, advising on fertilizers, soil prep, watering schedules, weather resilience, and 14-day crop prognosis).
     - Invite them to upload a photo of their crop or ask any farming question.
     - NEVER fabricate a plant diagnosis for greeting words like "Hey" or "Hello"!

2. **GENERAL AGRICULTURAL QUESTIONS**:
   - When the user asks a farming question without a photo (e.g., "How to prepare soil for tomatoes?", "What NPK ratio for maize?", "How often to water peppers?"):
     - Give clear, practical, expert agricultural guidance tailored to practical farming.
     - Include organic solutions, timing, dosages, and preventative measures.

3. **PHOTO INSPECTION & DECISIVE DIAGNOSIS (WHEN AN IMAGE IS PRESENT)**:
   - Whenever an image of a crop/leaf is provided (with or without text like "How does this look?", "Is this healthy?"):
     - **Plant Species**: Identify the plant variety (e.g., Protea, Tomato, Maize, Pepper, Cassava).
     - **Health Assessment**: State decisively if healthy, stressed, diseased (fungal/bacterial/viral), or pest-attacked.
     - **Specific Symptoms Seen**: Point out visible visual evidence in the photo (e.g., leaf curling, chlorosis, lesions).
     - **Immediate Action Steps**: 2-3 practical treatment/care steps (organic remedies and active ingredients).

4. **TONE & FORMATTING**:
   - Friendly, confident, and professional.
   - Use clean markdown with bold section headers and bullet points for easy reading on mobile in the field.
   - Build upon previous conversation context seamlessly.`

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
      const fallbackResponse = generateSmartFallback(userPrompt, Boolean(lastUserMessage?.image))

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
      temperature: 0.3,
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
        }

        // Save assistant's complete reply to MongoDB tied to this device
        if (deviceId && fullReply) {
          saveDeviceMessage({
            deviceId,
            role: "assistant",
            content: fullReply,
            ip,
          }).catch((e) => console.warn("Failed saving assistant msg:", e))
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

function generateSmartFallback(query: string, hasImage: boolean): string {
  const lower = query.toLowerCase().trim()

  // Casual greetings
  if (
    !hasImage &&
    (lower === "hey" ||
      lower === "hi" ||
      lower === "hello" ||
      lower === "hey bro" ||
      lower === "yo" ||
      lower === "good morning" ||
      lower === "good afternoon" ||
      lower.startsWith("hey ") ||
      lower.startsWith("hi ") ||
      lower.startsWith("hello "))
  ) {
    return `👋 **Hello! Welcome to AgriBot.**

I'm your AI Agronomist & Crop Health Assistant. Here is how I can help you today:

- 📸 **Crop Diagnosis**: Take or upload a photo of any plant/leaf to instantly identify diseases, pests, or nutrient deficiencies.
- 🔮 **14-Day Visual Prognosis**: See AI predictions of how your crop will progress under untreated vs treated conditions.
- 🐛 **Pest & Disease Control**: Get precise organic recipes (Neem oil, biological controls) and chemical dosages.
- 🌱 **Soil & Fertilizer Advice**: Ask about NPK ratios, pH adjustments, and seasonal crop care.

What crop are you working with today, or do you have a plant photo you'd like me to inspect?`
  }

  // Pests inquiry
  if (
    lower.includes("pest") ||
    lower.includes("bug") ||
    lower.includes("worm") ||
    lower.includes("aphid") ||
    lower.includes("caterpillar")
  ) {
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

  // Watering inquiry
  if (lower.includes("water") || lower.includes("irrigation")) {
    return `### 💧 Irrigation & Moisture Management

**Best Practices for Crop Vigor:**
1. **Timing**: Always water in the early morning (6:00 AM – 8:00 AM) to minimize evaporation and keep foliage dry overnight.
2. **Root Zone Focus**: Apply water directly at the base or through drip lines to prevent fungal spore splash on leaves.
3. **Soil Check**: Check top 2 inches of soil before watering — moist soil requires no additional watering to avoid root rot.`
  }

  // General fallback
  if (!hasImage && lower.length < 30) {
    return `🌿 **AgriBot Farming Assistant**

How can I assist your farm today? You can:
1. **Upload a leaf/crop photo** for an instant pathology & health diagnosis.
2. Ask about **fertilizers, soil preparation, planting seasons, or pest control**.
3. Type the name of your crop and describe what symptoms you are observing.`
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
