import cv2
import time
import threading
import numpy as np
from datetime import datetime, timezone
from app.models.utils import utc_now

class CameraService:
    """Manages OpenCV webcam video capture, frame buffering, and lifecycle."""

    def __init__(self, camera_index=0, width=640, height=480, target_fps=15):
        self.camera_index = camera_index
        self.width = width
        self.height = height
        self.target_fps = target_fps

        self.cap = None
        self.is_running = False
        self.is_camera_available = False
        self.current_frame = None
        self.annotated_frame = None
        self.frame_lock = threading.Lock()
        self.capture_thread = None
        self.last_frame_time = 0
        self.actual_fps = 0.0
        self.error_message = None

    def start(self):
        """Start background camera acquisition thread."""
        if self.is_running:
            return True

        self.is_running = True
        self.error_message = None
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()
        return True

    def stop(self):
        """Stop camera acquisition and release device resources."""
        self.is_running = False
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=2.0)
        self._release_camera()

    def _init_camera(self):
        """Attempt to open hardware camera with OpenCV."""
        try:
            # On Windows, cv2.CAP_DSHOW can provide faster startup, but default index works broadly
            self.cap = cv2.VideoCapture(self.camera_index)
            if self.cap and self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                self.is_camera_available = True
                self.error_message = None
                return True
            else:
                self.is_camera_available = False
                self.error_message = f"Camera device at index {self.camera_index} could not be opened."
                return False
        except Exception as e:
            self.is_camera_available = False
            self.error_message = f"Camera initialization exception: {str(e)}"
            return False

    def _release_camera(self):
        """Release VideoCapture handle."""
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.is_camera_available = False

    def _capture_loop(self):
        """Continuous frame acquisition thread."""
        self._init_camera()
        frame_interval = 1.0 / max(1, self.target_fps)
        fps_counter = 0
        fps_timer = time.time()

        while self.is_running:
            start_time = time.time()

            if self.is_camera_available and self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    with self.frame_lock:
                        self.current_frame = frame
                        self.last_frame_time = time.time()
                else:
                    # Device read failed or disconnected
                    self.is_camera_available = False
                    self.error_message = "Camera read failed. Attempting reconnect in 3s..."
                    self._release_camera()
                    time.sleep(3.0)
                    self._init_camera()
            else:
                # Fallback standby frame with timestamp when camera hardware is absent
                standby_frame = self._create_standby_frame()
                with self.frame_lock:
                    self.current_frame = standby_frame
                    self.last_frame_time = time.time()
                time.sleep(frame_interval)

            # Measure FPS
            fps_counter += 1
            if time.time() - fps_timer >= 1.0:
                self.actual_fps = round(fps_counter / (time.time() - fps_timer), 1)
                fps_counter = 0
                fps_timer = time.time()

            elapsed = time.time() - start_time
            sleep_time = max(0.005, frame_interval - elapsed)
            time.sleep(sleep_time)

        self._release_camera()

    def _create_standby_frame(self):
        """Generate an informative standby test frame when webcam hardware is unavailable."""
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        # Gradient background
        frame[:] = (20, 25, 35)

        # Draw tech border
        cv2.rectangle(frame, (20, 20), (self.width - 20, self.height - 20), (99, 102, 241), 2)
        
        # Draw status text
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        cv2.putText(frame, "SMART BILLBOARD - CAMERA STANDBY", (40, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
        
        status_msg = self.error_message or "Webcam searching / Standby mode"
        cv2.putText(frame, f"Status: {status_msg}", (40, 110),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (148, 163, 184), 1)
        cv2.putText(frame, f"Device Index: {self.camera_index} | Res: {self.width}x{self.height}", (40, 140),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (148, 163, 184), 1)
        cv2.putText(frame, f"System Clock: {now_str}", (40, 170),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (56, 189, 248), 1)
        return frame

    def get_latest_frame(self):
        """Thread-safe retrieval of the latest captured frame."""
        with self.frame_lock:
            if self.current_frame is not None:
                return self.current_frame.copy()
            return None

    def update_annotated_frame(self, frame):
        """Thread-safe update of the latest frame containing AI bounding boxes and overlays."""
        with self.frame_lock:
            self.annotated_frame = frame

    def get_annotated_frame(self):
        """Retrieve latest annotated frame or raw frame."""
        with self.frame_lock:
            if self.annotated_frame is not None:
                return self.annotated_frame.copy()
            if self.current_frame is not None:
                return self.current_frame.copy()
            return self._create_standby_frame()

    def get_status(self):
        """Return diagnostic status of camera subsystem."""
        return {
            "is_running": self.is_running,
            "camera_available": self.is_camera_available,
            "camera_index": self.camera_index,
            "width": self.width,
            "height": self.height,
            "actual_fps": self.actual_fps,
            "error_message": self.error_message
        }
