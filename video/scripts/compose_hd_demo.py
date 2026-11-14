#!/usr/bin/env python3
"""
Composes the High-Definition Master Video for MARSENSE.
Processes the continuous 1080p Playwright recording, adds branded intro & outro title cards,
and encodes to a high-bitrate, crisp, silent MP4 demo video.
"""

import glob
import os
import subprocess
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CLIPS_DIR = os.path.join(BASE_DIR, "hd_clips")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed_hd")
MASTER_OUT = os.path.join(BASE_DIR, "MARSENSE_DEMO_VIDEO.mp4")
PUBLIC_OUT = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__), "../../frontend/public/MARSENSE_DEMO_VIDEO.mp4"
    )
)

os.makedirs(PROCESSED_DIR, exist_ok=True)


def run(cmd):
  print("Running:", " ".join(cmd) if isinstance(cmd, list) else cmd)
  res = subprocess.run(cmd, shell=isinstance(cmd, str), check=True)
  return res


def get_latest_clip():
  files = glob.glob(os.path.join(CLIPS_DIR, "*.webm"))
  if not files:
    raise FileNotFoundError(f"No webm files found in {CLIPS_DIR}")
  files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
  return files[0]


def main():
  print("=== Composing HD MARSENSE Demonstration Video ===")
  clip_path = get_latest_clip()
  print(
      f"Found recorded clip: {clip_path} ({os.path.getsize(clip_path) / (1024*1024):.2f} MB)"
  )

  font = "/usr/share/fonts/liberation/LiberationSans-Bold.ttf"
  intro_card = os.path.join(PROCESSED_DIR, "00_intro_card.mp4")
  outro_card = os.path.join(PROCESSED_DIR, "99_outro_card.mp4")
  main_processed = os.path.join(PROCESSED_DIR, "main_recording.mp4")

  # 1. Generate Intro Title Card (4 seconds)
  print("\n--- Generating Branded Intro Title Card ---")
  intro_vf = (
      "scale=1920:1080,"
      f"drawtext=text='NASA SPACE APPS CHALLENGE 2026':fontcolor=#38bdf8:fontsize=24:x=(w-text_w)/2:y=380:font='{font}',"
      f"drawtext=text='M A R S E N S E':fontcolor=#ea580c:fontsize=72:x=(w-text_w)/2:y=440:font='{font}',"
      f"drawtext=text='The Martian Survival Navigator':fontcolor=#ffffff:fontsize=30:x=(w-text_w)/2:y=540:font='{font}',"
      f"drawtext=text='Complete Platform Demonstration':fontcolor=#94a3b8:fontsize=20:x=(w-text_w)/2:y=600:font='{font}'"
  )
  cmd_intro = [
      "ffmpeg",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=#07090e:s=1920x1080:d=4.0",
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
      "30",
      "-an",
      intro_card,
  ]
  run(cmd_intro)

  # 2. Process Main Recording (CRF 18 high quality, 1080p 30fps)
  print("\n--- Processing Main Recording Clip ---")
  cmd_main = [
      "ffmpeg",
      "-y",
      "-i",
      clip_path,
      "-vf",
      "scale=1920:1080,fps=30",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-an",
      main_processed,
  ]
  run(cmd_main)

  # 3. Generate Outro Title Card (4 seconds)
  print("\n--- Generating Outro Title Card ---")
  outro_vf = (
      "scale=1920:1080,"
      f"drawtext=text='MARSENSE · EXPLORE JEZERO SAFELY':fontcolor=#38bdf8:fontsize=24:x=(w-text_w)/2:y=380:font='{font}',"
      f"drawtext=text='MISSION FEASIBILITY VERIFIED':fontcolor=#ea580c:fontsize=64:x=(w-text_w)/2:y=440:font='{font}',"
      f"drawtext=text='Autonomous Navigation · Planetary Science · ECLSS Life Support':fontcolor=#ffffff:fontsize=26:x=(w-text_w)/2:y=540:font='{font}'"
  )
  cmd_outro = [
      "ffmpeg",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=#07090e:s=1920x1080:d=4.0",
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
      "30",
      "-an",
      outro_card,
  ]
  run(cmd_outro)

  # 4. Concatenate Intro + Main + Outro
  print("\n--- Concatenating into Master Video ---")
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
      MASTER_OUT,
  ]
  run(cmd_concat)

  # Copy to public frontend folder
  import shutil

  shutil.copyfile(MASTER_OUT, PUBLIC_OUT)
  print(f" Master Demo Video Created: {MASTER_OUT}")
  print(f" Copied to public download path: {PUBLIC_OUT}")

  # Check final duration and size
  probe = run(
      f"ffprobe -v error -show_entries format=duration,size,bit_rate -of json {MASTER_OUT}"
  )
  print(f"\nFinal Video Size: {os.path.getsize(MASTER_OUT) / (1024*1024):.2f} MB")


if __name__ == "__main__":
  main()
