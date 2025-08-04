import { create } from "zustand"
import { DocumentId, sync } from "@yuriko627/keepsync"

// Filter out KeepSync debug logs
// const originalConsoleLog = console.log
// console.log = (...args: any[]) => {
//   const message = args.join(" ")
//   if (
//     message.includes("sync-middleware") ||
//     message.includes("Received doc change") ||
//     message.includes("updating Zustand store")
//   ) {
//     return // Suppress these logs
//   }
//   originalConsoleLog.apply(console, args)
// }

// Event-specific participant type
export interface EventParticipant {
  name: string
  joinedAt: number
  calendarConnected: boolean
  color: string
}

// Privacy-focused schedule block (no sensitive calendar details)
export interface ScheduleBlock {
  startTime: string
  endTime: string
  lastSyncAt: number
}

interface EventState {
  // Event properies that are synced in keepsync document
  eventId: string | null
  title: string | null
  description?: string
  duration: number
  organizerName: string | null
  createdAt: number | null
  participants: Record<string, EventParticipant>
  scheduleBlocks: Record<string, ScheduleBlock>

  // Actions to update event states
  // Event management:
  // loadEventData: (eventData: {
  //   eventId: string
  //   title: string
  //   description?: string
  //   duration: number
  //   organizerName: string
  //   createdAt: number
  // }) => void
  storeEventData: (eventData: {
    eventId: string
    title: string
    description?: string
    duration: number
    organizerName: string
    createdAt: number
  }) => void

  // Participant management
  addParticipant: (name: string) => string
  updateParticipantState: (
    id: string,
    updates: Partial<EventParticipant>
  ) => void
  restoreParticipant: (
    participantId: string,
    participantData: EventParticipant
  ) => void
  updateCalendarSyncStatus: (participantId: string, connected: boolean) => void

  // Schedule sync
  syncParticipantSchedule: (
    participantId: string,
    scheduleBlocks: ScheduleBlock[]
  ) => void
  loadParticipantSchedule: (participantId: string) => Promise<void>

  // Availability helpers
  getScheduleForParticipant: (participantId: string) => ScheduleBlock[]
  getScheduleInRange: (start: string, end: string) => ScheduleBlock[]
  findCommonAvailability: (
    date: string,
    duration: number
  ) => { start: string; end: string; available: boolean; conflicts: string[] }[]
}

// Participant colors
const PARTICIPANT_COLORS = [
  "#3B82F6", // blue
  "#EC4899", // pink
  "#F59E0B", // yellow
  "#EF4444", // red
  "#8B5CF6", // purple
  "#06B6D4", // cyan
  "#F97316", // orange
  "#84CC16" // lime
]

// Function to generate random ID
const generateId = () => Math.random().toString(36).substring(2, 15)

