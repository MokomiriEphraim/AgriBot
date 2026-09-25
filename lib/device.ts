"use client"

export interface DeviceInfo {
  deviceId: string
  screenResolution: string
  language: string
  platform: string
  hardwareConcurrency: number
  deviceMemory: number | null
  userAgent: string
  timezone: string
}

const STORAGE_KEY = "agribot_device_id"

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server_device"

  let deviceId = localStorage.getItem(STORAGE_KEY)
  if (!deviceId) {
    // Generate high-entropy unique UUID
    const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const timePart = Date.now().toString(36)
    deviceId = `dev_${timePart}_${randomPart}`
    localStorage.setItem(STORAGE_KEY, deviceId)
  }
  return deviceId
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    return {
      deviceId: "server_device",
      screenResolution: "unknown",
      language: "en",
      platform: "unknown",
      hardwareConcurrency: 4,
      deviceMemory: null,
      userAgent: "unknown",
      timezone: "UTC",
    }
  }

  const deviceId = getOrCreateDeviceId()

  return {
    deviceId,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language || "en",
    platform: navigator.platform || "unknown",
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    // @ts-expect-error deviceMemory is available in Chrome/Chromium
    deviceMemory: navigator.deviceMemory || null,
    userAgent: navigator.userAgent || "unknown",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  }
}
