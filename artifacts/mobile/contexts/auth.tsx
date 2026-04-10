import React, { createContext, useContext, useState } from "react";

type Role = "customer" | "landscaper";

export interface LawnUser {
  id: number;
  username: string;
  role: Role;
  displayName: string;
  email: string;
  phone: string;
  address: string;
  zipCode: string;
  city: string;
  state: string;
  businessName: string;
  services: string;
  yearsExperience: string;
}

interface AuthContextType {
  role: Role | null;
  user: LawnUser | null;
  userName: string;
  avatarUri: string | null;
  preferredPayment: string | null;
  needsServiceSetup: boolean;
  isBanned: boolean;
  login: (user: LawnUser) => void;
  logout: () => void;
  banUser: () => void;
  setAvatarUri: (uri: string | null) => void;
  setPreferredPayment: (v: string | null) => void;
  setNeedsServiceSetup: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  user: null,
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LawnUser | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [preferredPayment, setPreferredPayment] = useState<string | null>(null);
  const [needsServiceSetup, setNeedsServiceSetup] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  const role = user?.role ?? null;
  const userName = user?.displayName ?? "";

  const login = (u: LawnUser) => setUser(u);

  const logout = () => {
    setUser(null);
    setAvatarUri(null);
    setPreferredPayment(null);
    setNeedsServiceSetup(false);
    setIsBanned(false);
  };

  const banUser = () => {
    setIsBanned(true);
    setUser(null);
    setAvatarUri(null);
    setPreferredPayment(null);
    setNeedsServiceSetup(false);
  };

  return (
    <AuthContext.Provider value={{
      role, user, userName, avatarUri, preferredPayment,
      needsServiceSetup, isBanned,
      login, logout, banUser,
      setAvatarUri, setPreferredPayment, setNeedsServiceSetup,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
