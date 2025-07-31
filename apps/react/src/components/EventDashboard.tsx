import React, { useEffect, useState, useRef } from "react"
import { useParams } from "react-router-dom"
import {
  Calendar,
  Users,
  Share2,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle,
  Copy,
  ExternalLink
} from "lucide-react"
import CalendarIntegration from "./CalendarIntegration"
import AvailabilityView from "./AvailabilityView"
import { useEventStore } from "../stores/eventStore"

interface EventData {
  eventId: string
  title: string
  description?: string
  duration: number
  organizerName: string
  createdAt: number
}

const EventDashboard: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [currentParticipantId, setCurrentParticipantId] = useState<
    string | null
  >(() => {
    return eventId ? localStorage.getItem(`participant-${eventId}`) : null
  })

  const [showParticipantSetup, setShowParticipantSetup] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [participantName, setParticipantName] = useState("")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const loadedEventRef = useRef<string | null>(null)

  const {
    participants,
    addParticipant,
    // loadEventData,
    updateCalendarSyncStatus,
    restoreParticipant,
    storeEventData,
    eventId: syncedEventId,
    title,
    description,
    duration,
    organizerName,
    createdAt
  } = useEventStore(eventId)

  // Load event data once when component mounts
  // useEffect(() => {
  //   // run this effect when we have an eventId and no eventData is loaded from local storage yet
  //   if (eventId && !eventData && loadedEventRef.current !== eventId) {
  //     console.log("🔄 Loading event data for eventId:", eventId)

  //     console.log("📊 KeepSync store data (should be null):", {
  //       syncedEventId,
  //       title,
  //       organizerName,
  //       participants
  //     })

  //     // Also log localStorage data for comparison
  //     const locallyStoredEvent = localStorage.getItem(`event-${eventId}`)
  //     console.log(
  //       "💾 localStorage data:",
  //       locallyStoredEvent ? JSON.parse(locallyStoredEvent) : null
  //     )

  //     loadedEventRef.current = eventId

  //     if (locallyStoredEvent) {
  //       const parsed = JSON.parse(locallyStoredEvent)

  //       // set eventdata for fallbacks
  //       setEventData(parsed)

  //       // Load event data (preserves existing participants for same event)
  //       storeEventData(parsed)
  //     } else {
  //       console.log("No event data found in localStorage or KeepSync")
  //     }
  //   }
  // }, [eventId, eventData, syncedEventId, title, restoreParticipant])

  // Handle case where synced event data becomes available from KeepSync (for other participants to join the event later)
  useEffect(() => {
    if (
      eventId &&
      !eventData &&
      syncedEventId &&
      syncedEventId === eventId &&
      title
    ) {
      console.log(
        "🧩 Synced event data became available from KeepSync, loading event data..."
      )
      const syncedEventData = {
        eventId: syncedEventId,
        title,
        description,
        duration,
        organizerName,
        createdAt
      }
      console.log("🧩 Synced event data:", syncedEventData)
      setEventData(syncedEventData)
      // Also store in localStorage for faster access next time
      localStorage.setItem(`event-${eventId}`, JSON.stringify(syncedEventData))
    }
  }, [
    eventId,
    eventData,
    syncedEventId,
    title,
    description,
    duration,
    organizerName,
    createdAt
  ])

  // Set timeout for loading
  useEffect(() => {
    if (eventId && !eventData) {
      const timeout = setTimeout(() => {
        console.log("Loading timeout reached for eventId:", eventId)
        console.log("eventData:", eventData)
        console.log("syncedEventData:", { syncedEventId, title, organizerName })
        console.log("participants:", participants)
        setLoadingTimeout(true)
      }, 10000) // 10 second timeout (increased from 5)

      return () => clearTimeout(timeout)
    }
  }, [eventId, eventData, syncedEventId, title]) // Removed participants dependency

  // Check participant status - wait for participants to load
  useEffect(() => {
    if (eventId) {
      const currentParticipantId = localStorage.getItem(
        `participant-${eventId}`
      )

      console.log("🔍 Participant status check:", {
        currentParticipantId,
        participantExists: currentParticipantId
          ? !!participants[currentParticipantId]
          : false,
        participantsCount: Object.keys(participants).length,
        participants: participants
      })

      if (currentParticipantId && participants[currentParticipantId]) {
        // Found existing participant in store
        console.log("✅ Setting currentParticipantId to:", currentParticipantId)
        setCurrentParticipantId(currentParticipantId) // Update local state only
        setIsInitializing(false)
      } else if (!currentParticipantId) {
        // No participant ID in localStorage - new user, show
        console.log("🆕 No participant ID in localStorage - new user")
        setCurrentParticipantId(null)
        setShowParticipantSetup(true)
        setIsInitializing(false)
      } else {
        // Still initializing - don't show anything yet
        console.log("⏳ Still initializing...")
      }
    }
  }, [eventId, participants])

  const handleParticipantSetup = () => {
    if (!participantName.trim() || !eventId) return

    console.log("Setting up participant with name:", participantName)
    console.log("Current participants in store:", participants)

    const participantId = addParticipant(participantName)
    console.log("Generated participant ID:", participantId)

    // Store participant ID in localStorage
    localStorage.setItem(`participant-${eventId}`, participantId)

    setCurrentParticipantId(participantId)
    setShowParticipantSetup(false)
  }

  const handleCopyLink = () => {
    const link = window.location.href
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1))
    setCurrentDate(newDate)
  }

  // Use eventData or fallback to store data
  const displayEventData =
    eventData ||
    (syncedEventId && title
      ? {
          eventId: syncedEventId,
          title,
          description,
          duration,
          organizerName,
          createdAt
        }
      : null)

  if (!displayEventData) {
    if (loadingTimeout) {
      // Show error after timeout
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Event Not Found
            </h2>
            <p className="text-gray-600">
              This event doesn't exist or has been removed.
            </p>
          </div>
        </div>
      )
    }

    // Show loading while waiting for KeepSync to sync
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading Event...
          </h2>
          <p className="text-gray-600">
            Please wait while we load the event data.
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while initializing participant state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading...
          </h2>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  // Participant setup modal
  if (showParticipantSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div className="text-center">
              <Calendar className="mx-auto h-10 w-10 text-blue-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Join Event</h2>
              <h3 className="text-lg font-medium text-gray-700 mt-2">
                {displayEventData.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Organized by {displayEventData.organizerName}
              </p>
            </div>

            {displayEventData.description && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  {displayEventData.description}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Duration: {displayEventData.duration} minutes</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>
                  {Object.keys(participants).length} participants joined
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="participantName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Enter your name to join
              </label>
              <input
                id="participantName"
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) =>
                  e.key === "Enter" && handleParticipantSetup()
                }
              />
            </div>

            <button
              onClick={handleParticipantSetup}
              disabled={!participantName.trim()}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Event
            </button>
          </div>
        </div>
      </div>
    )
  }

  const participantsEntries = Object.entries(participants)
  const participantsList = participantsEntries.map(([id, participant]) => ({
    id,
    ...participant
  }))

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 lg:space-x-4 min-w-0 flex-1">
            <Calendar className="w-6 h-6 lg:w-8 lg:h-8 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 truncate">
                {displayEventData.title}
              </h1>
              <p className="text-xs lg:text-sm text-gray-600 truncate">
                Organized by {displayEventData.organizerName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
            <div className="flex items-center space-x-1 lg:space-x-2">
              <Users className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500" />
              <span className="text-xs lg:text-sm text-gray-600">
                {participantsList.length}
              </span>
            </div>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center space-x-1 lg:space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Share2 className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="text-xs lg:text-sm">Share</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
        {/* Sidebar */}
        <aside className="w-full sm:w-80 bg-white shadow-sm border-b sm:border-b-0 sm:border-r border-gray-200 flex flex-col sm:max-h-none">
          <div className="p-4 sm:p-6 pb-4 sm:pb-6 sm:overflow-y-auto sm:flex-1">
            {/* Event Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Event Details
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {displayEventData.duration} minutes</span>
                </div>
                {displayEventData.description && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      {displayEventData.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Participants */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Participants
              </h3>
              <div className="space-y-2">
                {participantsList.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: participant.color }}
                    />
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {participant.name}
                    </span>
                    {participant.calendarConnected && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {participant.id === currentParticipantId && (
                      <span className="text-xs text-blue-600 ml-auto">You</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar Integration */}
            {currentParticipantId && (
              <div className="mb-6">
                <CalendarIntegration
                  eventId={eventId}
                  currentParticipantId={currentParticipantId}
                />
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 sm:overflow-y-auto">
          <div className="p-6 pb-4 sm:pb-20">
            {/* Availability View */}
            <AvailabilityView eventId={eventId} />
          </div>
        </main>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Share Event Link
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Share this link with people you want to invite to this event
            </p>
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                value={window.location.href}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventDashboard
