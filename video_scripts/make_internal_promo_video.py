#!/usr/bin/env python3
from __future__ import annotations

import math
import os
import shlex
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path("/Users/huangwei/Documents/产品使用指南视频拍摄/story")
OUT_DIR = Path("/Users/huangwei/projects/sextoy-docs/output/internal_promo_build")
FINAL = Path("/Users/huangwei/projects/sextoy-docs/output/dont-let-a-robotic-hand-guess-you_internal-draft-v2-music.mp4")
BACKGROUND_MUSIC = ROOT / "medias" / "The Theory of Everything.mp3"
COMPANION_VOICEOVER = ROOT / "ElevenLabs_script_device not a tool.mp3"

W, H = 1920, 1080
FPS = 25

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_MONO = "/System/Library/Fonts/SFNSMono.ttf"


def run(cmd: list[str]) -> None:
    print("+", " ".join(shlex.quote(c) for c in cmd))
    subprocess.run(cmd, check=True)


def q(path: Path) -> str:
    return str(path)


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        words = para.split(" ")
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            if draw.textbbox((0, 0), candidate, font=font_obj)[2] <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def make_overlay(
    path: Path,
    lines: list[str],
    *,
    y: int = 760,
    align: str = "center",
    title: bool = False,
    kicker: str | None = None,
) -> None:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    main_font = font(FONT_BOLD if title else FONT_REG, 68 if title else 44)
    small_font = font(FONT_MONO, 24)

    if kicker:
        kbox = draw.textbbox((0, 0), kicker, font=small_font)
        kx = (W - (kbox[2] - kbox[0])) // 2 if align == "center" else 126
        draw.text((kx, y - 58), kicker, font=small_font, fill=(104, 232, 226, 235))

    rendered: list[str] = []
    for line in lines:
        rendered.extend(wrap_text(draw, line, main_font, 1460))

    line_h = 58 if not title else 82
    text_w = max(draw.textbbox((0, 0), line, font=main_font)[2] for line in rendered)
    text_h = len(rendered) * line_h
    box_w = min(1600, text_w + 120)
    box_h = text_h + 72
    bx = (W - box_w) // 2 if align == "center" else 92
    by = y - 36

    if not title:
        rounded = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))
        rd = ImageDraw.Draw(rounded)
        rd.rounded_rectangle((0, 0, box_w, box_h), radius=28, fill=(0, 0, 0, 132))
        img.alpha_composite(rounded, (bx, by))

    for i, line in enumerate(rendered):
        bbox = draw.textbbox((0, 0), line, font=main_font)
        tw = bbox[2] - bbox[0]
        tx = (W - tw) // 2 if align == "center" else bx + 60
        ty = by + 36 + i * line_h
        shadow = 3
        draw.text((tx + shadow, ty + shadow), line, font=main_font, fill=(0, 0, 0, 160))
        draw.text((tx, ty), line, font=main_font, fill=(246, 246, 242, 248))

    img.save(path)


