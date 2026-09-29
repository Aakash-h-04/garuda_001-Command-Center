import React from 'react';
import { Bell, AlertTriangle, ShieldAlert, Activity, CheckCircle2 } from 'lucide-react';
import { AlertItem } from '../types';

interface SystemEventsLogProps {
  alerts: AlertItem[];
  events: {
    timestamp: string;
    event_type: string;
    message: string;
    camera_id: string;
    person_id?: string;
  }[];
}

export const SystemEventsLog: React.FC<SystemEventsLogProps> = ({ alerts, events }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg font-mono text-xs flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-slate-200 tracking-wider uppercase">SYSTEM EVENTS & ALERTS</span>
        </div>
        {alerts.length > 0 && (
          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] px-1.5 py-0.5 rounded font-bold animate-pulse">
            {alerts.length} ALERTS
          </span>
        )}
      </div>

      {/* Active Alerts Banner if any */}
      {alerts.length > 0 && (
        <div className="mb-2 flex flex-col gap-1.5">
          {alerts.slice(0, 3).map((alt, idx) => (
            <div
              key={idx}
              className={`p-2 rounded border flex items-start gap-2 text-[11px] ${
                alt.severity === 'CRITICAL'
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              }`}
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block uppercase">{alt.alert_type}</span>
                <span>{alt.message}</span>
                <span className="text-[9px] opacity-70 block mt-0.5">{alt.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Events Stream */}
      <div className="flex-1 overflow-y-auto max-h-[160px] space-y-1.5 pr-1 divide-y divide-slate-800/40">
        {events && events.length > 0 ? (
          events.map((evt, idx) => (
            <div key={idx} className="pt-1 flex items-center justify-between text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px]">{evt.timestamp}</span>
                <span className="text-slate-200">{evt.message}</span>
              </div>
              {evt.person_id && (
                <span className="text-[10px] bg-slate-800 text-cyan-300 px-1 py-0.5 rounded">
                  {evt.person_id}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-slate-500 italic text-[11px]">
            Listening for system detection events...
          </div>
        )}
      </div>
    </div>
  );
};
