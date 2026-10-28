import { useState, useCallback, useEffect, Component, type ReactNode } from "react";
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

// КЛАСС-ПЕРЕХВАТЧИК ДЛЯ ДИАГНОСТИКИ ОШИБОК НА ТЕЛЕФОНЕ
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "30px", background: "#1a0505", color: "#ff8888", minHeight: "screen", fontFamily: "monospace", fontSize: "14px", lineHeight: "1.6", border: "2px solid red", margin: "20px", borderRadius: "12px" }}>
          <h2 style={{ color: "#ff3333", marginBottom: "15px" }}>🚨 ИИ-Анализатор: Обнаружена критическая ошибка кода!</h2>
          <p style={{ background: "#2a0a0a", padding: "10px", borderRadius: "6px", wordBreak: "break-all" }}>
            <strong>Текст ошибки:</strong> {this.state.error?.toString()}
          </p>
          <p style={{ marginTop: "15px", color: "#bbb" }}>
            <strong>Стек вызовов:</strong> {this.state.error?.stack}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

type Status = "idle" | "loading" | "done" | "error" | "blocked";

function MainAppContent() {
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

  if (isAdmin) {
    return <AdminDashboard onSignOut={() => refreshScanStatus()} />;
  }

  const handleFile = useCallback(
    async (file: File) => {
      if (!user) {
        setAuthMode("login");
        setAuthModalOpen(true);
        return;
      }

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

        if (!isAdmin) {
          const recordResult = await recordScanServer(file.name);
          if (recordResult && !recordResult.allowed) {
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

  const handleUpgrade = () => {
    setModalOpen(false);
    const pricingEl = document.getElementById("pricing");
    pricingEl?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSignOut = async () => {
    await signOut();
    setScanStatus(null);
    setStatus("idle");
    setResult(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-blue-700/10 blur-[120px]" />
      </div>

      <PremiumModal
        open={modalOpen}
        featureName={modalFeature}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onUpgrade={handleUpgrade}
        hoursUntilReset={scanStatus ? scanStatus.time_until_reset_hours : 0}
        minutesUntilReset={scanStatus ? scanStatus.time_until_reset_minutes : 0}
      />

      <AuthModal
        open={authModalOpen}
        mode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <div className="relative z-10">
        <nav className="sticky top-0 z-20 border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur-md">
          <div className="mx-auto max-w-2xl px-5 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Music<span className="text-cyan-400">AI</span></span>
            </div>
            {user ? (
              <div className="flex items-center gap-2">
                <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 ring-1 ring-white/10 hover:bg-white/10">Выйти</button>
              </div>
            ) : (
              <button onClick={() => { setAuthMode("login"); setAuthModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400">Войти</button>
            )}
          </div>
        </nav>

        <main className="mx-auto max-w-2xl px-5 py-10">
          {status === "idle" && <DropZone onFileSelect={handleFile} />}
          {status === "loading" && <LoadingState />}
          {status === "done" && result && <ResultsPanel result={result} onReset={reset} onPremiumClick={openPremiumModal} />}
        </main>
      </div>
    </div>
  );
}

// ФИНАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ВНУТРИ ДИАГНОСТИЧЕСКОГО БЛОКА
export default function App() {
  return (
    <ErrorBoundary>
      <MainAppContent />
    </ErrorBoundary>
  );
}
