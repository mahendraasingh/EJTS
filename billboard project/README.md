# Smart Billboard AI Analytics

[![Python Version](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org)
[![Framework](https://img.shields.io/badge/Framework-Flask%203-green.svg)](https://palletsprojects.com/p/flask/)
[![Computer Vision](https://img.shields.io/badge/CV-OpenCV%20%26%20YOLOv8-orange.svg)](https://ultralytics.com)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An intelligent digital billboard system combining real-time computer vision, Ultralytics YOLOv8 person detection, multi-frame audience tracking, and SQLite-backed campaign attribution analytics.

Designed for edge deployment on standard laptops using the built-in webcam and CPU inference.

---

## 🌟 Key Features

1. **Live AI Perception Pipeline**: Real-time webcam frame acquisition via OpenCV, YOLOv8 person detection, and centroid-based multi-frame tracking with temporary IDs.
2. **Audience Monitoring Zone (ROI)**: Isolates actual engaged viewers in front of the screen from background foot traffic.
3. **Dynamic Campaign Attribution**: Automatically attributes viewer arrival, presence episodes, and duration to the advertisement active at that moment.
4. **Interactive Fullscreen Billboard Kiosk (`/billboard`)**: Automatic playlist transitions for image and video advertisements with countdown overlays and keyboard navigation.
5. **Campaign Management Suite (`/advertisements`)**: Upload images and videos, preview media, set display durations, schedule campaign dates, reorder playlist, and soft-delete/archive.
6. **Executive Overview Dashboard (`/dashboard`)**: Real-time KPI telemetry (Zone Occupancy, FOV detections, completed sessions, average presence duration) with Chart.js timeseries.
7. **Live Vision Monitor (`/monitoring`)**: Live MJPEG camera feed with real-time bounding boxes, centroid crosshairs, and interactive ROI zone calibration.
8. **Deep Analytics & CSV Export (`/analytics`)**: Detailed campaign breakdown, duration percentiles, audience share %, and one-click CSV report export.
9. **Calibration & Settings Manager (`/settings`)**: Fine-tune camera device indices, detection confidence, inference FPS, and session timeouts.
10. **Offline College Demo Generator (`scripts/simulate_data.py`)**: Generates realistic demonstration presence data for presentations without requiring people in front of the camera.

---

## 🏗️ Architecture & Processing Flow

```text
+-----------------------+       +------------------------+       +-------------------------+
| Laptop Built-in Webcam| ----> |  OpenCV VideoCapture   | ----> |   Ultralytics YOLOv8    |
| (cv2.VideoCapture)    |       |  (Background Thread)   |       |   (Person Class Filter) |
+-----------------------+       +------------------------+       +-------------------------+
                                                                              |
                                                                              v
+-----------------------+       +------------------------+       +-------------------------+
|  SQLite Persistence   | <---- | Session Attribution    | <---- | Multi-Frame Centroid    |
|  (SQLAlchemy Engine)  |       | Engine (Active Ad Sync)|       | Tracker (Temporary IDs) |
+-----------------------+       +------------------------+       +-------------------------+
           |
           v
+-----------------------+       +------------------------+
| Flask REST & MJPEG    | ----> | Responsive Web UI      |
| Endpoints (Port 5000) |       | (Chart.js + Billboard) |
+-----------------------+       +------------------------+
```

---

## 🚀 Quick Start (Windows)

### Prerequisites
- Windows 10 / 11
- Python 3.11 (Recommended for torch and opencv wheels)
- Built-in laptop webcam or USB webcam

### Option A: One-Click Startup
Double-click `run.bat` in this folder. It automatically creates the virtual environment, verifies dependencies, seeds the database, and launches the server.

### Option B: Manual Terminal Execution
```cmd
# 1. Create and activate Python 3.11 virtual environment
py -3.11 -m venv .venv
call .venv\Scripts\activate.bat

# 2. Install dependencies
pip install -r requirements.txt

# 3. Initialize SQLite database schema and default settings
python scripts\initialize_db.py

# 4. (Optional) Populate demonstration audience data for presentations
python scripts\simulate_data.py

# 5. Launch the application
python app.py
```

Open your browser to:
- **Dashboard**: `http://127.0.0.1:5000`
- **Live AI Monitor**: `http://127.0.0.1:5000/monitoring`
- **Campaign Manager**: `http://127.0.0.1:5000/advertisements`
- **Deep Analytics**: `http://127.0.0.1:5000/analytics`
- **System Settings**: `http://127.0.0.1:5000/settings`

---

## 🧪 Automated Testing

The project includes unit tests for database models, API endpoints, billboard player transitions, centroid tracking, and analytics aggregation:

```cmd
call .venv\Scripts\activate.bat
pytest tests/ -v
```

All 19 tests run in ~2 seconds against an in-memory SQLite database.

---

## 🛡️ Privacy & Academic Disclosures

- **Zero Biometric Identity Storage**: This project strictly avoids facial recognition, face detection, or persistent identity indexing. Tracking IDs (e.g. `#102`) exist solely in RAM across adjacent frames.
- **Estimated Presence Duration**: Metrics reflect physical presence and spatial dwell in front of the screen. In accordance with ethical standards, presence is not claimed as proven cognitive attention.
- **100% Local Inference**: Video frames are processed in-memory on the local CPU; no footage or telemetry is transmitted to external cloud services.
