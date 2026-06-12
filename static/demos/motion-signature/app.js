const embedMode = new URLSearchParams(window.location.search).get('embed');
if (embedMode === 'learning' || embedMode === 'engine') {
  document.body.dataset.embed = embedMode;
}

const state = {
  manifest: null,
  index: 0,
  startedAt: performance.now(),
  staticDirty: true,
  activeSeedIndex: 0,
  lastFrameAt: 0
};

const els = {
  name: document.querySelector('#techniqueName'),
  motion: document.querySelector('#techniqueMotion'),
  stats: document.querySelector('#techniqueStats'),
  dots: document.querySelector('#techniqueDots'),
  prev: document.querySelector('#prevTechnique'),
  next: document.querySelector('#nextTechnique'),
  video: document.querySelector('#motionVideo'),
  curve: document.querySelector('#curveCanvas'),
  signature: document.querySelector('#signatureCanvas'),
  seeds: document.querySelector('#seedList'),
  bank: document.querySelector('#signatureBank'),
  profile: document.querySelector('#profileCanvas'),
  timeline: document.querySelector('#timelineCanvas')
};

const colors = {
  ink: '#f6f2e8',
  muted: '#a9adb4',
  cyan: '#78dce8',
  gold: '#f4d35e',
  rose: '#ff7a90',
  green: '#8ee8a4',
  panel: '#171a20'
};

const timelineStages = [
  { label: 'Warm-up', color: '#78dce8', amp: 10, freq: 0.9 },
  { label: 'Explore', color: '#8ee8a4', amp: 14, freq: 1.15 },
  { label: 'Match rhythm', color: '#f4d35e', amp: 18, freq: 1.35 },
  { label: 'Build', color: '#ffb86b', amp: 24, freq: 1.55 },
  { label: 'Variation', color: '#ff7a90', amp: 18, freq: 1.2 },
  { label: 'Wind-down', color: '#78dce8', amp: 11, freq: 0.85 }
];

const engineTechniqueIds = ['cat-paw', 'prayer', 'drill-fire', 'pitch'];

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
  const pixelHeight = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height, dpr };
}

function normalizeSeriesWindow(points, box, windowStart, windowEnd, minValue, maxValue, padding = 24) {
  const range = Math.max(1e-6, maxValue - minValue);
  const duration = Math.max(1e-6, windowEnd - windowStart);
  return points.map((point) => [
    box.x + padding + ((point.time - windowStart) / duration) * Math.max(1, box.w - padding * 2),
    box.y + box.h - padding - ((point.value - minValue) / range) * Math.max(1, box.h - padding * 2)
  ]);
}

