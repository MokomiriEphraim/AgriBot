import { MongoClient, Db } from "mongodb"

const uri = process.env.MONGODB_URI || ""
const options = {}

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient> | null = null

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!process.env.MONGODB_URI) {
    return null
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options)
      global._mongoClientPromise = client.connect()
    }
    clientPromise = global._mongoClientPromise
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, options)
      clientPromise = client.connect()
    }
  }

  try {
    return await clientPromise
  } catch (error) {
    console.error("MongoDB connection error:", error)
    return null
  }
}

let indexesCreated = false

export async function getDatabase(dbName = "agribot_db"): Promise<Db | null> {
  const mongoClient = await getMongoClient()
  if (!mongoClient) return null
  const db = mongoClient.db(dbName)

  if (!indexesCreated) {
    indexesCreated = true
    // Create compound indexes in the background to make history queries ultra-fast
    Promise.all([
      db.collection("messages").createIndex({ deviceId: 1, createdAt: 1 }),
      db.collection("devices").createIndex({ deviceId: 1 }, { unique: true }),
      db.collection("forecasts").createIndex({ deviceId: 1, createdAt: -1 }),
      db.collection("rate_limits").createIndex({ deviceId: 1, action: 1 }),
    ]).catch((err) => console.warn("Index creation notice:", err))
  }

  return db
}

export interface DeviceRecord {
  deviceId: string
  ip: string
  userAgent: string
  hardwareInfo?: any
  firstSeenAt: Date
  lastSeenAt: Date
  messageCount: number
}

export interface StoredMessage {
  deviceId: string
  role: "user" | "assistant"
  content: string
  image?: string
  hasImage?: boolean
  ip?: string
  createdAt: Date
}

/** Registers or updates the device metadata (IP, hardware info, last seen) */
export async function registerOrUpdateDevice({
  deviceId,
  ip,
  userAgent,
  hardwareInfo,
}: {
  deviceId: string
  ip: string
  userAgent: string
  hardwareInfo?: any
}) {
  try {
    const db = await getDatabase()
    if (!db) return null

    const devices = db.collection<DeviceRecord>("devices")
    const now = new Date()

    return await devices.updateOne(
      { deviceId },
      {
        $set: {
          ip,
          userAgent,
          hardwareInfo: hardwareInfo || {},
          lastSeenAt: now,
        },
        $setOnInsert: {
          deviceId,
          firstSeenAt: now,
          messageCount: 0,
        },
      },
      { upsert: true },
    )
  } catch (err) {
    console.warn("Could not register device in MongoDB:", err)
    return null
  }
}

/** Saves a single chat message tied to this device and IP with image support */
export async function saveDeviceMessage({
  deviceId,
  role,
  content,
  image,
  hasImage = false,
  ip,
}: {
  deviceId: string
  role: "user" | "assistant"
  content: string
  image?: string
  hasImage?: boolean
  ip?: string
}) {
  try {
    const db = await getDatabase()
    if (!db) return null

    const messages = db.collection<StoredMessage>("messages")
    const devices = db.collection<DeviceRecord>("devices")

    const result = await messages.insertOne({
      deviceId,
      role,
      content,
      image,
      hasImage: hasImage || Boolean(image),
      ip,
      createdAt: new Date(),
    })

    // Increment device message counter
    await devices.updateOne(
      { deviceId },
      {
        $inc: { messageCount: 1 },
        $set: { lastSeenAt: new Date(), ...(ip ? { ip } : {}) },
      },
    )

    return result
  } catch (err) {
    console.warn("Could not save device message to MongoDB:", err)
    return null
  }
}

/** Retrieves the recent conversation history for a specific device */
export async function getDeviceHistory(deviceId: string, limit = 40) {
  try {
    const db = await getDatabase()
    if (!db) return []

    const messages = db.collection<StoredMessage>("messages")
    const history = await messages
      .find({ deviceId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray()

    return history.map((m) => ({
      id: m._id.toString(),
      role: m.role === "assistant" ? "bot" : "user",
      text: m.content,
      image: m.image,
      hasImage: m.hasImage,
      time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    }))
  } catch (err) {
    console.warn("Could not fetch device history from MongoDB:", err)
    return []
  }
}

/** Clears messages for a device when user starts a fresh chat */
export async function clearDeviceHistory(deviceId: string) {
  try {
    const db = await getDatabase()
    if (!db) return false

    const messages = db.collection<StoredMessage>("messages")
    await messages.deleteMany({ deviceId })
    return true
  } catch (err) {
    console.warn("Could not clear device history:", err)
    return false
  }
}
