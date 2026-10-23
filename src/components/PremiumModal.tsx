import { Lock, Timer } from "lucide-react";

interface PremiumModalProps {
  open: boolean;
  featureName: string;
  mode: "feature" | "limit";
  onClose: () => void;
  onUpgrade: () => void;
  hoursUntilReset?: number;
  minutesUntilReset?: number;
}

export default function PremiumModal({
  open,
  featureName,
  mode,
  onClose,
  onUpgrade,
  hoursUntilReset,
  minutesUntilReset,
}: PremiumModalProps) {
  if (!open) return null;

  const isLimitMode = mode === "limit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-3xl bg-[#0e1320] p-8 ring-1 ring-white/10 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
        {/* Glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-cyan-500/15 blur-[80px]" />

        <div className="relative">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-1 ring-white/10">
            {isLimitMode ? <Timer className="h-7 w-7 text-cyan-400" /> : <Lock className="h-7 w-7 text-cyan-400" />}
          </div>

          {isLimitMode ? (
            <>
              <h2 className="text-center text-xl font-bold text-white">Дневной лимит исчерпан</h2>
              <p className="mt-3 text-center text-sm text-white/50 leading-relaxed">
                Вы исчерпали свой ежедневный бесплатный лимит (1 трек в день). Перейдите на тариф{" "}
                <span className="font-semibold text-cyan-300">Pro Musician</span> для безлимитного ИИ-анализа,
                доступа к полной векторной базе хитов и экспорта рецензий.
              </p>
              <div className="mt-4 rounded-xl bg-cyan-500/[0.06] px-4 py-2.5 ring-1 ring-cyan-500/20">
                <p className="text-sm font-semibold text-cyan-300">
                  Pro Musician — Подписка. 100 ₽ / месяц.
                </p>
              </div>

              {hoursUntilReset !== undefined && minutesUntilReset !== undefined && (
                <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/10">
                  <Timer className="h-4 w-4 text-white/40" />
                  <span className="text-xs text-white/40">
                    До сброса лимита: {hoursUntilReset} ч {minutesUntilReset} мин
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-center text-xl font-bold text-white">Premium-функция</h2>
              <p className="mt-2 text-center text-sm text-white/50 leading-relaxed">
                <span className="font-semibold text-cyan-300">{featureName}</span> будет доступна в Premium-плане.
                Эта функция сейчас находится в разработке.
              </p>

              <div className="mt-6 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-cyan-300">
                  Pro Musician — Подписка. 100 ₽ / месяц.
                </p>
                <p className="mt-2 text-xs text-white/40 leading-relaxed">
                  С Premium-планом вы получите безлимитные сканирования, глубокий ИИ-анализ,
                  расширенную базу совпадений и экспорт результатов.
                </p>
              </div>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={onUpgrade}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-lg hover:shadow-cyan-500/20"
            >
              {isLimitMode ? "Перейти на Pro Musician" : "Узнать о Premium"}
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-white/5 px-5 py-3 text-sm font-medium text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white/80"
            >
              {isLimitMode ? "Позже" : "Позже"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
