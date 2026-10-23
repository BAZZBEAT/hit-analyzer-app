import { useState } from "react";
import { Lock, Gauge, TrendingUp, AlertTriangle, CheckCircle2, Activity, Crown } from "lucide-react";
import type { LoudnessMetrics } from "@/lib/loudnessAnalyzer";

interface LoudnessMeterProps {
  metrics: LoudnessMetrics;
  onPremiumFeature: (featureName: string) => void;
}

interface StreamingTarget {
  name: string;
  targetLUFS: number;
  tolerance: number;
}

const STREAMING_TARGETS: StreamingTarget[] = [
  { name: "Spotify", targetLUFS: -14, tolerance: 1 },
  { name: "Apple Music", targetLUFS: -16, tolerance: 1 },
  { name: "YouTube Music", targetLUFS: -14, tolerance: 1 },
  { name: "Club / DJ-ready", targetLUFS: -8, tolerance: 2 },
];

function getLUFSColor(lufs: number, target: number, tolerance: number): string {
  const diff = Math.abs(lufs - target);
  if (diff <= tolerance) return "text-emerald-400";
  if (diff <= tolerance + 3) return "text-amber-400";
  return "text-red-400";
}

function getLUFSBarColor(lufs: number, target: number, tolerance: number): string {
  const diff = Math.abs(lufs - target);
  if (diff <= tolerance) return "from-emerald-600 to-emerald-400";
  if (diff <= tolerance + 3) return "from-amber-600 to-amber-400";
  return "from-red-600 to-red-400";
}

function getTruePeakColor(dbtp: number): string {
  if (dbtp <= -1.0) return "text-emerald-400";
  if (dbtp <= 0) return "text-amber-400";
  return "text-red-400";
}

function getTruePeakBarColor(dbtp: number): string {
  if (dbtp <= -1.0) return "from-emerald-600 to-emerald-400";
  if (dbtp <= 0) return "from-amber-600 to-amber-400";
  return "from-red-600 to-red-400";
}

function getLRAColor(lra: number): string {
  if (lra < 4) return "text-amber-400";
  if (lra <= 12) return "text-emerald-400";
  return "text-cyan-400";
}

