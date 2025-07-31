# Tonk View Architecture and Usage Guide

## Overview
Tonk views are React-based frontend applications that integrate with the Tonk ecosystem for building local-first applications. They provide modern web UI/UX with real-time data synchronization using KeepSync and Automerge CRDTs, supporting offline-first collaborative experiences.

## Getting Started
The view structure described in this guide is automatically created when you run `tonk-create -t react -n <name> -d <description>`. This command will guide you through the process of creating a new view and scaffold a complete React application template folder with all the necessary files and configurations.

To create a new view:
```bash
tonk-create -t react -n <name> -d <description>
```

The CLI will prompt you to select "react" as the project type and guide you through the setup process, generating the folder structure and files detailed below.

## View Structure

### Core Files and Directories
```
view/
├── src/
│   ├── index.tsx          # Main entry point with React app initialization
│   ├── App.tsx            # Root React component with routing
│   ├── index.css          # Global styles
│   ├── views/             # Page-level view components
│   ├── components/        # Reusable UI components
│   ├── stores/            # Zustand state management stores
│   └── # Note: Instead of services/ directory, add API routes to the /server proxy
│   └── # The server is located at server/src/index.ts and handles API endpoints
├── server/                # Express.js backend server
│   ├── src/
│   │   └── index.ts       # Server entry point with API routes
│   ├── package.json       # Server-specific dependencies
│   └── tsconfig.json      # Server TypeScript configuration
├── instructions/          # LLM-readable documentation
├── public/                # Static assets (favicon, manifest, etc.)
├── scripts/               # Build and deployment scripts
├── package.json           # Frontend package configuration
├── tonk.config.json       # Tonk platform configuration
├── vite.config.ts         # Vite build configuration
├── tailwind.config.cjs    # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── index.html             # HTML template
```

### Key Dependencies
- `react` & `react-dom`: Core React framework
- `@tonk/keepsync`: Core data synchronization
- `@automerge/automerge-repo`: CRDT document management
- `@automerge/automerge-repo-network-websocket`: WebSocket networking
- `@automerge/automerge-repo-storage-indexeddb`: Browser storage
- `react-router-dom`: Client-side routing
- `zustand`: Lightweight state management
- `vite`: Fast build tool and dev server
- `tailwindcss`: Utility-first CSS framework
- `lucide-react`: Icon library
- `express`: Backend server framework
- `cors`: Cross-origin resource sharing

## Configuration Files

### tonk.config.json
Tonk platform integration:
- View name and description
- Platform type ("react")
- Template reference
- Project metadata

### vite.config.ts
Build and development configuration:
- **Plugins**: React, PWA, WebAssembly, top-level await
- **Dev Server**: Port (3000), proxy configuration for sync and API
- **Build**: Output directory, asset management, code splitting
- **Optimizations**: ESNext target, vendor chunking

### package.json
Frontend application configuration:
- **Scripts**: Development, build, preview, test, deployment
- **Workspaces**: Includes server subdirectory
- **Dependencies**: React ecosystem, Tonk/KeepSync, UI libraries
- **Dev Dependencies**: Build tools, TypeScript, testing framework

### Environment Configuration
- **Development**: Vite dev server on port 3000
- **Sync Proxy**: WebSocket proxy to `ws://localhost:7777/sync`
- **API Proxy**: HTTP proxy to `http://localhost:6080/api`
- **PWA**: Progressive Web App capabilities enabled

## View Architecture Patterns

### React App Initialization
Views initialize with:
- KeepSync engine configuration
- WebSocket client adapter setup
- IndexedDB storage adapter
- React router integration
- Strict mode for development

### KeepSync Integration
Views configure sync engines with:
- Browser WebSocket adapters for real-time sync
- IndexedDB storage for offline persistence
- Document read/write operations from components
- Automatic reconnection handling
- Cross-tab synchronization

### Component Architecture
- **Views**: Page-level components with routing
- **Components**: Reusable UI elements with proper separation
- **Stores**: Zustand stores for global state management
- **Services**: Data fetching and external API integration
- **Hooks**: Custom React hooks for KeepSync operations

### Data Flow Patterns
1. Component mounts and subscribes to KeepSync documents
2. Real-time updates received via WebSocket
3. Local state updated through Zustand stores
4. UI re-renders with new data
5. User interactions trigger document updates
6. Changes propagated to other connected clients

## Development Workflow


### Local Development
```bash
# CORRECT - Run from within the view directory:
cd view/your-view-name/
1. `pnpm install` - Install all dependencies
2. `pnpm dev` - Start both frontend and backend concurrently
3. `pnpm dev:client` - Start only frontend (port 3000)
4. `pnpm dev:server` - Start only backend server
5. `pnpm build` - Build for production
6. `pnpm serve` - Preview production build

# INCORRECT - Do NOT run from workspace root:
# npm run dev     # ❌ This will fail - no dev script in workspace root
```

