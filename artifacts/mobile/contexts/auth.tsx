import React, { createContext, useContext, useState } from "react";

type Role = "customer" | "landscaper";

interface AuthContextType {
  role: Role | null;
  userName: string;
  avatarUri: string | null;
  preferredPayment: string | null;
  needsServiceSetup: boolean;
  isBanned: boolean;
  login: (r: Role) => void;
  logout: () => void;
  banUser: () => void;
  setAvatarUri: (uri: string | null) => void;
  setPreferredPayment: (v: string | null) => void;
  setNeedsServiceSetup: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  userName: "",
  avatarUri: null,
  preferredPayment: null,
  needsServiceSetup: false,
  isBanned: false,
  login: () => {},
  logout: () => {},
  banUser: () => {},
  setAvatarUri: () => {},
  setPreferredPayment: () => {},
  setNeedsServiceSetup: () => {},
});

const ROLE_NAMES: Record<Role, string> = {
  customer: "Zamire Smith",
  landscaper: "GreenScape Pros",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [preferredPayment, setPreferredPayment] = useState<string | null>(null);
  const [needsServiceSetup, setNeedsServiceSetup] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  const login = (r: Role) => setRole(r);
  const logout = () => {
    setRole(null);
    setAvatarUri(null);
    setPreferredPayment(null);
    setNeedsServiceSetup(false);
    setIsBanned(false);
  };
  const banUser = () => {
    setIsBanned(true);
    setRole(null);
    setAvatarUri(null);
    setPreferredPayment(null);
    setNeedsServiceSetup(false);
  };

  const userName = role ? ROLE_NAMES[role] : "";

  return (
    <AuthContext.Provider value={{ role, userName, avatarUri, preferredPayment, needsServiceSetup, isBanned, login, logout, banUser, setAvatarUri, setPreferredPayment, setNeedsServiceSetup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
