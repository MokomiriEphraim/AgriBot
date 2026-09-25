import { NextResponse } from "next/server"
import { getUsageStats } from "@/lib/rate-limit"

export const runtime = "nodejs"

/**
 * GET /api/rate-limit?deviceId=xxx
 * Returns current rate limit usage for a device.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const deviceId = searchParams.get("deviceId")

    if (!deviceId) {
      return NextResponse.json(
        { error: "deviceId query parameter is required" },
        { status: 400 },
      )
    }

    const stats = await getUsageStats(deviceId, "image_generation")

    return NextResponse.json({
      deviceId,
      action: "image_generation",
      mode: process.env.APP_MODE || process.env.NODE_ENV || "development",
      ...stats,
    })
  } catch (error: any) {
    console.error("Rate limit check error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to check rate limit" },
      { status: 500 },
    )
  }
}
