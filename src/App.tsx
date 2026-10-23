import { useState, useCallback, useEffect } from "react";
import { Waves, Sparkles, AlertCircle, RotateCcw, LogIn, UserPlus, Crown, LogOut, ShieldCheck } from "lucide-react";
import DropZone from "@/components/DropZone";
import LoadingState from "@/components/LoadingState";
import ResultsPanel from "@/components/ResultsPanel";
import PremiumModal from "@/components/PremiumModal";
import PricingSection from "@/components/PricingSection";
import AuthModal from "@/components/AuthModal";
import AdminDashboard from "@/components/AdminDashboard";
import { useAuth } from "@/lib/authContext";
import { analyzeAudio, type AnalysisResult } from "@/lib/audioAnalyzer";
import { fetchScanStatus, recordScanServer, type ScanStatus } from "@/lib/scanService";

type Status = "idle" | "loading" | "done" | "error" | "blocked";

export default function App() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFeature, setModalFeature] = useState("");
  const [modalMode, setModalMode] = useState<"feature" | "limit">("feature");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [scanStatusLoading, setScanStatusLoading] = useState(false);

  // Fetch scan status from server whenever user changes
  const refreshScanStatus = useCallback(async () => {
    if (!user || isAdmin) {
      setScanStatus(null);
      return;
    }
    setScanStatusLoading(true);
    const s = await fetchScanStatus();
    setScanStatus(s);
    setScanStatusLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    refreshScanStatus();
  }, [refreshScanStatus]);

  // Show admin dashboard if admin is logged in
  if (isAdmin) {
    return <AdminDashboard onSignOut={() => refreshScanStatus()} />;
  }

  const handleFile = useCallback(
    async (file: File) => {
      // Must be authenticated
      if (!user) {
        setAuthMode("login");
        setAuthModalOpen(true);
        return;
      }

      // Server-side limit check
      if (!isAdmin) {
        const serverStatus = await fetchScanStatus();
        if (serverStatus && !serverStatus.can_scan) {
          setScanStatus(serverStatus);
          setModalMode("limit");
          setModalFeature("");
          setModalOpen(true);
          setStatus("blocked");
          return;
        }
      }

      setFileName(file.name);
      setStatus("loading");
      setError("");
      try {
        const res = await analyzeAudio(file);

        // Record scan on server (atomic check + insert)
        if (!isAdmin) {
          const recordResult = await recordScanServer(file.name);
          if (recordResult && !recordResult.allowed) {
            // Double-check failed — server rejected
            setModalMode("limit");
            setModalFeature("");
            setModalOpen(true);
            setStatus("blocked");
            await refreshScanStatus();
            return;
          }
        }

        setResult(res);
        setStatus("done");
        await refreshScanStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
        setStatus("error");
      }
    },
    [user, isAdmin, refreshScanStatus]
  );

  const reset = () => {
    setStatus("idle");
    setResult(null);
    setFileName(undefined);
    setError("");
  };

  const openPremiumModal = (featureName: string) => {
    setModalMode("feature");
    setModalFeature(featureName);
    setModalOpen(true);
  };

  const openLimitModal = () => {
    refreshScanStatus();
    setModalMode("limit");
    setModalFeature("");
    setModalOpen(true);
  };

  const handleUpgrade = () => {
    setModalOpen(false);
    const pricingEl = document.getElementById("pricing");
    pricingEl?.scrollIntoView({ behavior: "smooth" });
  };

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    setScanStatus(null);
    setStatus("idle");
    setResult(null);
  };

  const scansUsed = scanStatus !== null && !scanStatus.can_scan;
  const timeUntilReset = scanStatus
    ? { hours: scanStatus.time_until_reset_hours, minutes: scanStatus.time_until_reset_minutes }
    : { hours: 0, minutes: 0 };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-blue-700/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-500/5 blur-[100px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <PremiumModal
        open={modalOpen}
        featureName={modalFeature}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onUpgrade={handleUpgrade}
        hoursUntilReset={timeUntilReset.hours}
        minutesUntilReset={timeUntilReset.minutes}
      />

      <AuthModal
        open={authModalOpen}
        mode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <div className="relative z-10">
        {/* Top navigation bar */}
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

            {/* Scan counter badge */}
            {user && scanStatus && !isAdmin && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                <span className="text-[11px] text-white/40">
                  Сканов сегодня:{" "}
                  <span className="font-semibold text-cyan-400">
                    {scanStatus.scans_today}/{scanStatus.daily_limit}
                  </span>
                </span>
              </div>
            )}

            {/* Auth buttons */}
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <span className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/20">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Админ
                  </span>
                )}
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white/80"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth("login")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white/80"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Войти
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500/80 to-blue-600/80 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10 transition-all hover:from-cyan-400 hover:to-blue-500"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Регистрация
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
          {/* Hero header */}
          <header className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 ring-1 ring-white/10 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-white/60 tracking-wide">
                {user ? "Защищённый ИИ-анализ" : "Локальный ИИ-анализ"}
              </span>
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
              {user
                ? "Выберите аудиофайл для мгновенного извлечения музыкального вектора и поиска совпадений с хитами"
                : "Войдите в аккаунт для мгновенного извлечения музыкального вектора и поиска совпадений с хитами"}
            </p>
          </header>

          {/* Main card */}
          <div className="relative rounded-3xl bg-white/[0.02] p-6 sm:p-8 ring-1 ring-white/10 backdrop-blur-sm shadow-2xl">
            {/* Not signed in state */}
            {!user && (
              <div className="flex flex-col items-center gap-5 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-1 ring-white/10">
                  <LogIn className="h-7 w-7 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium text-white/90">Требуется авторизация</p>
                  <p className="text-sm text-white/40 mt-1 max-w-xs">
                    Войдите или зарегистрируйтесь для анализа треков
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => openAuth("login")}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-all"
                  >
                    <LogIn className="h-4 w-4" />
                    Войти
                  </button>
                  <button
                    onClick={() => openAuth("signup")}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500"
                  >
                    <UserPlus className="h-4 w-4" />
                    Регистрация
                  </button>
                </div>
              </div>
            )}

            {/* Signed in states */}
            {user && status === "loading" && <LoadingState />}

            {user && status === "error" && (
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

            {user && status === "done" && result && (
              <>
                <ResultsPanel result={result} onPremiumFeature={openPremiumModal} />
                <div className="mt-6 flex flex-col items-center gap-3">
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-medium text-white/60 ring-1 ring-white/10 hover:bg-white/10 hover:text-white/80 transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Анализировать другой трек
                  </button>
                  {scansUsed && (
                    <p className="text-xs text-white/30 text-center">
                      Дневной лимит исчерпан. Следующее сканирование будет доступно
                      через {timeUntilReset.hours} ч {timeUntilReset.minutes} мин.{" "}
                      <button
                        onClick={openLimitModal}
                        className="text-cyan-400/70 underline hover:text-cyan-300 transition-colors"
                      >
                        Перейти на Pro
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}

            {user && (status === "idle" || status === "blocked") && (
              <>
                {/* Limit warning */}
                {scansUsed && (
                  <div className="mb-5 rounded-2xl bg-amber-500/[0.06] p-4 ring-1 ring-amber-500/20 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-200/80">Дневной лимит исчерпан</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        До сброса: {timeUntilReset.hours} ч {timeUntilReset.minutes} мин
                      </p>
                    </div>
                    <button
                      onClick={openLimitModal}
                      className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 ring-1 ring-amber-500/20 transition-all hover:bg-amber-500/20"
                    >
                      Pro
                    </button>
                  </div>
                )}

                <div className={scansUsed ? "pointer-events-none select-none blur-sm" : ""}>
                  <DropZone onFile={handleFile} disabled={scansUsed || scanStatusLoading} fileName={fileName} />
                </div>

                {scansUsed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={openLimitModal}
                      className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500"
                    >
                      Перейти на Pro Musician
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pricing section */}
          <div id="pricing">
            <PricingSection onUpgrade={handleUpgrade} />
          </div>

          {/* Premium banner */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-600/10 p-5 ring-1 ring-cyan-500/20 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/20">
              <Crown className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white/90">MusicAI Pro Musician</p>
              <p className="text-xs text-white/40">Безлимитный анализ и глубокие инсайты</p>
            </div>
            <button
              onClick={handleUpgrade}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500"
            >
              Подробнее
            </button>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center">
            <p className="text-xs text-white/25">
              Лимиты проверяются на сервере — обработка выполняется локально в браузере
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
