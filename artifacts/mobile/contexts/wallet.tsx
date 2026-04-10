import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export type WalletTransaction = {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  date: string;
  status: "completed" | "pending";
};

interface WalletContextType {
  balance: number;
  transactions: WalletTransaction[];
  loading: boolean;
  addFunds: (amount: number, description: string) => void;
  recordWithdrawal: (amount: number, method: string) => void;
  refreshWallet: (name: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  balance: 0,
  transactions: [],
  loading: false,
  addFunds: () => {},
  recordWithdrawal: () => {},
  refreshWallet: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance]           = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading]           = useState(false);
  const landscaperNameRef               = useRef<string | null>(null);

  const today = () =>
    new Date().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });

  async function refreshWallet(name: string) {
    if (!name || !API_URL) return;
    landscaperNameRef.current = name;
    setLoading(true);
    try {
      const [balRes, txRes] = await Promise.all([
        fetch(`${API_URL}/api/wallet/balance?name=${encodeURIComponent(name)}`),
        fetch(`${API_URL}/api/wallet/transactions?name=${encodeURIComponent(name)}`),
      ]);
      if (balRes.ok) {
        const { balance: b } = await balRes.json();
        setBalance(typeof b === "number" ? b : 0);
      }
      if (txRes.ok) {
        const { transactions: txs } = await txRes.json();
        if (Array.isArray(txs)) setTransactions(txs);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const addFunds = (amount: number, description: string) => {
    const tx: WalletTransaction = {
      id: Date.now().toString(),
      type: "credit",
      amount,
      description,
      date: today(),
      status: "completed",
    };
    setTransactions((p) => [tx, ...p]);
    setBalance((p) => p + amount);
  };

  const recordWithdrawal = (amount: number, method: string) => {
    const tx: WalletTransaction = {
      id: Date.now().toString(),
      type: "debit",
      amount,
      description: `Withdrawal — ${method}`,
      date: today(),
      status: "pending",
    };
    setTransactions((p) => [tx, ...p]);
    setBalance((p) => p - amount);

    // Persist to DB if we know the landscaper name
    const name = landscaperNameRef.current;
    if (name && API_URL) {
      fetch(`${API_URL}/api/wallet/record-withdrawal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landscaperName: name, amount, method, status: "pending" }),
      }).catch(() => {});
    }
  };

  return (
    <WalletContext.Provider value={{ balance, transactions, loading, addFunds, recordWithdrawal, refreshWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
