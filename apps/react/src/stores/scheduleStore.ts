import { create } from "zustand"
import { DocumentId, sync } from "@yuriko627/keepsync"

// Schedule Event type (matching worker format)
export interface ScheduleEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  isAllDay: boolean
  location?: string
  attendees?: string[]
  status: "confirmed" | "tentative" | "cancelled"

  // Source tracking
  sourceCalendarId: string
  sourceEventId: string
  calendarName?: string

  // Metadata
  importedBy: string
  createdAt: number
  updatedAt: number
  lastSyncAt: number
}

// User type for collaborative scheduling
export interface User {
  id: string
  name: string
  email?: string
  calendarConnected: boolean
  joinedAt: number
  color: string // For UI differentiation
}

// Meeting proposal type
export interface MeetingProposal {
  id: string
  title: string
  description?: string
  duration: number // minutes
  proposedTimes: {
    start: string
    end: string
  }[]
  createdBy: string
  createdAt: number
  responses: Record<string, "available" | "maybe" | "unavailable">
  status: "pending" | "confirmed" | "cancelled"
}

// Schedule state interface
interface ScheduleState {
  // Events imported from calendars (synced with worker)
  events: Record<string, ScheduleEvent>

  // Users participating in scheduling
  users: Record<string, User>

  // Meeting proposals for collaboration
  proposals: Record<string, MeetingProposal>

  // Current user context
  currentUserId: string | null

  // User names cache (following my-world pattern)
  userNames: Record<string, string>

  // User management actions
  addUser: (user: Omit<User, "id" | "joinedAt" | "color">) => string
  updateUser: (id: string, updates: Partial<User>) => void
  setCurrentUser: (userId: string) => void
  updateUserName: (userId: string, name: string) => void

  // Meeting proposals
  createProposal: (
    proposal: Omit<MeetingProposal, "id" | "createdAt" | "responses" | "status">
  ) => void
  respondToProposal: (
    proposalId: string,
    response: "available" | "maybe" | "unavailable"
  ) => void
  updateProposal: (
    proposalId: string,
    updates: Partial<MeetingProposal>
  ) => void
  removeProposal: (proposalId: string) => void

  // Event management (sync with worker)
  syncEvents: (events: Record<string, ScheduleEvent>) => void

  // Helper functions
  getEventsForUser: (userId: string) => ScheduleEvent[]
  getEventsInRange: (start: string, end: string) => ScheduleEvent[]
  getActiveUsers: () => User[]
  findCommonAvailability: (
    userIds: string[],
    date: string,
    duration: number
  ) => { start: string; end: string; available: boolean }[]
}

// User colors for UI (following my-world pattern)
const USER_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // yellow
  "#EF4444", // red
  "#8B5CF6", // purple
  "#06B6D4", // cyan
  "#F97316", // orange
  "#84CC16" // lime
]

// Generate a random ID (following my-world pattern)
const generateId = () => Math.random().toString(36).substring(2, 15)

// Get the current user ID from localStorage
const getCurrentUserId = () => {
  return localStorage.getItem("currentUserId")
}

