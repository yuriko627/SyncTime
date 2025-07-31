# What is a Workspace?

A workspace is a structured development environment designed to function as an exocortex or second brain - a conversational data platform where users describe their data needs in natural language, and a coding agent materializes the technical solution. It serves as a comprehensive platform where you can pull data from various sources, run it through processing workflows, and visualize results through React applications.

## Workspace Structure

A workspace follows a specific organizational structure with four main directories:

- **`/console`** — A React app that provides a file browser showing document state in keepsync stores, plus a worker tab with up-to-date information on which workers have run, when they ran, and what data was moved

- **`/instructions`** — Contains instructions and guidelines for coding agents. Instructions are co-located with functionality: project-level instructions in `/instructions/`, view-specific guidance in `/views/llms.txt`, worker patterns in `/workers/llms.txt`, etc.

- **`/views`** — Storage location for Tonk apps (or views) created using `tonk-create`. These are interactive React applications that visualize data and provide user interfaces

- **`/workers`** — Contains Tonk workers created with `tonk-create`. These handle background processing, data ingestion, transformation, and can listen to keepsync stores or file systems for automated workflows

## Agent Interaction Model

**Command-Line Assistant**: The agent interacts through command-line tool use, acting as a conversational assistant that helps users build data processing pipelines. The agent should:

- Guide users through the process of creating views and workers
- **Vibecode** implementations (generate actual code on behalf of the user)
- Suggest specific parsing libraries and technical approaches
- Ask clarifying questions to disambiguate user intent
- Reference co-located instructions (e.g., `/workers/llms.txt` for keepsync listening patterns)

## Data Storage: Keepsync

The workspace uses **keepsync** as its data backbone. Keepsync handles data storage and synchronization between components. Workers read from and write to keepsync stores, creating flows of data that views can then visualize. The four directories don't communicate directly - they're organized for convenience and quick access to context-specific information.

## Typical Workflow Example

Here's how users typically build data processing pipelines:

1. **Ingest**: Create a worker to bring in data (e.g., Google data) → store in keepsync
2. **Visualize**: Create a view to display that data  
3. **Transform**: Create another worker to read keepsync data → transform into summaries (e.g., OpenAI integration) → store summaries
4. **Visualize**: Update view to show summaries
5. **Cross-reference**: Create worker to watch local files → transform and store in keepsync
6. **Join**: Create worker to listen to multiple keepsync stores → perform joins → store results
7. **Visualize**: Create view showing cross-referenced summaries

This creates **flows of data and visualizations over the flows** - an iterative process where the workspace grows organically through cycles of ingestion, transformation, and visualization.

## Agent Guidelines

**File Format Handling**: If a file format isn't currently handled, guide the user to:
1. Create a worker using `tonk-create -t worker -n <name> -d <description of the worker>`
2. Vibecode the worker to parse the file format (suggest specific parsing libraries)
3. Store parsed data in keepsync
4. Create a view to visualize the data

## File Listening Pattern - IMPORTANT

When implementing file watching functionality, **ALWAYS use the existing FileListener pattern** from `src/listeners/fileListener.ts`. Do NOT create custom file watcher services.

### Proper FileListener Usage:

1. **Import the FileListener**: Use `import { FileListener, createAndStartFileListener } from "./listeners/fileListener";`

2. **Define your data transformation**: Create a transformer function that converts file content to your desired format

3. **Define path transformation**: Create a function that maps file paths to keepsync document paths  

4. **Define data mapper**: Create a mapper function that handles how the transformed data gets written to keepsync

5. **Use the pattern**: Initialize the FileListener with your configuration

### Example Implementation:
```typescript
import { createAndStartFileListener } from "./listeners/fileListener";
// Note: Instead of creating services/ directory, add API routes to the /server proxy in the react template
// The server is located at server/src/index.ts and handles API endpoints

// In your main initialization:
const fileListener = await createAndStartFileListener(
  '/path/to/obsidian/file.md',
  (filePath) => 'obsidian/topics', // keepsync path
  (fileContent, filePath) => parseObsidianContent(fileContent), // transformer
  (existingDoc, newData) => ({ ...existingDoc, ...newData }) // mapper
);
```

### Why This Pattern?

- **Consistency**: All workers use the same file watching approach
- **Reliability**: The FileListener handles edge cases, debouncing, and error recovery
- **Integration**: Built-in keepsync integration with proper data mapping
- **Monitoring**: Standardized logging and error handling

**Remember**: The FileListener already handles chokidar setup, file reading, error handling, and keepsync integration. Focus on your business logic (data transformation) rather than file watching infrastructure.


**Instructions Reference**: Always check relevant `llms.txt` files for component-specific patterns and guidelines before vibecoding implementations.

## Tonk CLI Commands

The Tonk CLI provides essential commands for managing your workspace and applications:

### Main CLI (`tonk`)
- **`tonk -d`** — Run the Tonk daemon (background server for managing bundles and stores)
- **`tonk hello`** — Say hello to start and launch the tonk daemon
- **`tonk auth`** — Log in to your Tonk account
- **`tonk deploy`** — Deploy a Tonk bundle to an existing server
- **`tonk server`** — Manage Tonk servers

