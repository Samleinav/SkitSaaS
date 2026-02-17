import { defineModule, type ModuleManifest } from '@skitsaas/sdk';

export default defineModule({
  moduleId: 'mod.example.dashboard',
  version: '0.1.0',
  displayName: 'Example Dashboard',
  dashboardRouteAliases: ['/dashboard/custom/example-dashboard'],
  frontendRouteAliases: ['/features/example-dashboard'],
  dashboardNavItems: [
    {
      id: 'mod.example.dashboard.nav',
      href: '/dashboard/custom/example-dashboard',
      label: 'Example Dashboard',
      order: 80
    }
  ],
  dashboardPage: async () => {
    return 'Example dashboard module is enabled.';
  },
  frontendPage: async () => {
    return 'Example frontend module is enabled.';
  },
  frontendSlots: [
    {
      slotId: 'frontend.contact.form.primary',
      handler: async () => {
        return 'Example contact form slot rendered from module.';
      }
    }
  ]
} satisfies ModuleManifest);
