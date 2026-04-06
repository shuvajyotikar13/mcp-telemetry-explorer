# 📊 MCP Telemetry Explorer: Enterprise Data Agent Pattern

[![Model Context Protocol](https://img.shields.io/badge/MCP-Ext_Apps-blue)](https://modelcontextprotocol.io/)
[![ClickHouse](https://img.shields.io/badge/ClickHouse-Optimized-red)](https://clickhouse.com/)
[![React](https://img.shields.io/badge/React-UI_Sandbox-61dafb)](https://react.dev/)

This repository serves as a reference implementation for concepts discussed in *Engineering Enterprise Data Agents*. It demonstrates how to transition from traditional text-based LLM outputs to rich, interactive Agentic UIs using the Model Context Protocol (MCP) Apps extension.

Instead of forcing large language models to summarize tens of thousands of rows of raw JSON telemetry, this architecture orchestrates an interactive React dashboard rendered directly inside the agent's host environment (e.g., Claude Desktop, Goose).

## ✨ Key Features

* **Interactive Agentic UI:** Leverages the `@modelcontextprotocol/ext-apps` SDK to render a React application inside a secure, sandboxed iframe.
* **High-Performance Analytics:** Integrated tightly with **ClickHouse** for sub-second analytical querying over massive log and telemetry datasets.
* **Bidirectional Context Sync:** The UI communicates with the host via `postMessage`. When a user clicks a data point to drill down, the app silently updates the LLM's context, keeping the model aware of the user's workflow.
* **Enterprise-Ready Security:** Strict isolation between the UI resource and the host client. The database credentials and connection logic remain securely isolated on the MCP Server.

## 🏗️ Architecture

This repository is structured as a monorepo containing three core components:

1.  **Database (`docker-compose.yml`):** A local ClickHouse instance containing simulated Kafka ingestion metrics and API server logs.
2.  **MCP Server (`/mcp-server`):** A Node.js service that registers tools (`explore_telemetry`, `fetch_raw_logs`), executes secure database queries, and serves the UI metadata.
3.  **MCP App UI (`/mcp-app-ui`):** The React frontend that receives ClickHouse data and renders the interactive grids/charts.

```text
Host Client (Claude/Goose)
  │
  ├─ [1] LLM decides to call `explore_telemetry` tool
  │
  ├─ [2] Executes tool via MCP Client ────▶ MCP Server (Node.js)
  │                                           ├─ Runs SQL against ClickHouse
  │                                           └─ Returns Data + `ui://` resource URI
  │
  └─ [3] Host renders iframe and injects data ────▶ React App (MCP App UI)
                                                      ├─ User explores chart
                                                      └─ [4] App calls `updateModelContext`
```

## 🚀 Getting Started

### Prerequisites
1. Docker & Docker Compose
2. Node.js (v18+)
3. An MCP-compatible host client (e.g., Gemini CLI, Claude Desktop, Goose, or VS Code Insiders)

Installation & Setup
1. Start the ClickHouse Database:

```bash
docker-compose up -d
```
Build the React frontend (the MCP App) and start the Node.js MCP Server:

```bash
cd mcp-app-ui && npm install && npm run build
cd ../mcp-server && npm install && npm run start
```
(The server will start listening on stdio for MCP communication and open port 3000 to serve the UI assets to the Antigravity sandbox).

2. Antigravity Configuration
To register this local server with your Antigravity agent, add the following to your Antigravity workspace configuration (e.g., agent_config.yaml or via the Antigravity developer console):

```bash
mcp_servers:
  telemetry_explorer:
    transport: "stdio"
    command: "node"
    args: ["/absolute/path/to/mcp-telemetry-explorer/mcp-server/dist/index.js"]
    # Ensure Antigravity is configured to allow localhost UI resource fetching
    ui_permissions:
      allow_localhost: true
```
3. Executing the Agentic Workflow
Inside your Antigravity interface, prompt the agent:

"Analyze the API gateway logs for the last 24 hours and visualize the error spikes."

What happens next:

Antigravity will securely execute the local Node binary.

It will receive the ui://http://localhost:3000/ui/index.html payload.

Antigravity's UI layer will render the interactive dashboard.

As you click on specific error spikes in the UI, the React app uses the @modelcontextprotocol/ext-apps SDK to silently update the Antigravity agent's context, ensuring the agent remains completely aware of your visual exploration.

## 🔐 Security & Sandboxing
Antigravity enforces strict iframe isolation. The React application served on port 3000 cannot access the Antigravity parent DOM or the broader internet, restricted entirely by the JSON-RPC message bridge provided by the MCP specification.
