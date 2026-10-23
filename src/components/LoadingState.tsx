import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const MESSAGES = [
  "Декодирование аудиопотока...",
  "Извлечение музыкального вектора MERT...",
  "Анализ спектральных характеристик...",
  "Сравнение с базой хитов...",
];

export default function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-12 animate-[fadeIn_0.5s_ease-out]">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
        <Loader2 className="h-7 w-7 text-cyan-400 animate-pulse" />
      </div>

      <div className="text-center space-y-2">
        <p className="text-white/90 font-medium">Локальный ИИ анализирует аудиопоток</p>
        <p className="text-sm text-cyan-400/70 transition-all duration-300 min-h-[20px]">
          {MESSAGES[msgIndex]}
        </p>
      </div>

      <div className="w-48 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse" style={{ width: "60%" }} />
      </div>
    </div>
  );
}
