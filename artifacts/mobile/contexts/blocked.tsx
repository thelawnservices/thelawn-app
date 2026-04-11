import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "lawn_blocked_landscapers_v1";

type BlockedContextType = {
  blockedNames: Set<string>;
  isBlocked: (name: string) => boolean;
  blockLandscaper: (name: string) => void;
  unblockLandscaper: (name: string) => void;
};

const BlockedContext = createContext<BlockedContextType>({
  blockedNames: new Set(),
  isBlocked: () => false,
  blockLandscaper: () => {},
  unblockLandscaper: () => {},
});

export function BlockedProvider({ children }: { children: React.ReactNode }) {
  const [blockedNames, setBlockedNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const arr: string[] = JSON.parse(raw);
          setBlockedNames(new Set(arr));
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((next: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  }, []);

  const blockLandscaper = useCallback((name: string) => {
    setBlockedNames((prev) => {
      const next = new Set(prev);
      next.add(name);
      persist(next);
      return next;
    });
  }, [persist]);

  const unblockLandscaper = useCallback((name: string) => {
    setBlockedNames((prev) => {
      const next = new Set(prev);
      next.delete(name);
      persist(next);
      return next;
    });
  }, [persist]);

  const isBlocked = useCallback((name: string) => blockedNames.has(name), [blockedNames]);

  return (
    <BlockedContext.Provider value={{ blockedNames, isBlocked, blockLandscaper, unblockLandscaper }}>
      {children}
    </BlockedContext.Provider>
  );
}

export function useBlocked() {
  return useContext(BlockedContext);
}
