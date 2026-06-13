# Internal Promo Video Asset Manifest

Working title: **Don't Let a Robotic Hand Guess You**

This project keeps source media outside Git. To reproduce the current internal cut, place the following asset folder on the local machine and run `video_scripts/make_internal_promo_video.py`.

## Asset Root

```text
/Users/huangwei/Documents/产品使用指南视频拍摄/story
```

The current script reads this path as `ROOT`.

## Required Assets

### Opening Montage

```text
bigbangbang/1.png
bigbangbang/3.png
bigbangbang/4.png
bigbangbang/7.png
bigbangbang/8.png
```

### Audio

```text
ElevenLabs_script_device not a tool.mp3
medias/The Theory of Everything.mp3
```

### Motion Intelligence

```text
medias/motion intelligence/Techniques.png
medias/motion intelligence/motion signatures.mov
medias/motion intelligence/AI Choreography.mov
```

### AI Companion

```text
medias/AI Companions/prepare companion.mov
medias/AI Companions/2026-06-12 11-20-07_device_pip_browser_masked.mov
medias/AI Companions/2026-06-12 11-20-55_device_pip_browser_masked.mov
```

### Video Sync

```text
medias/Video sync/Local sync_device_pip.mov
medias/Video sync/Online sync_device_pip.mov
medias/Video sync/VR_immersive_experience_model.mp4
```

## Not Required For This Cut

These files exist in the source folder but are not used by the current script:

```text
bigbangbang/2.png
bigbangbang/5.png
bigbangbang/6.png
bigbangbang/9.png
medias/Video sync/VR_immersive_experience_dancing.mp4
story/out/
.DS_Store
```

## Generated Outputs

Generated video files and intermediate build artifacts are intentionally excluded from Git:

```text
output/*.mp4
output/internal_promo_build/
```
