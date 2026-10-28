import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/authContext";
import {
  Users, Activity, Zap, BarChart3, Settings, LogOut,
  CheckCircle2, XCircle, Clock, Crown,
} from "lucide-react";

interface AdminStats {
  total_users: number;
  total_scans: number;
  scans_today: number;
  daily_limit: number;
  active_users_24h: number;
}

interface LogEntry {
  id: string;
  user_id: string;
  file_name: string | null;
  created_at: string;
  user_email: string | null;
}

export default function AdminDashboard({ onSignOut }: { onSignOut: () => void }) {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [limit, setLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingLimit, setSavingLimit] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("get_recent_logs", { p_limit: 15 }),
      ]);

      if (statsRes.data) {
        const s = statsRes.data as AdminStats;
        setStats(s);
        setLimit(s.daily_limit);
      }
      if (logsRes.data) {
        setLogs(logsRes.data as LogEntry[]);
      }
    } catch (e) {
      console.error("Ошибка загрузки данных администратора:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveLimit = async () => {
    setSavingLimit(true);
    setSaveMsg("");
    const { data } = await supabase.rpc("update_daily_limit", { p_limit: limit });
    if (data) {
      setSaveMsg("Лимит обновлён");
      setTimeout(() => setSaveMsg(""), 3000);
    }
    setSavingLimit(false);
  };

  const handleSignOut = async () => {
    await signOut();
    onSignOut();
  };

  const statCards = [
    {
      label: "Всего пользователей",
      value: stats?.total_users ?? 0,
      icon: Users,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      ring: "ring-cyan-500/20",
    },
    {
      label: "Всего сканирований",
      value: stats?.total_scans ?? 0,
      icon: Activity,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      ring: "ring-blue-500/20",
    },
    {
      label: "Сканирований сегодня",
      value: stats?.scans_today ?? 0,
      icon: BarChart3,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      ring: "ring-emerald-500/20",
    },
    {
      label: "Активных за 24ч",
      value: stats?.active_users_24h ?? 0,
      icon: Zap,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      ring: "ring-amber-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-blue-700/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-5 py-8">
        {/* Admin header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-1 ring-white/10">
              <Crown className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Панель администратора</h1>
              <p className="text-xs text-white/40">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white/80"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>

        {/* Status badge */}
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-500/[0.06] px-4 py-3 ring-1 ring-emerald-500/20">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-200/70">Система работает в штатном режиме</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-white/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Онлайн
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10"
                >
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ring-1 ${card.ring}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <p className="text-3xl font-bold tabular-nums text-white">{card.value}</p>
                  <p className="text-xs text-white/40 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Limit control */}
            <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white/90">Глобальный лимит сканирований</h2>
              </div>
              <p className="text-xs text-white/40 mb-4">
                Установите дневной лимит бесплатных сканирований для всех пользователей
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLimit((v) => Math.max(0, v - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-2xl font-bold tabular-nums text-white">{limit}</span>
                  <button
                    onClick={() => setLimit((v) => v + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleSaveLimit}
                  disabled={savingLimit || limit === stats?.daily_limit}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-default"
                >
                  {savingLimit ? "Сохранение..." : "Сохранить"}
                </button>
                {saveMsg && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>

            {/* System logs */}
            <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white/90">Логи активности ИИ</h2>
              </div>
              
              <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-2">
                {logs.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4">История активности пуста</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-white/[0.02] rounded-xl border border-white/5 gap-1">
                      <div>
                        <div className="text-xs font-medium text-white/80">{log.user_email || "Анонимный пользователь"}</div>
                        <div className="text-[11px] text-white/40 font-mono mt-0.5">Файл: {log.file_name || "Не указан"}</div>
                      </div>
                      <div className="text-[10px] text-white/30 tabular-nums">
                        {new Date(log.created_at).toLocaleString("ru-RU")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
