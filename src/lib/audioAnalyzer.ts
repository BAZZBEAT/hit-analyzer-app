import type { SoundScore } from "./musicModel";
import { SOUND_LABELS, soundNameRu } from "./soundLabels";
import { computeLoudnessMetrics, type LoudnessMetrics } from "./loudnessAnalyzer";
import { HIT_PROFILES, type HitProfile } from "./hitProfiles";

export interface SoundShare {
  name: string;
  percent: number;
}

export interface SpectralFeatures {
  brightness: number;
  warmth: number;
  density: number;
  dynamicRange: number;
}

export interface TempoInfo {
  bpm: number;
  confidence: number;
}

export interface AtmosphereProfile {
  energy: number;
  mood: string;
  moodDescription: string;
  danceability: number;
  acousticness: number;
}

export interface HitMatch {
  title: string;
  artist: string;
  year: number;
  genre: string;
  similarity: number;
  cover: string;
}

export interface AnalysisResult {
  topSounds: SoundShare[];
  tags: string[];
  description: string;
  spectral: SpectralFeatures;
  tempo: TempoInfo;
  atmosphere: AtmosphereProfile;
  hitMatches: HitMatch[];
  duration: number;
  sampleRate: number;
  fileName: string;
  fileSize: string;
  loudness: LoudnessMetrics;
  soundVector: number[];
}

const MODEL_SAMPLE_RATE = 16000;
const WINDOW_SECONDS = 10;
const MAX_WINDOWS = 6;
const TOP_SOUNDS = 12;
const MIN_TAG_SCORE = 0.08;
const MAX_TAGS = 8;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function renderMono16k(decoded: AudioBuffer): Promise<Float32Array> {
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * MODEL_SAMPLE_RATE), MODEL_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

function pickWindows(samples: Float32Array): Float32Array[] {
  const windowLength = WINDOW_SECONDS * MODEL_SAMPLE_RATE;
  if (samples.length <= windowLength) return [samples];
  const count = Math.min(MAX_WINDOWS, Math.ceil(samples.length / windowLength));
  const maxStart = samples.length - windowLength;
  const windows: Float32Array[] = [];
  for (let i = 0; i < count; i++) {
    const start = count === 1 ? 0 : Math.round((maxStart * i) / (count - 1));
    windows.push(samples.subarray(start, start + windowLength));
  }
  return windows;
}

async function averageSoundScores(samples: Float32Array, onModelProgress?: (percent: number) => void): Promise<SoundScore[]> {
  const { classifySound } = await import("./musicModel");
  const windows = pickWindows(samples);
  const totals = new Map<string, number>();
  for (const window of windows) {
    const scores = await classifySound(window, onModelProgress);
    for (const { label, score } of scores) {
      totals.set(label, (totals.get(label) ?? 0) + score);
    }
  }
  return [...totals]
    .map(([label, total]) => ({ label, score: total / windows.length }))
    .sort((a, b) => b.score - a.score);
}

function buildTags(scores: SoundScore[]): string[] {
  return scores
    .filter((s) => s.label !== "Music" && SOUND_LABELS[s.label] && s.score >= MIN_TAG_SCORE)
    .slice(0, MAX_TAGS)
    .map((s) => soundNameRu(s.label));
}

function scoreOf(scores: SoundScore[], label: string): number {
  return scores.find((s) => s.label === label)?.score ?? 0;
}

function topInGroup(scores: SoundScore[], group: "genre" | "mood" | "instrument", limit: number): SoundScore[] {
  return scores
    .filter((s) => s.label !== "Music" && SOUND_LABELS[s.label]?.group === group && s.score >= MIN_TAG_SCORE)
    .slice(0, limit);
}

