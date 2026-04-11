import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import { registerPushTokenWithServer } from "@/utils/pushNotifications";
import { identifyUser, resetUser, track } from "@/utils/analytics";
import { setCrashUser, clearCrashUser } from "@/utils/crashReporter";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

async function fetchRemoteAvatar(username: string, role: string): Promise<string | null> {
  try {
    const resp = await fetch(`${API_URL}/api/profiles/${username}/${role}/images`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.avatar || null;
  } catch {
    return null;
  }
}

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
  appleId?: string;
}

interface StoredSession {
  user: LawnUser;
  lastActivity: number;
}

const SESSION_KEY = "lawn_session_v1";
const INACTIVITY_MS = 72 * 60 * 60 * 1000; // 72 hours

interface AuthContextType {
  role: Role | null;
  user: LawnUser | null;
  userName: string;
  avatarUri: string | null;
  preferredPayment: string | null;
  needsServiceSetup: boolean;
  isBanned: boolean;
  isLoading: boolean;
  login: (user: LawnUser) => Promise<void>;
  logout: () => Promise<void>;
  banUser: () => void;
  setAvatarUri: (uri: string | null) => void;
  setPreferredPayment: (v: string | null) => void;
  setNeedsServiceSetup: (v: boolean) => void;
  updateUser: (partial: Partial<LawnUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  user: null,
  userName: "",
  avatarUri: null,
  preferredPayment: null,
  needsServiceSetup: false,
  isBanned: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  banUser: () => {},
  setAvatarUri: () => {},
  setPreferredPayment: () => {},
  setNeedsServiceSetup: () => {},
  updateUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LawnUser | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [preferredPayment, setPreferredPayment] = useState<string | null>(null);
  const [needsServiceSetup, setNeedsServiceSetup] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── Restore session on mount ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const session = JSON.parse(raw) as StoredSession;
          const elapsed = Date.now() - session.lastActivity;
          if (elapsed < INACTIVITY_MS) {
            setUser(session.user);
            await AsyncStorage.setItem(
              SESSION_KEY,
              JSON.stringify({ user: session.user, lastActivity: Date.now() })
            );
            const remoteAvatar = await fetchRemoteAvatar(session.user.username, session.user.role);
            if (remoteAvatar) setAvatarUri(remoteAvatar);
            setCrashUser(session.user.username, session.user.role);
            identifyUser(session.user.username, { role: session.user.role });
            registerPushTokenWithServer(session.user.username, session.user.role).catch(() => {});
          } else {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  // ── Check expiry when app returns to foreground ──────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev.match(/inactive|background/) && next === "active") {
        try {
          const raw = await AsyncStorage.getItem(SESSION_KEY);
          if (raw) {
            const { lastActivity } = JSON.parse(raw) as StoredSession;
            if (Date.now() - lastActivity >= INACTIVITY_MS) {
              await AsyncStorage.removeItem(SESSION_KEY);
              clearState();
            }
          }
        } catch {}
      }
    });
    return () => sub.remove();
  }, []);

  function clearState() {
    setUser(null);
    setAvatarUri(null);
    setPreferredPayment(null);
    setNeedsServiceSetup(false);
    setIsBanned(false);
  }

  const role = user?.role ?? null;
  const userName = user?.displayName ?? "";

  const login = async (u: LawnUser) => {
    setUser(u);
    try {
      await AsyncStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ user: u, lastActivity: Date.now() })
      );
    } catch {}
    const remoteAvatar = await fetchRemoteAvatar(u.username, u.role);
    if (remoteAvatar) setAvatarUri(remoteAvatar);
    setCrashUser(u.username, u.role);
    identifyUser(u.username, { role: u.role, displayName: u.displayName });
    track("login", { role: u.role });
    registerPushTokenWithServer(u.username, u.role).catch(() => {});
  };

  const logout = async () => {
    resetUser();
    clearCrashUser();
    track("logout");
    clearState();
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch {}
  };

  const banUser = () => {
    setIsBanned(true);
    clearState();
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  };

  const updateUser = async (partial: Partial<LawnUser>) => {
    if (!user) return;
    const updated = { ...user, ...partial };
    setUser(updated);
    try {
      await AsyncStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ user: updated, lastActivity: Date.now() })
      );
    } catch {}
  };

  return (
    <AuthContext.Provider value={{
      role, user, userName, avatarUri, preferredPayment,
      needsServiceSetup, isBanned, isLoading,
      login, logout, banUser,
      setAvatarUri, setPreferredPayment, setNeedsServiceSetup,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
