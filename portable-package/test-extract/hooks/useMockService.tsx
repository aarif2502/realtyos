"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  leads as seededLeads,
  maintenanceBoard as seededMaintenance,
  notifications as seededNotifications,
  paymentSchedule as seededPayments,
  type Lead,
  type LeadStage,
  type MaintenanceStage,
  type MaintenanceTicketBoard,
  type NotificationItem,
} from "@/lib/mock-data";

type NotificationState = NotificationItem & { read: boolean };
type PaymentState = (typeof seededPayments)[number];

type MockServiceContextValue = {
  leads: Lead[];
  maintenanceBoard: MaintenanceTicketBoard[];
  notifications: NotificationState[];
  paymentSchedule: PaymentState[];
  unreadNotifications: number;
  moveLead: (leadId: string, stage: LeadStage) => void;
  moveMaintenanceTicket: (ticketId: string, stage: MaintenanceStage) => void;
  markNotificationRead: (notificationId: string) => void;
  recordPayment: (paymentId: string) => void;
};

const MockServiceContext = createContext<MockServiceContextValue | undefined>(undefined);
const storageKey = "goldenhub-realty-mock-service";

type PersistedState = {
  leads: Lead[];
  maintenanceBoard: MaintenanceTicketBoard[];
  notifications: NotificationState[];
  paymentSchedule: PaymentState[];
};

export function MockServiceProvider({ children }: { children: React.ReactNode }) {
  const hasLoadedFromStorage = useRef(false);
  const [leads, setLeads] = useState<Lead[]>(seededLeads);
  const [maintenanceBoard, setMaintenanceBoard] = useState<MaintenanceTicketBoard[]>(seededMaintenance);
  const [notifications, setNotifications] = useState<NotificationState[]>(
    seededNotifications.map((item) => ({ ...item, read: false })),
  );
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentState[]>(seededPayments);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      hasLoadedFromStorage.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PersistedState;
      if (Array.isArray(parsed.leads)) {
        setLeads(parsed.leads);
      }
      if (Array.isArray(parsed.maintenanceBoard)) {
        setMaintenanceBoard(parsed.maintenanceBoard);
      }
      if (Array.isArray(parsed.notifications)) {
        setNotifications(parsed.notifications);
      }
      if (Array.isArray(parsed.paymentSchedule)) {
        setPaymentSchedule(parsed.paymentSchedule);
      }
    } catch {
      // Ignore malformed persisted state and continue with seeded data.
    } finally {
      hasLoadedFromStorage.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedFromStorage.current) {
      return;
    }

    const snapshot: PersistedState = {
      leads,
      maintenanceBoard,
      notifications,
      paymentSchedule,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [leads, maintenanceBoard, notifications, paymentSchedule]);

  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const value = useMemo<MockServiceContextValue>(
    () => ({
      leads,
      maintenanceBoard,
      notifications,
      paymentSchedule,
      unreadNotifications,
      moveLead: (leadId, stage) => {
        setLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, stage } : lead)));
      },
      moveMaintenanceTicket: (ticketId, stage) => {
        setMaintenanceBoard((current) =>
          current.map((ticket) => (ticket.id === ticketId ? { ...ticket, stage } : ticket)),
        );
      },
      markNotificationRead: (notificationId) => {
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          ),
        );
      },
      recordPayment: (paymentId) => {
        setPaymentSchedule((current) =>
          current.map((payment) =>
            payment.id === paymentId ? { ...payment, status: "Paid" } : payment,
          ),
        );
      },
    }),
    [leads, maintenanceBoard, notifications, paymentSchedule, unreadNotifications],
  );

  return <MockServiceContext.Provider value={value}>{children}</MockServiceContext.Provider>;
}

export function useMockService() {
  const context = useContext(MockServiceContext);
  if (!context) {
    throw new Error("useMockService must be used inside MockServiceProvider");
  }
  return context;
}
