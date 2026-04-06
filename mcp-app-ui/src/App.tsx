import { useEffect, useState } from 'react';
import { App as MCPApp } from "@modelcontextprotocol/ext-apps";
import { TelemetryGrid } from './components/TelemetryGrid';
import { AlertCircle, ServerCrash } from 'lucide-react';

const mcpApp = new MCPApp();

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mcpApp.connect().then(() => {
      mcpApp.ontoolresult = (result: any) => {
        // Extract the JSON data hidden in the markdown response
        const content = result.data.content.find((c: any) => c.text.includes('<data'));
        if (content) {
          const match = content.text.match(/<data[^>]*>(.*?)<\/data>/s);
          if (match) setData(JSON.parse(match[1]));
        }
        setLoading(false);
      };
    });
  }, []);

  const handlePointClick = async (timestamp: string) => {
    // 1. Fetch raw logs from ClickHouse via the host
    const response = await mcpApp.callServerTool({
      name: "fetch_raw_logs",
      arguments: { timestamp }
    });

    const logs = JSON.parse(response.content[0].text);
    setRawLogs(logs);
    
    // 2. Sync context back to the LLM
    await mcpApp.updateModelContext({
      content: [{ 
        type: "text", 
        text: `User is now inspecting the error logs at exactly ${timestamp}. There are ${logs.length} errors.` 
      }],
    });
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
      <div className="animate-pulse flex items-center space-x-2">
        <AlertCircle className="w-6 h-6 text-blue-400" />
        <span>Awaiting telemetry data from agent...</span>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen w-full font-sans">
      <div className="flex items-center space-x-3 mb-6 border-b border-slate-700 pb-4">
        <ServerCrash className="w-8 h-8 text-red-500" />
        <h1 className="text-2xl font-bold">Live Anomaly Explorer</h1>
      </div>
      
      <TelemetryGrid data={data} onPointClick={handlePointClick} />

      {rawLogs.length > 0 && (
        <div className="mt-8 bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Raw Errors ({rawLogs[0].timestamp})</h2>
          <div className="overflow-y-auto max-h-48 space-y-2">
            {rawLogs.map((log, idx) => (
              <div key={idx} className="bg-slate-900 p-3 rounded font-mono text-sm text-red-400">
                <span className="text-slate-500 mr-2">[{log.service}]</span>
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
