# System Architecture & Technical Specifications

## 1. High-Level Overview
Smart Billboard AI Analytics is an edge computer-vision intelligence system designed to run on a local Windows workstation. It bridges live camera perception, neural person tracking, and advertisement playback with database-backed attribution metrics.

```text
+--------------------+       +----------------------+       +-------------------------+
|   Laptop Webcam    | ----> | OpenCV VideoCapture  | ----> |  Ultralytics YOLOv8n    |
| (cv2.VideoCapture) |       |  (Background Thread) |       |  (Person Class Filter)  |
+--------------------+       +----------------------+       +-------------------------+
                                                                         |
                                                                         v
+--------------------+       +----------------------+       +-------------------------+
| SQLite Persistence | <---- |   Session Lifecycle  | <---- |    Centroid Tracking    |
| (SQLAlchemy ORM)   |       | (Attribution Engine) |       | (Occlusion Proximity)   |
+--------------------+       +----------------------+       +-------------------------+
          |
          v
+--------------------+       +----------------------+
|  REST & MJPEG APIs | ----> | Responsive Web UI    |
|   (Flask Server)   |       |  (Chart.js + Kiosk)  |
+--------------------+       +----------------------+
```

## 2. Core Subsystems

### A. Video Acquisition (`app/services/camera_service.py`)
- Background thread reads frames from configured device index (default: `0`).
- Thread lock prevents frame tearing or buffer latency.
- Automatically generates informative fallback standby frames when webcam is missing or occupied by another application.

### B. Object Detection (`app/services/yolo_service.py`)
- Employs lightweight YOLOv8n model (`yolov8n.pt`) optimized for CPU execution.
- Filters exclusively for COCO class ID `0` (`person`).
- Confidence threshold is dynamically adjustable from `0.10` to `0.95`.

### C. Multi-Frame Tracking (`app/services/tracker_service.py`)
- Matches detected centroids using Euclidean distance across frames.
- Configurable occlusion tolerance (`lost_track_timeout` = 2.5s) retains tracking identity through brief detection loss.
- Zero biometric data, face recognition, or permanent identity storage.

### D. Audience Zone Evaluation & Session Engine (`app/services/session_service.py`)
- Evaluates if bounding box centroids fall inside the normalized monitoring zone ROI.
- On entry: Initializes a `ViewerSession` record in SQLite attributed to currently playing billboard ad.
- On departure: Computes duration `(end_time - start_time)`.
- If duration < `min_session_duration` (default 1.0s), discards noise.
- If duration >= threshold, marks `status="completed"` and records exit reason.
