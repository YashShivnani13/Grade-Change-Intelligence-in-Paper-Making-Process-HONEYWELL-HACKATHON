import React from 'react';
import { useAppStore } from '../../store/appStore';
import { formatISO } from '../../utils/formatting';
import { ListFilter } from 'lucide-react';

export function EventLog() {
  const eventLog = useAppStore((state) => state.eventLog);

  const getLevelBadge = (level) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="text-red-400 font-bold">● CRITICAL</span>;
      case 'WARNING':
        return <span className="text-amber-400 font-bold">● WARNING</span>;
      case 'ADVISORY':
        return <span className="text-[#58A6FF] font-bold">● ADVISORY</span>;
      default:
        return <span className="text-gray-400 font-semibold">● INFO</span>;
    }
  };

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded p-2.5 flex flex-col flex-1 min-h-[140px] font-mono text-xs select-none">
      <div className="flex items-center justify-between text-[#8B949E] text-[11px] font-bold tracking-wider uppercase border-b border-[#30363D] pb-1.5 mb-2">
        <div className="flex items-center space-x-1.5 text-gray-200">
          <ListFilter className="w-3.5 h-3.5 text-[#58A6FF]" />
          <span>TRANSITION EVENT AUDIT LOG</span>
        </div>
        <span className="text-[10px] text-gray-500 font-normal">{eventLog.length} EVENTS</span>
      </div>

      {/* Log Entries Container */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[220px]">
        {eventLog.length === 0 ? (
          <div className="text-gray-500 text-center py-4 text-[11px]">No events recorded</div>
        ) : (
          eventLog.map((item) => (
            <div
              key={item.id}
              className="bg-[#0D1117] p-1.5 rounded border border-[#30363D]/60 flex items-start space-x-2 text-[10.5px] leading-tight hover:border-[#484F58] transition"
            >
              <span className="text-[#8B949E] shrink-0">{formatISO(item.timestamp)}</span>
              <span className="shrink-0">{getLevelBadge(item.level)}</span>
              <span className="bg-[#161B22] px-1 rounded text-gray-300 font-bold shrink-0">{item.tag}</span>
              <span className="text-gray-200 truncate">{item.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
