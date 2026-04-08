import React, { createContext, useContext, useState } from "react";

export type ServiceNotification = {
  id: string;
  icon: string;
  title: string;
  sub: string;
  type?: "service" | "announcement";
  timestamp?: string;
};

type NotificationsContextType = {
  notifications: ServiceNotification[];
  addNotification: (n: Omit<ServiceNotification, "id">) => void;
  broadcastAnnouncement: (landscaperName: string, title: string, message: string) => void;
  clearNotifications: () => void;
};

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  addNotification: () => {},
  broadcastAnnouncement: () => {},
  clearNotifications: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<ServiceNotification[]>([]);

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
  }

  function clearNotifications() {
    setNotifications([]);
  }

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification, broadcastAnnouncement, clearNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