function buildDescription(scores: SoundScore[], spectral: SpectralFeatures, tempo: TempoInfo, atmosphere: AtmosphereProfile): string {
  const musicScore = scoreOf(scores, "Music");
  const sentences: string[] = [];

  if (musicScore < 0.15) {
    return "В треке мало музыки: в основном слышны другие звуки или речь.";
  }

  const genre = topInGroup(scores, "genre", 1)[0];
  if (genre) {
    sentences.push(`Жанр по звучанию: ${soundNameRu(genre.label)} (${Math.round(genre.score * 100)}%).`);
  }

  sentences.push(`Настроение: ${atmosphere.mood.toLowerCase()} — ${atmosphere.moodDescription.toLowerCase()}.`);

  const instruments = topInGroup(scores, "instrument", 4);
  if (instruments.length > 0) {
    sentences.push(`Основные инструменты: ${instruments.map((s) => soundNameRu(s.label).toLowerCase()).join(", ")}.`);
  }

  const vocalScore = Math.max(scoreOf(scores, "Singing"), scoreOf(scores, "Male singing"), scoreOf(scores, "Female singing"));
  const rapScore = scoreOf(scores, "Rapping");
  if (rapScore >= 0.15) {
    sentences.push("В треке есть читка (рэп).");
  } else if (vocalScore >= 0.15) {
    sentences.push("В треке есть вокал.");
  } else {
    sentences.push("Вокал почти не слышен, трек инструментальный.");
  }

  sentences.push(`Темп ≈ ${tempo.bpm} BPM (уверенность ${Math.round(tempo.confidence * 100)}%).`);

  if (spectral.brightness > 0.6) {
    sentences.push("Звучание яркое, с акцентом на верхних частотах.");
  } else if (spectral.warmth > 0.6) {
    sentences.push("Звучание тёплое, с акцентом на нижних частотах.");
  } else {
    sentences.push("Баланс частот ровный.");
  }

  if (atmosphere.danceability > 0.6) {
    sentences.push("Трек танцевальный, с чётным ритмом.");
  } else if (atmosphere.acousticness > 0.5) {
    sentences.push("Трек акустический, без выраженной электроники.");
  }

  return sentences.join(" ");
}

function computeSpectralFeatures(rawAudio: Float32Array, sampleRate: number): SpectralFeatures {
  const binCount = 512;
  const lowBins = Math.floor(binCount * 0.15);
  const midBins = Math.floor(binCount * 0.4);
  const highBins = binCount;

  let lowEnergy = 0, midEnergy = 0, highEnergy = 0, totalEnergy = 0;
  const blockSamples = 4096;
  const hop = Math.floor(blockSamples / 2);
  const energyTimeline: number[] = [];

  for (let start = 0; start + blockSamples <= rawAudio.length; start += hop) {
    const block = rawAudio.subarray(start, start + blockSamples);
    let blockEnergy = 0;
    const magnitudes = new Float32Array(binCount);

    for (let k = 0; k < binCount; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < blockSamples; n++) {
        const angle = (2 * Math.PI * k * n) / blockSamples;
        const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (blockSamples - 1));
        const sample = block[n] * window;
        real += sample * Math.cos(angle);
        imag += sample * Math.sin(angle);
      }
      const mag = Math.sqrt(real * real + imag * imag);
      magnitudes[k] = mag;
      blockEnergy += mag;
    }

    for (let k = 0; k < lowBins; k++) lowEnergy += magnitudes[k];
    for (let k = lowBins; k < midBins; k++) midEnergy += magnitudes[k];
    for (let k = midBins; k < highBins; k++) highEnergy += magnitudes[k];
    totalEnergy += blockEnergy;
    energyTimeline.push(blockEnergy);
  }

  const brightness = totalEnergy > 0 ? highEnergy / totalEnergy : 0;
  const warmth = totalEnergy > 0 ? lowEnergy / totalEnergy : 0;
  const density = totalEnergy > 0 ? Math.min(1, totalEnergy / (energyTimeline.length * binCount * 50)) : 0;

  let maxE = 0, minE = Infinity;
  for (const e of energyTimeline) {
    if (e > maxE) maxE = e;
    if (e < minE) minE = e;
  }
  const dynamicRange = maxE > 0 ? 1 - Math.min(1, minE / maxE) : 0;

  return {
    brightness: Math.min(1, brightness * 3),
    warmth: Math.min(1, warmth * 3),
    density: Math.min(1, density),
    dynamicRange,
  };
}

