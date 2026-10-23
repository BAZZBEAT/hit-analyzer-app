import { useState } from "react";
import { X, LogIn, UserPlus, Mail, Lock } from "lucide-react";
import { useAuth } from "@/lib/authContext";

interface AuthModalProps {
  open: boolean;
  mode: "login" | "signup";
  onClose: () => void;
}

export default function AuthModal({ open, mode, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fn = isLogin ? signIn : signUp;
    const { error: err } = await fn(email, password);

    if (err) {
      setError(err);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-3xl bg-[#0e1320] p-8 ring-1 ring-white/10 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-cyan-500/15 blur-[80px]" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-1 ring-white/10">
            {isLogin ? <LogIn className="h-7 w-7 text-cyan-400" /> : <UserPlus className="h-7 w-7 text-cyan-400" />}
          </div>

          <h2 className="text-center text-xl font-bold text-white">
            {isLogin ? "Вход в аккаунт" : "Регистрация"}
          </h2>
          <p className="mt-2 text-center text-sm text-white/40">
            {isLogin ? "Войдите для анализа треков" : "Создайте аккаунт для начала работы"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-white/50 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] pl-10 pr-4 py-3 text-sm text-white ring-1 ring-white/10 placeholder:text-white/20 focus:outline-none focus:ring-cyan-500/40 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-white/50 mb-1.5 block">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] pl-10 pr-4 py-3 text-sm text-white ring-1 ring-white/10 placeholder:text-white/20 focus:outline-none focus:ring-cyan-500/40 transition-all"
                  placeholder="Минимум 6 символов"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50"
            >
              {loading ? "Загрузка..." : isLogin ? "Войти" : "Создать аккаунт"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
