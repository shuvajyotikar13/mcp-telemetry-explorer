import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  data: any[];
  onPointClick: (timestamp: string) => void;
}

export function TelemetryGrid({ data, onPointClick }: Props) {
  return (
    <div className="h-64 w-full bg-slate-800 rounded-lg p-4 cursor-pointer">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} onClick={(e) => {
          if (e && e.activeLabel) onPointClick(e.activeLabel.toString());
        }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }}
            itemStyle={{ color: '#ef4444' }}
          />
          <Line 
            type="monotone" 
            dataKey="errors" 
            stroke="#ef4444" 
            strokeWidth={3}
            activeDot={{ r: 8, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} 
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-2 text-center">Click on a data point on the graph to drill down into raw logs.</p>
    </div>
  );
}
