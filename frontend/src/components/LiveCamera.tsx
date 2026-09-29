import React, { useRef, useState } from 'react';
import { Camera, Users, Zap, Maximize2, RefreshCw } from 'lucide-react';
import { TrackedPerson, CameraInfo } from '../types';

interface LiveCameraProps {
  camera: CameraInfo | undefined;
  cameraId: string;
  people: TrackedPerson[];
  peopleCount: number;
  fps: number;
  latencyMs: number;
  selectedPersonId: string | null;
  onSelectPerson: (id: string | null) => void;
  onOpenCalibration: () => void;
}

export const LiveCamera: React.FC<LiveCameraProps> = ({
  camera,
  cameraId,
  people,
  peopleCount,
  fps,
  latencyMs,
  selectedPersonId,
  onSelectPerson,
  onOpenCalibration
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(0);

  const streamUrl = `/api/cameras/${cameraId}/stream?t=${streamKey}`;

  // Native video resolution assumed 640x360 for normalized overlay coordinates
  const frameWidth = 640;
  const frameHeight = 360;

  const handleRefreshStream = () => {
    setStreamError(false);
    setStreamKey(prev => prev + 1);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Header bar */}
      <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wide">LIVE CAMERA FEED</span>
          <span className="text-[10px] text-slate-500">[{camera?.name || cameraId}]</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded text-emerald-400 text-[11px] font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>PEOPLE DETECTED: {peopleCount}</span>
          </div>

          <button
            onClick={handleRefreshStream}
            title="Reload Video Feed"
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Stream & SVG Bounding Box Canvas Container */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[320px] select-none group"
      >
        {/* Stream image */}
        {!streamError ? (
          <img
            src={streamUrl}
            alt="Live Camera Video Stream"
            className="w-full h-full object-contain"
            onError={() => setStreamError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400 font-mono text-xs">
            <Camera className="w-10 h-10 text-rose-500 mb-2 animate-bounce" />
            <p className="text-slate-200 font-bold mb-1">STREAM RECONNECTING</p>
            <p className="text-slate-500 text-[11px] mb-3">Waiting for camera feed...</p>
            <button
              onClick={handleRefreshStream}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1 rounded text-slate-200"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* SVG Bounding Boxes Overlay with exact viewBox */}
        <svg
          viewBox={`0 0 ${frameWidth} ${frameHeight}`}
          className="absolute inset-0 w-full h-full pointer-events-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {people.map((person) => {
            const isSelected = selectedPersonId === person.id;
            const { x, y, width, height } = person.bbox;
            const groundX = person.ground_pixel.x;
            const groundY = person.ground_pixel.y;
            const confPercent = Math.round(person.confidence * 100);

            return (
              <g
                key={person.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPerson(isSelected ? null : person.id);
                }}
                className="cursor-pointer transition-opacity group/box"
              >
                {/* Ground Contact Point indicator (bottom-center) */}
                <circle
                  cx={groundX}
                  cy={groundY}
                  r={isSelected ? 4.5 : 3}
                  fill={isSelected ? '#10b981' : '#06b6d4'}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
                <line
                  x1={groundX - 6}
                  y1={groundY}
                  x2={groundX + 6}
                  y2={groundY}
                  stroke={isSelected ? '#10b981' : '#06b6d4'}
                  strokeWidth="1"
                />

                {/* Bounding Box Rect */}
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(6, 182, 212, 0.05)'}
                  stroke={isSelected ? '#10b981' : '#06b6d4'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  strokeDasharray={isSelected ? 'none' : '4 2'}
                  rx="2"
                  className="transition-all duration-150"
                />

                {/* Tactical Box Label Banner */}
                <rect
                  x={x}
                  y={Math.max(0, y - 18)}
                  width={Math.max(68, width * 0.75)}
                  height="18"
                  fill={isSelected ? '#10b981' : '#0e7490'}
                  rx="2"
                />
                <text
                  x={x + 4}
                  y={Math.max(12, y - 5)}
                  fill="#ffffff"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {person.id} {confPercent}%
                </text>

                {/* Accuracy Badge on box if localized */}
                {person.geo && (
                  <text
                    x={x + 4}
                    y={y + height - 4}
                    fill={person.location_accuracy === 'HIGH' ? '#10b981' : person.location_accuracy === 'MEDIUM' ? '#f59e0b' : '#94a3b8'}
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    GEO: ±{person.accuracy_meters || 5}m
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Live HUD telemetry tags inside video */}
        <div className="absolute top-2 left-2 pointer-events-none flex flex-col gap-1 font-mono text-[10px] text-slate-300 bg-slate-950/70 backdrop-blur px-2 py-1 rounded border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">LIVE STREAM</span>
            <span>|</span>
            <span>FPS: {fps.toFixed(1)}</span>
            <span>|</span>
            <span>LATENCY: {latencyMs.toFixed(0)} ms</span>
          </div>
          <div className="text-slate-400 text-[9px]">
            {camera?.calibration_status === 'CALIBRATED' ? '● HOMOGRAPHY: ACTIVE' : '⚠ CALIBRATION REQUIRED'}
          </div>
        </div>

        {/* Bottom banner click hint */}
        <div className="absolute bottom-2 right-2 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-950/60 backdrop-blur px-2 py-0.5 rounded border border-slate-800">
          Click bounding box to track & inspect
        </div>
      </div>

      {/* Footer info strip */}
      <div className="bg-slate-950/90 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <div>CAM ID: <span className="text-slate-200 font-semibold">{cameraId}</span></div>
          <div>RES: <span className="text-slate-200">640x360</span></div>
          <div>STATUS: <span className="text-emerald-400 font-semibold">{camera?.status || 'ONLINE'}</span></div>
        </div>

        <div>
          <button
            onClick={onOpenCalibration}
            className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            {camera?.calibration_status === 'CALIBRATED' ? 'View Calibration' : 'Calibrate Camera'}
          </button>
        </div>
      </div>
    </div>
  );
};
