import { useState, useCallback } from "react";
import { Waves, Sparkles, AlertCircle, RotateCcw, LogIn, LogOut, ShieldCheck, Heart } from "lucide-react";
import DropZone from "@/components/DropZone";
import LoadingState from "@/components/LoadingState";
import ResultsPanel from "@/components/ResultsPanel";
import AuthModal from "@/components/AuthModal";
import AdminDashboard from "@/components/AdminDashboard";
import { useAuth } from "@/lib/authContext";
import { analyzeAudio, type AnalysisResult } from "@/lib/audioAnalyzer";
import { recordScan } from "@/lib/scanService";
import { SUPPORT_URL } from "@/lib/supportConfig";

type Status = "idle" | "loading" | "done" | "error";

function MainApp() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setStatus("loading");
      setError("");
      try {
        const res = await analyzeAudio(file);
        if (user) {
          void recordScan(file.name);
        }
        setResult(res);
        setStatus("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
        setStatus("error");
      }
    },
    [user]
  );

  const reset = () => {
    setStatus("idle");
    setResult(null);
    setFileName(undefined);
    setError("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard onSignOut={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-blue-700/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-500/5 blur-[100px]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <AuthModal open={authModalOpen} mode="login" onClose={() => setAuthModalOpen(false)} />

      <div className="relative z-10">
        <nav className="sticky top-0 z-20 border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur-md">
          <div className="mx-auto max-w-2xl px-5 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-1 ring-white/10">
                <Waves className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                Music<span className="text-cyan-400">AI</span>
              </span>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-white/40 max-w-[160px] truncate">{user.email}</span>
                <button
                  onClick={() => void signOut()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white/80"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Выйти
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white/80"
              >
                <LogIn className="h-3.5 w-3.5" />
                Войти
              </button>
            )}
          </div>
        </nav>

        <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
          <header className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 ring-1 ring-white/10 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-white/60 tracking-wide">Бесплатный ИИ-анализ</span>
            </div>

            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-1 ring-white/10">
                <Waves className="h-6 w-6 text-cyan-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Music<span className="text-cyan-400">AI</span> Analyzer
              </h1>
            </div>

            <p className="text-white/50 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              Загрузите аудиофайл для мгновенного извлечения музыкального вектора и поиска совпадений с хитами
            </p>
          </header>

          <div className="relative rounded-3xl bg-white/[0.02] p-6 sm:p-8 ring-1 ring-white/10 backdrop-blur-sm shadow-2xl">
            {status === "idle" && <DropZone onFile={handleFile} disabled={false} fileName={fileName} />}

            {status === "loading" && <LoadingState />}

            {status === "error" && (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
                  <AlertCircle className="h-7 w-7 text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-white/90">Не удалось обработать файл</p>
                  <p className="text-sm text-white/40 mt-1 max-w-xs">{error}</p>
                </div>
                <button
                  onClick={reset}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Попробовать снова
                </button>
              </div>
            )}

            {status === "done" && result && (
              <>
                <ResultsPanel result={result} />
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-medium text-white/60 ring-1 ring-white/10 hover:bg-white/10 hover:text-white/80 transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Анализировать другой трек
                  </button>
                </div>
              </>
            )}
          </div>

          {SUPPORT_URL && (
            <div className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-600/10 p-5 ring-1 ring-cyan-500/20 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/20">
                <Heart className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white/90">Поддержать проект</p>
                <p className="text-xs text-white/40">Сервис бесплатный. Добровольный взнос помогает развивать MusicAI</p>
              </div>
              <a
                href={SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500"
              >
                Поддержать
              </a>
            </div>
          )}

          <footer className="mt-8 text-center">
            <p className="inline-flex items-center gap-1.5 text-xs text-white/25">
              <ShieldCheck className="h-3.5 w-3.5" />
              Обработка выполняется локально в браузере
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default MainApp;
