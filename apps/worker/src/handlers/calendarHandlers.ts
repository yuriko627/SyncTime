import * as http from "http";
import * as url from "url";
import { readDoc } from "@tonk/keepsync";
import { calendarSyncService } from "../services/calendarSyncService";
import { googleOAuthService } from "../services/googleOAuthService";

/**
 * Calendar-related HTTP endpoint handlers
 * Contains business logic for calendar endpoints
 */
export class CalendarHandlers {
  
  /**
   * Handle GET /auth/google/calendar endpoint
   */
  static async handleGoogleCalendarAuth(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const userId = parsedUrl.query.userId as string;
      
      if (!userId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Missing userId parameter" }));
        return;
      }

      // Generate OAuth URL and redirect
      const authUrl = googleOAuthService.getAuthUrl(userId);
      
      res.writeHead(302, { 
        'Location': authUrl,
        'Content-Type': 'text/html'
      });
      res.end(`
        <html>
          <body>
            <p>Redirecting to Google for authentication...</p>
            <script>
              window.location.href = "${authUrl}";
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error in /auth/google/calendar endpoint:", error);
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body>
            <h2>Authentication Error</h2>
            <p>Error: ${error instanceof Error ? error.message : "Authentication failed"}</p>
            <p>Please check your Google OAuth credentials configuration.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 5000);
            </script>
          </body>
        </html>
      `);
    }
  }

  /**
   * Handle GET /auth/google/callback endpoint
   */
  static async handleGoogleCallback(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const code = parsedUrl.query.code as string;
      const state = parsedUrl.query.state as string; // userId
      const error = parsedUrl.query.error as string;
      
      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body>
              <h2>Authentication Failed</h2>
              <p>Error: ${error}</p>
              <p>Please try again.</p>
              <script>
                setTimeout(() => {
                  window.close();
                }, 3000);
              </script>
            </body>
          </html>
        `);
        return;
      }

      if (!code || !state) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body>
              <h2>Authentication Error</h2>
              <p>Missing authorization code or user ID</p>
              <script>
                setTimeout(() => {
                  window.close();
                }, 3000);
              </script>
            </body>
          </html>
        `);
        return;
      }

      // Handle OAuth callback
      const result = await googleOAuthService.handleCallback(code, state);
      
      if (result.success) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body>
              <h2>Authentication Successful!</h2>
              <p>Your Google Calendar has been connected successfully.</p>
              <p>You can now close this window.</p>
              <script>
                setTimeout(() => {
                  window.close();
                }, 2000);
              </script>
            </body>
          </html>
        `);
      } else {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body>
              <h2>Authentication Error</h2>
              <p>Failed to complete authentication. Please try again.</p>
              <script>
                setTimeout(() => {
                  window.close();
                }, 3000);
              </script>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error("Error in /auth/google/callback endpoint:", error);
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body>
            <h2>Authentication Error</h2>
            <p>Error: ${error instanceof Error ? error.message : "Callback failed"}</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }
  }

  /**
   * Handle GET /auth/status endpoint
   */
  static async handleAuthStatus(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const userId = parsedUrl.query.userId as string;
      
      if (!userId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Missing userId parameter" }));
        return;
      }

      // Check if user is authenticated
      const isAuthenticated = googleOAuthService.isUserAuthenticated(userId);
      
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: true, 
        connected: isAuthenticated,
        userId 
      }));
    } catch (error) {
      console.error("Error in /auth/status endpoint:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Status check failed" 
      }));
    }
  }

  /**
   * Handle POST /auth/disconnect endpoint
   */
  static async handleAuthDisconnect(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const userId = parsedUrl.query.userId as string;
      
      if (!userId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Missing userId parameter" }));
        return;
      }

      // Revoke authentication
      const success = await googleOAuthService.revokeUserAuth(userId);
      
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success, 
        message: success ? "Calendar disconnected successfully" : "Failed to disconnect calendar",
        userId 
      }));
    } catch (error) {
      console.error("Error in /auth/disconnect endpoint:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Disconnect failed" 
      }));
    }
  }

  /**
   * Handle POST /calendar/sync endpoint
   */
  static async handleCalendarSync(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const userId = parsedUrl.query.userId as string;
      
      if (!userId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Missing userId parameter" }));
        return;
      }

      // Check if user is authenticated
      if (!googleOAuthService.isUserAuthenticated(userId)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          success: false, 
          error: "User not authenticated. Please connect your Google Calendar first." 
        }));
        return;
      }

      // Get OAuth client for the user
      const oauthClient = googleOAuthService.getClientForUser(userId);
      if (!oauthClient) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          success: false, 
          error: "Failed to get user authentication. Please reconnect your Google Calendar." 
        }));
        return;
      }

      // Sync calendar events using OAuth client
      const result = await calendarSyncService.syncPrimaryCalendarWithOAuth(oauthClient, userId);
      
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: true, 
        events: result.events || {},
        eventCount: result.eventCount || 0,
        userId,
        syncedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error("Error in /calendar/sync endpoint:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Sync failed" 
      }));
    }
  }
  
  /**
   * Handle GET /calendar/events endpoint - debug view of synced events
   */
  static async handleGetCalendarEvents(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const userId = parsedUrl.query.userId as string;
      
      if (!userId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Missing userId parameter" }));
        return;
      }

      // Read events from KeepSync document
      const events = await calendarSyncService.getUserStoredEvents(userId);
      
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: true, 
        userId,
        eventCount: events.length,
        events: events,
        lastChecked: new Date().toISOString()
      }));
    } catch (error) {
      console.error("Error in /calendar/events endpoint:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to get events" 
      }));
    }
  }

  /**
   * Handle GET /test-calendar endpoint
   */
  static async handleTestCalendar(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const result = await calendarSyncService.testConnection();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error("Error in /test-calendar endpoint:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }));
    }
  }

  /**
   * Handle POST /calendar/schedule/sync endpoint - Privacy-focused schedule sync
   */
  static async handleScheduleSync(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const eventId = parsedUrl.query.eventId as string;
      const participantId = parsedUrl.query.participantId as string;
      
      if (!eventId || !participantId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          success: false, 
          error: "Missing eventId or participantId parameter" 
        }));
        return;
      }

      // Check if participant is authenticated
      if (!googleOAuthService.isUserAuthenticated(participantId)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          success: false, 
          error: "Participant not authenticated. Please connect your Google Calendar first." 
        }));
        return;
      }

      // Get OAuth client for participant
      const oauthClient = googleOAuthService.getClientForUser(participantId);
      if (!oauthClient) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          success: false, 
          error: "Failed to get OAuth client for participant" 
        }));
        return;
      }

      // Sync participant schedule blocks for the event
      const result = await calendarSyncService.syncParticipantScheduleForEvent(
        oauthClient, 
        eventId,
        participantId
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error("Error in /calendar/schedule/sync endpoint:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Schedule sync failed" 
      }));
    }
  }

  /**
   * Handle GET /calendar/schedule endpoint - Get participant schedule blocks
   */
  static async handleGetSchedule(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const eventId = parsedUrl.query.eventId as string;
      const participantId = parsedUrl.query.participantId as string;
      
      if (!eventId || !participantId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          success: false, 
          error: "Missing eventId or participantId parameter" 
        }));
        return;
      }

      // Schedule blocks are now stored in the event document, not separate calendar documents
      // Return empty for now - frontend will read from event document directly
      const scheduleBlocks = [];
      
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        scheduleBlocks,
        eventId,
        participantId,
        count: scheduleBlocks.length
      }));
    } catch (error) {
      console.error("Error in /calendar/schedule endpoint:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to get schedule" 
      }));
    }
  }

  /**
   * Handle POST /tonk endpoint - main worker logic
   */
  static async handleTonkRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        console.log("Received tonk request:", data);

        // Route request to appropriate service method based on action
        const result = await CalendarHandlers.routeTonkAction(data);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error("Error processing tonk request:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : "Request processing failed" 
        }));
      }
    });
  }

  /**
   * Route tonk actions to appropriate service methods
   */
  private static async routeTonkAction(data: any) {
    const { action } = data;

    switch (action) {
      case "sync-calendar": {
        const { calendarId, timeMin, timeMax } = data;
        return await calendarSyncService.syncCalendarEvents(
          calendarId || 'primary', 
          timeMin, 
          timeMax
        );
      }

      case "sync-primary": {
        const { timeMin, timeMax } = data;
        return await calendarSyncService.syncPrimaryCalendar(timeMin, timeMax);
      }

      case "get-stored-events": {
        const { calendarId } = data;
        const events = await calendarSyncService.getStoredEvents(calendarId || 'primary');
        return { 
          success: true, 
          events, 
          count: events.length,
          calendarId: calendarId || 'primary'
        };
      }

      case "sync-status": {
        return await calendarSyncService.getSyncStatus();
      }

      default: {
        // Default action: sync primary calendar
        console.log("No action specified, defaulting to sync-primary");
        return await calendarSyncService.syncPrimaryCalendar();
      }
    }
  }
}