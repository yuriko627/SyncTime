import React, { useState, useEffect } from "react"
import { useEventStore } from "../stores/eventStore"
import {
  storeGoogleToken,
  getGoogleToken,
  removeGoogleToken,
  hasValidGoogleToken
} from "../utils/tokenStorage"
import {
  storeLastSyncTime,
  getLastSyncTime,
  removeLastSyncTime
} from "../utils/syncTimeStorage"
import {
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw,
  Link,
  Unlink
} from "lucide-react"

// Google API types
declare global {
  interface Window {
    google: any
    gapi: any
  }
}

interface CalendarIntegrationProps {
  eventId?: string
  currentParticipantId?: string
}

// Google Client ID - should be in environment variable
// Vite uses import.meta.env instead of process.env
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "YOUR_CLIENT_ID.apps.googleusercontent.com"

const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({
  eventId,
  currentParticipantId
}) => {
  const {
    participants,
    updateParticipantState,
    syncParticipantSchedule: storeParticipantSchedule
  } = useEventStore(eventId || "")

  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)

  const currentParticipant = currentParticipantId
    ? participants[currentParticipantId]
    : null

  // Check if Google libraries are loaded
  useEffect(() => {
    const checkGoogleLibraries = () => {
      if (window.google && window.gapi) {
        setIsGoogleLoaded(true)
        // Initialize GAPI client
        window.gapi.load("client", async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"
              ]
            })
            console.log("Google API client initialized")
          } catch (error) {
            console.error("Failed to initialize Google API client:", error)
          }
        })
      }
    }

    // Check immediately
    checkGoogleLibraries()

    // Also check on window load
    const handleLoad = () => checkGoogleLibraries()
    window.addEventListener("load", handleLoad)

    return () => {
      window.removeEventListener("load", handleLoad)
    }
  }, [])

  // Check if token exists on mount and load last sync time
  useEffect(() => {
    const checkTokenStatus = async () => {
      if (currentParticipantId && eventId) {
        const hasToken = await hasValidGoogleToken(
          currentParticipantId,
          eventId
        )
        if (
          hasToken &&
          currentParticipant &&
          !currentParticipant.calendarConnected
        ) {
          updateParticipantState(currentParticipantId, {
            calendarConnected: true
          })
        }

        // Load last sync time from storage
        const storedSyncTime = getLastSyncTime(currentParticipantId, eventId)
        if (storedSyncTime) {
          setLastSyncTime(storedSyncTime)
        }
      }
    }
    checkTokenStatus()
  }, [currentParticipantId, eventId])

  // Silent sync function for auto-sync (no UI feedback/errors)
  const performSilentSync = async () => {
    if (!currentParticipantId || !eventId || !isGoogleLoaded || isSyncing || isAutoSyncing) {
      return
    }

    setIsAutoSyncing(true)
    
    try {
      // Check if we have a valid stored token
      const existingToken = await getGoogleToken(currentParticipantId, eventId)
      
      if (existingToken) {
        // Silently fetch and sync calendar without showing UI feedback
        await fetchAndSyncCalendar(existingToken, true) // Pass silent flag
      }
      // If no token, don't show OAuth popup - user needs to manually sync
    } catch (error) {
      console.log('Silent sync failed (this is normal):', error)
      // Fail silently - user can manually sync if needed
    } finally {
      setIsAutoSyncing(false)
    }
  }

  // Auto-sync when tab becomes visible (focus-based sync)
  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout

    const handleVisibilityChange = () => {
      // Only sync if tab becomes visible and user has connected calendar
      if (document.visibilityState === 'visible' && 
          currentParticipant?.calendarConnected &&
          !isSyncing && !isAutoSyncing) {
        
        // Debounce to prevent multiple rapid syncs
        clearTimeout(debounceTimeout)
        debounceTimeout = setTimeout(() => {
          performSilentSync()
        }, 1000) // 1 second debounce
      }
    }

    // Listen for tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(debounceTimeout)
    }
  }, [currentParticipant?.calendarConnected, isSyncing, isAutoSyncing, currentParticipantId, eventId, isGoogleLoaded])

  const handleSyncGoogleCalendar = async () => {
    if (!currentParticipantId || !eventId) {
      console.error("Missing participantId or eventId")
      return
    }

    if (!isGoogleLoaded) {
      setSyncError("Google services not loaded. Please refresh the page.")
      return
    }

    setIsSyncing(true)
    setSyncError(null)
    setSyncSuccess(false)

    try {
      // Check if we have a stored token
      const existingToken = await getGoogleToken(currentParticipantId, eventId)

      if (existingToken) {
        // Use existing token
        console.log("Using existing token")
        await fetchAndSyncCalendar(existingToken)
      } else {
        // Request new token
        console.log("Requesting new token")
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "https://www.googleapis.com/auth/calendar.readonly",
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setSyncError(`Authentication failed: ${tokenResponse.error}`)
              setIsSyncing(false)
              return
            }

            // Store token for future use
            await storeGoogleToken(
              currentParticipantId,
              eventId,
              tokenResponse.access_token,
              tokenResponse.expires_in
            )

            // Update participant state
            updateParticipantState(currentParticipantId, {
              calendarConnected: true
            })

            // Fetch and sync calendar
            await fetchAndSyncCalendar(tokenResponse.access_token)
          }
        })

        // Request access token (opens popup)
        tokenClient.requestAccessToken()
      }
    } catch (error) {
      console.error("Sync failed:", error)
      setSyncError("Failed to sync calendar. Please try again.")
      setIsSyncing(false)
    }
  }

  const fetchAndSyncCalendar = async (accessToken: string, silent: boolean = false) => {
    try {
      // Set token in GAPI client
      window.gapi.client.setToken({ access_token: accessToken })

      // Calculate time range (next 30 days)
      const timeMin = new Date().toISOString()
      const timeMax = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString()

      // Fetch calendar events
      console.log("Fetching calendar events...")
      const response = await window.gapi.client.calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 250 // Get more events for better availability picture
      })

      if (!response.result?.items) {
        console.log("No events found")
        const syncTime = new Date()
        if (!silent) {
          setSyncSuccess(true)
        }
        setLastSyncTime(syncTime)
        storeLastSyncTime(currentParticipantId!, eventId!, syncTime)
        setIsSyncing(false)
        return
      }

      console.log(`Found ${response.result.items.length} events`)

      // Convert to privacy-focused schedule blocks
      // Include all events (even those marked as "free") since they might still be relevant for scheduling
      const scheduleBlocks = response.result.items
        .filter((event: any) => event.start && event.end)
        .map((event: any) => ({
          startTime: event.start.dateTime || event.start.date,
          endTime: event.end.dateTime || event.end.date,
          lastSyncAt: Date.now()
        }))

      console.log(`Converted to ${scheduleBlocks.length} schedule blocks`)

      // Store schedule blocks in event store
      storeParticipantSchedule(currentParticipantId!, scheduleBlocks)

      // Update success state and store sync time
      const syncTime = new Date()
      if (!silent) {
        setSyncSuccess(true)
        // Clear success message after 3 seconds
        setTimeout(() => setSyncSuccess(false), 3000)
      }
      setLastSyncTime(syncTime)
      storeLastSyncTime(currentParticipantId!, eventId!, syncTime)
    } catch (error) {
      console.error("Failed to fetch calendar events:", error)
      if (!silent) {
        setSyncError("Failed to fetch calendar events. Please try again.")
      }
    } finally {
      setIsSyncing(false)
      // Clear token from GAPI client
      window.gapi.client.setToken(null)
    }
  }

  const handleDisconnectCalendar = async () => {
    if (!currentParticipantId || !eventId) return

    // Remove stored token
    removeGoogleToken(currentParticipantId, eventId)

    // Clear schedule blocks
    storeParticipantSchedule(currentParticipantId, [])

    // Update participant state
    updateParticipantState(currentParticipantId, { calendarConnected: false })

    // Reset UI state and remove stored sync time
    setLastSyncTime(null)
    removeLastSyncTime(currentParticipantId, eventId)
    setSyncSuccess(false)
  }

  // Don't render if no participant
  if (!currentParticipant) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">
            Please join the event to connect calendar
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (!isGoogleLoaded) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
          <p className="text-gray-600">Loading Google services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Calendar Integration
        </h3>
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentParticipant.color }}
          />
          <span className="text-sm text-gray-600">
            {currentParticipant.name}
          </span>
        </div>
      </div>

      {!currentParticipant.calendarConnected ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-500" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">
                Sync Google Calendar
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Share your availability to find the best meeting times
              </p>
            </div>
          </div>

          {syncError && (
            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{syncError}</p>
            </div>
          )}

          <button
            onClick={handleSyncGoogleCalendar}
            disabled={isSyncing}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <Link className="w-5 h-5" />
                <span>Sync Google Calendar</span>
              </>
            )}
          </button>

          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              Only your availability is shared - event details remain private
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div className="flex-1">
              <h4 className="font-medium text-green-900">Calendar Connected</h4>
              <p className="text-sm text-green-700 mt-1">
                {isSyncing
                  ? "Syncing your availability..."
                  : "Your availability is synced and ready for scheduling"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                onClick={handleSyncGoogleCalendar}
                disabled={isSyncing}
                className="flex-[3] flex items-center justify-center space-x-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Sync Again</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDisconnectCalendar}
                className="flex-[2] flex items-center justify-center space-x-1 text-red-500 hover:text-red-600 py-2 px-2 rounded-lg hover:bg-red-50 text-sm"
              >
                <Unlink className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              {lastSyncTime
                ? `Last synced: ${lastSyncTime.toLocaleTimeString()}`
                : "Not synced yet"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarIntegration
