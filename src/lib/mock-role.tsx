// Contexto de autenticação real (mantém o nome do módulo para compatibilidade
// com os imports existentes: `useMockRole`, `ROLE_LABEL`, `Role`, `MockRoleProvider`).
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type DbRole = "analyst" | "coordinator" | "process_analyst" | "admin";
export type Role = "analista" | "coordenador" | "analista_processos" | "administrador";
export type PermissionScope = "own" | "all";
export type PermissionMap = Record<string, PermissionScope>;

const OPERATIONAL_PERMISSIONS = [
  "relationship.view",
  "technical_support.view",
  "pitstop.monitor.view",
  "pitstop.records.view",
  "pitstop.records.create",
  "pitstop.records.update",
  "pitstop.records.inactivate",
  "carteira.monitor.view",
  "neo.records.view",
  "neo.records.create",
  "neo.records.update",
  "neo.records.inactivate",
  "neo.records.export",
  "document_cleaner.use",
];

function legacyPermissions(role: Role): PermissionMap {
  const own = Object.fromEntries(OPERATIONAL_PERMISSIONS.map((code) => [code, "own"]));
  if (role === "analista") return own as PermissionMap;
  if (role === "analista_processos") {
    return {
      ...own,
      "dispatch.view": "own",
      "dispatch.import": "all",
      "dispatch.update": "own",
      "dispatch.inactivate": "own",
      "dispatch.export": "own",
    } as PermissionMap;
  }
  if (role === "coordenador") {
    return {
      ...Object.fromEntries(OPERATIONAL_PERMISSIONS.map((code) => [code, "all"])),
      "audit.view": "all",
    } as PermissionMap;
  }
  return {
    ...Object.fromEntries(
      [
        ...OPERATIONAL_PERMISSIONS,
        "dispatch.view",
        "dispatch.import",
        "dispatch.update",
        "dispatch.inactivate",
        "dispatch.export",
        "audit.view",
        "administration.view",
        "administration.users.manage",
        "administration.lists.manage",
        "administration.roles.manage",
      ].map((code) => [code, "all"]),
    ),
  } as PermissionMap;
}

export function isIndividualAnalyst(role: Role) {
  return role === "analista" || role === "analista_processos";
}

const DB_TO_UI: Record<DbRole, Role> = {
  analyst: "analista",
  coordinator: "coordenador",
  process_analyst: "analista_processos",
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
  permissions: PermissionMap;
  rbacEnabled: boolean;
  cargo: { id: string; codigo: string; nome: string; protegido: boolean } | null;
  hasPermission: (code: string) => boolean;
  permissionScope: (code: string) => PermissionScope | null;
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
  const [access, setAccess] = useState<{
    rbacEnabled: boolean;
    cargo: Ctx["cargo"];
    permissions: PermissionMap;
  } | null>(null);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, email, role, ativo, avatar_path")
      .eq("id", uid)
      .maybeSingle();
    if (error || !data) {
      setProfile(null);
      setAccess(null);
      return;
    }
    let photoUrl: string | null = null;
    if (data.avatar_path) {
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(data.avatar_path, 60 * 60);
      photoUrl = signed?.signedUrl ?? null;
    }

    const nextProfile = {
      id: data.id,
      nome: data.nome,
      email: data.email,
      role: DB_TO_UI[data.role as DbRole] ?? "analista",
      ativo: data.ativo,
      avatar_path: data.avatar_path,
      foto_url: photoUrl,
    } satisfies AuthUser;
    setProfile(nextProfile);

    // A chamada e separada da leitura do perfil para manter compatibilidade caso
    // a migration de RBAC ainda nao tenha sido aplicada ou seja revertida.
    const { data: accessData, error: accessError } = await supabase.rpc(
      "current_user_access" as never,
    );
    if (accessError || !accessData || typeof accessData !== "object") {
      setAccess(null);
      return;
    }
    const parsed = accessData as unknown as {
      rbac_enabled?: boolean;
      cargo?: Ctx["cargo"];
      permissions?: PermissionMap;
    };
    setAccess({
      rbacEnabled: parsed.rbac_enabled === true,
      cargo: parsed.cargo ?? null,
      permissions: parsed.permissions ?? {},
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
        setAccess(null);
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
    setAccess(null);
    setSession(null);
  };

  const refresh = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  const user = profile ?? FALLBACK_USER;
  const rbacEnabled = access?.rbacEnabled === true;
  const permissions = rbacEnabled ? access.permissions : legacyPermissions(user.role);

  const value = useMemo<Ctx>(
    () => ({
      user,
      role: user.role,
      session,
      loading,
      permissions,
      rbacEnabled,
      cargo: rbacEnabled ? (access?.cargo ?? null) : null,
      hasPermission: (code: string) => Boolean(permissions[code]),
      permissionScope: (code: string) => permissions[code] ?? null,
      signOut,
      refresh,
    }),
    [user, session, loading, permissions, rbacEnabled, access?.cargo],
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
  analista_processos: "Analista de Processos",
  administrador: "Administrador",
};
