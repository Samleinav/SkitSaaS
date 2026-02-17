import type { AdminMessages } from '@/lib/i18n/messages/admin';

export type AdminDashboardModuleId =
  | 'overview'
  | 'quickLinks'
  | 'recentActivity';

export type AdminDashboardSummary = {
  totalUsers: number;
  totalTeams: number;
  activeSubscriptions: number;
  issueSubscriptions: number;
  pendingOrders: number;
  failedOrders: number;
};

export type AdminDashboardRecentActivity = {
  id: number;
  eventType: string;
  status: string;
  message: string | null;
  createdAt: Date;
};

export type AdminDashboardActivityPoint = {
  date: string;
  users: number;
  subscriptions: number;
  sales: number;
};

export type AdminDashboardModuleProps = {
  messages: AdminMessages;
  dateLocale: string;
  summary: AdminDashboardSummary;
  recentActivity: AdminDashboardRecentActivity[];
  activityChart: AdminDashboardActivityPoint[];
};