### Bundle Management
- **`tonk push`** — Package, upload, build and start a bundle on the Tonk server
- **`tonk start <bundleName>`** — Start a bundle on a route
- **`tonk ps`** — List running bundles
- **`tonk ls`** — List available bundles on the Tonk server
- **`tonk kill <serverId>`** — Stop a running bundle server
- **`tonk delete <bundleName>`** — Delete a bundle from the server (alias: `rm`)
- **`tonk proxy <bundleName>`** — Create a reverse proxy to access a Tonk bundle

### Worker Management (`tonk worker`)
- **`tonk worker ls`** — List all registered workers
- **`tonk worker inspect <nameOrId>`** — Inspect a specific worker
- **`tonk worker start <nameOrId>`** — Start a worker
- **`tonk worker stop <nameOrId>`** — Stop a worker
- **`tonk worker rm <nameOrId>`** — Remove a registered worker
- **`tonk worker ping <nameOrId>`** — Ping a worker to check its status
- **`tonk worker logs <nameOrId>`** — View logs for a worker
- **`tonk worker register [dir]`** — Register a worker with Tonk
- **`tonk worker install <package>`** — Install and start a worker from npm
- **`tonk worker init`** — Initialize a new worker configuration file

### Create Command (`tonk-create`)

The create command scaffolds code for your Tonk projects:

**Usage**: `tonk-create [options]`

**Options**:
- `-v, --version` — Output the current version
- `-i, --init` — Initialize in the current folder (instead of creating new directory)
- `-t, --template <type>` — Template type: `react`, `worker`, or `workspace`
- `-n, --name <name>` — Project name
- `-d, --description <description>` — Project description

**Template Types**:
- **`react`** — "Create apps with your data" - Interactive React applications for data visualization
- **`worker`** — "Retrieve data to use later" - Background processing and data ingestion
- **`workspace`** — "Organize multiple projects" - Complete development environment structure

**Examples**:
```bash
# Non-interactive mode
tonk-create -t react -n my-dashboard -d "Sales data visualization"
tonk-create --init -t workspace  # Initialize workspace in current directory
```

### Daemon Mode and Server Functionality

The daemon (`tonk -d`) provides the core infrastructure:
- **Bundle Storage**: Manages code bundles and their lifecycle
- **Data Stores**: Maintains keepsync stores for data synchronization
- **Process Coordination**: Handles running workers and serving React apps
- **Worker Registry**: Manages registered workers and their states
- **Server Infrastructure**: Runs TonkServer for handling requests

## LLM Agent Workspace Navigation

When working within a Tonk workspace, the LLM should understand these interaction patterns:

### Project Creation Workflow
1. **Understand Requirements**: Determine if user needs data ingestion (worker), visualization (react), or full environment (workspace)
2. **Guide CLI Usage**: Use `tonk-create` with appropriate template and meaningful names
3. **Implement Logic**: Vibecode the functionality using established patterns and libraries
4. **Register and Start**: For workers, use `tonk worker register` and `tonk worker start` to activate them

### Worker Management Patterns
- **Development Cycle**: Create with `tonk-create -t worker -n <name> -d <description>`, register with `tonk worker register`, start with `tonk worker start`
- **Debugging**: Use `tonk worker logs <worker>` to view output and `tonk worker ping <worker>` to check status
- **Monitoring**: Check `tonk worker ls` to see all registered workers and their states
- **Cleanup**: Use `tonk worker stop <worker>` and `tonk worker rm <worker>` to remove unused workers

### Development Best Practices
- **Check Existing Patterns**: Look at `/workers/` and `/views/` for similar implementations
- **Follow Conventions**: Use established libraries and coding patterns from the workspace
- **Reference Instructions**: Always check relevant `llms.txt` files for component-specific guidance
- **Use FileListener Pattern**: For file watching, always use the existing FileListener from `src/listeners/fileListener.ts`

### Troubleshooting and Debugging
- **Daemon Status**: Ensure `tonk -d` is running for all workspace operations
- **Worker Status**: Use `tonk worker ls` and `tonk worker ping <worker>` to monitor worker health
- **Logs**: Check `tonk worker logs <worker>` for error messages and debugging information
- **Data Flow**: Verify keepsync stores through the console app for data debugging

## Core Philosophy

The workspace transforms traditional development from static code creation into a **conversational data platform**. Users don't need to understand keepsync APIs or worker patterns - they describe what they want in natural language, and the agent handles technical implementation through vibecoding. The boundary between user intent and technical execution becomes fluid, with the agent serving as both consultant and implementer.

## Key Characteristics

**Agent-Centric Design**: The workspace is designed to be primarily updated and managed through coding agents. Rather than manual file manipulation, a coding agent serves as your primary assistant, understanding the workspace structure and making intelligent modifications.

**Interactive Data Pipeline**: The workspace enables a complete data processing pipeline:
1. **Data Ingestion** - Pull information from different sources
2. **Processing** - Run data through transformation and analysis workflows  
3. **Visualization** - Display results in custom React applications
4. **Feedback Loop** - React apps can collect user input and update the underlying data

**Living System**: Unlike static codebases, a workspace is designed to evolve and respond. The React apps within it can take feedback and input from users, creating a dynamic system that learns and adapts based on interaction.

## Use Cases

A workspace is ideal for:
- Building personal knowledge management systems
- Creating data analysis and visualization dashboards  
- Developing interactive tools for research and exploration
- Prototyping applications that need to process and display complex data
- Building systems that combine automation (workers) with human interaction (views)

The workspace concept transforms traditional development from static code creation into dynamic, agent-assisted system building where the boundary between tool and user becomes fluid.
