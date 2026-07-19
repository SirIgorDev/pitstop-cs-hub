// Contexto de autenticação real (mantém o nome do módulo para compatibilidade
// com os imports existentes: `useMockRole`, `ROLE_LABEL`, `Role`, `MockRoleProvider`).
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type DbRole = "analyst" | "coordinator" | "admin";
export type Role = "analista" | "coordenador" | "administrador";

const DB_TO_UI: Record<DbRole, Role> = {
  analyst: "analista",
  coordinator: "coordenador",
  admin: "administrador",
};

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  avatar_path: string | null;
  foto_url: string | null;
}

interface Ctx {
  user: AuthUser;
  role: Role;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<Ctx | null>(null);

const FALLBACK_USER: AuthUser = {
  id: "",
  nome: "Convidado",
  email: "",
  role: "analista",
  ativo: false,
  avatar_path: null,
  foto_url: null,
};

export function MockRoleProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, email, role, ativo, avatar_path")
      .eq("id", uid)
      .maybeSingle();
    if (error || !data) {
      setProfile(null);
      return;
    }
    let photoUrl: string | null = null;
    if (data.avatar_path) {
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(data.avatar_path, 60 * 60);
      photoUrl = signed?.signedUrl ?? null;
    }

    setProfile({
      id: data.id,
      nome: data.nome,
      email: data.email,
      role: DB_TO_UI[data.role as DbRole] ?? "analista",
      ativo: data.ativo,
      avatar_path: data.avatar_path,
      foto_url: photoUrl,
    });
  };

  useEffect(() => {
    // 1) listener primeiro
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        // adiar chamada para evitar deadlock
        setTimeout(() => void loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // 2) sessão inicial
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refresh = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  const user = profile ?? FALLBACK_USER;

  const value = useMemo<Ctx>(
    () => ({ user, role: user.role, session, loading, signOut, refresh }),
    [user, session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMockRole() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useMockRole/useAuth must be used within MockRoleProvider");
  return ctx;
}

export const useAuth = useMockRole;

export const ROLE_LABEL: Record<Role, string> = {
  analista: "Analista de CS",
  coordenador: "Coordenador",
  administrador: "Administrador",
};
