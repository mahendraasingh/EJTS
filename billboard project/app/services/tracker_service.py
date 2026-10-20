import time
import math
from datetime import datetime

class CentroidTracker:
    """Tracks detected people across frames using centroid proximity, computes velocity/behavior, and maintains live event logs."""

    def __init__(self, lost_track_timeout=2.5, max_distance=120):
        self.next_track_id = 1
        self.tracks = {}  # {track_id: {box, centroid, first_seen, last_seen, in_zone, in_zone_since, ...}}
        self.lost_track_timeout = lost_track_timeout
        self.max_distance = max_distance
        self.activity_log = []  # Ring buffer of recent live events
        self.max_log_size = 40

    def _log_event(self, person_id, event_type, message, badge="info"):
        """Append a timestamped live reading event to the activity ring buffer."""
        time_str = datetime.now().strftime("%H:%M:%S")
        entry = {
            "timestamp": time.time(),
            "time_str": time_str,
            "person_id": person_id,
            "event_type": event_type,
            "message": message,
            "badge": badge
        }
        self.activity_log.append(entry)
        if len(self.activity_log) > self.max_log_size:
            self.activity_log.pop(0)

    def update(self, detections, monitoring_zone=None, frame_width=640, frame_height=480):
        """Update tracks with current frame detections, compute live behaviors, and update activity log."""
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
        """Register a new tracked individual and determine initial behavior state."""
        tid = self.next_track_id
        self.next_track_id += 1
        
        cx, cy = det["centroid"]
        in_zone = self._is_in_zone(cx, cy, monitoring_zone, frame_width, frame_height)

        x1, y1, x2, y2 = det["box"]
        box_h = y2 - y1
        box_area = (x2 - x1) * box_h
        area_ratio = box_area / max(1, frame_width * frame_height)

        proximity = self._compute_proximity(box_h, area_ratio, frame_height)
        action = "Approaching Billboard" if in_zone else "Entered Camera FOV"
        engagement = 50 if in_zone else 20

        self.tracks[tid] = {
            "tracking_id": tid,
            "box": det["box"],
            "confidence": det.get("confidence", 0.0),
            "centroid": det["centroid"],
            "centroid_history": [(now, cx, cy)],
            "speed_px_per_sec": 0.0,
            "proximity": proximity,
            "action": action,
            "engagement_score": engagement,
            "first_seen": now,
            "last_seen": now,
            "in_zone": in_zone,
            "in_zone_since": now if in_zone else None,
            "zone_exit_time": None,
            "logged_milestones": set()
        }

        # Log new detection
        self._log_event(tid, "detected", f"Person #{tid} detected in camera feed ({proximity}).", badge="info")
        if in_zone:
            self._log_event(tid, "zone_entry", f"Viewer #{tid} positioned inside Audience ROI Zone.", badge="success")

    def _update_track(self, tid, det, now, monitoring_zone, frame_width, frame_height):
        """Update existing track state, velocity, proximity, behavioral action, and zone status."""
        cx, cy = det["centroid"]
        currently_in_zone = self._is_in_zone(cx, cy, monitoring_zone, frame_width, frame_height)
        track = self.tracks[tid]

        # Calculate instantaneous velocity from centroid history
        history = track.setdefault("centroid_history", [])
        speed = 0.0
        dx = 0
        dy = 0
        if len(history) > 0:
            last_t, last_cx, last_cy = history[-1]
            dt = max(0.02, now - last_t)
            dx = cx - last_cx
            dy = cy - last_cy
            speed = round(math.hypot(dx, dy) / dt, 1)

        history.append((now, cx, cy))
        if len(history) > 10:
            history.pop(0)

        # Proximity estimation
        x1, y1, x2, y2 = det["box"]
        box_h = y2 - y1
        box_area = (x2 - x1) * box_h
        area_ratio = box_area / max(1, frame_width * frame_height)
        proximity = self._compute_proximity(box_h, area_ratio, frame_height)

        # Zone status transitions
        if currently_in_zone and not track["in_zone"]:
            track["in_zone_since"] = now
            track["zone_exit_time"] = None
            self._log_event(tid, "zone_entry", f"Viewer #{tid} stepped into Audience ROI Zone.", badge="success")
        elif not currently_in_zone and track["in_zone"]:
            track["zone_exit_time"] = now
            self._log_event(tid, "zone_exit", f"Viewer #{tid} departed Audience ROI Zone.", badge="warning")

        # Behavioral Action Classification
        dwell = (now - track["in_zone_since"]) if (currently_in_zone and track.get("in_zone_since")) else 0.0
        total_seen = now - track["first_seen"]

        if currently_in_zone:
            if dwell >= 6.0 and speed < 35:
                action = "High Attention (Actively Dwelling)"
                engagement = min(98, int(70 + (dwell - 6.0) * 3))
                if 6 not in track["logged_milestones"]:
                    track["logged_milestones"].add(6)
                    self._log_event(tid, "milestone", f"Viewer #{tid} recorded 6s high-attention dwell!", badge="primary")
            elif dwell >= 2.0 and speed < 50:
                action = "Engaged Viewer (Looking at Billboard)"
                engagement = min(88, int(50 + dwell * 6))
                if 2 not in track["logged_milestones"]:
                    track["logged_milestones"].add(2)
                    self._log_event(tid, "milestone", f"Viewer #{tid} actively viewing billboard.", badge="success")
            elif dy > 14:
                action = "Approaching Billboard (Entering)"
                engagement = 60
            else:
                action = "Audience Zone Glancing"
                engagement = 42
        else:
            if speed > 40:
                dir_label = "Moving Right" if dx > 0 else "Moving Left"
                action = f"Passerby ({dir_label})"
                engagement = max(10, int(30 - min(20, speed * 0.1)))
            elif dy > 12:
                action = "Approaching Camera FOV"
                engagement = 35
            else:
                action = "Stationary Outside Zone"
                engagement = 22

        track["box"] = det["box"]
        track["confidence"] = det.get("confidence", track.get("confidence", 0.0))
        track["centroid"] = det["centroid"]
        track["last_seen"] = now
        track["in_zone"] = currently_in_zone
        track["speed_px_per_sec"] = speed
        track["proximity"] = proximity
        track["action"] = action
        track["engagement_score"] = engagement
        track["dwell_seconds"] = round(dwell, 1)
        track["total_seconds"] = round(total_seen, 1)

    def _compute_proximity(self, box_h, area_ratio, frame_height):
        """Estimate user proximity to camera."""
        if box_h > frame_height * 0.60 or area_ratio > 0.16:
            return "Close (< 2m)"
        elif box_h > frame_height * 0.30 or area_ratio > 0.06:
            return "Mid Range (2-4m)"
        else:
            return "Far Range (> 4m)"

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
            self._log_event(tid, "exit", f"Person #{tid} exited camera view.", badge="secondary")
            del self.tracks[tid]

    def get_live_telemetry(self, now=None):
        """Extract structured live telemetry of all individuals currently in camera view."""
        if now is None:
            now = time.time()

        persons = []
        dwells = []
        engagements = []
        actions = []

        for tid, t in sorted(self.tracks.items()):
            in_zone = t.get("in_zone", False)
            dwell = (now - t["in_zone_since"]) if (in_zone and t.get("in_zone_since")) else 0.0
            total = now - t["first_seen"]

            eng = t.get("engagement_score", 30)
            act = t.get("action", "Detected in FOV")
            
            dwells.append(dwell)
            engagements.append(eng)
            actions.append(act)

            persons.append({
                "tracking_id": tid,
                "in_zone": in_zone,
                "dwell_seconds": round(dwell, 1),
                "total_seconds": round(total, 1),
                "action": act,
                "engagement_score": eng,
                "proximity": t.get("proximity", "Mid Range"),
                "speed_px_per_sec": t.get("speed_px_per_sec", 0.0),
                "confidence": round(float(t.get("confidence", 0.0)), 2),
                "box": t.get("box", [0, 0, 0, 0])
            })

        avg_dwell = round(sum(dwells) / len(dwells), 1) if dwells else 0.0
        avg_eng = int(sum(engagements) / len(engagements)) if engagements else 0
        
        # Determine dominant action
        dominant = "Awaiting Individuals in Camera"
        if actions:
            dominant = max(set(actions), key=actions.count)

        return {
            "active_persons": persons,
            "activity_log": list(reversed(self.activity_log[-25:])),  # Most recent first
            "metrics": {
                "detected_count": len(persons),
                "zone_occupancy": sum(1 for p in persons if p["in_zone"]),
                "avg_dwell_sec": avg_dwell,
                "avg_engagement_pct": avg_eng,
                "dominant_action": dominant
            }
        }

    def reset(self):
        """Reset tracking state."""
        self.tracks.clear()
        self.activity_log.clear()
        self.next_track_id = 1
