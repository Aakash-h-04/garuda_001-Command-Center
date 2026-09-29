export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface TrackedPerson {
  id: string; // e.g. "P001"
  confidence: number;
  class_name: string;
  bbox: BoundingBox;
  ground_pixel: PixelPoint;
  geo?: GeoPoint;
  location_accuracy: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  accuracy_meters?: number;
  distance_meters?: number;
  route_distance_meters?: number;
  estimated_time_seconds?: number;
  speed_mps: number;
  direction?: string;
  status: 'Stationary' | 'Moving' | 'Lost';
  first_seen: string;
  last_seen: string;
  duration_seconds: number;
}

export interface CameraInfo {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude?: number;
  heading?: number;
  fov?: number;
  range?: number;
  mounting_height?: number;
  status: string;
  calibration_status: 'CALIBRATED' | 'CALIBRATION REQUIRED';
  fov_cone?: [number, number][];
}

export interface SystemMetrics {
  fps: number;
  camera_latency_ms: number;
  inference_latency_ms: number;
  backend_latency_ms: number;
  cpu_percent: number;
  ram_percent: number;
}

export interface SystemHealth {
  camera_online: boolean;
  detection_online: boolean;
  gps_available: boolean;
  mapping_online: boolean;
  websocket_connected: boolean;
  routing_online: boolean;
}

export interface AlertItem {
  camera_id: string;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  person_id?: string;
  zone_id?: string;
  timestamp: string;
}

export interface LiveUpdateMessage {
  type: string;
  timestamp: string;
  camera_id: string;
  camera: CameraInfo;
  people_count: number;
  people: TrackedPerson[];
  metrics: SystemMetrics;
  health: SystemHealth;
  alerts: AlertItem[];
}

export interface RouteResponse {
  route_distance_meters: number;
  direct_distance_meters: number;
  duration_seconds: number;
  formatted_duration: string;
  mode: string;
  coordinates: [number, number][];
  is_fallback: boolean;
  provider_note?: string;
}

export interface GeofenceZone {
  id: string;
  name: string;
  zone_type: 'SAFE' | 'RESTRICTED' | 'MONITORING';
  polygon: [number, number][];
  color: string;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
}

export interface TimeSeriesPoint {
  timestamp: string;
  people_count: number;
}

export interface AnalyticsData {
  current_people: number;
  total_detections_today: number;
  peak_people_count: number;
  average_people_count: number;
  min_people_count: number;
  max_people_count: number;
  average_confidence: number;
  average_tracking_duration_seconds: number;
  time_series_1m: TimeSeriesPoint[];
  time_series_5m: TimeSeriesPoint[];
  time_series_30m: TimeSeriesPoint[];
  time_series_1h: TimeSeriesPoint[];
  time_series_today: TimeSeriesPoint[];
  system_events: {
    timestamp: string;
    event_type: string;
    message: string;
    camera_id: string;
    person_id?: string;
  }[];
  heatmap_points: [number, number, number][];
}

export interface CalibrationPoint {
  image_x: number;
  image_y: number;
  geo_lat: number;
  geo_lon: number;
}