function getSignal(item) {
  if (!item.phaseSignal) {
    item.phaseSignal = (item.motionSeries?.series || []).map((point) => ({
      time: point.time,
      value: point.phaseSignal
    }));
    const values = item.phaseSignal.map((point) => point.value);
    item.phaseRange = {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }
  return item.phaseSignal;
}

function getFullSeriesDuration(item) {
  const series = item.motionSeries?.series || [];
  return Math.max(1, series[series.length - 1]?.time || 1);
}

function getDisplaySeriesDuration(item) {
  return getFullSeriesDuration(item) / 3;
}

function getSeedContextWindow(item, seed) {
  const fullDuration = getFullSeriesDuration(item);
  const span = getDisplaySeriesDuration(item);
  const maxStart = Math.max(0, fullDuration - span);
  const preferredStart = seed.startTime - span * 0.2;
  const start = Math.min(maxStart, Math.max(0, preferredStart));
  return {
    start,
    end: start + span
  };
}

function drawPath(ctx, points, stroke, width = 3, alpha = 1) {
  if (!points.length) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawTextPill(ctx, text, x, y, color) {
  ctx.save();
  ctx.font = '12px Inter, sans-serif';
  const width = ctx.measureText(text).width + 18;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y - 16, width, 24, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.ink;
  ctx.fillText(text, x + 9, y);
  ctx.restore();
}

function currentTechnique() {
  return state.manifest.techniques[state.index];
}

function engineTechniques() {
  return engineTechniqueIds
    .map((id) => state.manifest.techniques.find((item) => item.id === id))
    .filter(Boolean);
}

async function ensureMotionSeries(item) {
  if (item.motionSeries) return item.motionSeries;
  if (!item.motionSeriesPromise) {
    item.motionSeriesPromise = fetch(item.motionSeriesSrc)
      .then((response) => response.json())
      .then((series) => {
        item.motionSeries = series;
        return series;
      });
  }
  return item.motionSeriesPromise;
}

function renderSeedList(item) {
  const seedLabels = buildSeedLabels(item);
  els.seeds.innerHTML = item.seeds.map((seed, index) => {
    const score = typeof seed.score === 'number' ? seed.score.toFixed(2) : 'n/a';
    const seedLabel = seedLabels[index];
    return `
    <div class="signature-entry ${index === 0 ? 'active' : ''}">
      <b>Signature ${index + 1}</b>
      <strong>${seedLabel}</strong>
      <canvas class="seed-canvas" data-seed-index="${index}" width="320" height="96"></canvas>
      <span>top seed ${seed.cycle} / score ${score} / ${seed.startTime.toFixed(1)}s - ${seed.endTime.toFixed(1)}s</span>
    </div>
  `;
  }).join('');
}

async function setTechnique(nextIndex) {
  const total = state.manifest.techniques.length;
  state.index = (nextIndex + total) % total;
  const item = currentTechnique();
  const targetIndex = state.index;

  els.name.textContent = item.name;
  els.motion.textContent = `${item.motion} / ${item.signature}`;
  els.video.src = item.videoSrc;
  els.video.load();
  els.video.play().catch(() => {});
  els.stats.innerHTML = [
    `${item.stats.cycleCount} cycles`,
    `${item.stats.avgCycleDuration}s avg`,
    `${item.stats.periodSec}s period`,
    `${Math.round(item.stats.coverage.left * 100)}% tracking`
  ].map((label) => `<span>${label}</span>`).join('');
  state.activeSeedIndex = 0;
  els.seeds.innerHTML = '<div class="signature-entry loading-entry"><b>Loading signatures</b><strong>Preparing motion seeds</strong><span>motion series is loading</span></div>';
  [...els.dots.children].forEach((dot, index) => dot.classList.toggle('active', index === state.index));
  await ensureMotionSeries(item);
  if (state.index !== targetIndex) return;
  renderSeedList(item);
  state.staticDirty = true;
}

function setActiveSeedIndex(index) {
  if (index === state.activeSeedIndex) return;
  state.activeSeedIndex = index;
  document.querySelectorAll('.signature-entry').forEach((entry, entryIndex) => {
    entry.classList.toggle('active', entryIndex === index);
  });
}

function setupDots() {
  els.dots.innerHTML = state.manifest.techniques.map((_, index) => (
    `<button aria-label="Show technique ${index + 1}"></button>`
  )).join('');
  [...els.dots.children].forEach((dot, index) => {
    dot.addEventListener('click', () => setTechnique(index));
  });
}

function drawCurve(now) {
  const item = currentTechnique();
  const canvas = els.curve;
  const ctx = canvas.getContext('2d');
  const { width, height } = fitCanvas(canvas);
  const t = ((now - state.startedAt) / 1000) % 8;
  const progress = t / 8;
  const inset = { left: 42, right: 28, top: 74, bottom: 62 };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.panel;
  ctx.fillRect(0, 0, width, height);

  drawCurrentTechniqueCurve(ctx, item, {
    x: inset.left,
    y: inset.top,
    w: width - inset.left - inset.right,
    h: height - inset.top - inset.bottom
  }, progress);
}

function getSignatureSeed(item) {
  return item.seeds?.[0] || item.intervals?.[0] || {
    cycle: 0,
    score: 0,
    startTime: 0,
    endTime: 1
  };
}

function getCurveSeeds(item) {
  return item.candidateSeeds?.length ? item.candidateSeeds : item.seeds || item.intervals || [];
}

function findLibrarySeedIndex(item, candidateSeed) {
  if (!candidateSeed) return -1;
  return (item.seeds || []).findIndex((seed) => seed.cycle === candidateSeed.cycle);
}

function describeSeed(item, seed) {
  const points = getSignal(item).filter((point) => (
    point.time >= seed.startTime && point.time <= seed.endTime
  ));
  if (points.length < 4) return item.signature;

  const values = points.map((point) => point.value);
  const first = values[0];
  const last = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-6, max - min);
  const center = values[Math.floor(values.length / 2)];
  const startNorm = (first - min) / range;
  const centerNorm = (center - min) / range;
  const endNorm = (last - min) / range;
  const deltaNorm = (last - first) / range;
  let turns = 0;
  let previousSign = 0;

  for (let index = 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    const sign = Math.abs(delta) < range * 0.025 ? 0 : Math.sign(delta);
    if (sign !== 0 && previousSign !== 0 && sign !== previousSign) turns += 1;
    if (sign !== 0) previousSign = sign;
  }

  const turnRate = turns / Math.max(seed.duration, 0.1);
  if (turnRate > 4.5) return 'High-frequency tremor';
  if (turns >= 8) return 'Alternating micro-pulses';
  if (centerNorm > 0.72 && startNorm < 0.42 && endNorm < 0.42) return 'Lift crest + release';
  if (centerNorm < 0.28 && startNorm > 0.5 && endNorm > 0.5) return 'Compression dip + rebound';
  if (deltaNorm > 0.42) return 'Rising sweep';
  if (deltaNorm < -0.42) return 'Downstroke release';
  if (turns >= 4) return 'Balanced oscillation';
  return 'Stable phase segment';
}

function lowerFirst(text) {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function seedPositionLabel(item, seed, index) {
  const ratio = seed.startTime / getFullSeriesDuration(item);
  if (ratio < 0.18) return index === 0 ? 'Early' : 'Early-cycle';
  if (ratio < 0.42) return 'Mid-cycle';
  if (ratio < 0.72) return 'Late-cycle';
  return 'Terminal';
}

function buildSeedLabels(item) {
  const baseLabels = item.seeds.map((seed) => describeSeed(item, seed));
  const counts = baseLabels.reduce((acc, label) => {
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const seen = {};

  return item.seeds.map((seed, index) => {
    const base = baseLabels[index];
    if (counts[base] === 1) return base;
    const position = seedPositionLabel(item, seed, index);
    const label = `${position} ${lowerFirst(base)}`;
    seen[label] = (seen[label] || 0) + 1;
    return seen[label] === 1 ? label : `${label} variant ${seen[label]}`;
  });
}

function drawCurrentTechniqueCurve(ctx, item, row, progress) {
  const series = item.motionSeries?.series || [];
  if (!series.length) return;

  const seriesDuration = getDisplaySeriesDuration(item);
  const videoDuration = Number.isFinite(els.video.duration) && els.video.duration > 0 ? els.video.duration : seriesDuration;
  const videoTime = Number.isFinite(els.video.currentTime) ? Math.min(els.video.currentTime, videoDuration) : progress * videoDuration;
  const videoProgress = videoDuration > 0 ? videoTime / videoDuration : progress;
  const currentTime = Math.min(seriesDuration, videoProgress * seriesDuration);
  const windowStart = 0;
  const windowEnd = seriesDuration;
  const windowSpan = Math.max(1e-6, windowEnd - windowStart);
  const signal = getSignal(item);
  const curveSeeds = getCurveSeeds(item);
  const minValue = item.phaseRange.min;
  const maxValue = item.phaseRange.max;
  const visibleSignal = signal.filter((point) => (
    point.time >= windowStart && point.time <= windowEnd
  ));
  const path = normalizeSeriesWindow(visibleSignal, row, windowStart, windowEnd, minValue, maxValue, 22);
  const scanX = row.x + 22 + ((currentTime - windowStart) / windowSpan) * Math.max(1, row.w - 44);

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(row.x, row.y, row.w, row.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(row.x, row.y, row.w, row.h);
  ctx.restore();

  drawPath(ctx, path, 'rgba(169,173,180,0.62)', 2.2, 1);
  const currentSignalPoint = signal.reduce((closest, point) => (
    Math.abs(point.time - currentTime) < Math.abs(closest.time - currentTime) ? point : closest
  ), signal[0]);
  const currentPoint = normalizeSeriesWindow([currentSignalPoint], row, windowStart, windowEnd, minValue, maxValue, 22)[0];
  if (currentPoint) {
    ctx.save();
    ctx.fillStyle = colors.cyan;
    ctx.beginPath();
    ctx.arc(currentPoint[0], currentPoint[1], 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const elapsedSeedIndexes = curveSeeds
    .map((seed, index) => ({ seed, index }))
    .filter(({ seed }) => seed.startTime <= currentTime && seed.startTime <= windowEnd && seed.endTime >= windowStart);
  const activeSeed = elapsedSeedIndexes
    .sort((a, b) => b.seed.startTime - a.seed.startTime)[0] || { seed: null, index: -1 };
  setActiveSeedIndex(activeSeed.seed ? findLibrarySeedIndex(item, activeSeed.seed) : -1);

  curveSeeds.forEach((seed) => {
    if (currentTime < seed.startTime) return;
    const highlightStart = Math.max(seed.startTime, windowStart);
    const highlightEnd = Math.min(seed.endTime, windowEnd, currentTime);
    const isActive = seed.cycle === activeSeed.seed?.cycle;
    if (highlightEnd <= highlightStart) return;
    const boxStart = Math.max(seed.startTime, windowStart);
    const boxEnd = highlightEnd;
    if (boxEnd <= boxStart) return;
    const boxStartX = row.x + 22 + ((boxStart - windowStart) / windowSpan) * Math.max(1, row.w - 44);
    const boxEndX = row.x + 22 + ((boxEnd - windowStart) / windowSpan) * Math.max(1, row.w - 44);
    const highlightedSignal = signal.filter((point) => point.time >= highlightStart && point.time <= highlightEnd);
    const highlighted = normalizeSeriesWindow(highlightedSignal, row, windowStart, windowEnd, minValue, maxValue, 22);
    ctx.save();
    ctx.fillStyle = isActive ? 'rgba(244,211,94,0.12)' : 'rgba(244,211,94,0.045)';
    ctx.strokeStyle = isActive ? 'rgba(244,211,94,0.78)' : 'rgba(244,211,94,0.34)';
    ctx.lineWidth = isActive ? 1.5 : 1;
    ctx.fillRect(boxStartX, row.y, Math.max(4, boxEndX - boxStartX), row.h);
    ctx.strokeRect(boxStartX, row.y, Math.max(4, boxEndX - boxStartX), row.h);
    ctx.restore();
    if (isActive && highlighted.length > 1) {
      drawPath(ctx, highlighted, colors.gold, 5, 1);
    }
  });

  ctx.save();
  ctx.strokeStyle = 'rgba(120,220,232,0.42)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(scanX, row.y);
  ctx.lineTo(scanX, row.y + row.h);
  ctx.stroke();
  ctx.restore();

  drawTimeAxis(ctx, row, windowStart, windowEnd);

  ctx.save();
  ctx.fillStyle = 'rgba(120,220,232,0.1)';
  ctx.strokeStyle = 'rgba(120,220,232,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(scanX, row.y + row.h - 18, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const primarySeed = activeSeed.seed;
  const timeLabel = `series ${currentTime.toFixed(1)}s / ${seriesDuration.toFixed(1)}s`;
  drawTextPill(ctx, timeLabel, row.x + 16, row.y + 28, colors.cyan);
  if (primarySeed && currentTime >= primarySeed.startTime) {
    const libraryIndex = findLibrarySeedIndex(item, primarySeed);
    const labelPrefix = libraryIndex >= 0 ? 'library seed' : 'candidate seed';
    drawTextPill(ctx, `${labelPrefix} ${primarySeed.cycle} selected`, row.x + 16, row.y + 58, colors.gold);
  }
}

function drawTimeAxis(ctx, row, windowStart, windowEnd) {
  const axisY = row.y + row.h - 18;
  const left = row.x + 22;
  const right = row.x + row.w - 22;
  const span = Math.max(1e-6, windowEnd - windowStart);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.fillStyle = colors.muted;
  ctx.lineWidth = 1;
  ctx.font = '11px Inter, sans-serif';
  ctx.beginPath();
  ctx.moveTo(left, axisY);
  ctx.lineTo(right, axisY);
  ctx.stroke();
  for (let i = 0; i <= 4; i += 1) {
    const ratio = i / 4;
    const x = left + ratio * (right - left);
    const seriesTime = windowStart + ratio * span;
    ctx.beginPath();
    ctx.moveTo(x, axisY - 4);
    ctx.lineTo(x, axisY + 4);
    ctx.stroke();
    ctx.fillText(`${seriesTime.toFixed(1)}s`, x - 12, axisY - 8);
  }
  ctx.restore();
}

function drawSeedMiniCurves() {
  const item = currentTechnique();
  document.querySelectorAll('.seed-canvas').forEach((canvas) => {
    const index = Number(canvas.dataset.seedIndex || 0);
    const seed = item.seeds[index];
    if (!seed) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = fitCanvas(canvas);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }
    drawSeedContextPreview(ctx, item, seed, { x: 0, y: 0, w: width, h: height }, {
      padding: 10,
      contextWidth: 1.6,
      seedWidth: index === 0 ? 4 : 3,
      contextAlpha: 0.42
    });

    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  });
}

function drawSeedContextPreview(ctx, item, seed, box, options = {}) {
  const padding = options.padding ?? 10;
  const contextWindow = getSeedContextWindow(item, seed);
  const signal = getSignal(item);
  const contextSignal = signal.filter((point) => (
    point.time >= contextWindow.start && point.time <= contextWindow.end
  ));
  const seedSignal = signal.filter((point) => (
    point.time >= seed.startTime && point.time <= seed.endTime
  ));
  if (contextSignal.length < 2 || seedSignal.length < 2) return;

  const contextPoints = normalizeSeriesWindow(
    contextSignal,
    box,
    contextWindow.start,
    contextWindow.end,
    item.phaseRange.min,
    item.phaseRange.max,
    padding
  );
  const seedPoints = normalizeSeriesWindow(
    seedSignal,
    box,
    contextWindow.start,
    contextWindow.end,
    item.phaseRange.min,
    item.phaseRange.max,
    padding
  );

  drawPath(ctx, contextPoints, 'rgba(169,173,180,0.42)', options.contextWidth ?? 1.5, options.contextAlpha ?? 0.5);
  drawPath(ctx, seedPoints, colors.gold, options.seedWidth ?? 3, 1);
}

function drawSignature(now) {
  const item = currentTechnique();
  const canvas = els.signature;
  const ctx = canvas.getContext('2d');
  const { width, height } = fitCanvas(canvas);
  const pulse = (Math.sin((now - state.startedAt) / 520) + 1) / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.panel;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.strokeStyle = `rgba(244,211,94,${0.18 + pulse * 0.1})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 14]);
  for (let y = 82; y < height - 26; y += 36) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = colors.muted;
  ctx.font = `${Math.max(12, width / 72)}px Inter, sans-serif`;
  ctx.fillText('Top Ranked seeds normalized into reusable prototype', 24, 58);
}

function drawStaticSurfaces(now) {
  drawSignature(now);
  drawSeedMiniCurves();
  drawBank();
  drawProfile();
  state.staticDirty = false;
}

function isInViewport(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

function setupBank() {
  const techniqueCards = engineTechniques().map((item) => `
    <div class="signature-card source-card">
      <strong>${item.name}</strong>
      <canvas data-bank-seeds="${item.id}" width="280" height="94"></canvas>
      <span>${item.seeds.length} ranked seeds</span>
    </div>
  `).join('');
  els.bank.innerHTML = `${techniqueCards}
    <div class="signature-card collection-card">
      <strong>40+ Techniques</strong>
      <img data-src="./assets/technique-collection.jpg" alt="" loading="lazy" decoding="async" />
      <canvas data-bank-collection width="280" height="94"></canvas>
      <span>expanded motion corpus</span>
    </div>`;
}

function drawBank() {
  document.querySelectorAll('[data-bank-seeds]').forEach((canvas) => {
    const item = state.manifest.techniques.find((technique) => technique.id === canvas.dataset.bankSeeds);
    if (!item) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = fitCanvas(canvas);
    ctx.clearRect(0, 0, width, height);
    if (!item.motionSeries) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i += 1) {
        const y = 18 + i * 20;
        ctx.beginPath();
        ctx.moveTo(12, y);
        ctx.lineTo(width - 12, y);
        ctx.stroke();
      }
      return;
    }
    const laneHeight = height / 3;
    item.seeds.slice(0, 3).forEach((seed, index) => {
      const box = {
        x: 0,
        y: index * laneHeight,
        w: width,
        h: laneHeight
      };
      drawSeedContextPreview(ctx, item, seed, box, {
        padding: 5,
        contextWidth: 1.1,
        seedWidth: item === currentTechnique() ? 3 : 2.4,
        contextAlpha: 0.35
      });
    });
  });

  document.querySelectorAll('[data-bank-collection]').forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    const { width, height } = fitCanvas(canvas);
    const t = (performance.now() - state.startedAt) / 1000;
    ctx.clearRect(0, 0, width, height);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const x0 = 16 + col * ((width - 32) / 4);
        const y0 = 18 + row * ((height - 28) / 3);
        const w = (width - 48) / 4;
        const amp = 4 + ((row + col) % 3) * 2;
        const phase = t * 0.8 + row * 1.1 + col * 0.7;
        ctx.strokeStyle = [colors.cyan, colors.gold, colors.rose, colors.green][(row + col) % 4];
        ctx.globalAlpha = 0.72;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let step = 0; step <= 18; step += 1) {
          const p = step / 18;
          const x = x0 + p * w;
          const y = y0 + Math.sin(p * Math.PI * 2 + phase) * amp;
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  });
}

function drawProfile() {
  const canvas = els.profile;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = fitCanvas(canvas);
  const cx = width * 0.5;
  const cy = height * 0.52;
  const radius = Math.min(width, height) * 0.34;
  const axes = [
    { label: 'Gentle', value: 0.7 },
    { label: 'Fast', value: 0.58 },
    { label: 'Deep', value: 0.76 },
    { label: 'Novel', value: 0.48 },
    { label: 'Intense', value: 0.62 }
  ];

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.strokeStyle = 'rgba(142,232,164,0.16)';
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 3; ring += 1) {
    ctx.beginPath();
    axes.forEach((axis, index) => {
      const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
      const r = radius * (ring / 3);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  axes.forEach((axis, index) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
  });

  ctx.beginPath();
  axes.forEach((axis, index) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    const r = radius * axis.value;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(142,232,164,0.22)';
  ctx.strokeStyle = 'rgba(142,232,164,0.88)';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(246,242,232,0.72)';
  ctx.font = '10px Inter, sans-serif';
  axes.forEach((axis, index) => {
    const angle = -Math.PI / 2 + (index / axes.length) * Math.PI * 2;
    const x = cx + Math.cos(angle) * (radius + 18);
    const y = cy + Math.sin(angle) * (radius + 14);
    ctx.fillText(axis.label, x - 16, y + 3);
  });
  ctx.restore();
}

function drawTimeline(now) {
  const canvas = els.timeline;
  const ctx = canvas.getContext('2d');
  const { width, height } = fitCanvas(canvas);
  const t = (now - state.startedAt) / 1000;
  ctx.clearRect(0, 0, width, height);

  const y = height * 0.56;
  const left = 32;
  const right = width - 32;
  const span = right - left;
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();

  const segmentWidth = Math.max(190, span / 4.1);
  const gap = 22;
  const unit = segmentWidth + gap;
  const scroll = t * 34;
  const offset = scroll % unit;
  const baseIndex = Math.floor(scroll / unit);
  const visibleCount = Math.ceil(span / unit) + 3;

  for (let slot = -1; slot < visibleCount; slot += 1) {
    const stage = timelineStages[(baseIndex + slot + timelineStages.length) % timelineStages.length];
    const x0 = left + slot * unit - offset;
    const x1 = x0 + segmentWidth;
    if (x1 < left - 24 || x0 > right + 24) continue;

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(x0, y - 46, x1 - x0, 86);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.strokeRect(x0, y - 46, x1 - x0, 86);
    ctx.strokeStyle = stage.color;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let step = 0; step <= 48; step += 1) {
      const p = step / 48;
      const x = x0 + p * (x1 - x0);
      const taper = Math.sin(p * Math.PI);
      const yy = y + Math.sin(p * Math.PI * 2 * stage.freq + (baseIndex + slot) * 0.78) * stage.amp * (0.35 + taper * 0.65);
      if (step === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(246,242,232,0.78)';
    ctx.font = `${Math.max(11, width / 106)}px Inter, sans-serif`;
    ctx.fillText(stage.label, x0 + 8, height - 22);
    ctx.restore();
  }

  ctx.fillStyle = colors.muted;
  ctx.font = `${Math.max(12, width / 88)}px Inter, sans-serif`;
  ctx.fillText('Adaptive Session Timeline', 32, 24);
}

function animate(now) {
  requestAnimationFrame(animate);
  if (document.hidden || now - state.lastFrameAt < 33) return;
  state.lastFrameAt = now;
  if (state.manifest) {
    if (isInViewport(els.curve)) {
      drawCurve(now);
    }
    if (state.staticDirty) {
      drawStaticSurfaces(now);
    }
    if (isInViewport(els.timeline)) {
      drawTimeline(now);
    }
  }
}

function preloadRemainingMotionSeries() {
  const preload = async () => {
    await Promise.all(engineTechniques()
      .filter((item) => !item.motionSeries)
      .map((item) => ensureMotionSeries(item)));
    state.staticDirty = true;
  };
  preload();
}

function setupEnginePreloadObserver() {
  const engineModule = document.querySelector('.engine-module');
  if (!engineModule) return;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    document.querySelectorAll('.collection-card img[data-src]').forEach((image) => {
      image.src = image.dataset.src;
    });
    preloadRemainingMotionSeries();
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        start();
      }
    }, { rootMargin: '0px' });
    observer.observe(engineModule);
  } else {
    window.setTimeout(start, 5000);
  }
}

async function init() {
  const response = await fetch('./manifest.json');
  state.manifest = await response.json();
  if (embedMode !== 'engine') {
    setupDots();
    await setTechnique(0);
    els.prev.addEventListener('click', () => setTechnique(state.index - 1));
    els.next.addEventListener('click', () => setTechnique(state.index + 1));
  }
  if (embedMode !== 'learning') {
    setupBank();
    setupEnginePreloadObserver();
  }
  els.video.addEventListener('ended', () => {
    if (embedMode === 'engine') return;
    setTechnique(state.index + 1);
  });
  window.addEventListener('resize', () => {
    state.staticDirty = true;
  });
  requestAnimationFrame(animate);
}

init();
