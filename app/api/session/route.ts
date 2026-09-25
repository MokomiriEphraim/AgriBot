import { NextResponse } from "next/server"
import { registerOrUpdateDevice, getDeviceHistory, clearDeviceHistory } from "@/lib/mongodb"

export const runtime = "nodejs"

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "127.0.0.1"
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { deviceId, hardwareInfo } = body

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 })
    }

    const ip = getClientIp(req)
    const userAgent = req.headers.get("user-agent") || "unknown"

    // Register or update device metadata in MongoDB
    await registerOrUpdateDevice({
      deviceId,
      ip,
      userAgent,
      hardwareInfo,
    })

    // Retrieve previous persistent conversation history for this device
    const history = await getDeviceHistory(deviceId, 30)

    return NextResponse.json({
      success: true,
      deviceId,
      ip,
      history,
    })
  } catch (error: any) {
    console.error("Session registration error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to initialize session" },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const deviceId = searchParams.get("deviceId")

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 })
    }

    await clearDeviceHistory(deviceId)
    return NextResponse.json({ success: true, message: "History cleared" })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to clear history" },
      { status: 500 },
    )
  }
}
