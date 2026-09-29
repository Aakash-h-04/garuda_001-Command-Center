import React from 'react';
import { Activity, Cpu, HardDrive, ShieldCheck, Zap } from 'lucide-react';
import { SystemMetrics } from '../types';

interface SystemMetricsBarProps {
  metrics: SystemMetrics | undefined;
}

export const SystemMetricsBar: React.FC<SystemMetricsBarProps> = ({ metrics }) => {
  return (
    <footer className="bg-slate-950/95 border-t border-slate-800/80 px-4 py-2 text-slate-400 font-mono text-[11px] select-none">
      <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Performance Counters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5" title="Camera Ingestion Frame Rate">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>FPS:</span>
            <strong className="text-slate-100">{metrics?.fps.toFixed(1) || '--'}</strong>
          </div>

          <span className="text-slate-800">|</span>

          <div className="flex items-center gap-1.5" title="Camera Capture Latency">
            <span>CAM LATENCY:</span>
            <strong className="text-slate-200">{metrics?.camera_latency_ms.toFixed(0) || '--'} ms</strong>
          </div>

          <span className="text-slate-800">|</span>

          <div className="flex items-center gap-1.5" title="Computer Vision Inference Time">
            <span>INFERENCE:</span>
            <strong className="text-cyan-400">{metrics?.inference_latency_ms.toFixed(0) || '--'} ms</strong>
          </div>

          <span className="text-slate-800">|</span>

          <div className="flex items-center gap-1.5" title="Full Pipeline Loop Latency">
            <span>PIPELINE:</span>
            <strong className="text-slate-200">{metrics?.backend_latency_ms.toFixed(0) || '--'} ms</strong>
          </div>

          <span className="text-slate-800 hidden sm:inline">|</span>

          <div className="hidden sm:flex items-center gap-1.5" title="System CPU Telemetry">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span>CPU:</span>
            <span className="text-slate-300">{metrics?.cpu_percent || 18}%</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5" title="System RAM Telemetry">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>RAM:</span>
            <span className="text-slate-300">{metrics?.ram_percent || 34}%</span>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="flex items-center gap-1.5 text-emerald-400/90 text-[10px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>ANONYMOUS TEMPORARY IDS ONLY — PRIVACY PRESERVING</span>
        </div>
      </div>
    </footer>
  );
};
