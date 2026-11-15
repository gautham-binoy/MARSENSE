#!/usr/bin/env python3
"""
Composes the Fast 720p 60FPS Demonstration Video for MARSENSE.
Processes the recorded clip, adds 720p 60fps branded title cards,
and encodes to a crisp 60 FPS MP4 file.
"""

import glob
import os
import shutil
import subprocess
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CLIPS_DIR = os.path.join(BASE_DIR, "fast_720p_clips")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed_fast_720p")
TARGET_720P = os.path.join(BASE_DIR, "MARSENSE_DEMO_720P_60FPS.mp4")
PUBLIC_720P = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "../../frontend/public/MARSENSE_DEMO_720P_60FPS.mp4",
    )
)
TARGET_DEFAULT = os.path.join(BASE_DIR, "MARSENSE_DEMO_VIDEO.mp4")
PUBLIC_DEFAULT = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "../../frontend/public/MARSENSE_DEMO_VIDEO.mp4",
    )
)

os.makedirs(PROCESSED_DIR, exist_ok=True)


def run(cmd):
  print("Running:", " ".join(cmd) if isinstance(cmd, list) else cmd)
  return subprocess.run(cmd, shell=isinstance(cmd, str), check=True)


def get_latest_clip():
  files = glob.glob(os.path.join(CLIPS_DIR, "*.webm"))
  if not files:
    raise FileNotFoundError(f"No webm files found in {CLIPS_DIR}")
  files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
  return files[0]


def main():
  print("=== Composing Fast 720p 60FPS MARSENSE Demo Video ===")
  clip_path = get_latest_clip()
  print(
      f"Found recorded clip: {clip_path} ({os.path.getsize(clip_path) / (1024*1024):.2f} MB)"
  )

  font = "/usr/share/fonts/liberation/LiberationSans-Bold.ttf"
  intro_card = os.path.join(PROCESSED_DIR, "00_intro_card.mp4")
  outro_card = os.path.join(PROCESSED_DIR, "99_outro_card.mp4")
  main_processed = os.path.join(PROCESSED_DIR, "main_recording.mp4")

  # 1. Intro Card (2.5 seconds, 720p @ 60fps)
  print("\n--- Generating 720p 60fps Intro Card ---")
  intro_vf = (
      "scale=1280:720,fps=60,"
      f"drawtext=text='NASA SPACE APPS CHALLENGE 2026':fontcolor=#38bdf8:fontsize=18:x=(w-text_w)/2:y=250:font='{font}',"
      f"drawtext=text='M A R S E N S E':fontcolor=#ea580c:fontsize=52:x=(w-text_w)/2:y=290:font='{font}',"
      f"drawtext=text='The Martian Survival Navigator':fontcolor=#ffffff:fontsize=22:x=(w-text_w)/2:y=365:font='{font}',"
      f"drawtext=text='Fast Platform Demonstration · 720p 60 FPS':fontcolor=#94a3b8:fontsize=16:x=(w-text_w)/2:y=410:font='{font}'"
  )
  cmd_intro = [
      "ffmpeg",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=#07090e:s=1280x720:d=2.5",
      "-vf",
      intro_vf,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "60",
      "-an",
      intro_card,
  ]
  run(cmd_intro)

  # 2. Process Main Recording at strict 60fps 720p
  print("\n--- Processing Main Recording at 720p 60fps ---")
  cmd_main = [
      "ffmpeg",
      "-y",
      "-i",
      clip_path,
      "-vf",
      "scale=1280:720,fps=60",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "60",
      "-an",
      main_processed,
  ]
  run(cmd_main)

  # 3. Outro Card (2.5 seconds, 720p @ 60fps)
  print("\n--- Generating 720p 60fps Outro Card ---")
  outro_vf = (
      "scale=1280:720,fps=60,"
      f"drawtext=text='MARSENSE · EXPLORE JEZERO SAFELY':fontcolor=#38bdf8:fontsize=18:x=(w-text_w)/2:y=250:font='{font}',"
      f"drawtext=text='MISSION FEASIBILITY VERIFIED':fontcolor=#ea580c:fontsize=48:x=(w-text_w)/2:y=290:font='{font}',"
      f"drawtext=text='Autonomous Navigation · Planetary Science · ECLSS Life Support':fontcolor=#ffffff:fontsize=20:x=(w-text_w)/2:y=365:font='{font}'"
  )
  cmd_outro = [
      "ffmpeg",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=#07090e:s=1280x720:d=2.5",
      "-vf",
      outro_vf,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "60",
      "-an",
      outro_card,
  ]
  run(cmd_outro)

  # 4. Concatenate Intro + Main + Outro
  print("\n--- Concatenating into Master 720p 60fps Video ---")
  concat_list = os.path.join(PROCESSED_DIR, "concat_list.txt")
  with open(concat_list, "w") as f:
    f.write(f"file '{intro_card}'\n")
    f.write(f"file '{main_processed}'\n")
    f.write(f"file '{outro_card}'\n")

  cmd_concat = [
      "ffmpeg",
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concat_list,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      TARGET_720P,
  ]
  run(cmd_concat)

  # Copy to public and default paths
  shutil.copyfile(TARGET_720P, PUBLIC_720P)
  shutil.copyfile(TARGET_720P, TARGET_DEFAULT)
  shutil.copyfile(TARGET_720P, PUBLIC_DEFAULT)

  print(f"\n Master 720p 60FPS Video Created: {TARGET_720P}")
  print(f" Copied to public download path: {PUBLIC_720P}")
  print(f" Updated default app demo video: {PUBLIC_DEFAULT}")

  # Verify with ffprobe
  res = subprocess.run(
      [
          "ffprobe",
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=width,height,r_frame_rate,duration",
          "-of",
          "json",
          TARGET_720P,
      ],
      capture_output=True,
      text=True,
      check=True,
  )
  print("\n=== Video Stream Verification ===")
  print(res.stdout)
  print(f"File Size: {os.path.getsize(TARGET_720P) / (1024*1024):.2f} MB")


if __name__ == "__main__":
  main()
