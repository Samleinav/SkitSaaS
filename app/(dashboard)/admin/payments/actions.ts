'use server';

import { db } from '@/lib/db/drizzle';
import { paymentLogs } from '@/lib/db/schema';
import { adminAction } from '../controller';
import { revalidateAdminPayments } from '../actions/shared';

export const clearPaymentLogsAction = adminAction(
  async () => {
    await db.delete(paymentLogs);
  },
  {
    revalidate: revalidateAdminPayments
  }
);
