import json
import os
import subprocess
import sys
import shutil

MANIFEST_PATH = "video/manifest.json"
OUTPUT_DIR = "video/processed"
FINAL_VIDEO = "video/MARSENSE_DEMO_VIDEO.mp4"
PUBLIC_VIDEO = "frontend/public/MARSENSE_DEMO_VIDEO.mp4"

FONT_PATH = "/usr/share/fonts/liberation/LiberationSans-Bold.ttf"
if not os.path.exists(FONT_PATH):
    FONT_PATH = "/usr/share/fonts/noto/NotoSans-Bold.ttf"
if not os.path.exists(FONT_PATH):
    FONT_PATH = "Liberation Sans"

def run_cmd(cmd):
    print("Running:", " ".join(cmd))
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("ERROR:", res.stderr)
        raise RuntimeError(f"Command failed: {res.stderr}")
    return res.stdout

def create_title_card(output_path, title, subtitle, tag, duration=5.0):
    # Generates a polished 1080p intro/outro title card with ffmpeg
    filters = (
        f"color=c=#07090e:s=1920x1080:d={duration}[bg];"
        f"[bg]drawtext=text='{tag}':fontcolor=#38bdf8:fontsize=22:x=(w-text_w)/2:y=380:font='{FONT_PATH}',"
        f"drawtext=text='{title}':fontcolor=#ea580c:fontsize=68:x=(w-text_w)/2:y=440:font='{FONT_PATH}',"
        f"drawtext=text='{subtitle}':fontcolor=#ffffff:fontsize=28:x=(w-text_w)/2:y=540:font='{FONT_PATH}'"
    )
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", filters,
        "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo",
        "-t", str(duration),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "192k",
        output_path
    ]
    run_cmd(cmd)

def process_scene(scene, idx, total):
    scene_id = scene["id"]
    title = scene["title"]
    raw_video = f"video/clips/{scene_id}/raw.webm"
    audio_path = scene["audio_path"]
    out_video = f"{OUTPUT_DIR}/{scene_id}.mp4"

    if not os.path.exists(raw_video):
        raise FileNotFoundError(f"Missing raw video: {raw_video}")
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Missing audio file: {audio_path}")

    # Build lower-third overlay filter
    # Lower third banner appears at bottom-left between t=0.5s and t=6.5s
    vf = (
        f"scale=1920:1080,fps=30,"
        f"drawbox=x=60:y=860:w=720:h=120:color=black@0.75:t=fill:enable='between(t,0.5,6.5)',"
        f"drawbox=x=60:y=860:w=6:h=120:color=#06b6d4:t=fill:enable='between(t,0.5,6.5)',"
        f"drawtext=text='MARSENSE  ·  FEATURE {idx+1:02d} OF {total:02d}':fontcolor=#38bdf8:fontsize=16:x=85:y=885:font='{FONT_PATH}':enable='between(t,0.5,6.5)',"
        f"drawtext=text='{title}':fontcolor=#ffffff:fontsize=28:x=85:y=920:font='{FONT_PATH}':enable='between(t,0.5,6.5)'"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", raw_video,
        "-i", audio_path,
        "-vf", vf,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "19",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        out_video
    ]
    run_cmd(cmd)
    print(f"Processed scene {idx+1}/{total}: {out_video}")
    return out_video

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)

    # 1. Create Intro Card
    intro_card = f"{OUTPUT_DIR}/00_intro_card.mp4"
    print("\n--- Generating Intro Title Card ---")
    create_title_card(
        intro_card,
        title="M A R S E N S E",
        subtitle="The Martian Survival Navigator",
        tag="NASA SPACE APPS CHALLENGE 2026",
        duration=4.5
    )

    # 2. Process all scenes
    processed_files = [intro_card]
    total_scenes = len(manifest)
    for i, scene in enumerate(manifest):
        print(f"\n--- Processing Scene {i+1}/{total_scenes}: {scene['title']} ---")
        out_clip = process_scene(scene, i, total_scenes)
        processed_files.append(out_clip)

    # 3. Create Outro Card
    outro_card = f"{OUTPUT_DIR}/99_outro_card.mp4"
    print("\n--- Generating Outro Title Card ---")
    create_title_card(
        outro_card,
        title="MISSION FEASIBILITY VERIFIED",
        subtitle="Autonomous Systems · Planetary Science · ECLSS Life Support",
        tag="MARSENSE  ·  EXPLORE JEZERO SAFELY",
        duration=5.0
    )
    processed_files.append(outro_card)

    # 4. Concatenate all files
    concat_list_path = f"{OUTPUT_DIR}/concat_list.txt"
    with open(concat_list_path, "w") as f:
        for p in processed_files:
            abs_p = os.path.abspath(p)
            f.write(f"file '{abs_p}'\n")

    print("\n--- Concatenating all scenes into master demo video ---")
    concat_cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list_path,
        "-c", "copy",
        FINAL_VIDEO
    ]
    run_cmd(concat_cmd)
    print(f"\n Master Demo Video Created: {FINAL_VIDEO}")

    # Copy to frontend public directory
    shutil.copy2(FINAL_VIDEO, PUBLIC_VIDEO)
    print(f" Copied to public download path: {PUBLIC_VIDEO}")

    # Print final video info with ffprobe
    probe_cmd = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration,size,bit_rate", "-of", "json", FINAL_VIDEO
    ]
    info = json.loads(run_cmd(probe_cmd))
    duration_sec = float(info["format"]["duration"])
    size_mb = int(info["format"]["size"]) / (1024 * 1024)
    print(f"\n=== MARSENSE MASTER DEMO VIDEO SUMMARY ===")
    print(f"File: {FINAL_VIDEO}")
    print(f"Duration: {int(duration_sec // 60)}m {int(duration_sec % 60)}s ({duration_sec:.1f}s)")
    print(f"Size: {size_mb:.2f} MB")
    print(f"Resolution: 1920x1080 Full HD (30fps)")
    print(f"Audio: AAC Stereo 192kbps (Neural Voiceover)")
    print(f"Public URL: http://localhost:5173/MARSENSE_DEMO_VIDEO.mp4")

if __name__ == "__main__":
    main()
