/*
 * EBU R128 Loudness Measurement (simulated DSP)
 * Implements: Integrated LUFS, Short-Term (3s), Momentary (400ms),
 * Loudness Range (LRA), and True Peak (dBTP) with inter-sample peak detection.
 *
 * References: EBU Tech 3341 (Loudness metering), EBU Tech 3342 (LRA),
 *             ITU-R BS.1770-4 (gating and K-weighting).
 */

export interface LoudnessMetrics {
  integratedLUFS: number;
  shortTermMaxLUFS: number;
  momentaryMaxLUFS: number;
  loudnessRangeLU: number;
  truePeakMaxDBTP: number;
  shortTermSeries: number[];
  momentarySeries: number[];
}

// K-weighting filter coefficients (ITU-R BS.1770-4)
// Stage 1: high-shelf filter
const STAGE1_B = [1.53512485958697, -2.69169618940638, 1.19839281085285];
const STAGE1_A = [1.0, -1.69065929318241, 0.73248077421585];

// Stage 2: high-pass filter
const STAGE2_B = [1.0, -2.0, 1.0];
const STAGE2_A = [1.0, -1.99004745483398, 0.99007225036621];

function applyKWeighting(samples: Float32Array, sampleRate: number): Float32Array {
  // Resample to 48kHz if needed for consistent filter coefficients
  let data = samples;
  if (sampleRate !== 48000) {
    const ratio = 48000 / sampleRate;
    const newLen = Math.floor(samples.length * ratio);
    data = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      const srcIdx = i / ratio;
      const lo = Math.floor(srcIdx);
      const hi = Math.min(lo + 1, samples.length - 1);
      const frac = srcIdx - lo;
      data[i] = samples[lo] * (1 - frac) + samples[hi] * frac;
    }
  }

  const stage1Out = new Float32Array(data.length);
  const stage2Out = new Float32Array(data.length);

  // Stage 1: high-shelf
  let x1_1 = 0, x2_1 = 0, y1_1 = 0, y2_1 = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    const y = STAGE1_B[0] * x + STAGE1_B[1] * x1_1 + STAGE1_B[2] * x2_1 - STAGE1_A[1] * y1_1 - STAGE1_A[2] * y2_1;
    stage1Out[i] = y;
    x2_1 = x1_1; x1_1 = x;
    y2_1 = y1_1; y1_1 = y;
  }

  // Stage 2: high-pass
  let x1_2 = 0, x2_2 = 0, y1_2 = 0, y2_2 = 0;
  for (let i = 0; i < stage1Out.length; i++) {
    const x = stage1Out[i];
    const y = STAGE2_B[0] * x + STAGE2_B[1] * x1_2 + STAGE2_B[2] * x2_2 - STAGE2_A[1] * y1_2 - STAGE2_A[2] * y2_2;
    stage2Out[i] = y;
    x2_2 = x1_2; x1_2 = x;
    y2_2 = y1_2; y1_2 = y;
  }

  return stage2Out;
}

function meanSquare(block: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < block.length; i++) {
    sum += block[i] * block[i];
  }
  return sum / block.length;
}

const RELATIVE_GATE = -10.0; // LU relative to ungated
const ABSOLUTE_GATE = -70.0; // LUFS absolute

