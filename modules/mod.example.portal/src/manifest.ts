import { defineModule } from '@skitsaas/sdk';
import { EXAMPLE_PORTAL_MODULE_ID } from './constants';

export default defineModule({
  moduleId: EXAMPLE_PORTAL_MODULE_ID,
  version: '0.1.0',
  displayName: 'Example Portal',
  description:
    'Example module demonstrating the portal system: RoutePortal, RouteApiPortal, ' +
    'portal layout, public + authenticated pages, and role-based redirect.',
});
