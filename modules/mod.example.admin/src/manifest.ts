import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import { renderExampleAdminPage } from './showcase';

export default defineModule({
  moduleId: 'mod.example.admin',
  version: '0.1.0',
  displayName: 'Example Admin',
  adminRouteAliases: ['/admin/custom/example-admin'],
  adminNavItems: [
    {
      id: 'mod.example.admin.nav',
      href: '/admin/custom/example-admin',
      label: 'Example Admin',
      order: 80
    }
  ],
  adminPage: async () => renderExampleAdminPage()
} satisfies ModuleManifest);
