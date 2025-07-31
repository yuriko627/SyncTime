import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Google OAuth service for calendar authentication
 */
export class GoogleOAuthService {
  private oauth2Client: OAuth2Client;
  private readonly SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
  private readonly REDIRECT_URI = 'http://localhost:5555/auth/google/callback';

  constructor() {
    this.oauth2Client = this.initializeOAuthClient();
  }

  /**
   * Initialize OAuth2 client with credentials
   */
  private initializeOAuthClient(): OAuth2Client {
    try {
      const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
      if (!credentialsPath) {
        throw new Error('GOOGLE_CREDENTIALS_PATH not set in environment variables');
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      // Check if it's a service account or OAuth client credentials
      if (credentials.type === 'service_account') {
        throw new Error('Service account credentials detected. OAuth flow requires OAuth 2.0 client credentials.');
      }

      // Extract client credentials for OAuth
      const clientId = credentials.web?.client_id || credentials.installed?.client_id;
      const clientSecret = credentials.web?.client_secret || credentials.installed?.client_secret;

      if (!clientId || !clientSecret) {
        throw new Error('Missing client_id or client_secret in credentials file');
      }

      return new OAuth2Client(clientId, clientSecret, this.REDIRECT_URI);
    } catch (error) {
      console.error('Error initializing OAuth client:', error);
      throw error;
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(userId: string): string {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
      state: userId, // Pass userId in state parameter
      prompt: 'consent' // Force consent screen to get refresh token
    });

    return authUrl;
  }

  /**
   * Handle OAuth callback and get access token
   */
  async handleCallback(code: string, state: string): Promise<{
    userId: string;
    tokens: any;
    success: boolean;
  }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Set credentials for this client
      this.oauth2Client.setCredentials(tokens);
      
      // In a real app, you'd store these tokens securely (database, encrypted storage)
      // For now, we'll store them in memory/temporary storage
      this.storeUserTokens(state, tokens);

      return {
        userId: state,
        tokens,
        success: true
      };
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      return {
        userId: state,
        tokens: null,
        success: false
      };
    }
  }

  /**
   * Store user tokens (in production, use secure storage)
   */
  private storeUserTokens(userId: string, tokens: any): void {
    // For demo purposes, store in a simple in-memory store
    // In production, use encrypted database storage
    if (!global.userTokens) {
      global.userTokens = {};
    }
    global.userTokens[userId] = tokens;
    
    console.log(`Stored tokens for user ${userId}`);
  }

  /**
   * Get stored tokens for a user
   */
  getUserTokens(userId: string): any {
    return global.userTokens?.[userId] || null;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated(userId: string): boolean {
    const tokens = this.getUserTokens(userId);
    return tokens && tokens.access_token;
  }

  /**
   * Revoke user authentication
   */
  async revokeUserAuth(userId: string): Promise<boolean> {
    try {
      const tokens = this.getUserTokens(userId);
      if (tokens && tokens.access_token) {
        await this.oauth2Client.revokeToken(tokens.access_token);
      }
      
      // Remove from storage
      if (global.userTokens && global.userTokens[userId]) {
        delete global.userTokens[userId];
      }
      
      return true;
    } catch (error) {
      console.error('Error revoking auth:', error);
      return false;
    }
  }

  /**
   * Get OAuth client configured for a specific user
   */
  getClientForUser(userId: string): OAuth2Client | null {
    const tokens = this.getUserTokens(userId);
    if (!tokens) return null;

    const client = new OAuth2Client(
      this.oauth2Client._clientId,
      this.oauth2Client._clientSecret,
      this.REDIRECT_URI
    );
    client.setCredentials(tokens);
    return client;
  }
}

export const googleOAuthService = new GoogleOAuthService();