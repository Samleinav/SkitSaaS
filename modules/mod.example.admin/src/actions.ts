'use server';

import {
  createValidatedServerActionController,
  requireAdmin,
} from '@skitsaas/sdk/server';
import { createExampleAdminBroadcastFormDefinition } from './forms';

type ExampleAdminSessionUser = {
  id: number;
  role?: string | null;
};

const adminValidatedAction =
  createValidatedServerActionController<ExampleAdminSessionUser>({
    requireUser: async () => requireAdmin<ExampleAdminSessionUser>(),
  });

export const submitExampleAdminBroadcastAction = adminValidatedAction(
  createExampleAdminBroadcastFormDefinition(),
  async () => {
    return true;
  }
);
