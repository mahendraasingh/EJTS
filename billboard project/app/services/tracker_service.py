import time
import math

class CentroidTracker:
    """Tracks detected people across frames using centroid proximity and handles temporary occlusion."""

    def __init__(self, lost_track_timeout=2.5, max_distance=120):
        self.next_track_id = 1
        self.tracks = {}  # {track_id: {box, centroid, first_seen, last_seen, in_zone, in_zone_since}}
        self.lost_track_timeout = lost_track_timeout  # Seconds before track is expired
        self.max_distance = max_distance  # Maximum pixel distance to associate detection with track

    def update(self, detections, monitoring_zone=None, frame_width=640, frame_height=480):
        """Update tracks with current frame detections and evaluate monitoring zone inclusion."""
        now = time.time()

        # If no detections in current frame, update timestamps and clean expired
        if len(detections) == 0:
            self._expire_lost_tracks(now)
            return list(self.tracks.values())

        # If currently tracking no one, register all detections as new tracks
        if len(self.tracks) == 0:
            for det in detections:
                self._register_track(det, now, monitoring_zone, frame_width, frame_height)
            return list(self.tracks.values())

        # Match existing tracks with detections based on centroid distance
        track_ids = list(self.tracks.keys())
        track_centroids = [self.tracks[tid]["centroid"] for tid in track_ids]

        det_centroids = [d["centroid"] for d in detections]

        # Calculate pairwise Euclidean distance matrix
        distances = []
        for tc in track_centroids:
            row = []
            for dc in det_centroids:
                dist = math.hypot(tc[0] - dc[0], tc[1] - dc[1])
                row.append(dist)
            distances.append(row)

        used_tracks = set()
        used_detections = set()

        # Greedy distance matching
        matches = []
        for t_idx, row in enumerate(distances):
            for d_idx, dist in enumerate(row):
                if dist <= self.max_distance:
                    matches.append((dist, t_idx, d_idx))
        
        matches.sort(key=lambda x: x[0])

        for dist, t_idx, d_idx in matches:
            if t_idx in used_tracks or d_idx in used_detections:
                continue

            tid = track_ids[t_idx]
            det = detections[d_idx]
            self._update_track(tid, det, now, monitoring_zone, frame_width, frame_height)
            used_tracks.add(t_idx)
            used_detections.add(d_idx)

        # Unmatched detections become new tracks
        for d_idx, det in enumerate(detections):
            if d_idx not in used_detections:
                self._register_track(det, now, monitoring_zone, frame_width, frame_height)

        # Unmatched tracks expire after timeout
        self._expire_lost_tracks(now)

        return list(self.tracks.values())

    def _register_track(self, det, now, monitoring_zone, frame_width, frame_height):
        """Register a new tracked individual."""
        tid = self.next_track_id
        self.next_track_id += 1
        
        cx, cy = det["centroid"]
        in_zone = self._is_in_zone(cx, cy, monitoring_zone, frame_width, frame_height)

        self.tracks[tid] = {
            "tracking_id": tid,
            "box": det["box"],
            "confidence": det.get("confidence", 0.0),
            "centroid": det["centroid"],
            "first_seen": now,
            "last_seen": now,
            "in_zone": in_zone,
            "in_zone_since": now if in_zone else None,
            "zone_exit_time": None
        }

    def _update_track(self, tid, det, now, monitoring_zone, frame_width, frame_height):
        """Update existing track state and zone status."""
        cx, cy = det["centroid"]
        currently_in_zone = self._is_in_zone(cx, cy, monitoring_zone, frame_width, frame_height)
        track = self.tracks[tid]

        # Update zone entry / exit timestamps
        if currently_in_zone and not track["in_zone"]:
            track["in_zone_since"] = now
            track["zone_exit_time"] = None
        elif not currently_in_zone and track["in_zone"]:
            track["zone_exit_time"] = now

        track["box"] = det["box"]
        track["confidence"] = det.get("confidence", track.get("confidence", 0.0))
        track["centroid"] = det["centroid"]
        track["last_seen"] = now
        track["in_zone"] = currently_in_zone

    def _is_in_zone(self, cx, cy, zone, frame_width, frame_height):
        """Check if centroid (cx, cy) falls within normalized monitoring zone."""
        if not zone:
            return True

        zx1 = zone["x1"] * frame_width
        zy1 = zone["y1"] * frame_height
        zx2 = zone["x2"] * frame_width
        zy2 = zone["y2"] * frame_height

        return zx1 <= cx <= zx2 and zy1 <= cy <= zy2

    def _expire_lost_tracks(self, now):
        """Remove tracks that have not been seen for longer than lost_track_timeout."""
        expired = []
        for tid, track in self.tracks.items():
            if now - track["last_seen"] > self.lost_track_timeout:
                expired.append(tid)

        for tid in expired:
            del self.tracks[tid]

    def reset(self):
        """Reset tracking state."""
        self.tracks.clear()
        self.next_track_id = 1
