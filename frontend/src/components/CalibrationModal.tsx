import React, { useState, useEffect, useRef } from 'react';
import { Crosshair, CheckCircle2, AlertTriangle, RefreshCw, X, Save, Trash2, HelpCircle } from 'lucide-react';
import { CalibrationPoint } from '../types';
import { fetchCalibration, submitCalibration } from '../services/api';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraId: string;
  cameraLat: number;
  cameraLon: number;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  cameraId,
  cameraLat,
  cameraLon
}) => {
  const [snapshotUrl, setSnapshotUrl] = useState<string>('');
  const [points, setPoints] = useState<CalibrationPoint[]>([]);
  const [status, setStatus] = useState<string>('CALIBRATION REQUIRED');
  const [reprojectionError, setReprojectionError] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load existing calibration and snapshot when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setSnapshotUrl(`/api/cameras/${cameraId}/snapshot?t=${Date.now()}`);

    fetchCalibration(cameraId)
      .then((data) => {
        setStatus(data.status);
        setReprojectionError(data.reprojection_error);
        if (data.points && data.points.length >= 4) {
          setPoints(data.points);
        } else {
          // Default initial 4 reference points on perspective grid
          setPoints([
            { image_x: 160, image_y: 140, geo_lat: cameraLat + 0.00040, geo_lon: cameraLon - 0.00015 },
            { image_x: 480, image_y: 140, geo_lat: cameraLat + 0.00040, geo_lon: cameraLon + 0.00018 },
            { image_x: 100, image_y: 310, geo_lat: cameraLat + 0.00010, geo_lon: cameraLon - 0.00018 },
            { image_x: 540, image_y: 310, geo_lat: cameraLat + 0.00010, geo_lon: cameraLon + 0.00020 },
          ]);
        }
      })
      .catch((err) => console.error('Failed to load calibration:', err));
  }, [isOpen, cameraId, cameraLat, cameraLon]);

  // Redraw canvas with image and points
  useEffect(() => {
    if (!snapshotUrl || !canvasRef.current) return;

    const img = new Image();
    img.src = snapshotUrl;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [snapshotUrl, points]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageRef.current.naturalWidth || 640;
    canvas.height = imageRef.current.naturalHeight || 360;

    // Draw video snapshot
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw calibration points and quad polygon
    if (points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].image_x, points[0].image_y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].image_x, points[i].image_y);
      }
      if (points.length >= 4) {
        ctx.closePath();
      }
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (points.length >= 4) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
        ctx.fill();
      }
    }

    // Draw point markers
    points.forEach((pt, idx) => {
      ctx.beginPath();
      ctx.arc(pt.image_x, pt.image_y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`PT-${idx + 1}`, pt.image_x + 9, pt.image_y - 6);
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX);
    const clickY = Math.round((e.clientY - rect.top) * scaleY);

    if (points.length < 4) {
      // Add point
      const defaultOffset = (points.length + 1) * 0.0001;
      const newPt: CalibrationPoint = {
        image_x: clickX,
        image_y: clickY,
        geo_lat: cameraLat + defaultOffset,
        geo_lon: cameraLon + defaultOffset
      };
      setPoints([...points, newPt]);
    } else {
      // Replace closest point
      let closestIdx = 0;
      let minDist = Infinity;
      points.forEach((p, idx) => {
        const d = Math.hypot(p.image_x - clickX, p.image_y - clickY);
        if (d < minDist) {
          minDist = d;
          closestIdx = idx;
        }
      });
      const updated = [...points];
      updated[closestIdx] = { ...updated[closestIdx], image_x: clickX, image_y: clickY };
      setPoints(updated);
    }
  };

  const handlePointCoordChange = (index: number, field: 'geo_lat' | 'geo_lon', val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const updated = [...points];
    updated[index][field] = num;
    setPoints(updated);
  };

  const handleSaveCalibration = async () => {
    if (points.length < 4) {
      setMessage('Error: Exactly 4 or more reference points are required.');
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await submitCalibration(cameraId, points);
      setStatus(res.status);
      setReprojectionError(res.reprojection_error);
      setMessage(res.message);
    } catch (err: any) {
      setMessage(`Calibration failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPoints = () => {
    setPoints([
      { image_x: 160, image_y: 140, geo_lat: cameraLat + 0.00040, geo_lon: cameraLon - 0.00015 },
      { image_x: 480, image_y: 140, geo_lat: cameraLat + 0.00040, geo_lon: cameraLon + 0.00018 },
      { image_x: 100, image_y: 310, geo_lat: cameraLat + 0.00010, geo_lon: cameraLon - 0.00018 },
      { image_x: 540, image_y: 310, geo_lat: cameraLat + 0.00010, geo_lon: cameraLon + 0.00020 },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              CAMERA CALIBRATION & PLANAR HOMOGRAPHY
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Status Alert Banner */}
          <div className={`p-3 rounded-lg border flex items-center justify-between ${
            status === 'CALIBRATED'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
          }`}>
            <div className="flex items-center gap-2">
              {status === 'CALIBRATED' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span className="font-bold">STATUS: {status}</span>
            </div>
            {reprojectionError !== null && (
              <span className="text-[11px] font-mono">
                Reprojection Error: <strong className="text-emerald-400">{reprojectionError}m</strong>
              </span>
            )}
          </div>

          <p className="text-slate-400 text-[11px]">
            Click 4 ground reference points on the video snapshot below, then specify their real-world GPS coordinates (WGS84).
            The Direct Linear Transformation (DLT) solver calculates a 3x3 homography matrix <strong>H</strong> to map bounding box bottom-center pixels directly into GPS coordinates.
          </p>

          {/* Interactive Snapshot Canvas */}
          <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-black flex justify-center">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="max-w-full h-auto cursor-crosshair"
            />
            <div className="absolute top-2 right-2 bg-slate-950/80 px-2 py-1 rounded text-[10px] text-slate-300 pointer-events-none">
              Click to place or move reference points
            </div>
          </div>

          {/* Reference Points Table */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
              <span>POINT CORRESPONDENCES (MIN 4)</span>
              <button
                onClick={handleResetPoints}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-normal text-[10px]"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset to Ground Grid</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {points.map((pt, idx) => (
                <div key={idx} className="bg-slate-900 p-2.5 rounded border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-slate-200 font-bold">
                    <span className="text-emerald-400">POINT {idx + 1}</span>
                    <span className="text-[10px] text-slate-400">Pixel: ({pt.image_x}, {pt.image_y})</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <label className="text-slate-500 block mb-0.5">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={pt.geo_lat}
                        onChange={(e) => handlePointCoordChange(idx, 'geo_lat', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block mb-0.5">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={pt.geo_lon}
                        onChange={(e) => handlePointCoordChange(idx, 'geo_lon', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {message && (
            <div className="p-2.5 rounded bg-slate-800 text-slate-200 text-xs border border-slate-700">
              {message}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveCalibration}
            disabled={isSubmitting || points.length < 4}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Calculating...' : 'Compute & Save Homography'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
