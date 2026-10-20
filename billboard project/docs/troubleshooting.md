# Troubleshooting & Operational Guide

## 1. Webcam Access & Troubleshooting

### Issue: "Camera read failed / Standby mode displayed"
1. **Camera in use by another application:**
   - Windows only permits one process to access a USB/built-in webcam at a time.
   - Close Zoom, Microsoft Teams, Skype, or the Windows Camera app.
2. **Incorrect Camera Index:**
   - On laptops with external webcams, your built-in webcam may be index `0`, and external may be index `1`.
   - Go to **System Settings** in the dashboard (`/settings`) and change `camera_index` to `1` or `2`.
3. **Windows Camera Privacy Permissions:**
   - Open **Windows Settings -> Privacy & Security -> Camera**.
   - Ensure "Let desktop apps access your camera" is toggled **ON**.

## 2. YOLO Model & Neural Inference

### Issue: "First-time inference is slightly delayed"
- On the very first run, Ultralytics downloads the pre-trained `yolov8n.pt` weights (~6MB) from GitHub. Subsequent startups load directly from local cache in milliseconds.

### Issue: "High CPU usage on older laptops"
- Adjust `inference_fps` in `/settings` to `6` or `8` FPS. This significantly reduces thermal load while retaining sufficient tracking smoothness.

## 3. Billboard Kiosk Display

### Keyboard Controls:
- **Right Arrow / Spacebar**: Advance to next campaign in rotation.
- **Left Arrow**: Return to previous campaign.
- **'F' key**: Toggle full-screen kiosk display mode.
- **'Esc' key**: Exit full-screen.

## 4. Resetting Data

### Factory Reset Settings:
- Go to `/settings` and click **Restore Defaults** or call `POST /api/settings/reset`.

### Re-initializing Database:
```cmd
python scripts\initialize_db.py
```
