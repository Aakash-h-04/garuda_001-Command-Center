import React, { useState } from 'react';
import { Shield, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { GeofenceZone } from '../types';
import { createGeofence, deleteGeofence } from '../services/api';

interface GeofenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  geofences: GeofenceZone[];
  onRefresh: () => void;
  cameraLat: number;
  cameraLon: number;
}

export const GeofenceModal: React.FC<GeofenceModalProps> = ({
  isOpen,
  onClose,
  geofences,
  onRefresh,
  cameraLat,
  cameraLon
}) => {
  const [newZoneName, setNewZoneName] = useState('');
  const [zoneType, setZoneType] = useState<'RESTRICTED' | 'MONITORING' | 'SAFE'>('RESTRICTED');
  const [color, setColor] = useState('#ef4444');

  if (!isOpen) return null;

  const handleAddSampleZone = async () => {
    if (!newZoneName) return;

    // Create a square polygon zone offset from camera
    const offset = (geofences.length + 1) * 0.00015;
    const samplePolygon: [number, number][] = [
      [cameraLat + offset, cameraLon + offset],
      [cameraLat + offset + 0.00020, cameraLon + offset],
      [cameraLat + offset + 0.00020, cameraLon + offset + 0.00020],
      [cameraLat + offset, cameraLon + offset + 0.00020],
    ];

    const newZone: GeofenceZone = {
      id: `ZONE-${Date.now().toString().slice(-4)}`,
      name: newZoneName,
      zone_type: zoneType,
      polygon: samplePolygon,
      color: color,
      alert_on_enter: true,
      alert_on_exit: false
    };

    try {
      await createGeofence(newZone);
      setNewZoneName('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (zoneId: string) => {
    try {
      await deleteGeofence(zoneId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              GEOFENCE ZONES & SECURITY RULES
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <p className="text-slate-400 text-[11px]">
            Configure spatial boundaries on the map. When tracked persons enter or exit designated zones, real-time alerts are automatically dispatched to the monitoring dashboard.
          </p>

          {/* New Zone Creator */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-3">
            <div className="text-slate-200 font-bold text-xs uppercase">ADD NEW GEOFENCE ZONE</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Zone Name</label>
                <input
                  type="text"
                  placeholder="e.g. North Gate Restricted"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Zone Type</label>
                <select
                  value={zoneType}
                  onChange={(e) => {
                    const t = e.target.value as any;
                    setZoneType(t);
                    setColor(t === 'RESTRICTED' ? '#ef4444' : t === 'MONITORING' ? '#f59e0b' : '#10b981');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                >
                  <option value="RESTRICTED">RESTRICTED ZONE</option>
                  <option value="MONITORING">MONITORING ZONE</option>
                  <option value="SAFE">SAFE ZONE</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddSampleZone}
                  disabled={!newZoneName}
                  className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Zone</span>
                </button>
              </div>
            </div>
          </div>

          {/* Existing Zones List */}
          <div className="space-y-2">
            <div className="text-slate-300 font-bold text-xs uppercase">ACTIVE ZONES ({geofences.length})</div>
            {geofences.map((zone) => (
              <div
                key={zone.id}
                className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{zone.name}</span>
                      <span
                        className="text-[9px] px-1.5 py-0.2 rounded border font-semibold"
                        style={{
                          color: zone.color,
                          borderColor: `${zone.color}66`,
                          backgroundColor: `${zone.color}1a`
                        }}
                      >
                        {zone.zone_type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      ID: {zone.id} | Polygon Vertices: {zone.polygon.length}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(zone.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  title="Delete Zone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
