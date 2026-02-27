#!/usr/bin/env python3
"""Download, transcode, and register an Instagram video for the Videos window.

Usage:
  python3 scripts/fetch_instagram.py "https://www.instagram.com/reel/.../" \
    --title "My Clip" --description "Short note"

Requirements:
  - yt-dlp
  - ffmpeg (and ffprobe)
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_VIDEOS_DIR = ROOT / "public" / "videos"


def ensure_bin(name: str) -> None:
    if shutil.which(name):
        return
    print(f"error: required binary not found in PATH: {name}", file=sys.stderr)
    sys.exit(2)


def run(cmd: list[str]) -> str:
    proc = subprocess.run(cmd, check=True, text=True, capture_output=True)
    return proc.stdout.strip()


def now_stamp() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d-%H%M%S")


def read_manifest(path: pathlib.Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def write_manifest(path: pathlib.Path, entries: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")


def probe_duration(path: pathlib.Path) -> float | None:
    try:
        out = run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ]
        )
        return round(float(out), 3)
    except Exception:
        return None


def read_info_json(path: pathlib.Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download and encode an Instagram URL into public/videos assets"
    )
    parser.add_argument("url", help="Instagram video/reel URL")
    parser.add_argument("--id", dest="video_id", help="Stable id (default: timestamp)")
    parser.add_argument("--title", help="Display title in Videos window")
    parser.add_argument("--description", help="Description text for player window")
    parser.add_argument(
        "--videos-dir",
        default=str(DEFAULT_VIDEOS_DIR),
        help="Videos root directory (default: public/videos)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    ensure_bin("yt-dlp")
    ensure_bin("ffmpeg")
    ensure_bin("ffprobe")

    videos_root = pathlib.Path(args.videos_dir).resolve()
    videos_dir = videos_root
    thumbs_dir = videos_root / "thumbs"
    manifest_path = videos_root / "manifest.json"

    videos_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    video_id = args.video_id or f"video-{now_stamp()}"
    output_video = videos_dir / f"{video_id}.mp4"
    output_thumb = thumbs_dir / f"{video_id}.jpg"

    metadata: dict[str, Any] = {}
    with tempfile.TemporaryDirectory(prefix="igdl-") as tmp:
        tmpdir = pathlib.Path(tmp)
        source_tmpl = tmpdir / "source.%(ext)s"
        info_json = tmpdir / "source.info.json"

        print("Downloading source video...")
        subprocess.run(
            [
                "yt-dlp",
                "--no-playlist",
                "--write-info-json",
                "-o",
                str(source_tmpl),
                args.url,
            ],
            check=True,
        )

        downloaded = sorted(tmpdir.glob("source.*"))
        if not downloaded:
            print("error: yt-dlp did not produce a source file", file=sys.stderr)
            sys.exit(1)
        source = downloaded[0]

        print("Encoding mp4 (H.264/AAC)...")
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(source),
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "23",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-movflags",
                "+faststart",
                str(output_video),
            ],
            check=True,
        )

        print("Generating thumbnail...")
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(output_video),
                "-vf",
                "thumbnail,scale=480:-1",
                "-frames:v",
                "1",
                "-update",
                "1",
                str(output_thumb),
            ],
            check=True,
        )
        metadata = read_info_json(info_json)

    duration = probe_duration(output_video)
    meta_title = metadata.get("title") if isinstance(metadata.get("title"), str) else None
    meta_desc = metadata.get("description") if isinstance(metadata.get("description"), str) else None

    title = args.title or meta_title or video_id
    description = args.description if args.description is not None else (meta_desc or "")
    created_at = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")

    entry = {
        "id": video_id,
        "title": title,
        "description": description,
        "source_url": args.url,
        "video_url": f"/videos/{video_id}.mp4",
        "thumb_url": f"/videos/thumbs/{video_id}.jpg",
        "created_at": created_at,
        "duration": duration,
    }

    manifest = read_manifest(manifest_path)
    manifest = [m for m in manifest if isinstance(m, dict) and m.get("id") != video_id]
    manifest.insert(0, entry)
    write_manifest(manifest_path, manifest)

    print("Done")
    print(f"  id: {video_id}")
    print(f"  video: {output_video}")
    print(f"  thumb: {output_thumb}")
    print(f"  manifest: {manifest_path}")


if __name__ == "__main__":
    main()
