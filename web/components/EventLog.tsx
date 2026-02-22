'use client';

interface Props {
  events: string[];
}

export function EventLog({ events }: Props) {
  return (
    <div className="bg-axo-panel rounded-lg border border-gray-800 p-4 max-h-96 overflow-hidden">
      <h3 className="text-lg font-semibold mb-3">事件日志</h3>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-gray-500 text-sm">暂无事件...</div>
        ) : (
          events.map((event, idx) => (
            <div 
              key={idx} 
              className="text-sm border-l-2 border-axo-accent pl-3 py-1"
            >
              <span className="text-gray-400">{event}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
