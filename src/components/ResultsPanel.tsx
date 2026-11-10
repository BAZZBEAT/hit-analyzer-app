import type { AnalysisResult } from "@/lib/audioAnalyzer";
import { Tag, PenLine, Clock, AudioWaveform, HardDrive, Headphones, Flame, Gauge, Zap, Sun, Waves, Activity, Music2 } from "lucide-react";
import LoudnessMeter from "@/components/LoudnessMeter";

interface ResultsPanelProps {
  result: AnalysisResult;
}

function FeatureBar({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
          {icon}
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums text-white/80">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${Math.max(3, value * 100)}%` }}
        />
      </div>
    </div>
  );
}

function GenreIcon({ cover }: { cover: string }) {
  const letterMap: Record<string, string> = {
    synthwave: "♪",
    funk: "✦",
    acoustic: "♫",
    disco: "★",
    rock: "♫",
    electronic: "⚡",
    hiphop: "♪",
    jazz: "♫",
    classical: "♪",
  };
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/10 text-lg font-bold text-cyan-400">
      {letterMap[cover] ?? "♪"}
    </div>
  );
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
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1.5 text-cyan-300 ring-1 ring-cyan-500/20">
          <Gauge className="h-3.5 w-3.5" />
          {result.tempo.bpm > 0 ? `${result.tempo.bpm} BPM` : "BPM —"}
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
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Спектральные характеристики</h3>
        </div>
        <div className="space-y-4">
          <FeatureBar icon={<Sun className="h-3.5 w-3.5 text-amber-400" />} label="Яркость" value={result.spectral.brightness} color="from-amber-600 to-amber-400" />
          <FeatureBar icon={<Waves className="h-3.5 w-3.5 text-orange-400" />} label="Теплота (басы)" value={result.spectral.warmth} color="from-orange-600 to-orange-400" />
          <FeatureBar icon={<Zap className="h-3.5 w-3.5 text-cyan-400" />} label="Плотность" value={result.spectral.density} color="from-cyan-600 to-cyan-400" />
          <FeatureBar icon={<Activity className="h-3.5 w-3.5 text-blue-400" />} label="Динамический диапазон" value={result.spectral.dynamicRange} color="from-blue-600 to-blue-400" />
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Music2 className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Атмосфера трека</h3>
        </div>
        <div className="mb-4 rounded-xl bg-cyan-500/5 px-4 py-3 ring-1 ring-cyan-500/10">
          <p className="text-sm font-medium text-cyan-300">{result.atmosphere.mood}</p>
          <p className="text-xs text-white/50 mt-0.5">{result.atmosphere.moodDescription}</p>
        </div>
        <div className="space-y-3">
          <FeatureBar icon={<Zap className="h-3.5 w-3.5 text-red-400" />} label="Энергия" value={result.atmosphere.energy} color="from-red-600 to-red-400" />
          <FeatureBar icon={<Music2 className="h-3.5 w-3.5 text-cyan-400" />} label="Танцевальность" value={result.atmosphere.danceability} color="from-cyan-600 to-cyan-400" />
          <FeatureBar icon={<Headphones className="h-3.5 w-3.5 text-emerald-400" />} label="Акустичность" value={result.atmosphere.acousticness} color="from-emerald-600 to-emerald-400" />
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Теги</h3>
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
          <h3 className="text-sm font-semibold text-white/90">Полное описание</h3>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">{result.description}</p>
      </div>

      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">Совпадение с мировыми хитами</h3>
        </div>
        <div className="space-y-3">
          {result.hitMatches.map((match, i) => (
            <div
              key={match.title}
              className="flex items-center gap-3 rounded-xl bg-black/20 p-3 transition-all hover:bg-black/30"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <GenreIcon cover={match.cover} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">{match.title}</p>
                    <p className="text-xs text-white/40 mt-0.5 truncate">{match.artist} · {match.year}</p>
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums shrink-0 ${
                      match.similarity > 70 ? "text-cyan-400" : match.similarity > 55 ? "text-cyan-300" : "text-white/60"
                    }`}
                  >
                    {match.similarity.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-0.5">{match.genre}</p>
                <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-700"
                    style={{ width: `${match.similarity}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
