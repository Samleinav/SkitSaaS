import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import { createModulePageRouter } from '@skitsaas/sdk/server';
import {
  CONTACT_ADMIN_ALIAS,
  CONTACT_FRONTEND_SLOT_ID,
  CONTACT_MODULE_ID
} from './constants';
import {
  renderContactAdminPage,
  renderContactFrontendSlot
} from './views';

const contactAdminPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      handler: ({ context }) => renderContactAdminPage(context.searchParams)
    }
  ]
});

export default defineModule({
  moduleId: CONTACT_MODULE_ID,
  version: '0.1.0',
  displayName: 'Contact',
  description: 'Public contact form plus a small admin inbox for submissions.',
  adminRouteAliases: [CONTACT_ADMIN_ALIAS],
  adminNavItems: [
    {
      id: 'mod.contact.nav',
      href: CONTACT_ADMIN_ALIAS,
      label: 'Contact',
      order: 95
    }
  ],
  adminPage: contactAdminPage,
  frontendSlots: [
    {
      slotId: CONTACT_FRONTEND_SLOT_ID,
      handler: async ({ route }) => renderContactFrontendSlot(route)
    }
  ]
} satisfies ModuleManifest);
