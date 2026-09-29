import React from 'react';
import { Camera, Navigation, Compass, ArrowUp, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CameraInfo } from '../types';

interface CameraInfoCardProps {
  camera: CameraInfo | undefined;
  fps: number;
  latencyMs: number;
  onOpenSettings: () => void;
}

export const CameraInfoCard: React.FC<CameraInfoCardProps> = ({
  camera,
  fps,
  latencyMs,
  onOpenSettings
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg font-mono text-xs">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 tracking-wider uppercase">CAMERA TELEMETRY</span>
        </div>
        <button
          onClick={onOpenSettings}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
        >
          Configure
        </button>
      </div>

      {/* Attributes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        {/* Camera ID & Status */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-slate-400 text-[10px] block">CAMERA ID</span>
          <span className="text-slate-100 font-bold">{camera?.id || 'CAM-001'}</span>
          <span className="text-[10px] text-emerald-400 block font-semibold mt-0.5">
            ● {camera?.status || 'ONLINE'}
          </span>
        </div>

        {/* GPS Coordinates */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-slate-400 text-[10px] block">LOCATION (WGS84)</span>
          <span className="text-slate-200 font-semibold block truncate">
            {camera?.lat.toFixed(5)}, {camera?.lon.toFixed(5)}
          </span>
          <span className="text-[10px] text-slate-500">Alt: {camera?.altitude || 15}m</span>
        </div>

        {/* Heading & FOV */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-slate-400 text-[10px] block">HEADING / FOV</span>
          <span className="text-slate-200 font-semibold block">
            {camera?.heading || 45}° CW North
          </span>
          <span className="text-[10px] text-slate-400">
            FOV: {camera?.fov || 72}° | Range: {camera?.range || 120}m
          </span>
        </div>

        {/* Calibration Status */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-slate-400 text-[10px] block">CALIBRATION</span>
          <span className={`text-[11px] font-bold block ${
            camera?.calibration_status === 'CALIBRATED' ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {camera?.calibration_status || 'CALIBRATION REQUIRED'}
          </span>
          <span className="text-[10px] text-slate-400">
            FPS: {fps.toFixed(1)} | {latencyMs.toFixed(0)}ms
          </span>
        </div>
      </div>
    </div>
  );
};