// Create a store factory that generates event-specific stores
const createEventStore = (eventId: string) => {
  const store = create<EventState>(
    sync(
      (set, get) => ({
        // Initial state - start empty, populate only via KeepSync or explicit storeEventData calls
        // DO NOT use localStorage data here - it creates false impression of synced data
        eventId: null,
        title: null,
        description: undefined,
        duration: 60,
        organizerName: null,
        createdAt: null,
        participants: {},
        scheduleBlocks: {},

        // Participant management
        addParticipant: (name) => {
          const id = generateId()
          const { participants } = get()
          const colorIndex =
            Object.keys(participants).length % PARTICIPANT_COLORS.length

          // DEBUG: Log participant creation
          console.log("🆕 Creating participant:", {
            originalName: name,
            generatedId: id,
            existingParticipants: Object.keys(participants)
          })

          const participant: EventParticipant = {
            name,
            joinedAt: Date.now(),
            calendarConnected: false,
            color: PARTICIPANT_COLORS[colorIndex]
          }

          set((state) => ({
            participants: {
              ...state.participants,
              [id]: participant
            }
          }))

          // DEBUG: Log final participant state after adding it
          console.log("✅ Participant added to store:", participant)
          console.log("📊 Current participants after add:", get().participants)

          return id
        },

        updateParticipantState: (id, updates) => {
          set((state) => {
            if (!state.participants[id]) return state

            return {
              participants: {
                ...state.participants,
                [id]: {
                  ...state.participants[id],
                  ...updates
                }
              }
            }
          })
        },

        updateCalendarSyncStatus: (participantId, connected) => {
          set((state) => {
            if (!state.participants[participantId]) return state

            return {
              participants: {
                ...state.participants,
                [participantId]: {
                  ...state.participants[participantId],
                  calendarConnected: connected
                }
              }
            }
          })
        },

        // Event management
        // loadEventData: (eventData) => {
        //   console.log("🧩loadEventData called")
        //   set((state) => ({
        //     eventId: eventData.eventId,
        //     title: eventData.title,
        //     description: eventData.description,
        //     duration: eventData.duration,
        //     organizerName: eventData.organizerName,
        //     createdAt: eventData.createdAt,
        //     // Only clear data if switching to a different event
        //     participants:
        //       state.eventId === eventData.eventId ? state.participants : {},
        //     scheduleBlocks:
        //       state.eventId === eventData.eventId ? state.scheduleBlocks : {}
        //   }))
        // },

        // Store event data in KeepSync for cross-browser data sync
        storeEventData: (eventData) => {
          console.log("🔥 storeEventData is getting called with:", eventData)
          console.log("📝 Current store state before update:", {
            eventId: get().eventId,
            title: get().title,
            organizerName: get().organizerName
          })

          set((state) => {
            // Mutate nested object structure to help Automerge track diffs
            const updatedState = {
              ...state,
              eventId: eventData.eventId,
              title: eventData.title,
              description: eventData.description,
              duration: eventData.duration,
              organizerName: eventData.organizerName,
              createdAt: eventData.createdAt
            }

            // Force merge by recreating the root object (Automerge tracks objects better than scalars)
            return updatedState
          })
        },

        restoreParticipant: (participantId, participantData) => {
          // Restoring participant from localStorage
          const { participants } = get()

          set((state) => ({
            participants: {
              ...state.participants,
              [participantId]: participantData
            }
          }))

          // Participant restored successfully
        },

        // Schedule sync
        syncParticipantSchedule: (participantId, scheduleBlocks) => {
          console.log("🗓️ syncParticipantSchedule called:", {
            participantId,
            incomingBlocksCount: scheduleBlocks.length,
            currentScheduleBlocks: Object.keys(get().scheduleBlocks)
          })

          set((state) => {
            const newScheduleBlocks = { ...state.scheduleBlocks }

            // Remove existing schedule blocks for this participant
            const removedBlocks = []
            Object.keys(newScheduleBlocks).forEach((blockId) => {
              if (blockId.startsWith(`${participantId}-`)) {
                removedBlocks.push(blockId)
                delete newScheduleBlocks[blockId]
              }
            })

            console.log("🗑️ Removed existing blocks for participant:", {
              participantId,
              removedBlocks
            })

            // Add new schedule blocks (IDs will be generated by worker)
            const addedBlocks = []
            scheduleBlocks.forEach((block) => {
              // Generate unique ID for this block
              const blockId = `${participantId}-${generateId()}`
              newScheduleBlocks[blockId] = block
              addedBlocks.push(blockId)
            })

            console.log("➕ Added new blocks for participant:", {
              participantId,
              addedBlocks,
              finalScheduleBlockKeys: Object.keys(newScheduleBlocks)
            })

            return { scheduleBlocks: newScheduleBlocks }
          })
        },

        loadParticipantSchedule: async (participantId) => {
          const { eventId } = get()
          if (!eventId) return

          try {
            const response = await fetch(
              `https://synctime-server.app.tonk.xyz/synctime-worker/calendar/schedule?participantId=${participantId}&eventId=${eventId}`
            )
            const data = await response.json()

            if (data.success && data.scheduleBlocks) {
              const scheduleBlocks: ScheduleBlock[] = data.scheduleBlocks.map(
                (block: any) => {
                  // Ensure field order: startTime -> endTime -> lastSyncAt
                  return {
                    startTime: block.startTime,
                    endTime: block.endTime,
                    lastSyncAt: block.lastSyncAt
                  }
                }
              )

              get().syncParticipantSchedule(participantId, scheduleBlocks)
              // get().updateCalendarSyncStatus(participantId, true);

              // Schedule blocks loaded successfully
            }
          } catch (error) {
            console.error("Error loading participant schedule:", error)
          }
        },

        // Helper functions
        getScheduleForParticipant: (participantId) => {
          const { scheduleBlocks } = get()
          return Object.entries(scheduleBlocks)
            .filter(([blockId, block]) =>
              blockId.startsWith(`${participantId}-`)
            )
            .map(([blockId, block]) => block)
        },

        getScheduleInRange: (start, end) => {
          const { scheduleBlocks } = get()
          const startTime = new Date(start)
          const endTime = new Date(end)

          return Object.values(scheduleBlocks).filter((block) => {
            const blockStart = new Date(block.startTime)
            const blockEnd = new Date(block.endTime)

            return blockStart < endTime && blockEnd > startTime
          })
        },

        findCommonAvailability: (date, duration) => {
          const { scheduleBlocks, participants } = get()
          const participantIds = Object.keys(participants)

          const dayStart = new Date(`${date}T09:00:00`)
          const dayEnd = new Date(`${date}T23:00:00`)

          const slots: {
            start: string
            end: string
            available: boolean
            conflicts: string[]
          }[] = []
          const slotDuration = 30 // 30-minute slots

          // Generate time slots for the day
          for (
            let time = dayStart.getTime();
            time < dayEnd.getTime();
            time += slotDuration * 60 * 1000
          ) {
            const slotStart = new Date(time)
            const slotEnd = new Date(time + slotDuration * 60 * 1000)

            // Check availability and conflicts for each participant
            const conflicts: string[] = []

            participantIds.forEach((participantId) => {
              const participant = participants[participantId]
              if (!participant.calendarConnected) {
                conflicts.push(participant.name)
                return
              }

              const participantSchedule = Object.entries(scheduleBlocks)
                .filter(([blockId, block]) =>
                  blockId.startsWith(`${participantId}-`)
                )
                .map(([blockId, block]) => block)

              // Check if participant has any blocked time in this slot
              const hasConflict = participantSchedule.some((block) => {
                const blockStart = new Date(block.startTime)
                const blockEnd = new Date(block.endTime)

                return blockStart < slotEnd && blockEnd > slotStart
              })

              if (hasConflict) {
                conflicts.push(participant.name)
              }
            })

            // Check if slot is in the past
            const now = new Date()
            const isPast = slotEnd <= now

            if (isPast) {
              conflicts.push("Past time")
            }

            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              available: conflicts.length === 0,
              conflicts
            })
          }

          return slots
        }
      }),
      {
        docId: `event/${eventId}` as DocumentId,
        initTimeout: 30000,
        onInitError: (error) =>
          console.error("Event sync initialization error: ", error)
        // onInitComplete: () => {
        //   console.log("🎉 Sync initialization complete for: ", eventId)

        // load event data from localStorage
        // let initialEventData: any = null
        // try {
        //   const locallyStoredEvent = localStorage.getItem(`event-${eventId}`)
        //   if (locallyStoredEvent) {
        //     console.log("Found event in localStorage:", locallyStoredEvent)
        //     initialEventData = JSON.parse(locallyStoredEvent)
        //     const store = eventStores.get(eventId)

        //     // initialize the event state
        //     store.getState().storeEventData(initialEventData)
        //   }
        // } catch (error) {
        //   console.error("Error loading initial event data:", error)
        // }
        // }
      }
    )
  )

  return store
}

// Store cache for event-specific stores
const eventStores = new Map<string, ReturnType<typeof createEventStore>>()

// Export the createEventStore function and eventStores for direct use outside React components
export { createEventStore, eventStores }

// Export a hook that gets the event-specific store
export const useEventStore = (eventId: string) => {
  // Create a new event-specific store if eventId does not exist in the eventStores map
  if (!eventStores.has(eventId)) {
    eventStores.set(eventId, createEventStore(eventId))
  }

  return eventStores.get(eventId)!()
}
