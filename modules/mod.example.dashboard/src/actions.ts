'use server';

import {
  createValidatedServerActionController,
  requireUser,
} from '@skitsaas/sdk/server';
import { createExampleDashboardIntakeFormDefinition } from './forms';

type ExampleDashboardSessionUser = {
  id: number;
  role?: string | null;
};

const dashboardValidatedAction =
  createValidatedServerActionController<ExampleDashboardSessionUser>({
    requireUser: async () => requireUser<ExampleDashboardSessionUser>(),
  });

export const submitExampleDashboardIntakeAction = dashboardValidatedAction(
  createExampleDashboardIntakeFormDefinition(),
  async () => {
    return true;
  }
);
