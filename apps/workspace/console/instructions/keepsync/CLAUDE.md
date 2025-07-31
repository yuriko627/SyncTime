## Basic Usage

### 1. Set Up the Sync Provider

Initialize the sync engine in your application entry point (or before using any synced stores):

```typescript
// index.tsx
import { configureSyncEngine } from "@tonk/keepsync";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${wsProtocol}//${window.location.host}/sync`;
const wsAdapter = new BrowserWebSocketClientAdapter(wsUrl);
const storage = new IndexedDBStorageAdapter();

const url =
  window.location.host.indexOf("localhost") === 0
    ? "http://localhost:7777"
    : `${window.location.protocol}//${window.location.host}`;

configureSyncEngine({
  url,
  network: [wsAdapter as any],
  storage,
});
```

### 2. Create a Synced Store with the Middleware

Use the `sync` middleware to create stores that automatically synchronize with other clients:

```typescript
// stores/counterStore.ts
import { create } from 'zustand';
import { sync, DocumentId } from '@tonk/keepsync';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>(
  sync(
    // The store implementation
    (set) => ({
      count: 0,

      // Increment the counter
      increment: () => {
        set((state) => ({ count: state.count + 1 }));
      },

      // Decrement the counter
      decrement: () => {
        set((state) => ({ count: Math.max(0, state.count - 1) }));
      },

      // Reset the counter
      reset: () => {
        set({ count: 0 });
      },
    }),
    // Sync configuration
    { 
      docId: 'counter' as DocumentId,
      // Optional: configure initialization timeout
      initTimeout: 30000,
      // Optional: handle initialization errors
      onInitError: (error) => console.error('Sync initialization error:', error) 
    }
  )
);
```

### 3. Use the Store in React Components

```typescript
// components/Counter.tsx
import React from 'react';
import { useCounterStore } from '../stores/counterStore';

export function Counter() {
  // Use the store hook directly - sync is handled by the middleware
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <div>
      <h2>Collaborative Counter: {count}</h2>
      <div>
        <button onClick={decrement}>-</button>
        <button onClick={increment}>+</button>
        <button onClick={reset}>Reset</button>
      </div>
      <p>
        <small>
          Open this app in multiple windows to see real-time collaboration in action.
        </small>
      </p>
    </div>
  );
}

```

# Directly reading and writing documents

You can also directly read and write documents and address them using paths similar to a filesystem. This is useful for when you need more fine-grained control over document access and 
a zustand store is too cumbersome (e.g. when you want each document to have its own space and be directly addressable);


```typescript
import { readDoc, writeDoc, ls, mkDir, rm, listenToDoc } from "@tonk/keepsync";

/**
 * Reads a document from keepsync
 *
 * This function retrieves a document at the specified path in your sync engine.
 * It returns the document content if found, or undefined if the document doesn't exist.
 *
 * @param path - The path identifying the document to read
 * @returns Promise resolving to the document content or undefined if not found
 * @throws Error if the SyncEngine is not properly initialized
 */
readDoc = async <T>(path: string): Promise<T | undefined>;

/**
 * Writes content to a document to keepsync
 *
 * This function creates or updates a document at the specified path.
 * If the document doesn't exist, it creates a new one.
 * If the document already exists, it updates it with the provided content.
 *
 * @param path - The path identifying the document to write
 * @param content - The content to write to the document
 * @throws Error if the SyncEngine is not properly initialized
 */
writeDoc = async <T>(path: string, content: T);

/**
 * Lists documents at a specified path
 *
 * This function retrieves a list of documents at the specified directory path.
 * It returns an array of document names found at that path.
 *
 * @param path - The directory path to list documents from
 * @returns Promise resolving to an array of document names
 * @throws Error if the SyncEngine is not properly initialized
 */
ls = async (path: string): Promise<string[]>;

/**
 * Creates a directory at the specified path
 *
 * This function creates a new directory at the specified path.
 * If the directory already exists, it does nothing.
 *
 * @param path - The path where the directory should be created
 * @throws Error if the SyncEngine is not properly initialized
 */
mkDir = async (path: string): Promise<void>;

/**
 * Removes a document or directory at the specified path
 *
 * This function deletes a document or directory at the specified path.
 * If removing a directory, it will remove all documents within it.
 *
 * @param path - The path of the document or directory to remove
 * @param recursive - Whether to recursively remove directories (default: false)
 * @throws Error if the SyncEngine is not properly initialized
 */
rm = async (path: string, recursive?: boolean): Promise<void>;

/**
 * Listens for changes to a document
 *
 * This function sets up a listener for changes to a document at the specified path.
 * The callback will be called whenever the document changes with detailed patch information.
 *
 * @param path - The path of the document to listen to
 * @param callback - Function to call when the document changes, receives payload with doc, patches, patchInfo, and handle
 * @returns A function that can be called to stop listening
 * @throws Error if the SyncEngine is not properly initialized
 */
listenToDoc = <T>(path: string, callback: (payload: { doc: T; patches: any[]; patchInfo: any; handle: DocHandle<T> }) => void): Promise<() => void>;
```

## File System Operations Example

Here's an example of how to use the file system operations:

```typescript
import { ls, mkDir, rm, readDoc, writeDoc, listenToDoc } from "@tonk/keepsync";

// Create a directory structure
await mkDir("/users");

// Write a document
await writeDoc("/users/user1", { name: "Alice", age: 30 });
await writeDoc("/users/user2", { name: "Bob", age: 25 });

// List documents in a directory
const users = await ls("/users");
console.log(users); // ["user1", "user2"]

// Read a document
const user1 = await readDoc<{ name: string, age: number }>("/users/user1");
console.log(user1); // { name: "Alice", age: 30 }

// Listen for changes to a document
const unsubscribe = await listenToDoc<{ name: string, age: number }>("/users/user1", (payload) => {
  const { doc: user, patches, patchInfo, handle } = payload;
  if (user) {
    console.log(`User updated: ${user.name}, ${user.age}`);
    console.log("Patches:", patches);
    console.log("Patch info:", patchInfo);
  }
});

// Update the document (will trigger the listener)
await writeDoc("/users/user1", { name: "Alice", age: 31 });

// Stop listening when done
unsubscribe();

// Remove a document
await rm("/users/user2");

// Remove a directory and all its contents
await rm("/users", true);
```
