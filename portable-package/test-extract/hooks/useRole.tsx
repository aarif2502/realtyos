"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppRole = "admin" | "agent" | "accountant" | "owner" | "tenant";

type RoleContextValue = {
  role: AppRole;
  setRole: (role: AppRole) => void;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);
const storageKey = "goldenhub-realty-role";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<AppRole>("admin");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (saved && ["admin", "agent", "accountant", "owner", "tenant"].includes(saved)) {
      setRoleState(saved as AppRole);
    }
  }, []);

  const setRole = (nextRole: AppRole) => {
    setRoleState(nextRole);
    window.localStorage.setItem(storageKey, nextRole);
  };

  const value = useMemo(() => ({ role, setRole }), [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used inside RoleProvider");
  }
  return context;
}
