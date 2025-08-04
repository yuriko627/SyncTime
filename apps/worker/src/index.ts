/**
 * ⚠️  IMPORTANT: DO NOT POLLUTE THIS FILE WITH BUSINESS LOGIC! ⚠️
 *
 * This file should ONLY contain:
 * - HTTP server setup and routing
 * - Credential manager initialization
 * - KeepSync engine configuration
 * - Basic endpoint handlers that delegate to other modules
 *
 * ALL business logic should go in separate modules
 * FOR EXAMPLE:
 * - Gmail API operations → src/services/gmailService.ts
 * - OpenAI operations → src/services/openaiService.ts
 * - Email processing → src/services/emailProcessor.ts
 * - Data transformation → src/utils/dataTransforms.ts
 * - And so on...
 *
 * Keep this file clean and focused on infrastructure only!
 */
import { configureSyncEngine } from "@tonk/keepsync"
import { NetworkAdapterInterface } from "@automerge/automerge-repo"
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket"
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs"
import * as http from "http"
import dotenv from "dotenv"
import { CalendarHandlers } from "./handlers/calendarHandlers"
import { HealthHandlers } from "./handlers/healthHandlers"

// Load environment variables
dotenv.config()

// Set up global error handlers
process.on("uncaughtException", (err) => {
  console.error(`Uncaught exception: ${err.message}`)
  console.error(err.stack)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise)
  console.error("Reason:", reason)
})

// Log startup information
console.log(`Starting synctime-worker at ${new Date().toISOString()}`)
console.log(`Node.js version: ${process.version}`)
console.log(`Platform: ${process.platform}`)

/**
 * Configuration for the worker
 */
interface WorkerConfig {
  port: number
}

/**
 * Start the worker with the given configuration
 */
export async function startWorker(config: WorkerConfig): Promise<http.Server> {
  const { port } = config

  // Configure sync engine
  const SYNC_WS_URL = process.env.SYNC_WS_URL || "ws://localhost:7777/sync"
  const SYNC_URL = process.env.SYNC_URL || "http://localhost:7777"

  const wsAdapter = new BrowserWebSocketClientAdapter(SYNC_WS_URL)
  const engine = configureSyncEngine({
    url: SYNC_URL,
    network: [wsAdapter as any as NetworkAdapterInterface],
    storage: new NodeFSStorageAdapter()
  })

  // Helper function to handle CORS
  const setCorsHeaders = (res: http.ServerResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  }

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    // Set CORS headers for all responses
    setCorsHeaders(res)

    // Route requests to appropriate handlers
    if (req.method === "OPTIONS") {
      HealthHandlers.handleOptions(req, res)
      return
    }

    if (req.method === "GET" && req.url === "/health") {
      HealthHandlers.handleHealth(req, res)
      return
    }

    if (req.method === "GET" && req.url === "/test-calendar") {
      await CalendarHandlers.handleTestCalendar(req, res)
      return
    }

    if (req.method === "GET" && req.url?.startsWith("/auth/google/calendar")) {
      await CalendarHandlers.handleGoogleCalendarAuth(req, res)
      return
    }

    if (req.method === "GET" && req.url?.startsWith("/auth/google/callback")) {
      await CalendarHandlers.handleGoogleCallback(req, res)
      return
    }

    if (req.method === "GET" && req.url?.startsWith("/auth/status")) {
      await CalendarHandlers.handleAuthStatus(req, res)
      return
    }

    if (req.method === "POST" && req.url?.startsWith("/auth/disconnect")) {
      await CalendarHandlers.handleAuthDisconnect(req, res)
      return
    }

    if (req.method === "POST" && req.url?.startsWith("/calendar/sync")) {
      await CalendarHandlers.handleCalendarSync(req, res)
      return
    }

    if (req.method === "GET" && req.url?.startsWith("/calendar/events")) {
      await CalendarHandlers.handleGetCalendarEvents(req, res)
      return
    }

    if (
      req.method === "POST" &&
      req.url?.startsWith("/calendar/schedule/sync")
    ) {
      await CalendarHandlers.handleScheduleSync(req, res)
      return
    }

    if (req.method === "GET" && req.url?.startsWith("/calendar/schedule")) {
      await CalendarHandlers.handleGetSchedule(req, res)
      return
    }

    if (req.method === "POST" && req.url === "/tonk") {
      await CalendarHandlers.handleTonkRequest(req, res)
      return
    }

    // Handle 404s
    HealthHandlers.handleNotFound(req, res)
  })

  // Start the server
  return new Promise((resolve) => {
    server.listen(port, async () => {
      console.log(`synctime worker listening on http://localhost:${port}/tonk`)
      console.log("")
      console.log("🚀 Welcome to Tonk Workers!")
      console.log("")
      console.log(
        "Workers are long-running processes that handle background tasks, API integrations, and workflows."
      )
      console.log(
        "They connect to your Tonk app and can sync data, process requests, and more."
      )
      console.log("")
      console.log(
        "💡 Explain your goals to your vibe coding agent and get started!"
      )
      console.log("")
      console.log(
        "📚 Learn more: https://tonk-labs.github.io/tonk/workers.html"
      )
      console.log("")

      // Initialize the sync engine
      try {
        await engine.whenReady()
        console.log("Keepsync engine is ready")
      } catch (error) {
        console.error("Error initializing sync engine:", error)
      }

      // Handle graceful shutdown
      const cleanup = () => {
        console.log("Shutting down...")
        process.exit(0)
      }

      process.on("SIGINT", cleanup)
      process.on("SIGTERM", cleanup)

      resolve(server)
    })
  })
}

// If this file is run directly, start the worker
if (require.main === module) {
  const port = process.env.WORKER_PORT
    ? parseInt(process.env.WORKER_PORT, 10)
    : 5555
  startWorker({ port })
    .then(() => console.log(`Worker started on port ${port}`))
    .catch((err) => console.error("Failed to start worker:", err))
}
