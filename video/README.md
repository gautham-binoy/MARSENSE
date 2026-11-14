# MARSENSE Official Demonstration Video & Pipeline

This directory contains the production-grade video recording and neural narration pipeline for **MARSENSE – The Martian Survival Navigator** (NASA Space Apps Challenge 2026).

## Master Demo Video Deliverables

- **Local Video Master**: `video/MARSENSE_DEMO_VIDEO.mp4`
- **Frontend Public Stream**: `frontend/public/MARSENSE_DEMO_VIDEO.mp4`
- **Direct Browser URL**: [http://localhost:5173/MARSENSE_DEMO_VIDEO.mp4](http://localhost:5173/MARSENSE_DEMO_VIDEO.mp4)
- **Format**: 1920x1080 Full HD (1080p, 30fps), H.264 (yuv420p), AAC 192kbps stereo
- **Duration**: 5 minutes 47 seconds (347.8s)
- **Voiceover**: Microsoft Edge Neural TTS (`en-US-ChristopherNeural` — crisp, authoritative mission-briefing tone)

---

## Complete Feature Breakdown & Timestamps

| Scene | Timestamp | Duration | Feature Demonstrated |
| :---: | :---: | :---: | :--- |
| **Intro** | `00:00 - 00:04` | 4.5s | NASA Space Apps Challenge Title Card & Branding |
| **01** | `00:04 - 00:52` | 47.6s | **Mission Control Overview & Mars Chronometry**: Allison & McEwen algorithm, live Sol/LTST/Ls, perihelion dust storm alert, rover telemetry, feasibility ScoreRing |
| **02** | `00:52 - 01:27` | 35.1s | **Mars Explorer & GIS Layers**: 20m CTX DTM, CRISM phyllosilicates/carbonates/olivine, THEMIS thermal inertia, HRSC, click inspection (Horn slope & Riley TRI), bookmarking |
| **03** | `01:27 - 02:00` | 32.9s | **Terrain Intelligence & Elevation Transects**: Bounding box analysis, traversability index, elevation transect tool, Delta Scarp profile, 15° hazard threshold, CSV export |
| **04** | `02:00 - 02:31` | 31.2s | **Landing Site & Base Selection**: Multi-criteria comparison matrix, factor weights, candidate site selection |
| **05** | `02:31 - 03:05` | 34.3s | **Planetary Science Discovery & Sample Depot**: Curated targets, 4★+ bulk selection, Three Forks MSR sample cache (10 sealed sample tubes) |
| **06** | `03:05 - 03:36` | 30.7s | **Water Resources & ISRU Chemical Plant**: SHARAD/neutron ice reality check, MOXIE O2 & Sabatier propellant synthesizer |
| **07** | `03:36 - 04:06` | 30.0s | **Atmospheric Environment & Radiation Dosimetry**: Perseverance MEDA history, Curiosity RAD dosimetry, cumulative GCR tissue dose |
| **08** | `04:06 - 04:37` | 31.1s | **Terrain-Aware Route Planner**: A* pathfinding, 3-strategy comparison (Safest vs Balanced vs Direct), cross-section elevation, hazard segments, GPX/GeoJSON export |
| **09** | `04:37 - 05:10` | 32.8s | **Astronaut Survival Simulator**: NASA BVAD 2022 5-consumable hourly integration, contingency scenarios, 20% emergency reserve margin |
| **10** | `05:10 - 05:53` | 43.1s | **Mission Feasibility Assessment, Monte Carlo & Vault**: 7-category scorecard, 500-run Monte Carlo risk distribution, SQLite vault flight plans, 1-click PDF mission report |
| **Outro**| `05:53 - 05:58` | 5.0s | Mission Feasibility Verified Outro Card & Operational Sign-off |

---

## Pipeline Architecture & Reproduction

The video is 100% reproducible through automated headless browser interaction, neural speech synthesis, and FFmpeg compositing:

1. **Voiceover Narration Synthesis**:
   ```bash
   python3 video/scripts/generate_audio.py
   ```
   Uses `edge-tts` to synthesize authoritative audio for each of the 10 feature scripts and records precise durations in `video/manifest.json`.

2. **Automated Playwright 1080p Recording**:
   ```bash
   node video/recorder/record_all_scenes.cjs
   ```
   Drives Chromium at 1920x1080 with SwiftShader WebGL acceleration. Systematically navigates through each route, interacts with controls, adjusts sliders, expands data tabs, draws transects, and saves raw clips.

3. **FFmpeg Compositing & Lower-Third Overlays**:
   ```bash
   python3 video/scripts/compose_video.py
   ```
   Renders branded Intro and Outro title cards, draws dynamic lower-third feature pills (`MARSENSE · FEATURE 0X OF 10: <Title>`) with font smoothing, syncs voiceover, and concatenates all scenes into `video/MARSENSE_DEMO_VIDEO.mp4` and `frontend/public/MARSENSE_DEMO_VIDEO.mp4`.
