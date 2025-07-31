import { google } from "googleapis"
import { JWT } from "google-auth-library"
import * as path from "path"
import * as fs from "fs"

/**
 * Google Calendar Service
 * Handles authentication and calendar operations
 */
export class GoogleCalendarService {
  private auth: JWT
  private calendar: any

  constructor() {
    this.initializeAuth()
  }

  /**
   * Initialize Google Calendar API authentication
   */
  private initializeAuth() {
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH

    if (!credentialsPath) {
      throw new Error("GOOGLE_CREDENTIALS_PATH environment variable not set")
    }

    const fullPath = path.resolve(credentialsPath)

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Credentials file not found: ${fullPath}`)
    }

    try {
      const credentials = JSON.parse(fs.readFileSync(fullPath, "utf8"))

      this.auth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
          "https://www.googleapis.com/auth/calendar.readonly",
          "https://www.googleapis.com/auth/calendar.calendars.readonly"
        ]
      })

      this.calendar = google.calendar({ version: "v3", auth: this.auth })

      console.log("Google Calendar API initialized successfully")
    } catch (error) {
      console.error("Error initializing Google Calendar API:", error)
      throw error
    }
  }

  /**
   * Test the API connection by listing calendars
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.calendar.calendarList.list()
      console.log(
        `Successfully connected to Google Calendar API. Found ${
          response.data.items?.length || 0
        } calendars.`
      )
      return true
    } catch (error) {
      console.error("Failed to connect to Google Calendar API:", error)
      return false
    }
  }

  /**
   * List all calendars accessible by the service account
   */
  async listCalendars() {
    try {
      const response = await this.calendar.calendarList.list()
      return response.data.items || []
    } catch (error) {
      console.error("Error listing calendars:", error)
      throw error
    }
  }

  /**
   * Get events from a specific calendar
   */
  async getEvents(calendarId: string, timeMin?: string, timeMax?: string) {
    try {
      const params: any = {
        calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax:
          timeMax ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        maxResults: 50,
        singleEvents: true,
        orderBy: "startTime"
      }

      const response = await this.calendar.events.list(params)
      return response.data.items || []
    } catch (error) {
      console.error("Error fetching events:", error)
      throw error
    }
  }

  /**
   * Get events from the primary calendar
   */
  async getPrimaryCalendarEvents(timeMin?: string, timeMax?: string) {
    return this.getEvents("primary", timeMin, timeMax)
  }
}

// Export a singleton instance
export const googleCalendarService = new GoogleCalendarService()
