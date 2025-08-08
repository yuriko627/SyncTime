import React, { useState, useMemo, useEffect } from "react"
import { useEventStore } from "../stores/eventStore"
import {
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

interface TimeSlot {
  time: string
  hour: number
  minute: number
  availability: {
    [participantId: string]: "available" | "busy" | "unknown"
  }
  isPast?: boolean
}

interface AvailabilityViewProps {
  eventId?: string
}

const AvailabilityView: React.FC<AvailabilityViewProps> = ({ eventId }) => {
  const { participants, scheduleBlocks } = useEventStore(eventId)

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedDuration, setSelectedDuration] = useState(30)

  const participantsEntries = Object.entries(participants)
  const activeParticipants = participantsEntries.map(([id, participant]) => ({
    id,
    ...participant
  }))
  const connectedParticipants = activeParticipants.filter(
    (participant) => participant.calendarConnected
  )

  // Generate time slots for the selected date
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = []
    const startHour = 9 // 9 AM
    const endHour = 23 // 11 PM (to show evening events)
    const slotDuration = selectedDuration // Use selected duration

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotTime = new Date(selectedDate)
        slotTime.setHours(hour, minute, 0, 0)

        const availability: {
          [participantId: string]: "available" | "busy" | "unknown"
        } = {}
        const slotEnd = new Date(slotTime.getTime() + slotDuration * 60 * 1000)

        // Check if this slot is in the past
        const now = new Date()
        const isPast = slotEnd <= now

        // Check availability for each connected participant
        connectedParticipants.forEach((participant) => {
          if (isPast) {
            // Past slots show as grey (unknown) since they're not actually busy
            availability[participant.id] = "unknown"
          } else {
            const participantSchedule = Object.entries(scheduleBlocks)
              .filter(([blockId, block]) =>
                blockId.startsWith(`${participant.id}-`)
              )
              .map(([blockId, block]) => block)

            // Check if participant has any blocked time in this slot
            const hasConflict = participantSchedule.some((block) => {
              const blockStart = new Date(block.startTime)
              const blockEnd = new Date(block.endTime)
              const blockedSlot = blockStart < slotEnd && blockEnd > slotTime

              // Debug log for blocked slots only
              if (blockedSlot) {
                console.log("Found busy slot:", {
                  slotTime: slotTime.toLocaleString(),
                  blockStart: blockStart.toLocaleString(),
                  blockEnd: blockEnd.toLocaleString(),
                  participantId: participant.id
                })
              }

              return blockedSlot
            })

            availability[participant.id] = hasConflict ? "busy" : "available"

            // Debug log for busy slots only
            // if (hasConflict) {
            //   console.log("Slot marked as busy:", {
            //     slotTime: slotTime.toLocaleString(),
            //     participantId: participant.id,
            //     participantName: participant.name
            //   })
            // }
          }
        })

        // Mark non-connected participants as unknown
        activeParticipants.forEach((participant) => {
          if (!participant.calendarConnected) {
            availability[participant.id] = "unknown"
          }
        })

        slots.push({
          time: slotTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit"
          }),
          hour,
          minute,
          availability,
          isPast
        })
      }
    }

    return slots
  }, [selectedDate, scheduleBlocks, connectedParticipants, activeParticipants])

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + (direction === "next" ? 1 : -1))
    setSelectedDate(newDate)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const getSlotColor = (slot: TimeSlot) => {
    // Past slots are always gray
    if (slot.isPast) return "bg-gray-200 border-gray-300"

    if (connectedParticipants.length === 0) return "bg-gray-100"

    const allAvailable = connectedParticipants.every(
      (participant) => slot.availability[participant.id] === "available"
    )
    const allBusy = connectedParticipants.every(
      (participant) => slot.availability[participant.id] === "busy"
    )

    // Show green only when everyone is available
    if (allAvailable) return "bg-green-100 border-green-200"
    // Show red when anyone is busy (including mixed availability)
    return "bg-red-100 border-red-200"
  }

  const getSlotIcon = (slot: TimeSlot) => {
    // Past slots get a clock icon
    if (slot.isPast) return <Clock className="w-4 h-4 text-gray-500" />

    if (connectedParticipants.length === 0)
      return <Clock className="w-4 h-4 text-gray-400" />

    const allAvailable = connectedParticipants.every(
      (participant) => slot.availability[participant.id] === "available"
    )
    const allBusy = connectedParticipants.every(
      (participant) => slot.availability[participant.id] === "busy"
    )

    // Green check for available slots (user's priority)
    if (allAvailable) return <CheckCircle className="w-4 h-4 text-green-600" />
    if (allBusy) return <XCircle className="w-4 h-4 text-red-600" />
    return <AlertCircle className="w-4 h-4 text-yellow-600" />
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Availability</h3>
          <p className="text-sm text-gray-600">
            {connectedParticipants.length} of {activeParticipants.length}{" "}
            participants connected
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
          </select>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateDate("prev")}
          className="p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <h4 className="text-lg font-medium text-gray-900 text-center px-2 truncate">
          {formatDate(selectedDate)}
        </h4>

        <button
          onClick={() => navigateDate("next")}
          className="p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* User Legend */}
      <div className="mb-6">
        <h5 className="text-sm font-medium text-gray-900 mb-3">Participants</h5>
        <div className="flex flex-wrap gap-4">
          {activeParticipants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center space-x-2 min-w-0"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: participant.color }}
              />
              <span className="text-sm text-gray-700 truncate">
                {participant.name}
              </span>
              {participant.calendarConnected ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time Slots Grid */}
      {connectedParticipants.length > 0 ? (
        <div className="space-y-2">
          {timeSlots.map((slot, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${getSlotColor(
                slot
              )}`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="flex-shrink-0">{getSlotIcon(slot)}</div>
                <span className="font-medium text-gray-900 text-base truncate">
                  {slot.time}
                </span>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {activeParticipants.map((participant) => {
                  const availabilityStatus = slot.availability[participant.id]
                  let backgroundColor

                  if (availabilityStatus === "available") {
                    // Green for available (universal)
                    backgroundColor = "#10B981"
                  } else if (availabilityStatus === "busy") {
                    // Red for busy
                    backgroundColor = "#DC2626"
                  } else {
                    // Grey for unknown/past
                    backgroundColor = "#D1D5DB"
                  }

                  return (
                    <div
                      key={participant.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor }}
                      title={`${participant.name}: ${availabilityStatus}`}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: slot.isPast
                            ? "#9CA3AF"
                            : participant.color
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            No Schedule Data
          </h4>
          <p className="text-gray-600 mb-4">
            Participants need to connect their calendars to see availability
          </p>
        </div>
      )}
    </div>
  )
}

export default AvailabilityView
