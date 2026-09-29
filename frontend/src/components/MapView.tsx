import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Eye, Shield, Layers, Navigation, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import { CameraInfo, TrackedPerson, RouteResponse, GeofenceZone } from '../types';

interface MapViewProps {
  camera: CameraInfo | undefined;
  people: TrackedPerson[];
  selectedPersonId: string | null;
  onSelectPerson: (id: string | null) => void;
  routeData: RouteResponse | null;
  geofences: GeofenceZone[];
}

export const MapView: React.FC<MapViewProps> = ({
  camera,
  people,
  selectedPersonId,
  onSelectPerson,
  routeData,
  geofences
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layer groups
  const cameraLayerRef = useRef<L.LayerGroup | null>(null);
  const fovLayerRef = useRef<L.LayerGroup | null>(null);
  const peopleLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const geofenceLayerRef = useRef<L.LayerGroup | null>(null);

  // UI state toggles
  const [showFov, setShowFov] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultLat = camera?.lat || 12.971598;
    const defaultLon = camera?.lon || 77.594566;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLon],
      zoom: 18,
      zoomControl: false,
      attributionControl: false
    });

    // Dark tactical CartoDB Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 21,
      subdomains: 'abcd',
    }).addTo(map);

    // Layer groups
    fovLayerRef.current = L.layerGroup().addTo(map);
    geofenceLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    peopleLayerRef.current = L.layerGroup().addTo(map);
    cameraLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Camera Marker and FOV Cone
  useEffect(() => {
    if (!mapRef.current || !camera || !cameraLayerRef.current || !fovLayerRef.current) return;

    cameraLayerRef.current.clearLayers();
    fovLayerRef.current.clearLayers();

    const camLat = camera.lat;
    const camLon = camera.lon;
    const heading = camera.heading || 45;

    // Custom tactical Camera Icon with directional indicator
    const cameraIcon = L.divIcon({
      className: 'custom-camera-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            width: 32px; height: 32px; border-radius: 50%;
            background: #0f172a; border: 2px solid #10b981;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
            color: #10b981; font-weight: bold; font-size: 14px;
          ">
            📷
          </div>
          <!-- Heading direction arrow -->
          <div style="
            position: absolute; top: -10px; width: 0; height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 9px solid #10b981;
            transform: rotate(${heading}deg);
            transform-origin: 50% 26px;
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([camLat, camLon], { icon: cameraIcon });
    marker.bindPopup(`
      <div style="font-family: monospace; font-size: 12px; color: #0f172a; padding: 2px;">
        <strong style="color: #047857;">📷 CAMERA ${camera.id}</strong><br/>
        Name: ${camera.name}<br/>
        Lat: ${camLat.toFixed(6)}<br/>
        Lon: ${camLon.toFixed(6)}<br/>
        Heading: ${heading}°<br/>
        FOV: ${camera.fov || 72}° | Range: ${camera.range || 120}m<br/>
        Status: <span style="color: #059669; font-weight: bold;">${camera.status}</span>
      </div>
    `);
    cameraLayerRef.current.addLayer(marker);

    // Render Camera FOV Cone Polygon
    if (showFov && camera.fov_cone && camera.fov_cone.length > 2) {
      const fovPolygon = L.polygon(camera.fov_cone, {
        color: '#06b6d4',
        weight: 1.5,
        opacity: 0.8,
        fillColor: '#06b6d4',
        fillOpacity: 0.12,
        dashArray: '3, 4'
      });
      fovPolygon.bindTooltip('Camera Visual Field of View (FOV)', { sticky: true });
      fovLayerRef.current.addLayer(fovPolygon);
    }
  }, [camera, showFov]);

  // Update Geofence Zones
  useEffect(() => {
    if (!mapRef.current || !geofenceLayerRef.current) return;
    geofenceLayerRef.current.clearLayers();

    if (!showGeofences) return;

    geofences.forEach((zone) => {
      const poly = L.polygon(zone.polygon, {
        color: zone.color || '#ef4444',
        weight: 2,
        opacity: 0.85,
        fillColor: zone.color || '#ef4444',
        fillOpacity: 0.20,
        dashArray: zone.zone_type === 'RESTRICTED' ? '4, 4' : undefined
      });

      poly.bindTooltip(`
        <div style="font-family: monospace; font-size: 11px;">
          <strong>[${zone.zone_type}]</strong> ${zone.name}
        </div>
      `, { sticky: true });

      geofenceLayerRef.current?.addLayer(poly);
    });
  }, [geofences, showGeofences]);

  // Update Person Markers
  useEffect(() => {
    if (!mapRef.current || !peopleLayerRef.current) return;
    peopleLayerRef.current.clearLayers();

    people.forEach((person) => {
      if (!person.geo) return;
      const isSelected = selectedPersonId === person.id;
      const { lat, lon } = person.geo;

      const markerColor = isSelected ? '#10b981' : '#06b6d4';
      const glowColor = isSelected ? 'rgba(16, 185, 129, 0.8)' : 'rgba(6, 182, 212, 0.5)';

      const personIcon = L.divIcon({
        className: 'custom-person-marker',
        html: `
          <div style="
            display: flex; flex-direction: column; align-items: center; cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <div style="
              width: ${isSelected ? '28px' : '22px'};
              height: ${isSelected ? '28px' : '22px'};
              border-radius: 50%;
              background: #0f172a;
              border: 2px solid ${markerColor};
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 0 ${isSelected ? '14px' : '8px'} ${glowColor};
              color: #ffffff; font-size: 11px;
            ">
              👤
            </div>
            <div style="
              background: ${markerColor}; color: #ffffff;
              font-family: monospace; font-size: 9px; font-weight: bold;
              padding: 1px 4px; border-radius: 3px; margin-top: 2px;
              white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.5);
            ">
              ${person.id}
            </div>
          </div>
        `,
        iconSize: [28, 40],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([lat, lon], { icon: personIcon });

      marker.on('click', () => {
        onSelectPerson(isSelected ? null : person.id);
      });

      marker.bindTooltip(`
        <div style="font-family: monospace; font-size: 11px; color: #0f172a;">
          <strong>Person ${person.id}</strong> (${Math.round(person.confidence * 100)}% conf)<br/>
          Accuracy: ${person.location_accuracy} (±${person.accuracy_meters || 5}m)<br/>
          Direct Dist: ${person.distance_meters ? `${person.distance_meters}m` : '--'}<br/>
          Speed: ${person.speed_mps} m/s ${person.direction || ''}
        </div>
      `, { sticky: true });

      peopleLayerRef.current?.addLayer(marker);
    });
  }, [people, selectedPersonId, onSelectPerson]);

  // Update Route Polyline to Selected Person
  useEffect(() => {
    if (!mapRef.current || !routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();

    if (!selectedPersonId || !routeData || !routeData.coordinates || routeData.coordinates.length < 2) return;

    // Glowing background path line
    const glowLine = L.polyline(routeData.coordinates, {
      color: '#10b981',
      weight: 6,
      opacity: 0.35,
    });

    // Foreground tactical dash line
    const routeLine = L.polyline(routeData.coordinates, {
      color: '#10b981',
      weight: 3,
      opacity: 0.95,
      dashArray: routeData.is_fallback ? '6, 6' : undefined
    });

    routeLine.bindTooltip(`
      <div style="font-family: monospace; font-size: 11px;">
        <strong>SHORTEST PATH:</strong> ${routeData.route_distance_meters}m<br/>
        ETA (${routeData.mode}): ${routeData.formatted_duration}<br/>
        ${routeData.is_fallback ? '<span style="color: #f59e0b;">(Direct line approximation)</span>' : 'via road network'}
      </div>
    `, { sticky: true });

    routeLayerRef.current.addLayer(glowLine);
    routeLayerRef.current.addLayer(routeLine);
  }, [selectedPersonId, routeData]);

  // Map Controls Actions
  const handleRecenter = () => {
    if (!mapRef.current || !camera) return;
    mapRef.current.setView([camera.lat, camera.lon], 18, { animate: true });
  };

  const handleFitAll = () => {
    if (!mapRef.current || !camera) return;
    const points: [number, number][] = [[camera.lat, camera.lon]];
    people.forEach((p) => {
      if (p.geo) points.push([p.geo.lat, p.geo.lon]);
    });
    const bounds = L.latLngBounds(points);
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 19 });
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg relative">
      {/* Header */}
      <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wide">LIVE GEOSPATIAL MAP</span>
        </div>

        {/* Layer & Feature Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFov(prev => !prev)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors flex items-center gap-1 ${
              showFov
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Camera Field of View Cone"
          >
            <Eye className="w-3 h-3" />
            <span>FOV</span>
          </button>

          <button
            onClick={() => setShowGeofences(prev => !prev)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors flex items-center gap-1 ${
              showGeofences
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Geofence Zones"
          >
            <Shield className="w-3 h-3" />
            <span>Zones</span>
          </button>

          <button
            onClick={handleRecenter}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1"
            title="Recenter Map on Camera"
          >
            <Crosshair className="w-3 h-3 text-emerald-400" />
            <span>Center</span>
          </button>

          <button
            onClick={handleFitAll}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2 py-0.5 rounded text-[11px] font-mono transition-colors"
            title="Fit Camera and All Detections"
          >
            Fit All
          </button>
        </div>
      </div>

      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="flex-1 w-full min-h-[320px] bg-slate-950 z-0" />

      {/* Floating Tactical Zoom & Layer Controls */}
      <div className="absolute top-12 right-3 z-10 flex flex-col gap-1.5 font-mono text-xs">
        <button
          onClick={handleZoomIn}
          className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 p-1.5 rounded shadow transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 p-1.5 rounded shadow transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Route Telemetry HUD if a route is active */}
      {selectedPersonId && routeData && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-slate-950/90 backdrop-blur border border-emerald-500/40 rounded-lg p-2.5 shadow-xl font-mono text-xs text-slate-200 flex flex-wrap items-center gap-4">
          <div>
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">ACTIVE ROUTE TO {selectedPersonId}</span>
            <span className="text-sm font-bold text-slate-100">{routeData.route_distance_meters} m</span>
            <span className="text-slate-400 text-[11px] ml-1.5">({routeData.formatted_duration})</span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div>
            <span className="text-[10px] text-slate-400 block">DIRECT DISTANCE</span>
            <span className="text-xs font-semibold text-slate-200">{routeData.direct_distance_meters} m</span>
          </div>

          {routeData.is_fallback && (
            <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              <AlertCircle className="w-3 h-3" />
              <span>Routing unavailable — direct distance</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
