import pytest
from app.services.tracking.sort_tracker import SortTracker, calculate_iou

def test_calculate_iou():
    boxA = {'x': 100, 'y': 100, 'width': 50, 'height': 100}
    # Identical box: IoU = 1.0
    assert calculate_iou(boxA, boxA) == pytest.approx(1.0)

    # Disjoint box: IoU = 0.0
    boxB = {'x': 300, 'y': 300, 'width': 50, 'height': 100}
    assert calculate_iou(boxA, boxB) == 0.0

    # 50% horizontal overlap
    boxC = {'x': 125, 'y': 100, 'width': 50, 'height': 100}
    iou_c = calculate_iou(boxA, boxC)
    assert 0.30 < iou_c < 0.40

def test_tracker_id_persistence():
    tracker = SortTracker(max_age=5, min_hits=1, iou_threshold=0.3)

    # Frame 1: Detection of person 1
    dets_f1 = [{'bbox': {'x': 100, 'y': 100, 'width': 50, 'height': 100}, 'confidence': 0.95}]
    tracks_f1 = tracker.update(dets_f1)
    assert len(tracks_f1) == 1
    p1_id = tracks_f1[0].track_id
    assert p1_id.startswith("P")

    # Frame 2: Person 1 moves slightly
    dets_f2 = [{'bbox': {'x': 105, 'y': 102, 'width': 50, 'height': 100}, 'confidence': 0.94}]
    tracks_f2 = tracker.update(dets_f2)
    assert len(tracks_f2) == 1
    assert tracks_f2[0].track_id == p1_id # ID is stable!

    # Frame 3: New person appears
    dets_f3 = [
        {'bbox': {'x': 110, 'y': 104, 'width': 50, 'height': 100}, 'confidence': 0.93},
        {'bbox': {'x': 300, 'y': 200, 'width': 60, 'height': 120}, 'confidence': 0.90}
    ]
    tracks_f3 = tracker.update(dets_f3)
    assert len(tracks_f3) == 2
    track_ids = [t.track_id for t in tracks_f3]
    assert p1_id in track_ids
    # Ensure second person gets distinct stable ID
    second_id = [tid for tid in track_ids if tid != p1_id][0]
    assert second_id.startswith("P")