function Readout({
  label,
  value,
  unit,
  color,
  barColor,
  barPercent,
  warning,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  barColor: string;
  barPercent: number;
  warning?: string;
}) {
  return (
    <div className="rounded-xl bg-black/30 p-4 ring-1 ring-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">{label}</span>
        {warning && (
          <span className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400 ring-1 ring-red-500/20">
            <AlertTriangle className="h-3 w-3" />
            {warning}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
        <span className="text-xs text-white/30">{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
          style={{ width: `${Math.max(2, Math.min(100, barPercent))}%` }}
        />
      </div>
    </div>
  );
}

export default function LoudnessMeter({ metrics, onPremiumFeature }: LoudnessMeterProps) {
  const [showFull, setShowFull] = useState(false);

  // Scale LUFS (-40 to 0) to 0-100% for bar display
  const lufsToPercent = (lufs: number) => ((lufs + 40) / 40) * 100;
  // Scale dBTP (-12 to +1) to 0-100%
  const dbtpToPercent = (dbtp: number) => ((dbtp + 12) / 13) * 100;

  const truePeakWarning = metrics.truePeakMaxDBTP > -1.0 ? "Клиппинг!" : undefined;

  // Free user sees only integrated LUFS; rest is blurred
  const FreePreview = () => (
    <div className="space-y-4">
      {/* Only integrated LUFS is visible */}
      <Readout
        label="Интегрированная громкость"
        value={metrics.integratedLUFS.toFixed(1)}
        unit="LUFS"
        color={getLUFSColor(metrics.integratedLUFS, -14, 2)}
        barColor={getLUFSBarColor(metrics.integratedLUFS, -14, 2)}
        barPercent={lufsToPercent(metrics.integratedLUFS)}
      />

      {/* Blurred locked metrics */}
      <div className="relative pointer-events-none select-none blur-md opacity-40">
        <div className="grid grid-cols-2 gap-3">
          <Readout
            label="Short-Term Max"
            value="-18.3"
            unit="LUFS"
            color="text-white/40"
            barColor="from-white/20 to-white/10"
            barPercent={55}
          />
          <Readout
            label="Momentary Max"
            value="-12.1"
            unit="LUFS"
            color="text-white/40"
            barColor="from-white/20 to-white/10"
            barPercent={70}
          />
          <Readout
            label="Loudness Range"
            value="7.2"
            unit="LU"
            color="text-white/40"
            barColor="from-white/20 to-white/10"
            barPercent={50}
          />
          <Readout
            label="True Peak Max"
            value="-0.8"
            unit="dBTP"
            color="text-white/40"
            barColor="from-white/20 to-white/10"
            barPercent={85}
          />
        </div>
      </div>

      {/* Locked streaming targets */}
      <div className="relative pointer-events-none select-none blur-md opacity-40 space-y-2">
        {STREAMING_TARGETS.map((t) => (
          <div key={t.name} className="rounded-lg bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">{t.name}</span>
              <span className="text-xs text-white/30">-14.0 LUFS</span>
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#0e1320]/90 px-6 py-5 ring-1 ring-cyan-500/20 backdrop-blur-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/20">
            <Lock className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="text-sm font-medium text-white/80 text-center">Полный аудиометр — Pro Musician</p>
          <button
            onClick={() => onPremiumFeature("Профессиональный Аудиометр (Youlean Style)")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500"
          >
            <Crown className="h-3.5 w-3.5" />
            Разблокировать
          </button>
        </div>
      </div>
    </div>
  );

  const FullDashboard = () => (
    <div className="space-y-4">
      {/* Main readouts grid */}
      <div className="grid grid-cols-2 gap-3">
        <Readout
          label="Интегрированная громкость"
          value={metrics.integratedLUFS.toFixed(1)}
          unit="LUFS"
          color={getLUFSColor(metrics.integratedLUFS, -14, 2)}
          barColor={getLUFSBarColor(metrics.integratedLUFS, -14, 2)}
          barPercent={lufsToPercent(metrics.integratedLUFS)}
        />
        <Readout
          label="Short-Term Max (3с)"
          value={metrics.shortTermMaxLUFS.toFixed(1)}
          unit="LUFS"
          color={getLUFSColor(metrics.shortTermMaxLUFS, -14, 3)}
          barColor={getLUFSBarColor(metrics.shortTermMaxLUFS, -14, 3)}
          barPercent={lufsToPercent(metrics.shortTermMaxLUFS)}
        />
        <Readout
          label="Momentary Max (400мс)"
          value={metrics.momentaryMaxLUFS.toFixed(1)}
          unit="LUFS"
          color={getLUFSColor(metrics.momentaryMaxLUFS, -14, 4)}
          barColor={getLUFSBarColor(metrics.momentaryMaxLUFS, -14, 4)}
          barPercent={lufsToPercent(metrics.momentaryMaxLUFS)}
        />
        <Readout
          label="Loudness Range (LRA)"
          value={metrics.loudnessRangeLU.toFixed(1)}
          unit="LU"
          color={getLRAColor(metrics.loudnessRangeLU)}
          barColor={metrics.loudnessRangeLU <= 12 ? "from-emerald-600 to-emerald-400" : "from-cyan-600 to-cyan-400"}
          barPercent={Math.min(100, (metrics.loudnessRangeLU / 20) * 100)}
        />
      </div>

      {/* True Peak — full width with warning */}
      <Readout
        label="True Peak Max (интерсемпл)"
        value={metrics.truePeakMaxDBTP === -70 ? "-∞" : metrics.truePeakMaxDBTP.toFixed(1)}
        unit="dBTP"
        color={getTruePeakColor(metrics.truePeakMaxDBTP)}
        barColor={getTruePeakBarColor(metrics.truePeakMaxDBTP)}
        barPercent={dbtpToPercent(metrics.truePeakMaxDBTP)}
        warning={truePeakWarning}
      />

      {/* True Peak detailed warning */}
      {metrics.truePeakMaxDBTP > -1.0 && (
        <div className="rounded-xl bg-red-500/[0.08] p-4 ring-1 ring-red-500/20 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-300">Превышение True Peak</p>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">
              True Peak превышает -1.0 dBTP. Это может вызвать клиппинг и искажения
              на стриминговых платформах после конверсии в форматы с потерями (AAC/OGG).
              Рекомендуется снизить громкость мастер-канала.
            </p>
          </div>
        </div>
      )}

      {/* Loudness history visualization */}
      <div className="rounded-xl bg-black/30 p-4 ring-1 ring-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
            История громкости (Short-Term)
          </span>
        </div>
        <div className="flex items-end gap-[2px] h-20">
          {metrics.shortTermSeries.map((v, i) => {
            const pct = lufsToPercent(v);
            const color = v > -8 ? "from-red-600 to-red-400" : v > -16 ? "from-amber-600 to-amber-400" : "from-emerald-600 to-emerald-400";
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm bg-gradient-to-t ${color} transition-all`}
                style={{
                  height: `${Math.max(3, Math.min(100, pct))}%`,
                  animationDelay: `${i * 8}ms`,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-white/20">
          <span>-40 LUFS</span>
          <span>0 LUFS</span>
        </div>
      </div>

      {/* Streaming targets comparison */}
      <div className="rounded-xl bg-black/30 p-4 ring-1 ring-white/5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
            Цели стриминговых платформ
          </span>
        </div>
        <div className="space-y-2.5">
          {STREAMING_TARGETS.map((target) => {
            const diff = metrics.integratedLUFS - target.targetLUFS;
            const isOnTarget = Math.abs(diff) <= target.tolerance;
            const isLoud = diff > target.tolerance;
            const isQuiet = diff < -target.tolerance;

            return (
              <div key={target.name} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <span className="text-sm font-medium text-white/70">{target.name}</span>
                </div>
                <div className="flex-1 relative h-7 rounded-lg bg-white/[0.03] ring-1 ring-white/5 overflow-hidden">
                  {/* Target zone */}
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                    style={{
                      left: `${lufsToPercent(target.targetLUFS - target.tolerance)}%`,
                      width: `${(target.tolerance * 2 / 40) * 100}%`,
                    }}
                  />
                  {/* Current value marker */}
                  <div
                    className={`absolute top-0 bottom-0 w-1 rounded-full ${
                      isOnTarget ? "bg-emerald-400" : isLoud ? "bg-red-400" : "bg-amber-400"
                    }`}
                    style={{ left: `${Math.min(99, lufsToPercent(metrics.integratedLUFS))}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-[10px] text-white/30 tabular-nums">
                      {target.targetLUFS} LUFS
                    </span>
                  </div>
                </div>
                <div className="w-20 shrink-0 text-right">
                  {isOnTarget ? (
                    <span className="flex items-center justify-end gap-1 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
                    </span>
                  ) : isLoud ? (
                    <span className="flex items-center justify-end gap-1 text-xs font-medium text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      +{diff.toFixed(1)}
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-1 text-xs font-medium text-amber-400">
                      {diff.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[10px] text-white/30">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-400" /> В цели
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-amber-400" /> Тихо
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-red-400" /> Громко / клиппинг
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl bg-gradient-to-b from-cyan-500/[0.04] to-white/[0.02] p-5 ring-1 ring-cyan-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white/90">
            Профессиональный Аудиометр (Youlean Style)
          </h3>
        </div>
        <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-300 ring-1 ring-cyan-500/20">
          EBU R128
        </span>
      </div>

      <div className="relative">
        {showFull ? <FullDashboard /> : <FreePreview />}
      </div>

      {/* Toggle for demo / pro users — in production this would be gated by subscription */}
      <button
        onClick={() => {
          if (!showFull) {
            onPremiumFeature("Профессиональный Аудиометр (Youlean Style)");
          } else {
            setShowFull(false);
          }
        }}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-xs font-medium text-white/50 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-cyan-300"
      >
        <Lock className="h-3.5 w-3.5" />
        {showFull ? "Скрыть детальные метрики" : "Разблокировать полный аудиометр (Pro)"}
      </button>
    </div>
  );
}