function computeTempo(rawAudio: Float32Array, sampleRate: number): TempoInfo {
  const windowMs = 50;
  const windowSize = Math.floor((sampleRate * windowMs) / 1000);
  const energy: number[] = [];

  for (let i = 0; i + windowSize < rawAudio.length; i += windowSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += rawAudio[i + j] * rawAudio[i + j];
    }
    energy.push(sum / windowSize);
  }

  if (energy.length < 10) return { bpm: 0, confidence: 0 };

  const mean = energy.reduce((a, b) => a + b, 0) / energy.length;
  const peaks: number[] = [];
  for (let i = 1; i < energy.length - 1; i++) {
    if (energy[i] > energy[i - 1] && energy[i] > energy[i + 1] && energy[i] > mean * 1.3) {
      peaks.push(i);
    }
  }

  if (peaks.length < 3) return { bpm: 0, confidence: 0 };

  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  let bpm = (60000 / windowMs) / median;

  while (bpm < 60) bpm *= 2;
  while (bpm > 180) bpm /= 2;

  const variance = intervals.reduce((sum, v) => sum + Math.pow(v - median, 2), 0) / intervals.length;
  const cv = Math.sqrt(variance) / median;
  const confidence = Math.max(0, Math.min(1, 1 - cv * 2));

  return { bpm: Math.round(bpm), confidence };
}

function buildAtmosphere(scores: SoundScore[], spectral: SpectralFeatures, tempo: TempoInfo): AtmosphereProfile {
  const electronicScore = Math.max(
    scoreOf(scores, "Electronic music"),
    scoreOf(scores, "Electronic dance music"),
    scoreOf(scores, "House music"),
    scoreOf(scores, "Techno"),
    scoreOf(scores, "Dubstep"),
    scoreOf(scores, "Drum and bass"),
    scoreOf(scores, "Synthesizer"),
    scoreOf(scores, "Drum machine"),
  );

  const acousticScore = Math.max(
    scoreOf(scores, "Acoustic guitar"),
    scoreOf(scores, "Piano"),
    scoreOf(scores, "Classical music"),
    scoreOf(scores, "Violin, fiddle"),
  );

  const energeticScore = Math.max(
    scoreOf(scores, "Exciting music"),
    scoreOf(scores, "Angry music"),
    scoreOf(scores, "Heavy metal"),
    scoreOf(scores, "Punk rock"),
    scoreOf(scores, "Rock music"),
  );

  const calmScore = Math.max(
    scoreOf(scores, "Sad music"),
    scoreOf(scores, "Tender music"),
    scoreOf(scores, "Ambient music"),
    scoreOf(scores, "Background music"),
  );

  const drumScore = Math.max(
    scoreOf(scores, "Drum kit"),
    scoreOf(scores, "Drum machine"),
    scoreOf(scores, "Bass drum"),
    scoreOf(scores, "Hi-hat"),
  );

  const energy = Math.min(1, energeticScore * 1.5 + spectral.density * 0.5 + (tempo.bpm > 120 ? 0.2 : 0));
  const danceability = Math.min(1, drumScore * 1.2 + electronicScore * 0.8 + (tempo.bpm >= 100 && tempo.bpm <= 140 ? 0.3 : 0));
  const acousticness = Math.min(1, acousticScore * 1.5 + (1 - electronicScore) * 0.3);

  let mood: string;
  let moodDescription: string;

  if (energeticScore > 0.3 && energy > 0.5) {
    mood = "Энергичное";
    moodDescription = "трек заряжает драйвом и держит внимание";
  } else if (calmScore > 0.25) {
    mood = "Спокойное";
    moodDescription = "трек создаёт расслабленную атмосферу";
  } else if (scoreOf(scores, "Happy music") > 0.2) {
    mood = "Радостное";
    moodDescription = "позитивное и светлое звучание";
  } else if (scoreOf(scores, "Sad music") > 0.2) {
    mood = "Грустное";
    moodDescription = "меланхоличное и задумчивое настроение";
  } else if (scoreOf(scores, "Scary music") > 0.2) {
    mood = "Тревожное";
    moodDescription = "напряжённое и загадочное звучание";
  } else if (scoreOf(scores, "Funny music") > 0.2) {
    mood = "Игривое";
    moodDescription = "лёгкое и несерьёзное настроение";
  } else if (danceability > 0.5) {
    mood = "Танцевальное";
    moodDescription = "ритм заставляет двигаться";
  } else {
    mood = "Нейтральное";
    moodDescription = "сбалансированное звучание без ярких эмоций";
  }

  return { energy, mood, moodDescription, danceability, acousticness };
}

