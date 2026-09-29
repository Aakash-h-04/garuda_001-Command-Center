import math
import numpy as np
import cv2
from typing import List, Tuple, Dict, Any, Optional
from app.core.config import settings

EARTH_RADIUS = 6371000.0 # meters

def wgs84_to_local_metric(lat: float, lon: float, ref_lat: float, ref_lon: float) -> Tuple[float, float]:
    """
    Converts WGS84 (lat, lon) to local tangent plane metric coordinates (East X, North Y in meters)
    relative to reference origin (ref_lat, ref_lon).
    """
    d_lat = math.radians(lat - ref_lat)
    d_lon = math.radians(lon - ref_lon)
    ref_lat_rad = math.radians(ref_lat)

    y_north = d_lat * EARTH_RADIUS
    x_east = d_lon * EARTH_RADIUS * math.cos(ref_lat_rad)
    return (x_east, y_north)

def local_metric_to_wgs84(x_east: float, y_north: float, ref_lat: float, ref_lon: float) -> Tuple[float, float]:
    """
    Converts local tangent plane metric coordinates (East X, North Y in meters)
    back to WGS84 (lat, lon) relative to reference origin.
    """
    ref_lat_rad = math.radians(ref_lat)
    d_lat = y_north / EARTH_RADIUS
    d_lon = x_east / (EARTH_RADIUS * math.cos(ref_lat_rad) + 1e-12)

    lat = ref_lat + math.degrees(d_lat)
    lon = ref_lon + math.degrees(d_lon)
    return (lat, lon)