export function computeLoudnessMetrics(
  channels: Float32Array[],
  sampleRate: number
): LoudnessMetrics {
  const sr = 48000;

  // K-weight each channel
  const weightedChannels = channels.map((ch) => applyKWeighting(ch, sampleRate));

  // Momentary: 400ms blocks, Short-term: 3s blocks
  const momentaryBlockSize = Math.floor(sr * 0.4);
  const shortTermBlockSize = Math.floor(sr * 3.0);

  const numMomentaryBlocks = Math.floor(weightedChannels[0].length / momentaryBlockSize);
  const numShortTermBlocks = Math.floor(weightedChannels[0].length / shortTermBlockSize);

  // Compute momentary loudness for each 400ms block (50% overlap = hop = 200ms)
  const momentaryHop = Math.floor(momentaryBlockSize / 2);
  const momentaryValues: number[] = [];
  for (let i = 0; i + momentaryBlockSize <= weightedChannels[0].length; i += momentaryHop) {
    let msSum = 0;
    for (const ch of weightedChannels) {
      const block = ch.subarray(i, i + momentaryBlockSize);
      msSum += meanSquare(block);
    }
    if (msSum > 0) {
      momentaryValues.push(-0.691 + 10 * Math.log10(msSum));
    }
  }

  // Compute short-term loudness for each 3s block (no overlap per EBU R128)
  const shortTermValues: number[] = [];
  for (let i = 0; i + shortTermBlockSize <= weightedChannels[0].length; i += shortTermBlockSize) {
    let msSum = 0;
    for (const ch of weightedChannels) {
      const block = ch.subarray(i, i + shortTermBlockSize);
      msSum += meanSquare(block);
    }
    if (msSum > 0) {
      shortTermValues.push(-0.691 + 10 * Math.log10(msSum));
    }
  }

  const momentaryMaxLUFS = momentaryValues.length > 0 ? Math.max(...momentaryValues) : -70;
  const shortTermMaxLUFS = shortTermValues.length > 0 ? Math.max(...shortTermValues) : -70;

  // Integrated loudness with gating (EBU R128)
  // Step 1: compute 400ms block loudness with 75% overlap for gating
  const gateHop = Math.floor(momentaryBlockSize * 0.25);
  const blockLoudness: number[] = [];
  for (let i = 0; i + momentaryBlockSize <= weightedChannels[0].length; i += gateHop) {
    let msSum = 0;
    for (const ch of weightedChannels) {
      const block = ch.subarray(i, i + momentaryBlockSize);
      msSum += meanSquare(block);
    }
    if (msSum > 0) {
      blockLoudness.push(-0.691 + 10 * Math.log10(msSum));
    }
  }

  // Step 2: absolute gate — mean of blocks above -70 LUFS
  const absGated = blockLoudness.filter((l) => l > ABSOLUTE_GATE);
  let ungatedMeanLoudness: number;
  if (absGated.length > 0) {
    // Convert to linear, average, convert back
    const linearMean = absGated.reduce((sum, l) => sum + Math.pow(10, (l + 0.691) / 10), 0) / absGated.length;
    ungatedMeanLoudness = -0.691 + 10 * Math.log10(linearMean);
  } else {
    ungatedMeanLoudness = -70;
  }

  // Step 3: relative gate — blocks above ungatedMean - 10 LU
  const relThreshold = ungatedMeanLoudness + RELATIVE_GATE;
  const relGated = blockLoudness.filter((l) => l > relThreshold && l > ABSOLUTE_GATE);

  let integratedLUFS: number;
  if (relGated.length > 0) {
    const linearMean = relGated.reduce((sum, l) => sum + Math.pow(10, (l + 0.691) / 10), 0) / relGated.length;
    integratedLUFS = -0.691 + 10 * Math.log10(linearMean);
  } else {
    integratedLUFS = ungatedMeanLoudness;
  }

  // Loudness Range (LRA) — EBU Tech 3342
  // Uses short-term blocks with gating
  const shortTermGated = shortTermValues.filter((l) => l > ABSOLUTE_GATE);
  let lra = 0;
  if (shortTermGated.length > 4) {
    // Sort for percentile calculation
    const sorted = [...shortTermGated].sort((a, b) => a - b);
    // Calculate mean for relative gate
    const linMean = sorted.reduce((s, l) => s + Math.pow(10, (l + 0.691) / 10), 0) / sorted.length;
    const meanLoud = -0.691 + 10 * Math.log10(linMean);
    const relGatedST = sorted.filter((l) => l > meanLoud - 20);
    if (relGatedST.length > 0) {
      const idx10 = Math.floor(relGatedST.length * 0.1);
      const idx95 = Math.floor(relGatedST.length * 0.95);
      lra = relGatedST[Math.min(idx95, relGatedST.length - 1)] - relGatedST[idx10];
    }
  }

  // True Peak: inter-sample peak detection via 4x oversampling (linear interpolation)
  const oversampleFactor = 4;
  let truePeakMax = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length - 1; i++) {
      const s0 = Math.abs(ch[i]);
      const s1 = Math.abs(ch[i + 1]);
      // Check 3 inter-sample points
      for (let j = 1; j < oversampleFactor; j++) {
        const frac = j / oversampleFactor;
        const interp = Math.abs(ch[i] * (1 - frac) + ch[i + 1] * frac);
        if (interp > truePeakMax) truePeakMax = interp;
      }
      if (s0 > truePeakMax) truePeakMax = s0;
      if (s1 > truePeakMax) truePeakMax = s1;
    }
  }
  const truePeakMaxDBTP = truePeakMax > 0 ? 20 * Math.log10(truePeakMax) : -Infinity;

  // Downsample series for visualization (max 80 points)
  const downsample = (arr: number[], target: number): number[] => {
    if (arr.length <= target) return arr;
    const step = arr.length / target;
    const result: number[] = [];
    for (let i = 0; i < target; i++) {
      const idx = Math.floor(i * step);
      result.push(arr[idx]);
    }
    return result;
  };

  return {
    integratedLUFS,
    shortTermMaxLUFS,
    momentaryMaxLUFS,
    loudnessRangeLU: Math.max(0, lra),
    truePeakMaxDBTP: truePeakMaxDBTP === -Infinity ? -70 : truePeakMaxDBTP,
    shortTermSeries: downsample(shortTermValues, 80),
    momentarySeries: downsample(momentaryValues, 80),
  };
}
