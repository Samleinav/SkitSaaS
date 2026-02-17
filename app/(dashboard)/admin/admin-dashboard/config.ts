import type { AdminDashboardModuleId } from './types';

export const ADMIN_DASHBOARD_ENABLED_MODULES_ENV_KEY =
  'ADMIN_DASHBOARD_ENABLED_MODULES';

export const ADMIN_DASHBOARD_MODULE_VISIBILITY: Record<
  AdminDashboardModuleId,
  boolean
> = {
  overview: true,
  quickLinks: true,
  recentActivity: true
};
