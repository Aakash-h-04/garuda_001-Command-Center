import time
import math
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

def calculate_iou(boxA: Dict[str, float], boxB: Dict[str, float]) -> float:
    # box format: {'x': top_left_x, 'y': top_left_y, 'width': w, 'height': h}
    xA = max(boxA['x'], boxB['x'])
    yA = max(boxA['y'], boxB['y'])
    xB = min(boxA['x'] + boxA['width'], boxB['x'] + boxB['width'])
    yB = min(boxA['y'] + boxA['height'], boxB['y'] + boxB['height'])

    interW = max(0.0, xB - xA)
    interH = max(0.0, yB - yA)
    interArea = interW * interH

    boxAArea = boxA['width'] * boxA['height']
    boxBArea = boxB['width'] * boxB['height']

    unionArea = boxAArea + boxBArea - interArea
    if unionArea <= 0:
        return 0.0
    return interArea / unionArea

class Track:
    def __init__(self, track_id: str, bbox: Dict[str, float], confidence: float):
        self.track_id = track_id
        self.bbox = bbox # {'x', 'y', 'width', 'height'}
        self.confidence = confidence
        self.first_seen = time.time()
        self.last_seen = time.time()
        self.time_since_update = 0
        self.hits = 1
        self.hit_streak = 1
        self.age = 0
        
        # Velocity and trajectory
        self.history: List[Tuple[float, float, float]] = [] # [(time, ground_x, ground_y)]
        ground_x = bbox['x'] + bbox['width'] / 2.0
        ground_y = bbox['y'] + bbox['height']
        self.history.append((self.first_seen, ground_x, ground_y))
        
        self.vx = 0.0
        self.vy = 0.0
        self.speed_mps = 0.0
        self.direction = "Stationary"
        self.geo: Optional[Dict[str, float]] = None # {'lat', 'lon'}
        self.location_accuracy = "UNKNOWN"
        self.distance_meters: Optional[float] = None
        self.route_distance_meters: Optional[float] = None
        self.estimated_time_seconds: Optional[float] = None

    def predict(self):
        # Extrapolate bounding box slightly based on velocity if lost
        if self.time_since_update > 0 and len(self.history) >= 2:
            self.bbox['x'] += self.vx * 0.03
            self.bbox['y'] += self.vy * 0.03
        self.age += 1
        self.time_since_update += 1

    def update(self, bbox: Dict[str, float], confidence: float):
        now = time.time()
        dt = max(0.01, now - self.last_seen)
        self.last_seen = now
        self.time_since_update = 0
        self.hits += 1
        self.hit_streak += 1
        self.confidence = 0.7 * self.confidence + 0.3 * confidence

        # Calculate pixel ground position (bottom-center)
        new_ground_x = bbox['x'] + bbox['width'] / 2.0
        new_ground_y = bbox['y'] + bbox['height']
        
        old_ground_x = self.bbox['x'] + self.bbox['width'] / 2.0
        old_ground_y = self.bbox['y'] + self.bbox['height']

        # Exponential smoothing for velocity
        inst_vx = (new_ground_x - old_ground_x) / dt
        inst_vy = (new_ground_y - old_ground_y) / dt
        self.vx = 0.6 * self.vx + 0.4 * inst_vx
        self.vy = 0.6 * self.vy + 0.4 * inst_vy

        self.bbox = bbox
        self.history.append((now, new_ground_x, new_ground_y))
        if len(self.history) > 30:
            self.history.pop(0)

class SortTracker:
    def __init__(self, max_age: int = 25, min_hits: int = 1, iou_threshold: float = 0.25):
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        self.tracks: List[Track] = []
        self.next_id = 1

    def update(self, detections: List[Dict[str, Any]]) -> List[Track]:
        """
        Takes detections list: [{'bbox': {'x', 'y', 'width', 'height'}, 'confidence': float, ...}]
        Returns active Track objects with persistent IDs.
        """
        # Step 1: Predict new locations of existing tracks
        for trk in self.tracks:
            trk.predict()

        # Step 2: Associate detections to existing tracks via IoU
        matched_indices, unmatched_detections, unmatched_tracks = self._associate_detections_to_tracks(detections)

        # Update matched tracks
        for trk_idx, det_idx in matched_indices:
            det = detections[det_idx]
            self.tracks[trk_idx].update(det['bbox'], det['confidence'])

        # Create new tracks for unmatched detections
        for det_idx in unmatched_detections:
            det = detections[det_idx]
            track_id = f"P{self.next_id:03d}"
            self.next_id += 1
            new_track = Track(track_id, det['bbox'], det['confidence'])
            self.tracks.append(new_track)

        # Remove dead tracks
        self.tracks = [trk for trk in self.tracks if trk.time_since_update <= self.max_age]

        # Return tracks that have met min_hits criteria and are not completely lost
        return [trk for trk in self.tracks if trk.hits >= self.min_hits and trk.time_since_update <= 3]

    def _associate_detections_to_tracks(self, detections: List[Dict[str, Any]]) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
        if len(self.tracks) == 0:
            return [], list(range(len(detections))), []
        if len(detections) == 0:
            return [], [], list(range(len(self.tracks)))

        # Compute IoU matrix
        iou_matrix = np.zeros((len(self.tracks), len(detections)), dtype=np.float32)
        for t, trk in enumerate(self.tracks):
            for d, det in enumerate(detections):
                iou_matrix[t, d] = calculate_iou(trk.bbox, det['bbox'])

        matched_indices = []
        unmatched_tracks = set(range(len(self.tracks)))
        unmatched_detections = set(range(len(detections)))

        # Greedy bipartite matching
        while True:
            max_iou = -1.0
            best_t = -1
            best_d = -1
            for t in unmatched_tracks:
                for d in unmatched_detections:
                    if iou_matrix[t, d] > max_iou:
                        max_iou = iou_matrix[t, d]
                        best_t = t
                        best_d = d

            if max_iou >= self.iou_threshold and best_t != -1 and best_d != -1:
                matched_indices.append((best_t, best_d))
                unmatched_tracks.remove(best_t)
                unmatched_detections.remove(best_d)
            else:
                break

        return matched_indices, list(unmatched_detections), list(unmatched_tracks)
