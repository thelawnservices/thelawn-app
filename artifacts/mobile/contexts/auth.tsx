import React, { createContext, useContext, useState } from "react";

type Role = "customer" | "landscaper";

interface AuthContextType {
  role: Role | null;
  userName: string;
  avatarUri: string | null;
  login: (r: Role) => void;
  logout: () => void;
  setAvatarUri: (uri: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  userName: "",
  avatarUri: null,
  login: () => {},
  logout: () => {},
  setAvatarUri: () => {},
});

const ROLE_NAMES: Record<Role, string> = {
  customer: "Zamire Smith",
  landscaper: "GreenScape Pros",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const login = (r: Role) => setRole(r);
  const logout = () => { setRole(null); setAvatarUri(null); };

  const userName = role ? ROLE_NAMES[role] : "";

  return (
    <AuthContext.Provider value={{ role, userName, avatarUri, login, logout, setAvatarUri }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
