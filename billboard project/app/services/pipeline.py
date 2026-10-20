import cv2
import time
import threading
from app.services.camera_service import CameraService
from app.services.yolo_service import YoloDetector
from app.services.tracker_service import CentroidTracker
from app.services.session_service import SessionManager
from app.routes.billboard import get_current_active_ad
from app.models.setting import Setting

class VisionPipeline:
    """Master computer vision pipeline orchestrating camera, YOLO detection, tracking, and annotation."""

    def __init__(self, app=None):
        self.app = app
        self.camera_service = CameraService()
        self.detector = YoloDetector()
        self.tracker = CentroidTracker()
        self.session_manager = SessionManager()

        self.is_active = False
        self.pipeline_thread = None
        self.inference_fps = 10
        self.monitoring_zone = {"x1": 0.20, "y1": 0.15, "x2": 0.80, "y2": 0.90}
        self.current_stats = {
            "detected_count": 0,
            "zone_occupancy": 0,
            "fps": 0.0,
            "last_inference_time": 0
        }

    def init_app(self, app):
        """Initialize with Flask application settings."""
        self.app = app
        with app.app_context():
            cam_idx = Setting.get_val("camera_index", app.config.get("CAMERA_INDEX", 0))
            w = Setting.get_val("frame_width", app.config.get("FRAME_WIDTH", 640))
            h = Setting.get_val("frame_height", app.config.get("FRAME_HEIGHT", 480))
            conf = Setting.get_val("confidence_threshold", app.config.get("CONFIDENCE_THRESHOLD", 0.45))
            fps = Setting.get_val("inference_fps", app.config.get("INFERENCE_FPS", 10))
            zone = Setting.get_val("monitoring_zone", app.config.get("DEFAULT_MONITORING_ZONE"))

            self.camera_service.camera_index = int(cam_idx)
            self.camera_service.width = int(w)
            self.camera_service.height = int(h)
            self.detector = YoloDetector(confidence_threshold=float(conf))
            self.inference_fps = int(fps)
            if zone:
                self.monitoring_zone = zone

    def start(self):
        """Start the video capture and inference processing loop."""
        if self.is_active:
            return True

        self.camera_service.start()
        # Load YOLO model
        self.detector.load_model()

        self.is_active = True
        self.pipeline_thread = threading.Thread(target=self._processing_loop, daemon=True)
        self.pipeline_thread.start()
        return True

    def stop(self):
        """Stop processing pipeline and finalize open sessions."""
        self.is_active = False
        if self.pipeline_thread and self.pipeline_thread.is_alive():
            self.pipeline_thread.join(timeout=2.0)
        self.camera_service.stop()

        if self.app:
            with self.app.app_context():
                self.session_manager.finalize_all(reason="app_shutdown")

    def _processing_loop(self):
        """Continuous inference and tracking loop."""
        interval = 1.0 / max(1, self.inference_fps)

        while self.is_active:
            loop_start = time.time()
            raw_frame = self.camera_service.get_latest_frame()

            if raw_frame is not None:
                # 1. Run YOLO person detection
                detections = self.detector.detect_people(raw_frame)

                # 2. Update multi-frame tracking
                h, w = raw_frame.shape[:2]
                active_tracks = self.tracker.update(
                    detections,
                    monitoring_zone=self.monitoring_zone,
                    frame_width=w,
                    frame_height=h
                )

                # 3. Associate with active ad & manage sessions
                current_ad = get_current_active_ad()
                ad_id = current_ad.get("ad_id")

                if self.app:
                    with self.app.app_context():
                        self.session_manager.process_tracks(active_tracks, current_ad_id=ad_id)

                # 4. Generate annotated visualization frame
                annotated = self._draw_annotations(
                    raw_frame,
                    active_tracks,
                    current_ad.get("name", "Welcome Banner"),
                    w, h
                )
                self.camera_service.update_annotated_frame(annotated)

                # Update live metrics
                zone_count = sum(1 for t in active_tracks if t.get("in_zone", False))
                self.current_stats["detected_count"] = len(active_tracks)
                self.current_stats["zone_occupancy"] = zone_count
                self.current_stats["last_inference_time"] = time.time()

            elapsed = time.time() - loop_start
            sleep_time = max(0.01, interval - elapsed)
            time.sleep(sleep_time)

    def _draw_annotations(self, frame, tracks, current_ad_name, width, height):
        """Overlay bounding boxes, tracking labels, monitoring zone, and tech HUD on frame."""
        vis = frame.copy()

        # 1. Draw Central Monitoring Zone (ROI)
        zx1 = int(self.monitoring_zone["x1"] * width)
        zy1 = int(self.monitoring_zone["y1"] * height)
        zx2 = int(self.monitoring_zone["x2"] * width)
        zy2 = int(self.monitoring_zone["y2"] * height)

        # Draw semi-transparent monitoring zone overlay
        overlay = vis.copy()
        cv2.rectangle(overlay, (zx1, zy1), (zx2, zy2), (99, 102, 241), -1)
        cv2.addWeighted(overlay, 0.12, vis, 0.88, 0, vis)

        # Draw monitoring zone border
        cv2.rectangle(vis, (zx1, zy1), (zx2, zy2), (99, 102, 241), 2)
        cv2.putText(vis, "MONITORING ZONE (AUDIENCE ROI)", (zx1 + 10, zy1 + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (165, 180, 252), 1, cv2.LINE_AA)

        # 2. Draw Tracked People
        for track in tracks:
            x1, y1, x2, y2 = track["box"]
            cx, cy = track["centroid"]
            tid = track["tracking_id"]
            in_zone = track.get("in_zone", False)

            color = (16, 185, 129) if in_zone else (245, 158, 11)  # Emerald in zone, Amber outside
            label = f"Viewer #{tid}" if in_zone else f"Person #{tid}"

            # Box & Centroid Crosshair
            cv2.rectangle(vis, (x1, y1), (x2, y2), color, 2)
            cv2.circle(vis, (cx, cy), 4, color, -1)

            # Label banner
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(vis, (x1, max(0, y1 - 20)), (x1 + tw + 10, y1), color, -1)
            cv2.putText(vis, label, (x1 + 5, max(12, y1 - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

        # 3. Top HUD Banner - Pure Dark Obsidian
        hud_bg = vis.copy()
        cv2.rectangle(hud_bg, (10, 10), (width - 10, 60), (10, 10, 10), -1)
        cv2.addWeighted(hud_bg, 0.75, vis, 0.25, 0, vis)
        cv2.rectangle(vis, (10, 10), (width - 10, 60), (255, 255, 255), 1)

        zone_count = sum(1 for t in tracks if t.get("in_zone", False))
        cv2.putText(vis, f"AI: Active | People: {len(tracks)} | Zone Occupancy: {zone_count}",
                    (20, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(vis, f"Active Ad: {current_ad_name[:32]}",
                    (20, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (56, 189, 248), 1, cv2.LINE_AA)

        return vis

    def get_annotated_frame(self):
        """Retrieve latest processed frame for streaming."""
        return self.camera_service.get_annotated_frame()

    def get_status(self):
        """Retrieve real-time telemetry from all vision subsystems."""
        cam_stat = self.camera_service.get_status()
        yolo_stat = self.detector.get_status()
        return {
            "pipeline_active": self.is_active,
            "camera": cam_stat,
            "yolo": yolo_stat,
            "detected_count": self.current_stats["detected_count"],
            "zone_occupancy": self.current_stats["zone_occupancy"],
            "monitoring_zone": self.monitoring_zone
        }

# Global singleton pipeline instance
pipeline_engine = VisionPipeline()
