import type { SoundScore } from "./musicModel";
import { SOUND_LABELS, soundNameRu } from "./soundLabels";
import { computeLoudnessMetrics, type LoudnessMetrics } from "./loudnessAnalyzer";

export interface SoundShare {
  name: string;
  percent: number;
}

export interface AnalysisResult {
  topSounds: SoundShare[];
  tags: string[];
  description: string;
  duration: number;
  sampleRate: number;
  fileName: string;
  fileSize: string;
  loudness: LoudnessMetrics;
}

const MODEL_SAMPLE_RATE = 16000;
const WINDOW_SECONDS = 10;
const MAX_WINDOWS = 4;
const TOP_SOUNDS = 10;
const MIN_TAG_SCORE = 0.1;
const MAX_TAGS = 6;

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

function buildDescription(scores: SoundScore[]): string {
  const scoreOf = (label: string) => scores.find((s) => s.label === label)?.score ?? 0;
  const topInGroup = (group: "genre" | "mood" | "instrument", limit: number) =>
    scores
      .filter((s) => s.label !== "Music" && SOUND_LABELS[s.label]?.group === group && s.score >= MIN_TAG_SCORE)
      .slice(0, limit);

  if (scoreOf("Music") < 0.2) {
    return "В треке мало музыки: в основном слышны другие звуки или речь.";
  }

  const sentences: string[] = [];
  const genre = topInGroup("genre", 1)[0];
  if (genre) {
    sentences.push(`Жанр по звучанию: ${soundNameRu(genre.label)} (${Math.round(genre.score * 100)}%).`);
  }

  const mood = topInGroup("mood", 1)[0];
  if (mood) {
    sentences.push(`Настроение: ${soundNameRu(mood.label).toLowerCase()}.`);
  }

  const instruments = topInGroup("instrument", 3);
  if (instruments.length > 0) {
    sentences.push(`Основные инструменты: ${instruments.map((s) => soundNameRu(s.label).toLowerCase()).join(", ")}.`);
  }

  const vocalScore = Math.max(scoreOf("Singing"), scoreOf("Male singing"), scoreOf("Female singing"));
  const rapScore = scoreOf("Rapping");
  if (rapScore >= 0.2) {
    sentences.push("В треке есть читка (рэп).");
  } else if (vocalScore >= 0.2) {
    sentences.push("В треке есть вокал.");
  } else {
    sentences.push("Вокал почти не слышен, трек инструментальный.");
  }

  return sentences.join(" ");
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

  const scores = await averageSoundScores(await renderMono16k(decoded), onModelProgress);

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
    description: buildDescription(scores),
    duration: decoded.duration,
    sampleRate: decoded.sampleRate,
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    loudness: computeLoudnessMetrics(channelData, decoded.sampleRate),
  };
}