export const useScheduleStore = create<ScheduleState>(
  sync(
    (set, get) => ({
      // Initial state
      events: {},
      users: {},
      proposals: {},
      currentUserId: getCurrentUserId(),
      userNames: {},

      // User management
      addUser: (userData) => {
        const id = generateId()
        const { users } = get()
        const colorIndex = Object.keys(users).length % USER_COLORS.length

        const user: User = {
          ...userData,
          id,
          joinedAt: Date.now(),
          color: USER_COLORS[colorIndex]
        }

        set((state) => ({
          users: {
            ...state.users,
            [id]: user
          },
          userNames: {
            ...state.userNames,
            [id]: user.name
          }
        }))

        return id
      },

      updateUser: (id, updates) => {
        set((state) => {
          if (!state.users[id]) return state

          const updatedUser = {
            ...state.users[id],
            ...updates
          }

          return {
            users: {
              ...state.users,
              [id]: updatedUser
            },
            userNames: {
              ...state.userNames,
              [id]: updatedUser.name
            }
          }
        })
      },

      setCurrentUser: (userId) => {
        // Store in localStorage (following my-world pattern)
        localStorage.setItem("currentUserId", userId)
        set({ currentUserId: userId })
      },

      updateUserName: (userId, name) => {
        set((state) => ({
          userNames: {
            ...state.userNames,
            [userId]: name
          }
        }))
      },

      // Meeting proposals
      createProposal: (proposalData) => {
        const { currentUserId } = get()
        if (!currentUserId) return

        const id = generateId()
        const proposal: MeetingProposal = {
          ...proposalData,
          id,
          createdBy: currentUserId,
          createdAt: Date.now(),
          responses: {},
          status: "pending"
        }

        set((state) => ({
          proposals: {
            ...state.proposals,
            [id]: proposal
          }
        }))
      },

      respondToProposal: (proposalId, response) => {
        const { currentUserId } = get()
        if (!currentUserId) return

        set((state) => {
          const proposal = state.proposals[proposalId]
          if (!proposal) return state

          return {
            proposals: {
              ...state.proposals,
              [proposalId]: {
                ...proposal,
                responses: {
                  ...proposal.responses,
                  [currentUserId]: response
                }
              }
            }
          }
        })
      },

      updateProposal: (proposalId, updates) => {
        set((state) => {
          const proposal = state.proposals[proposalId]
          if (!proposal) return state

          return {
            proposals: {
              ...state.proposals,
              [proposalId]: {
                ...proposal,
                ...updates
              }
            }
          }
        })
      },

      removeProposal: (proposalId) => {
        set((state) => {
          const newProposals = { ...state.proposals }
          delete newProposals[proposalId]
          return { proposals: newProposals }
        })
      },

      // Event management
      syncEvents: (events) => {
        set({ events })
      },

      // Helper functions
      getEventsForUser: (userId) => {
        const { events } = get()
        return Object.values(events).filter(
          (event) => (event as ScheduleEvent).importedBy === userId
        )
      },

      getEventsInRange: (start, end) => {
        const { events } = get()
        const startTime = new Date(start)
        const endTime = new Date(end)

        return Object.values(events).filter((event) => {
          const scheduleEvent = event as ScheduleEvent
          const eventStart = new Date(scheduleEvent.startTime)
          const eventEnd = new Date(scheduleEvent.endTime)

          // Event overlaps with range
          return eventStart < endTime && eventEnd > startTime
        })
      },

      getActiveUsers: () => {
        const { users } = get()
        return Object.values(users).sort((a, b) => a.joinedAt - b.joinedAt)
      },

      findCommonAvailability: (userIds, date, duration) => {
        const { events } = get()
        const dayStart = new Date(`${date}T09:00:00`)
        const dayEnd = new Date(`${date}T17:00:00`)

        const slots: { start: string; end: string; available: boolean }[] = []
        const slotDuration = 30 // 30-minute slots

        // Generate time slots for the day
        for (
          let time = dayStart.getTime();
          time < dayEnd.getTime();
          time += slotDuration * 60 * 1000
        ) {
          const slotStart = new Date(time)
          const slotEnd = new Date(time + slotDuration * 60 * 1000)

          // Check if all users are available in this slot
          const allAvailable = userIds.every((userId) => {
            const userEvents = Object.values(events).filter(
              (event) => event.importedBy === userId
            )

            // Check if user has any conflicting events in this slot
            const hasConflict = userEvents.some((event) => {
              const eventStart = new Date(event.startTime)
              const eventEnd = new Date(event.endTime)

              return eventStart < slotEnd && eventEnd > slotStart
            })

            return !hasConflict
          })

          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            available: allAvailable
          })
        }

        return slots
      }
    }),
    {
      docId: "collaborative-schedule" as DocumentId,
      initTimeout: 30000,
      onInitError: (error) =>
        console.error("Schedule sync initialization error:", error)
    }
  )
)
