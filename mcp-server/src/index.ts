import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { queryClickHouse, initDB } from "./clickhouse.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Initialize Database
initDB().catch(console.error);

// 2. Serve UI Assets
const app = express();
app.use(cors({ origin: '*' }));
app.use("/ui", express.static(path.join(__dirname, "../../mcp-server/public")));
app.listen(3000, () => console.error("UI Assets serving on port 3000"));

// 3. MCP Server Setup
const server = new Server(
  { name: "telemetry-explorer", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "explore_telemetry",
      description: "Visualize system logs and API telemetry data as an interactive dashboard.",
      inputSchema: {
        type: "object",
        properties: { time_range: { type: "string" } }
      },
      _meta: { ui: { resourceUri: "http://localhost:3000/ui/index.html" } }
    },
    {
      name: "fetch_raw_logs",
      description: "Fetch raw log lines for a specific minute.",
      inputSchema: {
        type: "object",
        properties: { timestamp: { type: "string" } }
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "explore_telemetry") {
    // Aggregate errors by minute for the time-series chart
    const query = `
      SELECT formatDateTime(toStartOfMinute(timestamp), '%Y-%m-%d %H:%M') as time, 
             count() as errors 
      FROM telemetry_logs 
      WHERE level='ERROR' 
      GROUP BY time ORDER BY time ASC
    `;
    const data = await queryClickHouse(query);
    
    // Markdown fallback for CLI environments
    let md = `📊 **Telemetry Report**\n\n| Time | Errors |\n|---|---|\n`;
    data.forEach((r: any) => md += `| ${r.time} | ${r.errors} |\n`);

    return {
      content: [
        { type: "text", text: md },
        { type: "text", text: `\n<data style="display:none;">${JSON.stringify(data)}</data>` }
      ]
    };
  }
  
  if (request.params.name === "fetch_raw_logs") {
    const time = request.params.arguments?.timestamp;
    const query = `SELECT * FROM telemetry_logs WHERE formatDateTime(timestamp, '%Y-%m-%d %H:%M') = '${time}'`;
    const data = await queryClickHouse(query);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  }
  
  throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
server.connect(transport).then(() => console.error("MCP Server running on stdio")).catch(console.error);
