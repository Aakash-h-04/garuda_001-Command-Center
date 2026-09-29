import { RouteResponse, GeofenceZone, AnalyticsData, CalibrationPoint } from '../types';

const API_BASE = '/api';

export async function fetchCameras() {
  const res = await fetch(`${API_BASE}/cameras`);
  if (!res.ok) throw new Error('Failed to fetch cameras');
  return res.json();
}

export async function fetchCamera(id: string) {
  const res = await fetch(`${API_BASE}/cameras/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch camera ${id}`);
  return res.json();
}

export async function updateCamera(id: string, payload: any) {
  const res = await fetch(`${API_BASE}/cameras/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to update camera');
  return res.json();
}

export async function fetchCalibration(cameraId: string) {
  const res = await fetch(`${API_BASE}/calibration/${cameraId}`);
  if (!res.ok) throw new Error('Failed to fetch calibration');
  return res.json();
}

export async function submitCalibration(cameraId: string, points: CalibrationPoint[]) {
  const res = await fetch(`${API_BASE}/calibration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ camera_id: cameraId, points })
  });
  if (!res.ok) throw new Error('Calibration calculation failed');
  return res.json();
}

export async function calculateRoute(startLat: number, startLon: number, endLat: number, endLon: number, mode: string = 'walking'): Promise<RouteResponse> {
  const res = await fetch(`${API_BASE}/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start_lat: startLat,
      start_lon: startLon,
      end_lat: endLat,
      end_lon: endLon,
      mode
    })
  });
  if (!res.ok) throw new Error('Failed to calculate route');
  return res.json();
}

export async function fetchGeofences(): Promise<GeofenceZone[]> {
  const res = await fetch(`${API_BASE}/geofences`);
  if (!res.ok) throw new Error('Failed to fetch geofences');
  return res.json();
}

export async function createGeofence(zone: GeofenceZone) {
  const res = await fetch(`${API_BASE}/geofences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(zone)
  });
  if (!res.ok) throw new Error('Failed to create geofence');
  return res.json();
}

export async function deleteGeofence(zoneId: string) {
  const res = await fetch(`${API_BASE}/geofences/${zoneId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete geofence');
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchPlatformSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updatePlatformSettings(settings: any) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
