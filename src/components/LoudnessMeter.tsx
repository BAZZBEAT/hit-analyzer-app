import { Gauge, TrendingUp, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import type { LoudnessMetrics } from "@/lib/loudnessAnalyzer";

interface LoudnessMeterProps {
  metrics: LoudnessMetrics;
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

export default function LoudnessMeter({ metrics }: LoudnessMeterProps) {

  // Scale LUFS (-40 to 0) to 0-100% for bar display
  const lufsToPercent = (lufs: number) => ((lufs + 40) / 40) * 100;
  // Scale dBTP (-12 to +1) to 0-100%
  const dbtpToPercent = (dbtp: number) => ((dbtp + 12) / 13) * 100;

  const truePeakWarning = metrics.truePeakMaxDBTP > -1.0 ? "Клиппинг!" : undefined;

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

      <FullDashboard />
    </div>
  );
}
