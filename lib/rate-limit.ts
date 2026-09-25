import { getDatabase } from "./mongodb"

/**
 * Rate Limiter — tracks image generation usage per device in MongoDB.
 *
 * Limits:
 *   - development: 10 image generations per 24 hours per device
 *   - production:  5 image generations per 24 hours per device
 *
 * Collection: `rate_limits` in agribot_db
 * Document shape:
 *   { deviceId, action, timestamps: Date[], windowStart: Date }
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: Date
  used: number
}

interface RateLimitRecord {
  deviceId: string
  action: string
  timestamps: Date[]
  windowStart: Date
  updatedAt: Date
}

const LIMITS: Record<string, Record<string, number>> = {
  development: {
    image_generation: 10,
  },
  production: {
    image_generation: 5,
  },
}

const WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours in ms

function getAppMode(): string {
  return process.env.APP_MODE || process.env.NODE_ENV || "development"
}

function getLimit(action: string): number {
  const mode = getAppMode()
  return LIMITS[mode]?.[action] ?? LIMITS.production?.[action] ?? 5
}

/**
 * Check if a device is within rate limits for a given action.
 * Does NOT consume a usage — use `recordUsage()` after the action succeeds.
 */
export async function checkRateLimit(
  deviceId: string,
  action: string = "image_generation",
): Promise<RateLimitResult> {
  const limit = getLimit(action)
  const now = new Date()
  const windowStart = new Date(now.getTime() - WINDOW_MS)

  try {
    const db = await getDatabase()
    if (!db) {
      // If no DB, allow but with a low limit warning
      return { allowed: true, remaining: limit, limit, resetAt: new Date(now.getTime() + WINDOW_MS), used: 0 }
    }

    const collection = db.collection<RateLimitRecord>("rate_limits")

    // Get existing record for this device + action
    const record = await collection.findOne({ deviceId, action })

    if (!record) {
      // First time — no usage yet
      return { allowed: true, remaining: limit, limit, resetAt: new Date(now.getTime() + WINDOW_MS), used: 0 }
    }

    // Filter timestamps to only those within the 24-hour window
    const recentTimestamps = (record.timestamps || []).filter(
      (ts) => new Date(ts).getTime() > windowStart.getTime(),
    )

    const used = recentTimestamps.length
    const remaining = Math.max(0, limit - used)
    const allowed = used < limit

    // Calculate reset time — when the oldest timestamp in the window expires
    let resetAt = new Date(now.getTime() + WINDOW_MS)
    if (recentTimestamps.length > 0) {
      const oldestInWindow = new Date(
        Math.min(...recentTimestamps.map((ts) => new Date(ts).getTime())),
      )
      resetAt = new Date(oldestInWindow.getTime() + WINDOW_MS)
    }

    return { allowed, remaining, limit, resetAt, used }
  } catch (err) {
    console.warn("Rate limit check error:", err)
    // On error, allow the request (fail open)
    return { allowed: true, remaining: limit, limit, resetAt: new Date(now.getTime() + WINDOW_MS), used: 0 }
  }
}

/**
 * Record a successful usage. Call this AFTER the image generation succeeds.
 * Also cleans up expired timestamps from the record.
 */
export async function recordUsage(
  deviceId: string,
  action: string = "image_generation",
): Promise<void> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - WINDOW_MS)

  try {
    const db = await getDatabase()
    if (!db) return

    const collection = db.collection<RateLimitRecord>("rate_limits")

    // Get existing record
    const record = await collection.findOne({ deviceId, action })

    if (record) {
      // Clean expired timestamps and add the new one
      const recentTimestamps = (record.timestamps || []).filter(
        (ts) => new Date(ts).getTime() > windowStart.getTime(),
      )
      recentTimestamps.push(now)

      await collection.updateOne(
        { deviceId, action },
        {
          $set: {
            timestamps: recentTimestamps,
            windowStart,
            updatedAt: now,
          },
        },
      )
    } else {
      // First usage — create new record
      await collection.insertOne({
        deviceId,
        action,
        timestamps: [now],
        windowStart,
        updatedAt: now,
      })
    }
  } catch (err) {
    console.warn("Rate limit record error:", err)
  }
}

/**
 * Get usage stats for a device (for display in the UI or admin).
 */
export async function getUsageStats(
  deviceId: string,
  action: string = "image_generation",
): Promise<{ used: number; limit: number; remaining: number; resetAt: Date | null }> {
  const result = await checkRateLimit(deviceId, action)
  return {
    used: result.used,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: result.used > 0 ? result.resetAt : null,
  }
}
