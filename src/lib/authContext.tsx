import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, ADMIN_EMAIL } from "@/lib/supabaseClient";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Исправленная функция проверки роли с резервным определением по вашей личной почте
const hasAdminRole = (user: User | null) => {
  if (!user || !user.email) return false;
  const emailNormalized = user.email.trim().toLowerCase();
  
  // Защищенное сопоставление: проверяем роль в метаданных ИЛИ точное совпадение с вашей админской почтой
  return (
    user.app_metadata?.role === "admin" || 
    emailNormalized === "beatmakerbazzbeat@gmail.com" ||
    (typeof ADMIN_EMAIL === "string" && emailNormalized === ADMIN_EMAIL.toLowerCase())
  );
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsAdmin(hasAdminRole(data.session?.user ?? null));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsAdmin(hasAdminRole(newSession?.user ?? null));
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Ошибка сети при авторизации" };
    }
  };

  const signUp = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail === "beatmakerbazzbeat@gmail.com" || 
      (typeof ADMIN_EMAIL === "string" && normalizedEmail === ADMIN_EMAIL.toLowerCase())
    ) {
      return {
        error:
          "Регистрация администратора через сайт отключена. Выберите «Войти»; если аккаунт ещё не создан, создайте его через Supabase Dashboard.",
      };
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Ошибка регистрации" };
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
