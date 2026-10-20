import cv2
import time
import threading
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

class CameraService:
    """Manages video acquisition from either hardware webcam or cached video file simulation."""

    def __init__(self, camera_index=0, width=640, height=480, target_fps=15):
        self.camera_index = camera_index
        self.width = width
        self.height = height
        self.target_fps = target_fps

        # Source mode: 'webcam' or 'video_file'
        self.source_mode = "webcam"
        self.video_path = None
        self.video_filename = None
        self.video_finished = False
        self.loop_video = False

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
        self._need_reconnect = False

    def set_source(self, mode, video_path=None, filename=None):
        """Switch video input between physical webcam and a cached video file."""
        with self.frame_lock:
            self.source_mode = mode
            self.video_finished = False
            if mode == "video_file" and video_path:
                self.video_path = str(video_path)
                self.video_filename = filename or Path(video_path).name
            elif mode == "webcam":
                self.video_path = None
                self.video_filename = None
            self._need_reconnect = True

    def replay_video(self):
        """Rewind cached video file to frame 0 and restart 1-time playback."""
        with self.frame_lock:
            if self.cap and self.source_mode == "video_file":
                try:
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    self.video_finished = False
                    return True
                except Exception:
                    pass
        return False

    def get_source_info(self):
        """Return active video feed configuration."""
        return {
            "source_mode": self.source_mode,
            "video_path": self.video_path,
            "video_filename": self.video_filename,
            "camera_index": self.camera_index,
            "video_finished": self.video_finished,
            "loop_video": self.loop_video
        }

    def start(self):
        """Start background video acquisition thread."""
        if self.is_running:
            return True

        self.is_running = True
        self.error_message = None
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()
        return True

    def stop(self):
        """Stop video acquisition and release device resources."""
        self.is_running = False
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=2.0)
        self._release_camera()

    def _init_camera(self):
        """Attempt to open hardware camera or cached video file."""
        self._release_camera()
        try:
            if self.source_mode == "video_file" and self.video_path and Path(self.video_path).exists():
                self.cap = cv2.VideoCapture(self.video_path)
                if self.cap and self.cap.isOpened():
                    self.is_camera_available = True
                    self.error_message = None
                    return True
                else:
                    self.is_camera_available = False
                    self.error_message = f"Unable to open cached video file: {self.video_filename}"
                    return False
            else:
                import os
                # On Windows, try DirectShow first for fast, instant hardware webcam initialization
                if os.name == "nt":
                    self.cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
                    if not self.cap or not self.cap.isOpened():
                        self.cap = cv2.VideoCapture(self.camera_index)
                else:
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
            self.error_message = f"Video capture initialization error: {str(e)}"
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
        """Continuous frame acquisition thread with auto-looping for cached video."""
        self._init_camera()
        frame_interval = 1.0 / max(1, self.target_fps)
        fps_counter = 0
        fps_timer = time.time()

        while self.is_running:
            start_time = time.time()

            # Handle dynamic source change requests
            if self._need_reconnect:
                self._need_reconnect = False
                self._init_camera()

            if self.is_camera_available and self.cap and self.cap.isOpened():
                if self.source_mode == "video_file" and self.video_finished:
                    # Video reached end of 1-time playback: hold frame and idle
                    time.sleep(frame_interval)
                    continue

                ret, frame = self.cap.read()

                # If reading a video file and reaching the end:
                if (not ret or frame is None) and self.source_mode == "video_file":
                    if self.loop_video:
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = self.cap.read()
                    else:
                        self.video_finished = True
                        time.sleep(frame_interval)
                        continue

                if ret and frame is not None:
                    # Resize if frame does not match target resolution
                    if frame.shape[1] != self.width or frame.shape[0] != self.height:
                        frame = cv2.resize(frame, (self.width, self.height))

                    with self.frame_lock:
                        self.current_frame = frame
                        self.last_frame_time = time.time()
                else:
                    # In webcam mode, handle disconnect
                    if self.source_mode == "webcam":
                        self.is_camera_available = False
                        self.error_message = "Webcam disconnect detected. Reconnecting in 3s..."
                        self._release_camera()
                        time.sleep(3.0)
                        self._init_camera()
            else:
                # Standby test frame
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
        """Generate an informative, dynamically animated standby frame with active scanline and HUD."""
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        frame[:] = (10, 12, 16)

        # Dynamic animated scanline and radar sweep
        t = time.time()
        scan_y = int((t * 140) % max(1, self.height - 40)) + 20
        cv2.line(frame, (20, scan_y), (self.width - 20, scan_y), (60, 180, 255), 1)

        # Subtle pulsing center radar circle
        cx, cy = self.width // 2, self.height // 2 + 30
        pulse_r = int(35 + 20 * abs(np.sin(t * 2.5)))
        cv2.circle(frame, (cx, cy), pulse_r, (40, 60, 90), 1)
        cv2.circle(frame, (cx, cy), 6, (56, 189, 248), -1)

        # Border
        cv2.rectangle(frame, (20, 20), (self.width - 20, self.height - 20), (99, 102, 241), 1)

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")[:-4] + " UTC"
        mode_str = "HARDWARE WEBCAM" if self.source_mode == "webcam" else f"CACHED VIDEO ({self.video_filename or 'None'})"

        cv2.putText(frame, "LIVE AI VISION MONITOR [ACTIVE]", (30, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.58, (255, 255, 255), 2)

        cv2.putText(frame, f"Source: {mode_str}", (30, 85),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (56, 189, 248), 1)

        if self.source_mode == "video_file" and self.video_finished:
            status_msg = "Video 1-time run finished. Click 'Rewatch' to replay."
            status_color = (250, 204, 21)
        else:
            status_msg = self.error_message or "Scanning for human subjects in FOV..."
            status_color = (148, 163, 184)

        cv2.putText(frame, f"Status: {status_msg}", (30, 115),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.44, status_color, 1)

        cv2.putText(frame, f"FPS: {self.actual_fps:.1f} | Clock: {now_str}", (30, 145),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (148, 163, 184), 1)
        return frame

    def get_latest_frame(self):
        with self.frame_lock:
            if self.current_frame is not None:
                return self.current_frame.copy()
            return None

    def update_annotated_frame(self, frame):
        with self.frame_lock:
            self.annotated_frame = frame

    def get_annotated_frame(self):
        with self.frame_lock:
            if self.annotated_frame is not None:
                return self.annotated_frame.copy()
            if self.current_frame is not None:
                return self.current_frame.copy()
            return self._create_standby_frame()

    def get_status(self):
        return {
            "is_running": self.is_running,
            "camera_available": self.is_camera_available,
            "source_mode": self.source_mode,
            "video_filename": self.video_filename,
            "camera_index": self.camera_index,
            "width": self.width,
            "height": self.height,
            "actual_fps": self.actual_fps,
            "error_message": self.error_message,
            "video_finished": self.video_finished,
            "loop_video": self.loop_video
        }
