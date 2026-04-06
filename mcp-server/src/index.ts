import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { queryClickHouse } from "./clickhouse.js";
import path from "path";
import express from "express";

// 1. Serve the UI assets (in a real enterprise setup, use a CDN or Nginx)
const app = express();
app.use("/ui", express.static(path.join(__dirname, "../public")));
app.listen(3000, () => console.log("UI Assets serving on port 3000"));

const server = new Server(
  { name: "telemetry-explorer", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 2. Define the tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "explore_telemetry",
        description: "Visualize system logs and API telemetry data as an interactive dashboard.",
        inputSchema: {
          type: "object",
          properties: {
            time_range: { type: "string", description: "e.g., 'last 24 hours'" },
            service: { type: "string", description: "The microservice to filter by" }
          },
          required: ["time_range"]
        },
        // The magic: Telling the host to render the UI
        _meta: {
          ui: {
            resourceUri: "http://localhost:3000/ui/index.html" 
          }
        }
      },
      {
        name: "fetch_raw_logs",
        description: "Fetch raw log lines for a specific timestamp. Used by the UI for drill-downs.",
        inputSchema: {
          type: "object",
          properties: { timestamp: { type: "string" } }
        }
      }
    ]
  };
});

// 3. Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "explore_telemetry") {
    // Fetch initial aggregated data from ClickHouse
    const data = await queryClickHouse("SELECT service, count() as errors FROM logs WHERE level='ERROR' GROUP BY service");
    return {
      content: [{ type: "text", text: JSON.stringify(data) }]
    };
  }
  
  if (request.params.name === "fetch_raw_logs") {
    const data = await queryClickHouse(`SELECT * FROM logs WHERE timestamp = '${request.params.arguments.timestamp}'`);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }]
    };
  }
  
  throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
