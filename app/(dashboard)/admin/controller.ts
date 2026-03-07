import {
  createServerActionController,
  createValidatedServerActionController
} from '@/lib/actions/controller';
import { requireAdminUser } from './actions/shared';

export const adminAction = createServerActionController({
  requireUser: requireAdminUser
});

export const adminValidatedAction = createValidatedServerActionController({
  requireUser: requireAdminUser
});
