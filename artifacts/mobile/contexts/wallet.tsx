import React, { createContext, useContext, useState } from "react";

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
  addFunds: (amount: number, description: string) => void;
  recordWithdrawal: (amount: number, method: string) => void;
}

const WalletContext = createContext<WalletContextType>({
  balance: 0,
  transactions: [],
  addFunds: () => {},
  recordWithdrawal: () => {},
});

const SEED: WalletTransaction[] = [
  { id: "t1", type: "credit", amount: 85,  description: "Mowing/Edging — Alex T.",      date: "Apr 7, 2026",  status: "completed" },
  { id: "t2", type: "credit", amount: 140, description: "Weeding/Mulching — Priya N.",  date: "Apr 5, 2026",  status: "completed" },
  { id: "t3", type: "debit",  amount: 100, description: "Withdrawal — PayPal",           date: "Apr 4, 2026",  status: "completed" },
  { id: "t4", type: "credit", amount: 85,  description: "Mowing/Edging — Marcus R.",    date: "Apr 3, 2026",  status: "completed" },
  { id: "t5", type: "credit", amount: 210, description: "Sod Installation — Diane W.",  date: "Apr 1, 2026",  status: "completed" },
  { id: "t6", type: "credit", amount: 85,  description: "Mowing/Edging — Carlos F.",    date: "Mar 29, 2026", status: "completed" },
];

const INITIAL_BALANCE = SEED.reduce(
  (sum, t) => (t.type === "credit" ? sum + t.amount : sum - t.amount),
  0
);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(SEED);

  const today = () =>
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

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
  };

  return (
    <WalletContext.Provider value={{ balance, transactions, addFunds, recordWithdrawal }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
