import React, { createContext, useContext, useState } from "react";

export type ServiceNotification = {
  id: string;
  icon: string;
  title: string;
  sub: string;
  type?: "service" | "announcement";
  timestamp?: string;
};

export type ActiveDiscount = {
  landscaperName: string;
  discountPct: number | null;
  discountAmt: number | null;
  label: string;
  announcementTitle: string;
};

type NotificationsContextType = {
  notifications: ServiceNotification[];
  addNotification: (n: Omit<ServiceNotification, "id">) => void;
  broadcastAnnouncement: (landscaperName: string, title: string, message: string) => void;
  clearNotifications: () => void;
  activeDiscounts: ActiveDiscount[];
  getDiscountForPro: (name: string) => ActiveDiscount | null;
};

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  addNotification: () => {},
  broadcastAnnouncement: () => {},
  clearNotifications: () => {},
  activeDiscounts: [],
  getDiscountForPro: () => null,
});

function parseDiscount(title: string, message: string): Omit<ActiveDiscount, "landscaperName"> | null {
  const text = `${title} ${message}`.toLowerCase();

  let discountPct: number | null = null;
  let discountAmt: number | null = null;
  let label = "";

  const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:off|discount|savings?|deal|sale)?/);
  if (pctMatch) {
    discountPct = parseFloat(pctMatch[1]);
    label = `${discountPct}% off`;
  }

  if (!discountPct) {
    const amtMatch =
      text.match(/\$\s*(\d+(?:\.\d+)?)\s*off/) ||
      text.match(/save\s+\$?\s*(\d+(?:\.\d+)?)/) ||
      text.match(/(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?)\s*off/);
    if (amtMatch) {
      discountAmt = parseFloat(amtMatch[1]);
      label = `$${discountAmt} off`;
    }
  }

  if (!discountPct && !discountAmt) return null;

  const announcementTitle = title.trim() || message.split(" ").slice(0, 6).join(" ");
  return { discountPct, discountAmt, label, announcementTitle };
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<ServiceNotification[]>([]);
  const [activeDiscounts, setActiveDiscounts] = useState<ActiveDiscount[]>([]);

  function addNotification(n: Omit<ServiceNotification, "id">) {
    const id = String(Date.now());
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setNotifications((prev) => [{ ...n, id, timestamp, type: n.type ?? "service" }, ...prev]);
  }

  function broadcastAnnouncement(landscaperName: string, title: string, message: string) {
    const id = String(Date.now());
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setNotifications((prev) => [
      {
        id,
        icon: "megaphone-outline",
        title: `📣 ${landscaperName}: ${title}`,
        sub: message,
        type: "announcement",
        timestamp,
      },
      ...prev,
    ]);

    const parsed = parseDiscount(title, message);
    if (parsed) {
      setActiveDiscounts((prev) => {
        const filtered = prev.filter((d) => d.landscaperName !== landscaperName);
        return [{ landscaperName, ...parsed }, ...filtered];
      });
    }
  }

  function clearNotifications() {
    setNotifications([]);
  }

  function getDiscountForPro(name: string): ActiveDiscount | null {
    return activeDiscounts.find((d) => d.landscaperName === name) ?? null;
  }

  return (
    <NotificationsContext.Provider
      value={{ notifications, addNotification, broadcastAnnouncement, clearNotifications, activeDiscounts, getDiscountForPro }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
