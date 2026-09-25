import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export const runtime = "nodejs"

export async function GET() {
  try {
    const db = await getDatabase()
    if (!db) {
      return NextResponse.json({
        connected: false,
        message: "MongoDB not connected. Add MONGODB_URI to .env.local",
        history: [],
      })
    }

    const conversations = await db
      .collection("conversations")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    return NextResponse.json({
      connected: true,
      count: conversations.length,
      history: conversations,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch history" },
      { status: 500 },
    )
  }
}