def make_black_card(path: Path, text: str, *, subtitle: str | None = None) -> None:
    img = Image.new("RGB", (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    main = font(FONT_BOLD, 64)
    sub = font(FONT_REG, 42)
    lines = wrap_text(draw, text, main, 1320)
    total_h = len(lines) * 82 + (74 if subtitle else 0)
    y = (H - total_h) // 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=main)
        draw.text(((W - (bbox[2] - bbox[0])) // 2, y), line, font=main, fill=(245, 245, 240))
        y += 82
    if subtitle:
        y += 26
        for line in wrap_text(draw, subtitle, sub, 1240):
            bbox = draw.textbbox((0, 0), line, font=sub)
            draw.text(((W - (bbox[2] - bbox[0])) // 2, y), line, font=sub, fill=(160, 238, 232))
            y += 58
    img.save(path)


def reset_frame_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    for frame in path.glob("frame_*.png"):
        frame.unlink()


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def ease(value: float) -> float:
    value = clamp(value)
    return value * value * (3 - 2 * value)


def draw_centered_text(
    img: Image.Image,
    text: str,
    font_obj: ImageFont.FreeTypeFont,
    *,
    y: int,
    max_width: int,
    line_h: int,
    fill: tuple[int, int, int],
    alpha: int = 255,
) -> int:
    if alpha <= 0:
        return y
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    lines = wrap_text(draw, text, font_obj, max_width)
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_obj)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2 + 3, y + 3), line, font=font_obj, fill=(0, 0, 0, int(alpha * 0.5)))
        draw.text(((W - tw) // 2, y), line, font=font_obj, fill=(*fill, alpha))
        y += line_h
    img.alpha_composite(layer)
    return y


def make_animated_black_video(out: Path, duration: float, render_frame) -> None:
    frames = OUT_DIR / "animated_frames" / out.stem
    reset_frame_dir(frames)
    total = int(duration * FPS)
    for i in range(total):
        t = i / FPS
        img = render_frame(t, i, total).convert("RGB")
        img.save(frames / f"frame_{i:04d}.png")
    run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", str(FPS), "-i", q(frames / "frame_%04d.png"),
        "-f", "lavfi", "-t", str(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-vf", "format=yuv420p",
        "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k", "-shortest", q(out),
    ])


def make_motion_transition_video(out: Path, duration: float) -> None:
    main = font(FONT_BOLD, 64)
    sub = font(FONT_REG, 40)
    mono = font(FONT_MONO, 24)

    def render(t: float, _i: int, _total: int) -> Image.Image:
        img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
        kicker_alpha = int(210 * ease((t - 0.15) / 0.8))
        title_alpha = int(255 * ease((t - 0.45) / 1.1))
        sub_alpha = int(230 * ease((t - 1.55) / 1.2))
        draw_centered_text(img, "MOTION INTELLIGENCE", mono, y=305, max_width=1200, line_h=34, fill=(104, 232, 226), alpha=kicker_alpha)
        draw_centered_text(img, "From human technique to motion intelligence.", main, y=392, max_width=1320, line_h=78, fill=(245, 245, 240), alpha=title_alpha)
        draw_centered_text(
            img,
            "We start with real expert technique, then translate touch into rhythm, pressure, and variation.",
            sub,
            y=595,
            max_width=1260,
            line_h=56,
            fill=(160, 238, 232),
            alpha=sub_alpha,
        )
        return img

    make_animated_black_video(out, duration, render)


def make_companion_transition_video(out: Path, duration: float) -> None:
    small = font(FONT_MONO, 24)
    lead = font(FONT_REG, 42)
    phrase = font(FONT_BOLD, 74)
    phrase_small = font(FONT_BOLD, 58)

    def render(t: float, _i: int, _total: int) -> Image.Image:
        img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
        fx = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(fx)
        pulse = 0.5 + 0.5 * math.sin(t * 1.4)
        draw.rectangle((0, H - 5, int(W * clamp(t / duration)), H), fill=(104, 232, 226, 150))
        draw.ellipse((W // 2 - 420, 185, W // 2 + 420, 995), fill=(30, 70, 75, int(18 + 12 * pulse)))
        img.alpha_composite(fx)

        draw_centered_text(img, "AI COMPANION", small, y=250, max_width=900, line_h=34, fill=(104, 232, 226), alpha=int(190 * ease((t - 0.2) / 1.0)))
        draw_centered_text(img, "A better device is", lead, y=334, max_width=1100, line_h=58, fill=(205, 212, 214), alpha=int(225 * ease((t - 0.75) / 1.1)))
        draw_centered_text(img, "not just a tool.", phrase, y=430, max_width=1200, line_h=88, fill=(245, 245, 240), alpha=int(255 * ease((t - 1.65) / 1.0)))
        draw_centered_text(img, "It becomes a presence", phrase_small, y=565, max_width=1260, line_h=72, fill=(245, 245, 240), alpha=int(245 * ease((t - 5.1) / 1.2)))
        draw_centered_text(
            img,
            "that understands preference, fantasy, and mood.",
            lead,
            y=680,
            max_width=1040,
            line_h=56,
            fill=(160, 238, 232),
            alpha=int(235 * ease((t - 9.3) / 1.2)),
        )
        return img

    make_animated_black_video(out, duration, render)


def make_sync_transition_video(out: Path, duration: float) -> None:
    main = font(FONT_BOLD, 62)
    flash = font(FONT_BOLD, 86)
    sub = font(FONT_REG, 40)

    def render(t: float, _i: int, _total: int) -> Image.Image:
        img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
        draw = ImageDraw.Draw(img)
        if t < 0.6:
            draw_centered_text(img, "SCREEN", flash, y=470, max_width=1200, line_h=98, fill=(245, 245, 240), alpha=255)
        elif 0.85 <= t < 1.45:
            draw_centered_text(img, "BODY", flash, y=470, max_width=1200, line_h=98, fill=(245, 245, 240), alpha=255)
        elif 1.7 <= t < 2.4:
            draw_centered_text(img, "OUT OF SYNC", flash, y=470, max_width=1300, line_h=98, fill=(104, 232, 226), alpha=255)
        else:
            if t > 2.55:
                fx = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                fx_draw = ImageDraw.Draw(fx)
                for y in range(170, 930, 76):
                    if 310 <= y <= 760:
                        continue
                    fx_draw.line((260, y, 1660, y), fill=(104, 232, 226, 26), width=1)
                img.alpha_composite(fx)
                title_alpha = int(255 * ease((t - 2.6) / 0.8))
                sub_alpha = int(230 * ease((t - 3.45) / 0.8))
                draw_centered_text(img, "Immersion breaks when screen and body move separately.", main, y=360, max_width=1320, line_h=76, fill=(245, 245, 240), alpha=title_alpha)
                draw_centered_text(
                    img,
                    "So we synchronize content, motion, and context into one continuous experience.",
                    sub,
                    y=615,
                    max_width=1280,
                    line_h=56,
                    fill=(160, 238, 232),
                    alpha=sub_alpha,
                )
        return img

    make_animated_black_video(out, duration, render)


def make_side_caption(path: Path, kicker: str, headline: str, body: str | None = None) -> None:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    mono = font(FONT_MONO, 24)
    head = font(FONT_BOLD, 50)
    body_font = font(FONT_REG, 34)

    x, y = 1390, 205
    draw.text((x, y), kicker.upper(), font=mono, fill=(104, 232, 226, 235))
    y += 58

    for line in wrap_text(draw, headline, head, 420):
        draw.text((x, y), line, font=head, fill=(246, 246, 242, 248))
        y += 64

    if body:
        y += 28
        for line in wrap_text(draw, body, body_font, 420):
            draw.text((x, y), line, font=body_font, fill=(206, 212, 214, 230))
            y += 48

    img.save(path)


def make_typewriter_frames(out: Path, duration: float) -> None:
    out.mkdir(parents=True, exist_ok=True)
    lines = [
        "Not just a smart stroker.",
        "An intimate experience system that understands rhythm, preference, and companionship.",
        "For body. For mind. For you.",
    ]
    full = "\n".join(lines)
    total = int(duration * FPS)
    start_delay = int(0.8 * FPS)
    type_frames = int(10.6 * FPS)
    chars = len(full)
    main = font(FONT_BOLD, 58)
    accent = font(FONT_MONO, 34)
    for i in range(total):
        progress = max(0, min(chars, math.floor((i - start_delay) / max(1, type_frames) * chars)))
        visible = full[:progress]
        img = Image.new("RGB", (W, H), (0, 0, 0))
        draw = ImageDraw.Draw(img)
        y = 330
        for idx, line in enumerate(visible.split("\n")):
            f = accent if idx == 2 else main
            color = (110, 236, 230) if idx == 2 else (245, 245, 240)
            wrapped = wrap_text(draw, line, f, 1350) if line else [""]
            for wline in wrapped:
                bbox = draw.textbbox((0, 0), wline, font=f)
                draw.text(((W - (bbox[2] - bbox[0])) // 2, y), wline, font=f, fill=color)
                y += 72 if idx < 2 else 52
            if line.endswith("."):
                y += 14
        if i % 18 < 9 and progress < chars:
            draw.rectangle((W // 2 - 6, y + 6, W // 2 + 6, y + 64), fill=(110, 236, 230))
        img.save(out / f"frame_{i:04d}.png")


def make_opening_image_clip(img_path: Path, overlay: Path | None, out: Path, duration: float, zoom: str) -> None:
    frame_count = int(duration * FPS)
    filters = (
        f"scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H},"
        f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frame_count}:s={W}x{H}:fps={FPS},"
        "eq=contrast=1.14:saturation=0.78,"
        "format=yuv420p"
    )
    if overlay:
        run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-loop", "1", "-t", str(duration), "-i", q(img_path),
            "-loop", "1", "-t", str(duration), "-i", q(overlay),
            "-f", "lavfi", "-t", str(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
            "-filter_complex", f"[0:v]{filters}[base];[base][1:v]overlay=0:0:format=auto,format=yuv420p[v]",
            "-map", "[v]", "-map", "2:a",
            "-r", str(FPS), "-frames:v", str(frame_count),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-c:a", "aac", "-b:a", "128k", "-shortest", q(out),
        ])
    else:
        run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-loop", "1", "-t", str(duration), "-i", q(img_path),
            "-f", "lavfi", "-t", str(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
            "-filter_complex", f"[0:v]{filters}[v]",
            "-map", "[v]", "-map", "1:a",
            "-r", str(FPS), "-frames:v", str(frame_count),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-c:a", "aac", "-b:a", "128k", "-shortest", q(out),
        ])


def normalize_clip(src: Path, out: Path, *, start: float, duration: float, overlays: list[tuple[Path, float, float]] | None = None, use_source_audio: bool = False) -> None:
    base = (
        f"scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H},setsar=1,format=rgba"
    )
    inputs = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(start), "-t", str(duration), "-i", q(src)]
    fc = [f"[0:v]{base}[v0]"]
    last = "v0"
    if overlays:
        for idx, (ov, t0, t1) in enumerate(overlays, start=1):
            inputs.extend(["-loop", "1", "-t", str(duration), "-i", q(ov)])
            out_label = f"v{idx}"
            fc.append(f"[{last}][{idx}:v]overlay=0:0:enable='between(t,{t0},{t1})':format=auto[{out_label}]")
            last = out_label
    fc.append(f"[{last}]format=yuv420p[v]")
    silent_audio_index = None
    if not use_source_audio:
        silent_audio_index = 1 + (len(overlays) if overlays else 0)
        inputs.extend(["-f", "lavfi", "-t", str(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"])
    run(inputs + [
        "-filter_complex", ";".join(fc),
        "-map", "[v]",
        *(
            ["-map", "0:a?", "-af", "aresample=48000,aformat=channel_layouts=stereo"]
            if use_source_audio
            else ["-map", f"{silent_audio_index}:a"]
        ),
        "-r", str(FPS),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k", "-shortest", q(out),
    ])


def framed_clip(
    src: Path,
    out: Path,
    *,
    start: float,
    duration: float,
    caption: Path,
    use_source_audio: bool = False,
    frame_x: int = 80,
    frame_y: int = 130,
    frame_w: int = 1240,
    frame_h: int = 820,
    fade_embed: bool = False,
    loop_src: bool = False,
) -> None:
    inputs = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
    ]
    if loop_src:
        inputs.extend(["-stream_loop", "-1"])
    inputs.extend([
        "-ss", str(start), "-t", str(duration), "-i", q(src),
        "-loop", "1", "-t", str(duration), "-i", q(caption),
    ])
    if not use_source_audio:
        inputs.extend(["-f", "lavfi", "-t", str(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"])

    fg_filter = f"[0:v]scale={frame_w}:{frame_h}:force_original_aspect_ratio=decrease,setsar=1"
    if fade_embed:
        fade_out_start = max(0, duration - 0.6)
        fg_filter += f",format=rgba,fade=t=in:st=0:d=0.6:alpha=1,fade=t=out:st={fade_out_start:.3f}:d=0.6:alpha=1"
    fg_filter += "[fg];"
    fc = (
        f"color=c=0x07090d:s={W}x{H}:d={duration}[bg];"
        f"{fg_filter}"
        f"[bg][fg]overlay=x='{frame_x}+({frame_w}-w)/2':y='{frame_y}+({frame_h}-h)/2'[base];"
        "[base][1:v]overlay=0:0:format=auto,format=yuv420p[v]"
    )
    run(inputs + [
        "-filter_complex", fc,
        "-map", "[v]",
        *(
            ["-map", "0:a?", "-af", "aresample=48000,aformat=channel_layouts=stereo"]
            if use_source_audio
            else ["-map", "2:a"]
        ),
        "-r", str(FPS),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k", "-shortest", q(out),
    ])


def framed_image_clip(src: Path, out: Path, *, duration: float, caption: Path) -> None:
    run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-loop", "1", "-t", str(duration), "-i", q(src),
        "-loop", "1", "-t", str(duration), "-i", q(caption),
        "-f", "lavfi", "-t", str(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-filter_complex",
        f"color=c=0x07090d:s={W}x{H}:d={duration}[bg];"
        "[0:v]scale=1240:820:force_original_aspect_ratio=decrease,setsar=1[fg];"
        "[bg][fg]overlay=x='80+(1240-w)/2':y='130+(820-h)/2'[base];"
        "[base][1:v]overlay=0:0:format=auto,format=yuv420p[v]",
        "-map", "[v]", "-map", "2:a",
        "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k", "-shortest", q(out),
    ])


def make_black_video(card: Path, out: Path, duration: float) -> None:
    run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-loop", "1", "-t", str(duration), "-i", q(card),
        "-f", "lavfi", "-t", str(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-vf", "format=yuv420p",
        "-map", "0:v", "-map", "1:a",
        "-r", str(FPS),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k", "-shortest", q(out),
    ])


def make_audio(path: Path, duration: float) -> None:
    # Copyright-clean placeholder: intro machine pulses + restrained electronic bed.
    expr = (
        "0.020*sin(2*PI*55*t)"
        "+0.012*sin(2*PI*82.41*t)"
        "+0.010*sin(2*PI*110*t)"
        "+0.020*sin(2*PI*(220+12*sin(2*PI*0.07*t))*t)*(0.35+0.65*gt(t,20))"
        "+0.040*sin(2*PI*70*t)*exp(-mod(t,1.0)*7)*gt(t,20)"
        "+0.028*sin(2*PI*48*t)*exp(-mod(t,0.5)*10)*gt(t,75)"
        "+0.055*sin(2*PI*(180+70*sin(2*PI*3*t))*t)*lt(t,12)*lt(mod(t,1.6),0.18)"
        "+0.025*sin(2*PI*880*t)*lt(t,12)*lt(mod(t,0.43),0.04)"
    )
    run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "lavfi", "-i", f"aevalsrc='{expr}':s=48000:d={duration}",
        "-af", "volume=0.85,lowpass=f=9000,highpass=f=35,afade=t=in:st=0:d=1.5,afade=t=out:st=117:d=3",
        "-c:a", "aac", "-b:a", "192k", q(path),
    ])


def concat_videos(clips: list[Path], out: Path) -> None:
    list_file = OUT_DIR / "concat.txt"
    list_file.write_text("".join(f"file '{clip}'\n" for clip in clips), encoding="utf-8")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", q(list_file), "-c", "copy", q(out)])


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            q(path),
        ],
        check=True,
        text=True,
        capture_output=True,
    )
    return float(result.stdout.strip())


def mix_background_music(
    timeline: Path,
    music: Path,
    out: Path,
    *,
    voiceover: Path | None = None,
    voiceover_start: float | None = None,
    source_audio_boost_start: float | None = None,
) -> None:
    duration = probe_duration(timeline)
    fade_out_start = max(0, duration - 3.2)
    source_volume = (
        f"volume='if(gte(t,{source_audio_boost_start:.3f}),0.20,0.12)':eval=frame"
        if source_audio_boost_start is not None
        else "volume=0.12"
    )
    inputs = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        q(timeline),
        "-stream_loop",
        "-1",
        "-i",
        q(music),
    ]

    if voiceover and voiceover_start is not None:
        delay_ms = max(0, round(voiceover_start * 1000))
        voice_end = voiceover_start + 15.0
        inputs.extend(["-i", q(voiceover)])
        filter_complex = (
            f"[0:a]aresample=48000,aformat=channel_layouts=stereo,{source_volume}[src];"
            f"[1:a]aresample=48000,aformat=channel_layouts=stereo,"
            f"volume='if(between(t,{voiceover_start:.3f},{voice_end:.3f}),0.30,0.86)':eval=frame,"
            "afade=t=in:st=0:d=1.4,"
            f"afade=t=out:st={fade_out_start:.3f}:d=3.2[music];"
            f"[2:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:15,"
            f"adelay={delay_ms}|{delay_ms},volume=1.35[vo];"
            "[music][src][vo]amix=inputs=3:duration=first:dropout_transition=0:normalize=0,"
            "alimiter=limit=0.95[a]"
        )
    else:
        filter_complex = (
            f"[0:a]aresample=48000,aformat=channel_layouts=stereo,{source_volume}[src];"
            f"[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.86,"
            "afade=t=in:st=0:d=1.4,"
            f"afade=t=out:st={fade_out_start:.3f}:d=3.2[music];"
            "[music][src]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,"
            "alimiter=limit=0.95[a]"
        )

    run(inputs + [
        "-filter_complex",
        filter_complex,
        "-map",
        "0:v",
        "-map",
        "[a]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        q(out),
    ])


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "overlays").mkdir(exist_ok=True)
    (OUT_DIR / "clips").mkdir(exist_ok=True)

    ov = OUT_DIR / "overlays"
    clips_dir = OUT_DIR / "clips"

    opening_caption = ov / "opening_caption.png"
    make_overlay(opening_caption, ["When a tech nerd tried to solve loneliness with mechanics."], y=800)

    title_card = ov / "title_card.png"
    make_black_card(
        title_card,
        "DON'T LET A ROBOTIC HAND GUESS YOU",
        subtitle="When a tech nerd tried to solve loneliness with mechanics.",
    )

    black_card = ov / "black_turn.png"
    make_black_card(
        black_card,
        "The problem was never just motion.",
        subtitle="It was whether technology could understand you.",
    )
    missing_card = ov / "something_missing.png"
    make_black_card(
        missing_card,
        "Something was missing.",
    )

    # Opening images: selected 1, 3, 4, 7, 8 as requested.
    bb = ROOT / "bigbangbang"
    selected = [
        bb / "1.png",
        bb / "3.png",
        bb / "4.png",
        bb / "7.png",
        bb / "8.png",
    ]
    opening_clips: list[Path] = []
    title_clip = clips_dir / "title_card.mp4"
    make_black_video(title_card, title_clip, 4.0)
    opening_durations = [1.55, 1.75, 2.15, 2.55, 3.0]
    for i, img in enumerate(selected):
        out = clips_dir / f"opening_{i}.mp4"
        overlay = opening_caption
        zoom = "min(zoom+0.0016,1.08)" if i % 2 == 0 else "max(1.08-0.0014*on,1.0)"
        make_opening_image_clip(img, overlay, out, opening_durations[i], zoom)
        opening_clips.append(out)

    # Black turn
    missing_clip = clips_dir / "something_missing.mp4"
    make_black_video(missing_card, missing_clip, 2.6)
    black_clip = clips_dir / "black_turn.mp4"
    make_black_video(black_card, black_clip, 6.5)

    # Motion intelligence transition, still image, and clips.
    mi = ROOT / "medias" / "motion intelligence"
    motion_transition = clips_dir / "motion_transition.mp4"
    make_motion_transition_video(motion_transition, 5.0)

    ov_m1 = ov / "motion_1.png"
    ov_m2 = ov / "motion_2.png"
    ov_m3 = ov / "motion_3.png"
    ov_m4 = ov / "motion_4.png"
    ov_techniques = ov / "techniques_caption.png"
    make_side_caption(
        ov_techniques,
        "Motion Intelligence",
        "We begin with real expert technique.",
        "Human touch becomes a structured library of motion patterns.",
    )
    make_side_caption(ov_m1, "Motion Intelligence", "Learning from human technique.", "The system studies real motion, not generic vibration.")
    make_side_caption(ov_m2, "Motion Intelligence", "Gesture becomes data.", "Rhythm, pressure, variation, and phase become reusable motion signatures.")
    make_side_caption(ov_m3, "Motion Intelligence", "AI choreographs the session.", "Signatures are blended into an adaptive experience timeline.")
    make_side_caption(ov_m4, "AI Motion Engine", "The experience is composed, not repeated.", "AI turns learned motion into a session with build, variation, and release.")
    techniques_clip = clips_dir / "techniques.png.mp4"
    framed_image_clip(mi / "Techniques.png", techniques_clip, duration=6.0, caption=ov_techniques)
    motion1 = clips_dir / "motion_signatures.mp4"
    framed_clip(
        mi / "motion signatures.mov",
        motion1,
        start=0,
        duration=22,
        caption=ov_m2,
        fade_embed=True,
    )
    motion2 = clips_dir / "ai_choreography.mp4"
    framed_clip(
        mi / "AI Choreography.mov",
        motion2,
        start=0,
        duration=6.5,
        caption=ov_m4,
        fade_embed=True,
        loop_src=True,
    )

    # AI companion transition and clips.
    ac = ROOT / "medias" / "AI Companions"
    companion_transition = clips_dir / "companion_transition.mp4"
    make_companion_transition_video(companion_transition, 15.0)

    ov_c1 = ov / "companion_1.png"
    ov_c2 = ov / "companion_2.png"
    ov_c3 = ov / "companion_3.png"
    ov_c4 = ov / "companion_4.png"
    make_side_caption(ov_c1, "AI Companion", "Choose a presence, not just a profile.", "The companion sets the emotional frame before the session begins.")
    make_side_caption(ov_c2, "AI Companion", "Personality becomes part of the experience.", "A look, a voice, and a style of interaction create continuity.")
    make_side_caption(ov_c3, "AI Companion", "Realistic or anime. Gentle or bold.", "Different fantasies can become different modes of companionship.")
    make_side_caption(ov_c4, "AI Companion", "The system adapts around your preference.", "Companionship turns the product from a tool into a personal ritual.")
    comp1 = clips_dir / "comp_prepare_6_9.mp4"
    comp2 = clips_dir / "comp_prepare_40_47.mp4"
    comp3 = clips_dir / "comp_anime.mp4"
    comp4 = clips_dir / "comp_real.mp4"
    framed_clip(ac / "prepare companion.mov", comp1, start=5, duration=4, caption=ov_c1)
    framed_clip(ac / "prepare companion.mov", comp2, start=40, duration=7, caption=ov_c2)
    framed_clip(ac / "2026-06-12 11-20-07_device_pip_browser_masked.mov", comp3, start=10, duration=10, caption=ov_c3)
    framed_clip(ac / "2026-06-12 11-20-55_device_pip_browser_masked.mov", comp4, start=25, duration=10, caption=ov_c4)

    # Video sync transition and clips. These keep their source audio.
    vs = ROOT / "medias" / "Video sync"
    sync_transition = clips_dir / "sync_transition.mp4"
    make_sync_transition_video(sync_transition, 6.0)

    ov_s1 = ov / "sync_1.png"
    ov_s2 = ov / "sync_2.png"
    ov_s3 = ov / "sync_3.png"
    make_side_caption(ov_s1, "Video Sync", "Local video becomes motion feedback.", "The timeline is converted into synchronized physical response.")
    make_side_caption(ov_s2, "Video Sync", "Online content follows the same motion pipeline.", "Streaming experiences can become interactive, not passive.")
    make_side_caption(ov_s3, "VR Immersion", "In VR, watching becomes embodied presence.", "The body receives the scene instead of only observing it.")
    sync1 = clips_dir / "sync_local.mp4"
    sync2 = clips_dir / "sync_online.mp4"
    sync3 = clips_dir / "sync_vr.mp4"
    framed_clip(
        vs / "Local sync_device_pip.mov",
        sync1,
        start=18,
        duration=10,
        caption=ov_s1,
        use_source_audio=True,
        frame_x=50,
        frame_y=80,
        frame_w=1300,
        frame_h=920,
    )
    framed_clip(
        vs / "Online sync_device_pip.mov",
        sync2,
        start=25,
        duration=10,
        caption=ov_s2,
        use_source_audio=True,
        frame_x=50,
        frame_y=80,
        frame_w=1300,
        frame_h=920,
    )
    framed_clip(
        vs / "VR_immersive_experience_model.mp4",
        sync3,
        start=26,
        duration=10,
        caption=ov_s3,
        use_source_audio=True,
        frame_x=50,
        frame_y=80,
        frame_w=1300,
        frame_h=920,
    )

    # Final typewriter card.
    frames = OUT_DIR / "typewriter_frames"
    make_typewriter_frames(frames, 15)
    final_card = clips_dir / "final_typewriter.mp4"
    run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", str(FPS), "-i", q(frames / "frame_%04d.png"),
        "-f", "lavfi", "-t", "15", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-vf", "format=yuv420p",
        "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k", "-shortest", q(final_card),
    ])

    all_clips = [
        title_clip,
        *opening_clips,
        missing_clip,
        black_clip,
        motion_transition,
        techniques_clip,
        motion1,
        motion2,
        companion_transition,
        comp1,
        comp2,
        comp3,
        comp4,
        sync_transition,
        sync1,
        sync2,
        sync3,
        final_card,
    ]
    timeline = OUT_DIR / "timeline_with_source_audio.mp4"
    voiceover_start = sum(probe_duration(clip) for clip in all_clips[:all_clips.index(companion_transition)])
    sync_audio_start = sum(probe_duration(clip) for clip in all_clips[:all_clips.index(sync1)])
    concat_videos(all_clips, timeline)
    mix_background_music(
        timeline,
        BACKGROUND_MUSIC,
        FINAL,
        voiceover=COMPANION_VOICEOVER,
        voiceover_start=voiceover_start,
        source_audio_boost_start=sync_audio_start,
    )
    print(f"\nDone: {FINAL}")


if __name__ == "__main__":
    main()
