# Smart Billboard AI Analytics

An intelligent digital billboard system combining computer vision, real-time person detection, and viewer session analytics with full advertisement campaign management.

## 🎯 Project Overview
Smart Billboard AI Analytics uses a standard webcam and lightweight YOLOv8 models to monitor audience engagement in front of a digital display. It provides real-time audience presence estimation, tracks engagement duration per advertisement, and aggregates high-fidelity attribution metrics into an interactive dashboard.

## 🏗️ Architecture
- **Backend**: Python 3.11, Flask, SQLAlchemy, SQLite
- **Computer Vision**: OpenCV, Ultralytics YOLOv8, Centroid/IoU Person Tracking
- **Frontend**: Responsive HTML5, Vanilla CSS3, JavaScript, Chart.js
- **Attribution & Analytics**: Time-based session attribution, presence duration tracking, exportable reporting

## 📁 Project Structure
```text
billboard project/
├── app/
│   ├── models/           # SQLAlchemy database schemas
│   ├── routes/           # REST endpoints & web pages
│   ├── services/         # CV capture, YOLO inference, session tracking
│   ├── static/           # CSS stylesheets, JavaScript modules, assets
│   └── templates/        # HTML templates (Dashboard, Billboard, Ads, Monitoring, etc.)
├── instance/             # Local SQLite database storage
├── media/advertisements/ # Local advertisement media files
├── scripts/              # Database initialization & helper utilities
├── tests/                # Automated pytest unit & integration tests
├── docs/                 # Architectural & metric documentation
├── app.py                # Main application entry point
├── config.py             # Configuration classes
├── requirements.txt      # Python dependencies
├── run.bat               # Windows quick-start script
└── .env.example          # Environment variables template
```

## 🚀 Quick Start (Windows)
1. Initialize virtual environment:
   ```cmd
   py -3.11 -m venv .venv
   .venv\Scripts\activate
   ```
2. Install dependencies:
   ```cmd
   pip install -r requirements.txt
   ```
3. Initialize the database:
   ```cmd
   python scripts/initialize_db.py
   ```
4. Run the application:
   ```cmd
   python app.py
   ```
   Open `http://127.0.0.1:5000` in your web browser.
