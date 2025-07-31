import React, { useState } from "react"
import { useEventStore } from "../stores/eventStore"
import {
  Calendar,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Link,
  Unlink
} from "lucide-react"

interface CalendarIntegrationProps {
  eventId?: string
  currentParticipantId?: string // Added to receive from parent component
}

const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({
  eventId,
  currentParticipantId
}) => {
  const {
    participants,
    updateParticipantState,
    loadParticipantSchedule,
    syncParticipantSchedule: storeParticipantSchedule
  } = useEventStore(eventId)

  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const currentParticipant = currentParticipantId
    ? participants[currentParticipantId]
    : null

  const handleConnectCalendar = async () => {
    if (!currentParticipantId || !eventId) return

    setIsConnecting(true)
    setConnectionError(null)

    try {
      // Open OAuth window for participant authentication
      const authUrl = `http://localhost:5555/auth/google/calendar?userId=${currentParticipantId}`

      // Option 1: Open in same window (more reliable)
      // window.location.href = authUrl;

      // Option 2: Open in popup (current approach)
      const authWindow = window.open(
        authUrl,
        "calendar_auth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      )

      // Listen for auth completion
      const checkAuthComplete = setInterval(() => {
        try {
          if (authWindow?.closed) {
            clearInterval(checkAuthComplete)
            // Check if auth was successful
            checkAuthStatus(true)
          }
        } catch (error) {
          // Handle cross-origin policy errors
          console.warn(
            "Cannot check window.closed due to cross-origin policy, checking auth status anyway"
          )
          clearInterval(checkAuthComplete)
          checkAuthStatus()
        }
      }, 1000)

      // Also check auth status after a reasonable timeout
      setTimeout(() => {
        clearInterval(checkAuthComplete)
        checkAuthStatus()
      }, 30000) // 30 seconds timeout
    } catch (error) {
      setConnectionError("Failed to connect to Google Calendar")
    } finally {
      setIsConnecting(false)
    }
  }

  const checkAuthStatus = async (shouldSync = false) => {
    if (!currentParticipantId) return

    try {
      const response = await fetch(
        `http://localhost:5555/auth/status?userId=${currentParticipantId}`
      )
      const data = await response.json()

      if (data.connected) {
        // Only update if calendar connection status has actually changed
        const currentParticipantData = participants[currentParticipantId]
        if (
          currentParticipantData &&
          !currentParticipantData.calendarConnected
        ) {
          console.log("Calendar status changed from disconnected to connected")
          updateParticipantState(currentParticipantId, {
            calendarConnected: true
          })
        }

        // Only sync if explicitly requested or if this is the first time we're detecting the connection
        if (shouldSync) {
          console.log("Calendar connected, starting automatic sync...")
          await syncParticipantSchedule()
        }
      }
    } catch (error) {
      console.error("Error checking auth status:", error)
    }
  }

  const syncParticipantSchedule = async () => {
    if (!currentParticipantId || !eventId) {
      console.error("Missing currentParticipantId or eventId", {
        currentParticipantId,
        eventId
      })
      return
    }

    console.log(
      "Starting sync for participant:",
      currentParticipantId,
      "event:",
      eventId
    )
    setIsSyncing(true)

    try {
      const syncUrl = `http://localhost:5555/calendar/schedule/sync?eventId=${eventId}&participantId=${currentParticipantId}`
      console.log("Calling sync endpoint:", syncUrl)

      const response = await fetch(syncUrl, {
        method: "POST"
      })

      console.log("Sync response status:", response.status)
      const data = await response.json()
      console.log("Sync response data:", data)

      if (response.ok && data.success && data.scheduleBlocks) {
        console.log("Schedule sync successful:", data)

        // Convert the schedule blocks from the response to the format expected by the store
        const scheduleBlocks = Object.values(data.scheduleBlocks).map(
          (block: any) => ({
            startTime: block.startTime,
            endTime: block.endTime,
            lastSyncAt: block.lastSyncAt || Date.now()
          })
        )

        // Store schedule blocks directly in the event document
        storeParticipantSchedule(currentParticipantId, scheduleBlocks)

        // Show success message and update last sync time
        setSyncSuccess(true)
        setLastSyncTime(new Date())
        setTimeout(() => setSyncSuccess(false), 3000) // Hide after 3 seconds
      } else {
        console.error("Sync failed:", data)
      }
    } catch (error) {
      console.error("Error syncing participant schedule:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnectCalendar = async () => {
    if (!currentParticipantId) return

    try {
      await fetch(
        `http://localhost:5555/auth/disconnect?userId=${currentParticipantId}`,
        {
          method: "POST"
        }
      )

      updateParticipantState(currentParticipantId, { calendarConnected: false })
    } catch (error) {
      console.error("Error disconnecting calendar:", error)
    }
  }

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
                Connect Google Calendar
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Share your availability privately to find the best meeting times
              </p>
            </div>
          </div>

          {connectionError && (
            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{connectionError}</p>
            </div>
          )}

          <button
            onClick={handleConnectCalendar}
            disabled={isConnecting}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Link className="w-5 h-5" />
                <span>Connect Google Calendar</span>
                <ExternalLink className="w-4 h-4" />
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

          {syncSuccess && (
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <p className="text-sm text-blue-700">
                Calendar sync completed! Your availability is now updated.
              </p>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                onClick={syncParticipantSchedule}
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
                    <span>Sync Now</span>
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
