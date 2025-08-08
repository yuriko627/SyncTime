/**
 * Storage utility for last sync time
 * Stores when each participant last synced their calendar for each event
 */

// Key format: synctime_{participantId}_{eventId}
const getSyncTimeKey = (participantId: string, eventId: string): string => {
  return `synctime_${participantId}_${eventId}`
}

/**
 * Store the last sync time for a participant in an event
 */
export const storeLastSyncTime = (
  participantId: string,
  eventId: string,
  syncTime: Date = new Date()
): void => {
  const key = getSyncTimeKey(participantId, eventId)
  localStorage.setItem(key, syncTime.toISOString())
}

/**
 * Retrieve the last sync time for a participant in an event
 * Returns null if no sync time is stored
 */
export const getLastSyncTime = (
  participantId: string,
  eventId: string
): Date | null => {
  const key = getSyncTimeKey(participantId, eventId)
  const storedTime = localStorage.getItem(key)

  if (!storedTime) return null

  try {
    return new Date(storedTime)
  } catch (error) {
    console.error("Failed to parse stored sync time:", error)
    removeLastSyncTime(participantId, eventId)
    return null
  }
}

/**
 * Remove stored sync time (when calendar is disconnected)
 */
export const removeLastSyncTime = (
  participantId: string,
  eventId: string
): void => {
  const key = getSyncTimeKey(participantId, eventId)
  localStorage.removeItem(key)
}
