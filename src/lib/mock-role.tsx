import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "analista" | "coordenador" | "administrador";

export interface MockUser {
  nome: string;
  email: string;
  role: Role;
}

const USERS: Record<Role, MockUser> = {
  analista: { nome: "Marina Alves", email: "marina.alves@fortestecnologia.com.br", role: "analista" },
  coordenador: { nome: "Rafael Cordeiro", email: "rafael.cordeiro@fortestecnologia.com.br", role: "coordenador" },
  administrador: { nome: "Juliana Prado", email: "juliana.prado@fortestecnologia.com.br", role: "administrador" },
};

const STORAGE_KEY = "pitstop.mock.role";

interface Ctx {
  user: MockUser;
  role: Role;
  setRole: (r: Role) => void;
}

const RoleContext = createContext<Ctx | null>(null);

export function MockRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("analista");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved === "analista" || saved === "coordenador" || saved === "administrador") {
      setRoleState(saved);
    }
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, r);
  };

  const value = useMemo<Ctx>(() => ({ role, setRole, user: USERS[role] }), [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useMockRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useMockRole must be used within MockRoleProvider");
  return ctx;
}

export const ROLE_LABEL: Record<Role, string> = {
  analista: "Analista de CS",
  coordenador: "Coordenador",
  administrador: "Administrador",
};
