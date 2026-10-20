import os
import cv2
import numpy as np
from pathlib import Path

class YoloDetector:
    """Manages Ultralytics YOLO inference targeting the person class."""

    def __init__(self, model_name="yolov8n.pt", confidence_threshold=0.45):
        self.model_name = model_name
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.is_loaded = False
        self.load_error = None
        self.person_class_id = 0  # COCO class 0 is 'person'

    def load_model(self):
        """Load YOLO model into memory."""
        if self.is_loaded and self.model is not None:
            return True

        try:
            from ultralytics import YOLO
            # Load weights (downloads yolov8n.pt automatically if not present locally)
            self.model = YOLO(self.model_name)
            self.is_loaded = True
            self.load_error = None
            return True
        except Exception as e:
            self.is_loaded = False
            self.load_error = f"YOLO model load error: {str(e)}"
            return False

    def detect_people(self, frame):
        """Run YOLO inference on frame and return detected people bounding boxes."""
        if not self.is_loaded or self.model is None or frame is None:
            return []

        try:
            # Run inference targeting only person class (classes=[0]) on CPU
            results = self.model.predict(
                source=frame,
                classes=[self.person_class_id],
                conf=self.confidence_threshold,
                verbose=False,
                device="cpu"
            )

            detections = []
            if results and len(results) > 0:
                boxes = results[0].boxes
                for box in boxes:
                    conf = float(box.conf[0])
                    coords = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                    x1, y1, x2, y2 = [int(v) for v in coords]
                    cx = int((x1 + x2) / 2)
                    cy = int((y1 + y2) / 2)
                    detections.append({
                        "box": [x1, y1, x2, y2],
                        "confidence": round(conf, 2),
                        "centroid": (cx, cy)
                    })
            return detections
        except Exception as e:
            self.load_error = f"Inference execution error: {str(e)}"
            return []

    def get_status(self):
        """Return status and configuration of YOLO detector."""
        return {
            "is_loaded": self.is_loaded,
            "model_name": self.model_name,
            "confidence_threshold": self.confidence_threshold,
            "load_error": self.load_error
        }
