import React from 'react';
import { Camera, Radio, Shield, Activity, Sliders, MapPin, BarChart3, Crosshair, AlertTriangle } from 'lucide-react';
import { SystemHealth, CameraInfo } from '../types';

interface NavbarProps {
  health: SystemHealth | undefined;
  camera: CameraInfo | undefined;
  selectedCameraId: string;
  onSelectCamera: (id: string) => void;
  onOpenCalibration: () => void;
  onOpenGeofences: () => void;
  onOpenAnalytics: () => void;
  onOpenSettings: () => void;
  isDemoMode: boolean;
  alertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  camera,
  selectedCameraId,
  onSelectCamera,
  onOpenCalibration,
  onOpenGeofences,
  onOpenAnalytics,
  onOpenSettings,
  isDemoMode,
  alertCount
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 text-slate-100 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-lg text-emerald-400">
            <Crosshair className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-wider font-mono uppercase bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                GEO-CV SENTINEL
              </h1>
              {isDemoMode && (
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-mono px-2 py-0.5 rounded font-semibold tracking-wider animate-pulse">
                  DEMO MODE
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">
              REAL-TIME HUMAN DETECTION & GEOSPATIAL TRACKING PLATFORM
            </p>
          </div>
        </div>

        {/* System Health Indicators */}
        <div className="hidden lg:flex items-center gap-2.5 bg-slate-950/70 border border-slate-800/80 px-3 py-1.5 rounded-lg text-xs font-mono">
          <div className="text-[11px] text-slate-400 uppercase font-semibold mr-1">SYSTEM STATUS:</div>
          
          <div className="flex items-center gap-1.5" title="Camera Stream Status">
            <span className={`w-2 h-2 rounded-full ${health?.camera_online ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`} />
            <span className={health?.camera_online ? 'text-slate-200' : 'text-slate-500'}>Camera</span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5" title="Computer Vision Inference Service">
            <span className={`w-2 h-2 rounded-full ${health?.detection_online ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
            <span className={health?.detection_online ? 'text-slate-200' : 'text-slate-500'}>Detection</span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5" title="Geospatial Homography Localization">
            <span className={`w-2 h-2 rounded-full ${camera?.calibration_status === 'CALIBRATED' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 animate-ping'}`} />
            <span className="text-slate-200">GPS/Calib</span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5" title="Road Network Routing Engine">
            <span className={`w-2 h-2 rounded-full ${health?.routing_online ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
            <span className={health?.routing_online ? 'text-slate-200' : 'text-slate-500'}>Routing</span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5" title="Real-Time WebSocket Stream">
            <span className={`w-2 h-2 rounded-full ${health?.websocket_connected ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]' : 'bg-rose-500'}`} />
            <span className={health?.websocket_connected ? 'text-slate-200' : 'text-slate-500'}>Live WS</span>
          </div>
        </div>

        {/* Action Controls & Camera Selector */}
        <div className="flex items-center gap-2">
          {/* Camera Selector */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
            <Camera className="w-3.5 h-3.5 text-cyan-400 mr-2" />
            <select
              value={selectedCameraId}
              onChange={(e) => onSelectCamera(e.target.value)}
              className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="CAM-001" className="bg-slate-900 text-slate-100">CAM-001 (Sector-Alpha)</option>
              <option value="CAM-IPHONE" className="bg-slate-900 text-slate-100">CAM-IPHONE (Mobile Stream)</option>
              <option value="CAM-WEBCAM" className="bg-slate-900 text-slate-100">CAM-WEBCAM (USB Video)</option>
            </select>
          </div>

          {/* Quick Action Navigation */}
          <button
            onClick={onOpenCalibration}
            title="Camera Calibration & Homography Matrix"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-200 transition-colors"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Calibrate</span>
          </button>

          <button
            onClick={onOpenGeofences}
            title="Geofence Zones & Spatial Rules"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-200 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Geofences</span>
          </button>

          <button
            onClick={onOpenAnalytics}
            title="Analytics & Historical Crowd Statistics"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-200 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Analytics</span>
          </button>

          <button
            onClick={onOpenSettings}
            title="Platform Settings & Roboflow API"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-200 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
