import 'server-only';

import { createServerActionController } from '@/lib/actions/controller';
import { requireAdminUser } from './actions/shared';

export const adminAction = createServerActionController({
  requireUser: requireAdminUser
});
