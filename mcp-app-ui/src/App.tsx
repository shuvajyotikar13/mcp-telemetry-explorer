import { useEffect, useState } from 'react';
import { App as MCPApp } from "@modelcontextprotocol/ext-apps";
import { TelemetryGrid } from './components/TelemetryGrid';

// Initialize the MCP App Bridge
const mcpApp = new MCPApp();

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Connect to the host (e.g., Claude Desktop or custom LangGraph host)
    mcpApp.connect().then(() => {
      // Listen for the initial data payload from the explore_telemetry tool
      mcpApp.ontoolresult = (result) => {
        const parsedData = JSON.parse(result.data.content[0].text);
        setData(parsedData);
        setLoading(false);
      };
    });
  }, []);

  // Handle drill-down interactions
  const handlePointClick = async (timestamp: string) => {
    setLoading(true);
    
    // The UI asks the host to execute another tool on the server
    const response = await mcpApp.callServerTool({
      name: "fetch_raw_logs",
      arguments: { timestamp }
    });

    const rawLogs = JSON.parse(response.content[0].text);
    console.log("Drill down data:", rawLogs);
    
    // Update the LLM's context so it knows what the user is looking at
    await mcpApp.updateModelContext({
      content: [{ 
        type: "text", 
        text: `User drilled down into the error logs at ${timestamp}. The root cause appears to be a database timeout.` 
      }],
    });
    
    setLoading(false);
  };

  if (loading) return <div>Loading Telemetry...</div>;

  return (
    <div className="p-4 bg-slate-900 text-white rounded-lg h-screen w-full">
      <h1 className="text-xl font-bold mb-4">Live Telemetry Explorer</h1>
      <TelemetryGrid data={data} onPointClick={handlePointClick} />
    </div>
  );
}