1. `cd view/your-view-name/` - **Always navigate to the worker directory first**
### Production Deployment
1. `pnpm build` - Compile and bundle
2. `tonk deploy` - Deploy to Tonk platform
3. Static assets served via CDN
4. Server handles API routes and proxying

## Server Integration

### Express.js Backend
Views include integrated Express servers:
- **API Routes**: Custom business logic endpoints
- **Proxy Configuration**: Route sync and external API calls
- **CORS Support**: Cross-origin request handling
- **Static Serving**: Fallback for production builds
- **Error Handling**: Structured error responses

### Server Structure
```
server/
├── src/
│   └── index.ts           # Express app with routing
├── package.json           # Server dependencies
└── tsconfig.json          # Server TypeScript config
```

## State Management

### Zustand Stores
Lightweight state management with:
- Simple store creation and usage
- TypeScript integration
- Persistence middleware support
- DevTools integration
- Minimal boilerplate

### KeepSync Document State
- Document subscriptions in React components
- Automatic re-rendering on document changes
- Optimistic UI updates
- Conflict-free collaborative editing
- Offline state management

## UI/UX Patterns

### Modern React Patterns
- Functional components with hooks
- TypeScript for type safety
- Suspense for loading states
- Error boundaries for error handling
- React Router for navigation

### Styling and Design
- **Tailwind CSS**: Utility-first styling approach
- **Component Libraries**: Lucide React for icons
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: System preference detection
- **Accessibility**: ARIA labels and semantic HTML

### Progressive Web App Features
- **Service Worker**: Automatic updates
- **Manifest**: App-like experience
- **Offline Support**: Via KeepSync and IndexedDB
- **Install Prompt**: Add to home screen
- **Push Notifications**: Real-time updates

## Best Practices

### Performance Optimization
- **Code Splitting**: Vendor and feature-based chunks
- **Tree Shaking**: Unused code elimination
- **Lazy Loading**: Route-based code splitting
- **Bundle Analysis**: Size monitoring and optimization
- **Caching**: Aggressive caching strategies

### Error Handling
- **Error Boundaries**: Component-level error isolation
- **Network Resilience**: Offline capability and retry logic
- **User Feedback**: Toast notifications and error states
- **Logging**: Structured error reporting
- **Graceful Degradation**: Progressive enhancement

### Security
- **Input Validation**: Client and server-side validation
- **CORS Configuration**: Proper origin restrictions
- **Content Security Policy**: XSS protection
- **Secure Headers**: Security-focused HTTP headers
- **Environment Secrets**: Proper secret management

### Testing
- **Unit Tests**: Component testing with Jest
- **Integration Tests**: End-to-end user flows
- **Visual Regression**: UI consistency testing
- **Performance Tests**: Bundle size and loading metrics
- **Accessibility Tests**: WCAG compliance validation

## Integration Points

### With Tonk Platform
- **Deployment**: Automated build and deploy pipeline
- **Monitoring**: Performance and error tracking
- **Configuration**: Environment-based settings
- **Scaling**: Auto-scaling based on traffic

### With KeepSync
- **Real-time Sync**: Multi-user collaboration
- **Offline First**: Local-first data architecture
- **Conflict Resolution**: Automatic merge strategies
- **Version History**: Document change tracking

### With External Services
- **API Integration**: RESTful and GraphQL services
- **Authentication**: OAuth and JWT token handling
- **File Uploads**: Multi-part form data handling
- **Third-party Libraries**: NPM ecosystem integration

## Example Usage Patterns

### KeepSync Document Operations
```typescript
// Subscribe to document changes
const [data, setData] = useState(null);
useEffect(() => {
  const unsubscribe = engine.subscribe(documentPath, setData);
  return unsubscribe;
}, []);

// Update document
const updateDocument = (newData) => {
  engine.updateDocument(documentPath, newData);
};
```

### Zustand Store Pattern
```typescript
// Create typed store
const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
```

### React Router Setup
```typescript
// App.tsx routing configuration
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/settings" element={<Settings />} />
</Routes>
```

### Component with KeepSync
```typescript
// View component with real-time data
const Dashboard = () => {
  const { data, updateData } = useKeepSyncDocument('dashboard');
  
  return (
    <div>
      <h1>{data?.title || 'Loading...'}</h1>
      <button onClick={() => updateData({ title: 'Updated!' })}>
        Update Title
      </button>
    </div>
  );
};
```

This architecture enables views to serve as modern, collaborative web applications with real-time synchronization, offline capabilities, and seamless integration with the Tonk ecosystem.
