import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Activity, AlertTriangle, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

export function Header() {
  const connected = useAppStore((state) => state.connected);
  const riskLevel = useAppStore((state) => state.riskLevel);
  const eventLog = useAppStore((state) => state.eventLog);
  const telemetry = useAppStore((state) => state.telemetry);

  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ')[4] + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute active alarm counts
  const criticalCount = riskLevel === 'Critical' ? 1 : 0;
  const warningCount = riskLevel === 'Warning' ? 1 : 0;
  const advisoryCount = eventLog.filter((e) => e.level === 'ADVISORY').length;

  return (
    <header className="h-[40px] bg-[#161B22] border-b border-[#30363D] px-4 flex items-center justify-between text-xs font-mono select-none z-30">
      {/* Left Title & System ID */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 font-bold tracking-wider text-white">
          <Activity className="w-4 h-4 text-[#58A6FF] animate-pulse" />
          <span>HONEYWELL QCS</span>
          <span className="text-[#8B949E] font-normal">|</span>
          <span className="text-[#58A6FF] font-semibold">GRADE CHANGE INTELLIGENCE</span>
        </div>
        <div className="hidden md:flex items-center space-x-2 text-[#8B949E] text-[11px] border-l border-[#30363D] pl-3">
          <span>Mill: <strong className="text-gray-200">PM-07</strong></span>
          <span>·</span>
          <span>Machine: <strong className="text-gray-200">PaperLine-3</strong></span>
        </div>
      </div>

      {/* Center: Live UTC Clock */}
      <div className="hidden lg:flex items-center space-x-2 text-[#8B949E]">
        <span className="bg-[#0D1117] px-2.5 py-0.5 rounded border border-[#30363D] font-mono text-[11px] text-gray-300">
          {utcTime}
        </span>
      </div>

      {/* Right: Alarm Counters & Connection Status */}
      <div className="flex items-center space-x-4">
        {/* ISA-18.2 Alarm Counters */}
        <div className="flex items-center space-x-3 text-[11px] font-semibold">
          <div className={`flex items-center space-x-1 px-2 py-0.5 rounded border ${
            criticalCount > 0 ? 'bg-red-950/80 border-red-600 text-red-400 animate-pulse' : 'bg-[#0D1117] border-[#30363D] text-[#8B949E]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${criticalCount > 0 ? 'bg-red-500 shadow-[0_0_8px_#f85149]' : 'bg-gray-600'}`}></span>
            <span>{criticalCount} CRITICAL</span>
          </div>

          <div className={`flex items-center space-x-1 px-2 py-0.5 rounded border ${
            warningCount > 0 ? 'bg-amber-950/70 border-amber-600 text-amber-400' : 'bg-[#0D1117] border-[#30363D] text-[#8B949E]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${warningCount > 0 ? 'bg-amber-500 shadow-[0_0_8px_#d29922]' : 'bg-gray-600'}`}></span>
            <span>{warningCount} WARNING</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded border bg-[#0D1117] border-[#30363D] text-[#8B949E]">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>{advisoryCount} ADVISORY</span>
          </div>
        </div>

        {/* Connection Status Badge */}
        <div className="flex items-center border-l border-[#30363D] pl-3">
          {connected ? (
            <div className="flex items-center space-x-1.5 text-emerald-400 text-[11px] font-medium" title="Telemetry Stream Connected (1Hz)">
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ONLINE</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-red-400 text-[11px] font-medium animate-pulse" title="Connecting to Backend...">
              <WifiOff className="w-3.5 h-3.5" />
              <span>OFFLINE</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
