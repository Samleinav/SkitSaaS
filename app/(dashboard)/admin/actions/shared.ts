import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/db/queries';

const ADMIN_ROLES = new Set(['admin']);

export const USER_ROLES = new Set(['member', 'owner', 'admin']);
export const USER_ACCOUNT_STATUSES = new Set(['active', 'suspended', 'banned']);
export const SUBSCRIPTION_STATUSES = new Set([
  'free',
  'trialing',
  'active',
  'unpaid',
  'canceled'
]);
export const PAYMENT_PROVIDERS = new Set(['stripe', 'paypal']);

export async function requireAdminUser() {
  const currentUser = await getUser();
  if (!currentUser) {
    redirect('/admin/login');
  }

  if (!ADMIN_ROLES.has(currentUser.role)) {
    redirect('/dashboard');
  }

  return currentUser;
}

export function revalidateAdminUsers() {
  revalidatePath('/admin');
  revalidatePath('/admin/users');
}

export function revalidateAdminSubscriptions() {
  revalidatePath('/admin');
  revalidatePath('/admin/subscriptions');
  revalidatePath('/admin/subscriptions/templates');
  revalidatePath('/admin/suscriptions');
}

export function revalidateAdminSuscriptions() {
  revalidatePath('/admin');
  revalidatePath('/admin/subscriptions');
  revalidatePath('/admin/suscriptions');
}

export function revalidateAdminAppConfig() {
  revalidatePath('/admin');
  revalidatePath('/admin/app-config');
  revalidatePath('/admin/app-config/general');
  revalidatePath('/admin/app-config/subscriptions');
  revalidatePath('/admin/app-config/payments-methods');
  revalidatePath('/admin/app-config/email');
  revalidatePath('/admin/app-config/modules');
}

export function revalidateAdminBilling() {
  revalidatePath('/admin');
  revalidatePath('/admin/billing');
  revalidatePath('/admin/subscriptions');
  revalidatePath('/admin/suscriptions');
}

export function revalidateAdminPayments() {
  revalidatePath('/admin');
  revalidatePath('/admin/payments');
}

export function revalidateAdminOrders() {
  revalidatePath('/admin');
  revalidatePath('/admin/orders');
}

export function revalidateDashboard() {
  revalidatePath('/dashboard');
}

export function revalidatePricing() {
  revalidatePath('/pricing');
}

export function revalidateAuthPages() {
  revalidatePath('/login');
  revalidatePath('/sign-up');
}
