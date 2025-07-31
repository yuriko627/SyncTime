### Worker App

  - Purpose: Backend service for calendar sync and
  coordination
  - Framework: Node.js with Express
  - Key Features:
    - Google Calendar integration via googleapis
    - OAuth authentication flow
    - File system monitoring with chokidar
    - Real-time sync with Automerge
    - CLI interface for worker management

  Key Services:
  - googleCalendarService.ts - Google Calendar API
  integration
  - googleOAuthService.ts - OAuth authentication
  - calendarSyncService.ts - Calendar synchronization logic

  Infrastructure:
  - Automerge repo data storage for CRDT synchronization
  - WebSocket connections for real-time updates
  - File listeners for change detection

  Technology Stack

  Synchronization

  - Automerge: CRDT library for conflict-free data
  synchronization
  - Keepsync: Tonk's synchronization library for local-first
   apps
  - WebSocket: Real-time communication between clients

    External Integrations

  - Google Calendar API: Calendar data sync
  - OAuth 2.0: Secure authentication flow

  Development

  - TypeScript: Type safety across both apps
  - pnpm: Package management with workspaces
  - Docker: Containerization support for deployment

  The architecture supports true local-first operation where
   data is stored locally and synchronized peer-to-peer,
  with the worker handling external calendar integrations
  and coordination tasks.

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Build for production:
   ```bash
   pnpm build
   ```

4. Register the worker with Tonk:
   ```bash
   tonk worker register
   ```

## Worker Configuration

The worker is configured using the `worker.config.js` file. You can modify this file to change the worker's behavior.

## Environment Variables

Create a `.env` file based on the `.env.example` file to configure the worker.

## Project Structure

```
my-worker/
├── src/
│   ├── index.ts      # Main entry point
│   ├── cli.ts        # For controlling the worker
├── worker.config.js  # Worker configuration
└── package.json      # Project configuration
```

## License

MIT © Tonk
