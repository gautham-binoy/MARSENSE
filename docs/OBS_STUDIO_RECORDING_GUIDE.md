# OBS Studio Recording Guide for MARSENSE

This guide outlines how to use **OBS Studio** (pre-installed on your system at `/usr/bin/obs`) to record a live demonstration video of **MARSENSE** on Arch Linux (Hyprland / Omarchy desktop).

---

## 1. Quick Start with OBS Studio

### Launching OBS Studio
Open your terminal or application launcher:
```bash
obs
```
*(Or press `SUPER + SPACE`, type `obs`, and press `Enter`)*

---

## 2. Setting Up 1080p 60FPS Video

1. Go to **Settings** (`Ctrl + ,` or bottom-right corner).
2. Click **Video** on the left menu:
   - **Base (Canvas) Resolution**: `1920x1080`
   - **Output (Scaled) Resolution**: `1920x1080`
   - **Downscale Filter**: `Bicubic (Sharpened scaling, 16 samples)` or `Lanczos`
   - **Common FPS Values**: `60` (or `30` if preferred)
3. Click **Output** on the left menu:
   - **Output Mode**: `Simple` or `Advanced`
   - **Recording Path**: `/home/titan/Videos` or `/home/titan/Projects/MARSENSE/video`
   - **Recording Quality**: `High Quality, Medium File Size`
   - **Recording Format**: `mp4`
   - **Video Encoder**: `Hardware (VAAPI)` (Intel Iris Xe) or `Software (x264)`

---

## 3. Adding the MARSENSE Window Capture Source

Because you are using **Hyprland (Wayland)**:
1. In the **Sources** dock at the bottom of OBS, click the **`+`** (Add Source) button.
2. Select **Screen Capture (PipeWire)**.
3. Name it `MARSENSE Screen` and click **OK**.
4. A Wayland portal dialog will appear asking you which screen or window to share:
   - Select either your **Full Monitor (`eDP-1`)** or choose the **Brave/Chromium window** running `http://localhost:5173`.
5. Check **Capture Cursor: Yes** so viewers can see your mouse movements and clicks.

---

## 4. Setting Up Your Microphone (For Voiceover)

1. In **Settings -> Audio -> Global Audio Devices**:
   - Set **Mic/Auxiliary Audio** to your microphone (or PipeWire Default).
2. To enhance voice clarity, in the **Audio Mixer** dock:
   - Click the gear/three dots next to your **Mic/Aux** slider -> **Filters**.
   - Click **`+`** and add:
     - **Noise Suppression** (`RNNoise` method for clean background noise removal).
     - **Compressor** (default settings, smooths out sudden volume spikes).

---

## 5. Live Demonstration Workflow

1. Start both servers in your terminal if not already running:
   ```bash
   # Backend:
   cd /home/titan/Projects/MARSENSE/backend && PYTHONPATH=. .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
   
   # Frontend:
   cd /home/titan/Projects/MARSENSE/frontend && npm run dev
   ```
2. Open `http://localhost:5173` in your browser and press `F11` (or Super + F in Hyprland) for **Fullscreen Mode**.
3. Open [`docs/VOICEOVER_SCRIPT.md`](file:///home/titan/Projects/MARSENSE/docs/VOICEOVER_SCRIPT.md) on a second screen, phone, or tablet.
4. In OBS, click **Start Recording** (or press your hotkey, e.g. `Ctrl + F9`).
5. Follow the 10 scenes in the script sequentially:
   - **Scene 01**: Mission Control & Fly to Jezero
   - **Scene 02**: Mars Explorer & Layer Switcher
   - **Scene 03**: Terrain Intelligence & Delta Scarp Transect
   - **Scene 04**: Landing Site Selection & Base Locking
   - **Scene 05**: Planetary Science Targets & Three Forks MSR Depot
   - **Scene 06**: Water Resources & ISRU Chemical Plant
   - **Scene 07**: Atmospheric MEDA & Curiosity RAD Dosimetry
   - **Scene 08**: Route Planner A* Solver & Strategy Comparison
   - **Scene 09**: Astronaut Survival Simulator & Contingency Tests
   - **Scene 10**: Mission Assessment Scorecard, Monte Carlo & PDF Export
6. Click **Stop Recording**. Your video will be saved in `~/Videos` ready for your submission!
