import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, Plus, Share2, Users, Clock } from "lucide-react"
import { createEventStore, eventStores } from "../stores/eventStore"

const CreateEventPage: React.FC = () => {
  const [eventTitle, setEventTitle] = useState("")
  const [eventDescription, setEventDescription] = useState("")
  const [duration, setDuration] = useState(60)
  const [organizerName, setOrganizerName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const generateEventId = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    )
  }

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !organizerName.trim()) {
      return
    }

    setIsLoading(true)

    try {
      // Generate unique event ID
      const eventId = generateEventId()

      // Create event data
      const eventData = {
        eventId: eventId,
        title: eventTitle,
        description: eventDescription,
        duration,
        organizerName,
        createdAt: Date.now()
      }

      console.log("Creating event with data:", eventData)

      // Store event data in localStorage first
      localStorage.setItem(`event-${eventId}`, JSON.stringify(eventData))
      console.log("Stored the new event data to local storage")

      // Create the event store for this eventId
      if (!eventStores.has(eventId)) {
        eventStores.set(eventId, createEventStore(eventId))
      }

      const store = eventStores.get(eventId)!

      // Initialize the event state
      store.getState().storeEventData(eventData)

      console.log("navigating to event join page...")
      navigate(`/event/${eventId}`)
    } catch (error) {
      console.error("Error creating event:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-blue-500" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">SyncTime</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create an event and send the link to anyone you want to find
            overlapping free time with 🎉
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <label
              htmlFor="organizerName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Name
            </label>
            <input
              id="organizerName"
              type="text"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="eventTitle"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Event Title
            </label>
            <input
              id="eventTitle"
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="e.g., Team Meeting, Project Discussion"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="eventDescription"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description (Optional)
            </label>
            <textarea
              id="eventDescription"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Add any additional details about the meeting..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="duration"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Expected Duration
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>

          <button
            onClick={handleCreateEvent}
            disabled={!eventTitle.trim() || !organizerName.trim() || isLoading}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Event & Get Link</span>
              </>
            )}
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Share2 className="w-4 h-4" />
              <span>You'll get a unique link to share with participants</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start space-x-2">
              <span className="font-medium">1.</span>
              <span>Create your event and get a unique link</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium">2.</span>
              <span>Share the link with people you want to meet</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium">3.</span>
              <span>Participants join and connect their calendars</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium">4.</span>
              <span>Find the perfect time that works for everyone</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateEventPage
