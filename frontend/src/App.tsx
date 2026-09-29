import React, { useState, useEffect, useMemo } from 'react';
import { useLiveTelemetry } from './hooks/useLiveTelemetry';
import { Navbar } from './components/Navbar';
import { LiveCamera } from './components/LiveCamera';
import { MapView } from './components/MapView';
import { PersonList } from './components/PersonList';
import { PersonDetails } from './components/PersonDetails';
import { CameraInfoCard } from './components/CameraInfoCard';
import { SystemEventsLog } from './components/SystemEventsLog';
import { SystemMetricsBar } from './components/SystemMetricsBar';
import { CalibrationModal } from './components/CalibrationModal';
import { GeofenceModal } from './components/GeofenceModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { SettingsModal } from './components/SettingsModal';
import { RouteResponse, GeofenceZone } from './types';
import { calculateRoute, fetchGeofences } from './services/api';

export function App() {
  const [selectedCameraId, setSelectedCameraId] = useState<string>('CAM-001');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [routeMode, setRouteMode] = useState<string>('walking');
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [geofences, setGeofences] = useState<GeofenceZone[]>([]);

  // Modal Dialog states
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isGeofencesOpen, setIsGeofencesOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Live WebSocket Telemetry stream
  const { data, isConnected, error } = useLiveTelemetry(selectedCameraId);

  // Load geofences initially
  const loadGeofences = async () => {
    try {
      const zones = await fetchGeofences();
      setGeofences(zones);
    } catch (err) {
      console.error('Failed to load geofences:', err);
    }
  };

  useEffect(() => {
    loadGeofences();
  }, []);

  // Find currently selected person
  const selectedPerson = useMemo(() => {
    if (!data || !selectedPersonId) return undefined;
    return data.people.find(p => p.id === selectedPersonId);
  }, [data, selectedPersonId]);

  // Recalculate shortest route whenever selected person changes or coordinates update
  useEffect(() => {
    if (!data || !selectedPerson || !selectedPerson.geo) {
      setRouteData(null);
      return;
    }

    const camLat = data.camera?.lat || 12.971598;
    const camLon = data.camera?.lon || 77.594566;
    const pLat = selectedPerson.geo.lat;
    const pLon = selectedPerson.geo.lon;

    let isMounted = true;
    calculateRoute(camLat, camLon, pLat, pLon, routeMode)
      .then((res) => {
        if (isMounted) setRouteData(res);
      })
      .catch((err) => {
        console.error('Routing calculation failed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedPerson?.geo?.lat, selectedPerson?.geo?.lon, selectedPersonId, routeMode, data?.camera?.lat, data?.camera?.lon]);

  const cameraInfo = data?.camera;
  const peopleList = data?.people || [];
  const peopleCount = data?.people_count || 0;
  const metrics = data?.metrics;
  const health = data?.health;
  const alerts = data?.alerts || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-mono">
      {/* Top Navigation Bar */}
      <Navbar
        health={health}
        camera={cameraInfo}
        selectedCameraId={selectedCameraId}
        onSelectCamera={setSelectedCameraId}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        onOpenGeofences={() => setIsGeofencesOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDemoMode={selectedCameraId === 'CAM-001'}
        alertCount={alerts.length}
      />

      {/* Main Dashboard Grid */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-3 sm:p-4 space-y-4">
        {/* TOP SECTION: LIVE CAMERA & LIVE MAP (Split View) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[440px]">
          {/* Left: Live Camera View */}
          <div className="h-[440px] lg:h-auto flex flex-col">
            <LiveCamera
              camera={cameraInfo}
              cameraId={selectedCameraId}
              people={peopleList}
              peopleCount={peopleCount}
              fps={metrics?.fps || 0}
              latencyMs={metrics?.camera_latency_ms || 0}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
              onOpenCalibration={() => setIsCalibrationOpen(true)}
            />
          </div>

          {/* Right: Interactive Geospatial Map */}
          <div className="h-[440px] lg:h-auto flex flex-col">
            <MapView
              camera={cameraInfo}
              people={peopleList}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
              routeData={routeData}
              geofences={geofences}
            />
          </div>
        </div>

        {/* MIDDLE SECTION: TELEMETRY & DETECTED PEOPLE LIST */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column (5 cols): Camera Info & Selected Person Details */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            <CameraInfoCard
              camera={cameraInfo}
              fps={metrics?.fps || 0}
              latencyMs={metrics?.camera_latency_ms || 0}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            <PersonDetails
              person={selectedPerson}
              routeData={routeData}
              routeMode={routeMode}
              onChangeRouteMode={setRouteMode}
              onClearSelection={() => setSelectedPersonId(null)}
            />
          </div>

          {/* Right Column (7 cols): Detected People Table */}
          <div className="lg:col-span-7 flex flex-col">
            <PersonList
              people={peopleList}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
            />
          </div>
        </div>

        {/* BOTTOM SECTION: SYSTEM EVENTS & ALERTS */}
        <div className="w-full">
          <SystemEventsLog
            alerts={alerts}
            events={[
              {
                timestamp: data?.timestamp || '12:00:00',
                event_type: 'SYSTEM',
                message: `Active monitoring on ${selectedCameraId} - ${peopleCount} subjects in visual field`,
                camera_id: selectedCameraId
              }
            ]}
          />
        </div>
      </main>

      {/* Persistent Telemetry Footer Bar */}
      <SystemMetricsBar metrics={metrics} />

      {/* Interactive Calibration Dialog */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        cameraId={selectedCameraId}
        cameraLat={cameraInfo?.lat || 12.971598}
        cameraLon={cameraInfo?.lon || 77.594566}
      />

      {/* Geofence Management Dialog */}
      <GeofenceModal
        isOpen={isGeofencesOpen}
        onClose={() => setIsGeofencesOpen(false)}
        geofences={geofences}
        onRefresh={loadGeofences}
        cameraLat={cameraInfo?.lat || 12.971598}
        cameraLon={cameraInfo?.lon || 77.594566}
      />

      {/* Analytics & Crowd Trends Dialog */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />

      {/* Platform & Vision Settings Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        cameraId={selectedCameraId}
        cameraName={cameraInfo?.name || selectedCameraId}
        cameraLat={cameraInfo?.lat || 12.971598}
        cameraLon={cameraInfo?.lon || 77.594566}
        cameraHeading={cameraInfo?.heading || 45}
        cameraFov={cameraInfo?.fov || 72}
        onSaved={loadGeofences}
      />
    </div>
  );
}

export default App;
