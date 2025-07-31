import * as http from "http";

/**
 * Health and status endpoint handlers
 * Contains logic for system health checks
 */
export class HealthHandlers {
  
  /**
   * Handle GET /health endpoint
   */
  static handleHealth(req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  }

  /**
   * Handle 404 errors
   */
  static handleNotFound(req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Not found" }));
  }

  /**
   * Handle OPTIONS preflight requests
   */
  static handleOptions(req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(204);
    res.end();
  }
}