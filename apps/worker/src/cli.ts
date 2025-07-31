#!/usr/bin/env node

/**
 * CLI entry point for the worker
 */
import dotenv from "dotenv"
import * as path from "path"

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") })

// Now import other modules after env vars are loaded
import { Command } from "commander"
import { startWorker } from "./index"

const program = new Command()

program
  .name("tonk-scheduler-worker")
  .description("App to make a schedule with other people privately")
  .version("1.0.0")

program
  .command("start")
  .description("Start the worker")
  .option(
    "-p, --port <port>",
    "Port to run the worker on",
    process.env.WORKER_PORT || "5555"
  )
  .action(async (options) => {
    try {
      console.log(
        `Starting tonk-scheduler-worker worker on port ${options.port}...`
      )
      await startWorker({
        port: parseInt(options.port, 10)
      })
      console.log(`tonk-scheduler-worker worker is running`)
    } catch (error) {
      console.error("Failed to start worker:", error)
      process.exit(1)
    }
  })

program.parse(process.argv)
