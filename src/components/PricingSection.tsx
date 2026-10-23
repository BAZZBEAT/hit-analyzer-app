import { Check, Crown, Zap } from "lucide-react";

interface PricingSectionProps {
  onUpgrade: () => void;
}

const FREE_FEATURES = [
  "1 сканирование в день",
  "Базовый музыкальный вектор (MERT)",
  "Совпадение с 4 хитами",
  "Теги атмосферы трека",
];

const PRO_FEATURES = [
  "Безлимитные сканирования",
  "Глубокий ИИ-анализ (Full AI Review)",
  "Доступ к полной векторной базе хитов",
  "Advanced Match — детальное сравнение",
  "Экспорт рецензий (PDF / JSON)",
  "Приоритетная обработка",
];

export default function PricingSection({ onUpgrade }: PricingSectionProps) {
  return (
    <div className="mt-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Тарифные планы</h2>
        <p className="mt-2 text-sm text-white/40">Выберите подходящий план для анализа</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Free tier */}
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
              <Zap className="h-5 w-5 text-white/50" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Free</h3>
              <p className="text-xs text-white/40">Базовый анализ</p>
            </div>
          </div>

          <div className="mb-5">
            <span className="text-3xl font-bold text-white">0 ₽</span>
            <span className="text-sm text-white/40">/ месяц</span>
          </div>

          <ul className="space-y-3 mb-6">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-white/60">
                <Check className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <button
            disabled
            className="w-full rounded-xl bg-white/5 px-5 py-3 text-sm font-medium text-white/40 ring-1 ring-white/10 cursor-default"
          >
            Текущий план
          </button>
        </div>

        {/* Pro tier */}
        <div className="relative rounded-2xl bg-gradient-to-b from-cyan-500/[0.08] to-transparent p-6 ring-1 ring-cyan-500/30">
          <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          <div className="absolute -top-3 right-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Рекомендуем
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/20">
              <Crown className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Pro Musician</h3>
              <p className="text-xs text-cyan-300/60">Полный доступ</p>
            </div>
          </div>

          <div className="mb-5">
            <span className="text-3xl font-bold text-white">100 ₽</span>
            <span className="text-sm text-white/40">/ месяц</span>
          </div>

          <ul className="space-y-3 mb-6">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-white/70">
                <Check className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <button
            onClick={onUpgrade}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-lg hover:shadow-cyan-500/20"
          >
            Перейти на Pro
          </button>
        </div>
      </div>
    </div>
  );
}
