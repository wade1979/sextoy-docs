const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SOURCE_ROOT = '/Users/huangwei/Library/CloudStorage/SynologyDrive-workspace/工作/AI成人用品/研发/用户端应用/docs/手法引擎/学习与编排';
const VIDEO_ROOT = path.join(SOURCE_ROOT, '手法视频');
const ANALYSIS_ROOT = path.join(SOURCE_ROOT, '分析数据');
const OUT_ROOT = path.join(process.cwd(), 'static/demos/motion-signature');
const ASSET_ROOT = path.join(OUT_ROOT, 'assets');
const PYTHON = '/Users/huangwei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const MOTION_SERIES_EXPORTER = path.join(process.cwd(), 'scripts/export-motion-series.py');

const techniques = [
  {
    id: 'mountain-flow',
    sourceName: '高山流水',
    name: 'Mountain Flow',
    video: 'highmountain720p_runway.mp4',
    motion: 'Gentle caresses that build into a flowing repeated rhythm',
    signature: 'Gradual caress + flowing progression'
  },
  {
    id: 'willow-pull',
    sourceName: '倒拔杨柳',
    name: 'Willow Pull',
    video: 'daobayangliu720p_runway.mp4',
    motion: 'Encircling finger motion with a compact upward pulling cadence',
    signature: 'Encircling pull + rapid lift cadence'
  },
  {
    id: 'cat-paw',
    sourceName: '猫爪',
    name: 'Cat Paw',
    video: 'maozhua720p_runway.mp4',
    motion: 'Alternating two-hand presses with a tightening rhythm',
    signature: 'Alternating peaks + vertical rebound'
  },
  {
    id: 'prayer',
    sourceName: '祈祷',
    name: 'Prayer Press',
    video: 'qidao720p_runway.mp4',
    motion: 'Synchronized palm-press motion with a stable center line',
    signature: 'Synchronized closure + center stability'
  },
  {
    id: 'drill-fire',
    sourceName: '钻木取火',
    name: 'Fire Drill',
    video: 'zuanmuquhuo720p_runway.mp4',
    motion: 'Continuous rotating and driving motion across both hands',
    signature: 'Rotational phase + high-frequency drive'
  },
  {
    id: 'pitch',
    sourceName: '投球',
    name: 'Pitch Throw',
    video: 'touqiu720p_runway.mp4',
    motion: 'Arc-shaped acceleration with a clear release at the end',
    signature: 'Arc loading + terminal release'
  }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parseCsv(file) {
  const text = fs.readFileSync(file, 'utf8').trim();
  const [headerLine, ...lines] = text.split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(headers.map((header, index) => {
      const value = cells[index];
      const number = Number(value);
      return [header, Number.isFinite(number) ? number : value];
    }));
  });
}

function scoreIntervals(intervals, avgDuration) {
  return intervals.map((interval) => {
    const stability = Math.max(0, 1 - Math.abs(interval.duration - avgDuration) / Math.max(avgDuration, 0.1));
    const span = interval.end_frame - interval.start_frame;
    return {
      cycle: interval.cycle_index,
      startFrame: interval.start_frame,
      endFrame: interval.end_frame,
      startTime: interval.start_time,
      endTime: interval.end_time,
      duration: interval.duration,
      span,
      score: Number((0.72 + stability * 0.24 + Math.min(span / 600, 1) * 0.04).toFixed(2))
    };
  });
}

function pickSeeds(scoredIntervals) {
  return [...scoredIntervals]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.startFrame - b.startFrame);
}

function copyIfChanged(src, dest) {
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest)) {
    const srcStat = fs.statSync(src);
    const destStat = fs.statSync(dest);
    if (srcStat.size === destStat.size && Math.floor(srcStat.mtimeMs) === Math.floor(destStat.mtimeMs)) {
      return;
    }
  }
  fs.copyFileSync(src, dest);
  const srcStat = fs.statSync(src);
  fs.utimesSync(dest, srcStat.atime, srcStat.mtime);
}

function exportMotionSeries(input, output) {
  const result = spawnSync(PYTHON, [MOTION_SERIES_EXPORTER, input, output], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) {
    throw new Error(`Motion series export failed for ${input}\n${result.stderr || result.stdout}`);
  }
}

function main() {
  ensureDir(ASSET_ROOT);

  const manifest = {
    generatedAt: new Date().toISOString(),
    title: 'Motion Signature Explainer',
    techniques: techniques.map((item) => {
      const sourceName = item.sourceName || item.name;
      const analysisDir = path.join(ANALYSIS_ROOT, `${sourceName}_trajectory_analysis`);
      const assetDir = path.join(ASSET_ROOT, item.id);
      ensureDir(assetDir);

      const videoSrc = path.join(VIDEO_ROOT, sourceName, item.video);
      const summary = readJson(path.join(analysisDir, 'summary.json'));
      const intervals = parseCsv(path.join(analysisDir, 'intervals.csv'));
      const candidateSeeds = scoreIntervals(intervals, summary.avg_cycle_duration)
        .sort((a, b) => a.startFrame - b.startFrame);
      const seeds = pickSeeds(candidateSeeds);
      const processedPkl = path.join(analysisDir, `${sourceName}.processed.pkl`);
      const motionSeriesDest = path.join(assetDir, 'motion_series.json');

      copyIfChanged(videoSrc, path.join(assetDir, item.video));
      exportMotionSeries(processedPkl, motionSeriesDest);
      for (const image of ['trajectory.png', 'cycle_overlay.png', 'repetition_boundaries.png']) {
        copyIfChanged(path.join(analysisDir, image), path.join(assetDir, image));
      }

      return {
        ...item,
        sourceName,
        videoSrc: `assets/${item.id}/${item.video}`,
        trajectoryImage: `assets/${item.id}/trajectory.png`,
        cycleOverlayImage: `assets/${item.id}/cycle_overlay.png`,
        repetitionImage: `assets/${item.id}/repetition_boundaries.png`,
        motionSeriesSrc: `assets/${item.id}/motion_series.json`,
        stats: {
          fps: summary.video.fps,
          frames: summary.video.num_frames,
          width: summary.video.width,
          height: summary.video.height,
          cycleCount: summary.cycle_count,
          avgCycleDuration: Number(summary.avg_cycle_duration.toFixed(2)),
          periodSec: Number(summary.estimated_period_sec.toFixed(2)),
          coverage: summary.coverage
        },
        candidateSeeds,
        seeds,
        intervals: intervals.map((interval) => ({
          cycle: interval.cycle_index,
          startFrame: interval.start_frame,
          endFrame: interval.end_frame,
          startTime: interval.start_time,
          endTime: interval.end_time,
          duration: interval.duration
        }))
      };
    })
  };

  fs.writeFileSync(path.join(OUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Motion signature demo synced: ${manifest.techniques.length} techniques`);
}

main();
