import React, { createContext, useContext, useState } from "react";

type Role = "customer" | "landscaper";

interface AuthContextType {
  role: Role | null;
  login: (r: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const login = (r: Role) => setRole(r);
  const logout = () => setRole(null);
  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
