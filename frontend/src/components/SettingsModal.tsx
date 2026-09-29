import React, { useState, useEffect } from 'react';
import { Sliders, Camera, Cpu, ShieldCheck, Save, X, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { fetchPlatformSettings, updatePlatformSettings, updateCamera } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraId: string;
  cameraName: string;
  cameraLat: number;
  cameraLon: number;
  cameraHeading: number;
  cameraFov: number;
  onSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  cameraId,
  cameraName,
  cameraLat,
  cameraLon,
  cameraHeading,
  cameraFov,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'detection' | 'privacy'>('camera');
  
  // Camera state
  const [name, setName] = useState(cameraName);
  const [providerType, setProviderType] = useState('demo');
  const [streamUrl, setStreamUrl] = useState('');
  const [lat, setLat] = useState(cameraLat.toString());
  const [lon, setLon] = useState(cameraLon.toString());
  const [heading, setHeading] = useState(cameraHeading.toString());
  const [fov, setFov] = useState(cameraFov.toString());

  // Detection & Roboflow state
  const [detectionProvider, setDetectionProvider] = useState('simulated');
  const [roboflowApiKey, setRoboflowApiKey] = useState('');
  const [roboflowModel, setRoboflowModel] = useState('yolov8n-640');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.50);
  const [detectionFps, setDetectionFps] = useState(5);
  const [crowdThreshold, setCrowdThreshold] = useState(8);

  // Privacy state
  const [storeVideo, setStoreVideo] = useState(false);
  const [retentionDays, setRetentionDays] = useState(7);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(cameraName);
    setLat(cameraLat.toString());
    setLon(cameraLon.toString());
    setHeading(cameraHeading.toString());
    setFov(cameraFov.toString());

    fetchPlatformSettings().then((s) => {
      setDetectionProvider(s.active_detection_provider || 'simulated');
      setRoboflowModel(s.roboflow_model || 'yolov8n-640');
      setConfidenceThreshold(s.confidence_threshold || 0.50);
      setDetectionFps(s.detection_fps || 5);
      setCrowdThreshold(s.crowd_threshold || 8);
    }).catch(console.error);
  }, [isOpen, cameraName, cameraLat, cameraLon, cameraHeading, cameraFov]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      // 1. Update camera
      await updateCamera(cameraId, {
        name,
        provider_type: providerType,
        stream_url: streamUrl || undefined,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        heading: parseFloat(heading),
        fov: parseFloat(fov),
        confidence_threshold: confidenceThreshold
      });

      // 2. Update platform settings
      await updatePlatformSettings({
        roboflow_api_key: roboflowApiKey || undefined,
        roboflow_model: roboflowModel,
        detection_provider: detectionProvider,
        confidence_threshold: confidenceThreshold,
        crowd_threshold: crowdThreshold,
        detection_fps: detectionFps
      });

      setStatusMsg('Configuration successfully applied.');
      onSaved();
      setTimeout(() => {
        setStatusMsg(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setStatusMsg(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              PLATFORM & SENSOR SETTINGS
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('camera')}
            className={`pb-2 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'camera'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera & Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('detection')}
            className={`pb-2 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'detection'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Roboflow & Vision</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-2 px-3 border-b-2 font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy & Storage</span>
          </button>
        </div>

        {/* Body Form */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: CAMERA */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Camera Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Camera Provider Type</label>
                  <select
                    value={providerType}
                    onChange={(e) => setProviderType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="demo">Demo Synthetic Simulator (Built-in)</option>
                    <option value="iphone">iPhone Stream (HTTP / MJPEG from iOS app)</option>
                    <option value="webcam">Local USB Webcam (OpenCV /dev/video0)</option>
                    <option value="rtsp">RTSP IP Camera Stream</option>
                  </select>
                </div>
              </div>

              {providerType !== 'demo' && providerType !== 'webcam' && (
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Stream URL</label>
                  <input
                    type="text"
                    placeholder={providerType === 'iphone' ? 'http://192.168.1.100:8080/video' : 'rtsp://127.0.0.1:8554/live'}
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Latitude</label>
                  <input
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Longitude</label>
                  <input
                    type="text"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Heading (° CW North)</label>
                  <input
                    type="number"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Horizontal FOV (°)</label>
                  <input
                    type="number"
                    value={fov}
                    onChange={(e) => setFov(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETECTION & ROBOFLOW */}
          {activeTab === 'detection' && (
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Active Detection Backend</label>
                <select
                  value={detectionProvider}
                  onChange={(e) => setDetectionProvider(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value="simulated">Simulated Synthetic Detector (Demo Mode)</option>
                  <option value="roboflow">Roboflow Inference API (Cloud Hosted)</option>
                  <option value="yolo">Local YOLO Engine (YOLOv8 / ONNX / Ultralytics)</option>
                </select>
              </div>

              {detectionProvider === 'roboflow' && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Roboflow API Key (Kept Server-Side)</label>
                    <input
                      type="password"
                      placeholder="Enter your private Roboflow API key"
                      value={roboflowApiKey}
                      onChange={(e) => setRoboflowApiKey(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">Model ID</label>
                    <input
                      type="text"
                      placeholder="yolov8n-640 or your-workspace/project/version"
                      value={roboflowModel}
                      onChange={(e) => setRoboflowModel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Confidence Cutoff</span>
                    <span>{Math.round(confidenceThreshold * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.95"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Inference FPS</span>
                    <span>{detectionFps} FPS</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={detectionFps}
                    onChange={(e) => setDetectionFps(parseInt(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">Crowd Alert Threshold</label>
                  <input
                    type="number"
                    value={crowdThreshold}
                    onChange={(e) => setCrowdThreshold(parseInt(e.target.value) || 5)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY & DATA RETENTION */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 flex items-start gap-2.5 text-slate-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-300 block mb-1 font-bold">
                    PRIVACY-BY-DESIGN ARCHITECTURE
                  </strong>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    This platform operates under strict anonymous tracking standards. No facial recognition, biometrics, or personal identification features are implemented. All detected subjects are assigned temporary anonymous identifiers (P001, P002...).
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 block">Raw Video Storage</span>
                    <span className="text-[10px] text-slate-500">Record raw video frames on disk</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={storeVideo}
                    onChange={(e) => setStoreVideo(e.target.checked)}
                    className="h-4 w-4 accent-emerald-500 rounded"
                  />
                </div>

                <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 block">Metadata Retention Window</span>
                    <span className="text-[10px] text-slate-500">Auto-purge anonymous detection telemetry</span>
                  </div>
                  <select
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-1 rounded"
                  >
                    <option value="1">1 Day</option>
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {statusMsg && (
            <div className="p-2.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
