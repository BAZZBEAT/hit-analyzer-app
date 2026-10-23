import { type AnalysisResult } from "@/lib/audioAnalyzer";
import { Cpu, Tag, PenLine, Flame, Clock, AudioWaveform, HardDrive, Lock } from "lucide-react";
import LoudnessMeter from "@/components/LoudnessMeter";

interface ResultsPanelProps {
  result: AnalysisResult;
  onPremiumFeature: (featureName: string) => void;
}

function GenreIcon({ genre }: { genre: string }) {
  const letterMap: Record<string, string> = {
    synthwave: "♪",
    funk: "✦",
    acoustic: "♫",
    disco: "★",
  };
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/10 text-lg font-bold text-cyan-400">
      {letterMap[genre] ?? "♪"}
    </div>
  );
}

export default function ResultsPanel({ result, onPremiumFeature }: ResultsPanelProps) {
  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
      {/* Metadata strip */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-white/50 ring-1 ring-white/10">
          <Clock className="h-3.5 w-3.5" />
          {result.duration.toFixed(1)} с
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-white/50 ring-1 ring-white/10">
          <AudioWaveform className="h-3.5 w-3.5" />
          {(result.sampleRate / 1000).toFixed(1)} kHz
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-white/50 ring-1 ring-white/10">
          <HardDrive className="h-3.5 w-3.5" />
          {result.fileSize}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-white/50 ring-1 ring-white/10">
          <Cpu className="h-3.5 w-3.5" />
          768-dim
        </span>
      </div>

      {/* Professional Loudness Meter (Youlean Style) */}
      <LoudnessMeter metrics={result.loudness} onPremiumFeature={onPremiumFeature} />

      {/* Vector */}
      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Музыкальный вектор (MERT)</h3>
        </div>
        <p className="font-mono text-[11px] text-cyan-300/70 bg-black/20 rounded-lg px-3 py-2.5 break-all leading-relaxed">
          {result.vectorPreview}
        </p>
        {/* Mini vector visualization */}
        <div className="flex items-end gap-[2px] mt-3 h-10">
          {result.vector.slice(0, 48).map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-gradient-to-t from-cyan-600/40 to-cyan-400/80 transition-all"
              style={{
                height: `${Math.max(8, Math.abs(v) * 100)}%`,
                animationDelay: `${i * 15}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Атмосфера трека</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {result.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-300 ring-1 ring-cyan-500/20"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Review */}
      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-3">
          <PenLine className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Рецензия</h3>
        </div>
        <p className="text-sm italic text-white/60 leading-relaxed">{result.description}</p>
        <button
          onClick={() => onPremiumFeature("Full AI Review")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-medium text-white/50 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-cyan-300"
        >
          <Lock className="h-3.5 w-3.5" />
          Полный ИИ-разбор (Premium)
        </button>
      </div>

      {/* Matches */}
      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Совпадение с хитами</h3>
        </div>
        <div className="space-y-3">
          {result.matches.map((match, i) => (
            <div
              key={match.title}
              className="flex items-center gap-3 rounded-xl bg-black/20 p-3 transition-all hover:bg-black/30"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <GenreIcon genre={match.cover} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-white/90 truncate">{match.title}</p>
                  <span
                    className={`text-sm font-bold tabular-nums shrink-0 ${
                      match.score > 90 ? "text-cyan-400" : match.score > 80 ? "text-cyan-300" : "text-white/60"
                    }`}
                  >
                    {match.score.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-0.5">{match.genre}</p>
                <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-700"
                    style={{ width: `${match.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => onPremiumFeature("Advanced Match")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-medium text-white/50 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-cyan-300"
        >
          <Lock className="h-3.5 w-3.5" />
          Расширенное сравнение (Premium)
        </button>
      </div>
    </div>
  );
}