function buildSoundVector(scores: SoundScore[]): number[] {
  const groups: ("genre" | "mood" | "instrument" | "vocal")[] = ["genre", "mood", "instrument", "vocal"];
  const vector: number[] = [];
  for (const group of groups) {
    const groupScores = scores.filter((s) => SOUND_LABELS[s.label]?.group === group);
    const groupSum = groupScores.reduce((sum, s) => sum + s.score, 0);
    vector.push(groupSum);
  }
  return vector;
}

function matchHits(soundVector: number[], atmosphere: AtmosphereProfile, spectral: SpectralFeatures, tempo: TempoInfo): HitMatch[] {
  const featureVector = [
    ...soundVector,
    atmosphere.energy,
    atmosphere.danceability,
    atmosphere.acousticness,
    spectral.brightness,
    spectral.warmth,
    spectral.density,
    spectral.dynamicRange,
    tempo.bpm / 180,
  ];

  return HIT_PROFILES.map((hit: HitProfile) => {
    const hitFeatureVector = [
      ...hit.soundVector,
      hit.energy,
      hit.danceability,
      hit.acousticness,
      hit.brightness,
      hit.warmth,
      hit.density,
      hit.dynamicRange,
      hit.bpm / 180,
    ];

    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < featureVector.length; i++) {
      dot += featureVector[i] * hitFeatureVector[i];
      magA += featureVector[i] * featureVector[i];
      magB += hitFeatureVector[i] * hitFeatureVector[i];
    }
    const cosine = magA > 0 && magB > 0 ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
    const similarity = Math.max(0, Math.min(100, cosine * 100));

    return {
      title: hit.title,
      artist: hit.artist,
      year: hit.year,
      genre: hit.genre,
      similarity,
      cover: hit.cover,
    };
  }).sort((a, b) => b.similarity - a.similarity);
}

export async function analyzeAudio(
  file: File,
  onModelProgress?: (percent: number) => void
): Promise<AnalysisResult> {
  const audioCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(await file.arrayBuffer());
  } finally {
    await audioCtx.close();
  }

  const rawAudio = decoded.getChannelData(0);
  const mono16k = await renderMono16k(decoded);

  const scores = await averageSoundScores(mono16k, onModelProgress);
  const spectral = computeSpectralFeatures(rawAudio, decoded.sampleRate);
  const tempo = computeTempo(rawAudio, decoded.sampleRate);
  const atmosphere = buildAtmosphere(scores, spectral, tempo);
  const soundVector = buildSoundVector(scores);
  const hitMatches = matchHits(soundVector, atmosphere, spectral, tempo);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    channelData.push(decoded.getChannelData(c));
  }

  return {
    topSounds: scores.slice(0, TOP_SOUNDS).map((s) => ({
      name: soundNameRu(s.label),
      percent: Math.round(s.score * 100),
    })),
    tags: buildTags(scores),
    description: buildDescription(scores, spectral, tempo, atmosphere),
    spectral,
    tempo,
    atmosphere,
    hitMatches: hitMatches.slice(0, 5),
    duration: decoded.duration,
    sampleRate: decoded.sampleRate,
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    loudness: computeLoudnessMetrics(channelData, decoded.sampleRate),
    soundVector,
  };
}
