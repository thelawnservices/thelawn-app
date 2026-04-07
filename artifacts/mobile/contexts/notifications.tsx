import React, { createContext, useContext, useState } from "react";

export type ServiceNotification = {
  id: string;
  icon: string;
  title: string;
  sub: string;
};

type NotificationsContextType = {
  notifications: ServiceNotification[];
  addNotification: (n: Omit<ServiceNotification, "id">) => void;
  clearNotifications: () => void;
};

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  addNotification: () => {},
  clearNotifications: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<ServiceNotification[]>([]);

  function addNotification(n: Omit<ServiceNotification, "id">) {
    const id = String(Date.now());
    setNotifications((prev) => [{ ...n, id }, ...prev]);
  }

  function clearNotifications() {
    setNotifications([]);
  }

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification, clearNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
