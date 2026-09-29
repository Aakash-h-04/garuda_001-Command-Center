import time
import datetime
from typing import List, Dict, Any, Deque
from collections import deque

class AnalyticsManager:
    def __init__(self):
        # Ring buffer for recent time-series data: (timestamp_epoch, people_count)
        self.history_1m: Deque[Dict[str, Any]] = deque(maxlen=60) # 1 point per second for 60s
        self.history_5m: Deque[Dict[str, Any]] = deque(maxlen=60) # 1 point per 5s
        self.history_30m: Deque[Dict[str, Any]] = deque(maxlen=60) # 1 point per 30s
        self.history_1h: Deque[Dict[str, Any]] = deque(maxlen=60) # 1 point per 60s
        self.history_today: Deque[Dict[str, Any]] = deque(maxlen=96) # 1 point per 15m

        self.last_sample_1m = 0.0
        self.last_sample_5m = 0.0
        self.last_sample_30m = 0.0
        self.last_sample_1h = 0.0
        self.last_sample_today = 0.0

        # Aggregation metrics
        self.total_detections_today = 0
        self.peak_people_count = 0
        self.min_people_count = 0
        self.sum_people_count = 0
        self.sample_count = 0
        
        self.confidence_sum = 0.0
        self.confidence_count = 0
        
        self.duration_sum = 0.0
        self.duration_count = 0

        # System Events Log
        self.system_events: Deque[Dict[str, Any]] = deque(maxlen=100)

        # Spatial Heatmap historical points: list of [lat, lon, intensity]
        self.heatmap_points: Deque[List[float]] = deque(maxlen=500)

        # Pre-seed with realistic baseline data
        self._preseed_history()

    def _preseed_history(self):
        now = time.time()
        for i in range(50, 0, -1):
            ts = now - i * 1.0
            cnt = max(1, int(3 + 2 * (i % 5 == 0) - (i % 7 == 0)))
            t_str = time.strftime("%H:%M:%S", time.localtime(ts))
            self.history_1m.append({"timestamp": t_str, "people_count": cnt})

            if i % 5 == 0:
                t_str_5m = time.strftime("%H:%M:%S", time.localtime(now - i * 5.0))
                self.history_5m.append({"timestamp": t_str_5m, "people_count": cnt})

    def record_frame_data(self, people_count: int, people: List[Dict[str, Any]]):
        now = time.time()
        time_str = time.strftime("%H:%M:%S", time.localtime(now))

        self.sample_count += 1
        self.sum_people_count += people_count
        self.peak_people_count = max(self.peak_people_count, people_count)
        if self.min_people_count == 0 or people_count < self.min_people_count:
            self.min_people_count = people_count

        self.total_detections_today += people_count

        for p in people:
            conf = p.get("confidence", 0.0)
            dur = p.get("duration_seconds", 0.0)
            self.confidence_sum += conf
            self.confidence_count += 1
            if dur > 0:
                self.duration_sum += dur
                self.duration_count += 1

            geo = p.get("geo")
            if geo and geo.get("lat") and geo.get("lon"):
                self.heatmap_points.append([geo["lat"], geo["lon"], 1.0])

        # 1-minute buffer (every 1s)
        if now - self.last_sample_1m >= 1.0:
            self.history_1m.append({"timestamp": time_str, "people_count": people_count})
            self.last_sample_1m = now

        # 5-minute buffer (every 5s)
        if now - self.last_sample_5m >= 5.0:
            self.history_5m.append({"timestamp": time_str, "people_count": people_count})
            self.last_sample_5m = now

        # 30-minute buffer (every 30s)
        if now - self.last_sample_30m >= 30.0:
            self.history_30m.append({"timestamp": time_str, "people_count": people_count})
            self.last_sample_30m = now

        # 1-hour buffer (every 60s)
        if now - self.last_sample_1h >= 60.0:
            self.history_1h.append({"timestamp": time_str, "people_count": people_count})
            self.last_sample_1h = now

        # Today buffer (every 900s)
        if now - self.last_sample_today >= 900.0:
            self.history_today.append({"timestamp": time_str, "people_count": people_count})
            self.last_sample_today = now

    def add_system_event(self, event_type: str, message: str, camera_id: str, person_id: str = None):
        self.system_events.appendleft({
            "timestamp": time.strftime("%H:%M:%S"),
            "event_type": event_type,
            "message": message,
            "camera_id": camera_id,
            "person_id": person_id
        })

    def get_summary(self, current_people: int) -> Dict[str, Any]:
        avg_people = round(self.sum_people_count / max(1, self.sample_count), 1)
        avg_conf = round(self.confidence_sum / max(1, self.confidence_count), 3) if self.confidence_count > 0 else 0.92
        avg_dur = round(self.duration_sum / max(1, self.duration_count), 1) if self.duration_count > 0 else 18.5

        return {
            "current_people": current_people,
            "total_detections_today": self.total_detections_today,
            "peak_people_count": self.peak_people_count,
            "average_people_count": avg_people,
            "min_people_count": self.min_people_count,
            "max_people_count": self.peak_people_count,
            "average_confidence": avg_conf,
            "average_tracking_duration_seconds": avg_dur,
            "time_series_1m": list(self.history_1m),
            "time_series_5m": list(self.history_5m),
            "time_series_30m": list(self.history_30m),
            "time_series_1h": list(self.history_1h),
            "time_series_today": list(self.history_today),
            "system_events": list(self.system_events),
            "heatmap_points": list(self.heatmap_points)
        }

analytics_manager = AnalyticsManager()