class HomographyCalibrator:
    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        self.is_calibrated = False
        self.homography_matrix: Optional[np.ndarray] = None
        self.reprojection_error: Optional[float] = None
        self.point_pairs: List[Dict[str, Any]] = []
        self.ref_lat: float = settings.DEFAULT_CAMERA_LAT
        self.ref_lon: float = settings.DEFAULT_CAMERA_LON

    def set_reference_origin(self, lat: float, lon: float):
        self.ref_lat = lat
        self.ref_lon = lon

    def calibrate_from_points(self, points: List[Dict[str, Any]]) -> Tuple[bool, str, Optional[float]]:
        """
        Expects list of at least 4 dicts:
        [{'image_x': float, 'image_y': float, 'geo_lat': float, 'geo_lon': float}, ...]
        Computes 3x3 homography mapping image (u, v) -> local metric (x, y).
        """
        if len(points) < 4:
            return False, "At least 4 point correspondences are required for planar homography.", None

        src_pts = []
        dst_pts = []

        for p in points:
            u = float(p['image_x'])
            v = float(p['image_y'])
            lat = float(p['geo_lat'])
            lon = float(p['geo_lon'])
            
            x_m, y_m = wgs84_to_local_metric(lat, lon, self.ref_lat, self.ref_lon)
            src_pts.append([u, v])
            dst_pts.append([x_m, y_m])

        src_arr = np.array(src_pts, dtype=np.float32)
        dst_arr = np.array(dst_pts, dtype=np.float32)

        try:
            H, mask = cv2.findHomography(src_arr, dst_arr, cv2.RANSAC, 5.0)
            if H is None:
                return False, "Failed to compute valid homography matrix. Points may be collinear.", None

            # Calculate reprojection error
            num_pts = len(src_arr)
            src_homo = np.hstack([src_arr, np.ones((num_pts, 1), dtype=np.float32)])
            proj_homo = (H @ src_homo.T).T
            proj_pts = proj_homo[:, :2] / (proj_homo[:, 2:3] + 1e-12)
            
            errors = np.linalg.norm(proj_pts - dst_arr, axis=1)
            mean_error = float(np.mean(errors))

            self.homography_matrix = H
            self.reprojection_error = round(mean_error, 3)
            self.point_pairs = points
            self.is_calibrated = True

            return True, f"Calibration successful! Mean reprojection error: {self.reprojection_error} meters", self.reprojection_error
        except Exception as e:
            return False, f"Homography calculation exception: {e}", None

    def pixel_to_geo(self, u: float, v: float) -> Tuple[Optional[Tuple[float, float]], str, Optional[float]]:
        """
        Transforms pixel ground point (u, v) -> WGS84 (lat, lon) using H.
        Returns: ((lat, lon), accuracy_tier, accuracy_meters_estimate)
        """
        if not self.is_calibrated or self.homography_matrix is None:
            return None, "UNKNOWN", None

        pt = np.array([u, v, 1.0], dtype=np.float64)
        proj = self.homography_matrix @ pt
        w = proj[2]
        if abs(w) < 1e-6:
            return None, "UNKNOWN", None

        x_east = proj[0] / w
        y_north = proj[1] / w

        # Calculate distance from camera origin
        dist_m = math.sqrt(x_east * x_east + y_north * y_north)
        lat, lon = local_metric_to_wgs84(x_east, y_north, self.ref_lat, self.ref_lon)

        # Estimate accuracy tier
        if dist_m < 35.0:
            tier = "HIGH"
            acc_m = 2.0
        elif dist_m < 80.0:
            tier = "MEDIUM"
            acc_m = 5.0
        else:
            tier = "LOW"
            acc_m = 12.0

        return (lat, lon), tier, acc_m

    def setup_default_demo_calibration(self, cam_lat: float, cam_lon: float):
        """
        Sets up a calibrated homography for the Demo surveillance scene
        matching the DemoStreamProvider's perspective ground plane grid.
        """
        self.set_reference_origin(cam_lat, cam_lon)
        # Reference calibration points from DemoStreamProvider:
        # REF-1: (160, 140) -> North 45m, West 15m
        # REF-2: (480, 140) -> North 45m, East 18m
        # REF-3: (100, 310) -> North 12m, West 18m
        # REF-4: (540, 310) -> North 12m, East 20m
        demo_points = [
            {"image_x": 160.0, "image_y": 140.0, "x_m": -15.0, "y_m": 45.0},
            {"image_x": 480.0, "image_y": 140.0, "x_m": 18.0, "y_m": 45.0},
            {"image_x": 100.0, "image_y": 310.0, "x_m": -18.0, "y_m": 12.0},
            {"image_x": 540.0, "image_y": 310.0, "x_m": 20.0, "y_m": 12.0},
        ]

        formatted_points = []
        for p in demo_points:
            lat, lon = local_metric_to_wgs84(p["x_m"], p["y_m"], cam_lat, cam_lon)
            formatted_points.append({
                "image_x": p["image_x"],
                "image_y": p["image_y"],
                "geo_lat": lat,
                "geo_lon": lon
            })

        self.calibrate_from_points(formatted_points)

def calculate_camera_fov_cone(lat: float, lon: float, heading: float, fov_deg: float, range_m: float) -> List[List[float]]:
    """
    Generates polygon vertices for camera Field of View cone:
    [ [cam_lat, cam_lon], [arc_pt1_lat, arc_pt1_lon], ..., [cam_lat, cam_lon] ]
    Heading is degrees clockwise from North (0 = North, 90 = East, etc.)
    """
    points = [[lat, lon]]
    half_fov = fov_deg / 2.0
    start_angle = heading - half_fov
    end_angle = heading + half_fov

    num_arc_steps = 16
    for step in range(num_arc_steps + 1):
        angle = start_angle + (end_angle - start_angle) * (step / num_arc_steps)
        rad = math.radians(angle)
        # Bearing angle from North:
        # North is Y = cos(angle), East is X = sin(angle)
        x_east = range_m * math.sin(rad)
        y_north = range_m * math.cos(rad)
        arc_lat, arc_lon = local_metric_to_wgs84(x_east, y_north, lat, lon)
        points.append([arc_lat, arc_lon])

    points.append([lat, lon]) # close polygon
    return points
