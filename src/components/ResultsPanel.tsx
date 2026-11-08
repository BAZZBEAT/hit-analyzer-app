import type { AnalysisResult } from "@/lib/audioAnalyzer";
import { Tag, PenLine, Clock, AudioWaveform, HardDrive, Headphones } from "lucide-react";
import LoudnessMeter from "@/components/LoudnessMeter";

interface ResultsPanelProps {
  result: AnalysisResult;
}

export default function ResultsPanel({ result }: ResultsPanelProps) {
  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
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
      </div>

      <LoudnessMeter metrics={result.loudness} />

      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Headphones className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Звуковой профиль</h3>
        </div>
        <div className="space-y-3">
          {result.topSounds.map((sound, i) => (
            <div key={sound.name} className="animate-[fadeIn_0.5s_ease-out]" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-white/80 truncate">{sound.name}</span>
                <span className="text-xs font-semibold tabular-nums text-cyan-300">{sound.percent}%</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-700"
                  style={{ width: `${Math.max(2, sound.percent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Атмосфера трека</h3>
        </div>
        {result.tags.length > 0 ? (
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
        ) : (
          <p className="text-sm text-white/40">Ярко выраженных жанровых или настроенческих признаков не найдено.</p>
        )}
      </div>

      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-3">
          <PenLine className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Описание</h3>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">{result.description}</p>
      </div>
    </div>
  );
}
