/**
 * Secure storage for Google OAuth access tokens in localStorage
 *
 * Purpose: Encrypt Google access tokens before storing in localStorage
 * to add a layer of protection against token theft from XSS attacks
 * or users inspecting localStorage directly.
 *
 * Note: This is NOT server communication encryption - tokens never go to our server
 */

// Google token data structure
export interface GoogleTokenData {
  access_token: string
  expires_at: number
  participant_id: string
  event_id: string
  connected_at: number
}

// Derive encryption key from participantId + eventId
const deriveKey = async (
  participantId: string,
  eventId: string
): Promise<CryptoKey> => {
  const encoder = new TextEncoder()
  const seed = `${participantId}_${eventId}_synctime`
  const data = encoder.encode(seed)

  // Create key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  )

  // Derive AES key for token encryption
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("synctime-token-salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

// Encrypt token for localStorage
const encryptToken = async (token: string, key: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder()
  const tokenBytes = encoder.encode(token)

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt token
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    tokenBytes
  )

  // Combine IV + encrypted token
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  // Return as base64 for localStorage
  return btoa(String.fromCharCode(...combined))
}

// Decrypt token from localStorage
const decryptToken = async (
  encryptedToken: string,
  key: CryptoKey
): Promise<string> => {
  // Convert from base64
  const combined = new Uint8Array(
    atob(encryptedToken)
      .split("")
      .map((char) => char.charCodeAt(0))
  )

  // Extract IV and encrypted token
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  )

  // Convert back to string
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * Store Google access token securely in localStorage
 * Token is encrypted before storage to protect against XSS
 */
export const storeGoogleToken = async (
  participantId: string,
  eventId: string,
  accessToken: string,
  expiresIn: number = 3600
): Promise<void> => {
  const tokenData: GoogleTokenData = {
    access_token: accessToken,
    expires_at: Date.now() + expiresIn * 1000,
    participant_id: participantId,
    event_id: eventId,
    connected_at: Date.now()
  }

  // Encrypt the entire token data object
  const key = await deriveKey(participantId, eventId)
  const encrypted = await encryptToken(JSON.stringify(tokenData), key)

  // Store encrypted token in localStorage
  localStorage.setItem(`gtoken_${participantId}_${eventId}`, encrypted)
}

/**
 * Retrieve Google access token from localStorage
 * Returns null if token doesn't exist, is expired, or decryption fails
 */
export const getGoogleToken = async (
  participantId: string,
  eventId: string
): Promise<string | null> => {
  const encrypted = localStorage.getItem(`gtoken_${participantId}_${eventId}`)
  if (!encrypted) return null

  try {
    // Decrypt token data
    const key = await deriveKey(participantId, eventId)
    const decrypted = await decryptToken(encrypted, key)
    const tokenData: GoogleTokenData = JSON.parse(decrypted)

    // Check if token expired
    if (Date.now() > tokenData.expires_at) {
      // Remove expired token
      removeGoogleToken(participantId, eventId)
      return null
    }

    return tokenData.access_token
  } catch (error) {
    console.error("Failed to decrypt Google token:", error)
    // Remove corrupted token
    removeGoogleToken(participantId, eventId)
    return null
  }
}

/**
 * Remove Google token from localStorage
 * Used when disconnecting calendar or token is invalid
 */
export const removeGoogleToken = (
  participantId: string,
  eventId: string
): void => {
  localStorage.removeItem(`gtoken_${participantId}_${eventId}`)
}

/**
 * Check if valid Google token exists for this participant/event
 */
export const hasValidGoogleToken = async (
  participantId: string,
  eventId: string
): Promise<boolean> => {
  const token = await getGoogleToken(participantId, eventId)
  return token !== null
}
