'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { paymentOrders, subscriptionTemplates, users } from '@/lib/db/schema';
import { createPaymentLog } from '@/lib/payments/logs';
import { runPaymentOrderSubscriptionLifecycle } from '@/lib/payments/order-subscription-events';
import { persistPaymentSettlementTransaction } from '@/lib/payments/transactions';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import { emitEvent, emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import {
  revalidateAdminBilling,
  revalidateAdminOrders,
  revalidateAdminPayments,
  revalidateDashboard
} from '../actions/shared';
import { adminAction } from '../controller';
import {
  ADMIN_MANUAL_ORDER_EVENT_TYPE,
  ADMIN_MANUAL_ORDER_SOURCE,
  collectChangedFields,
  type AdminPaymentOrderInput,
  mapOrderStatusToLogStatus,
  parseAdminPaymentOrderInput
} from './form-utils';

type OrderTargetType = 'team' | 'user';

function normalizeTargetType(input: string): OrderTargetType | null {
  const normalized = input.trim().toLowerCase();
  if (normalized === 'team' || normalized === 'user') {
    return normalized;
  }

  return null;
}

function buildManualOrderMetadata({
  order,
  targetType,
  userId
}: {
  order: AdminPaymentOrderInput;
  targetType: OrderTargetType;
  userId: number | null;
}) {
  const targetPayload =
    targetType === 'user'
      ? { targetType: 'user' as const, userId }
      : { targetType: 'team' as const, teamId: order.teamId };

  try {
    return JSON.stringify({
      ...targetPayload,
      checkoutContext: {
        schemaVersion: 1,
        provider: order.provider,
        eventType: order.eventType,
        source: order.source,
        providerMetadata: {
          system: {
            ...targetPayload,
            templateId: order.subscriptionTemplateId
          }
        }
      }
    }).slice(0, 12000);
  } catch {
    return null;
  }
}

export const createPaymentOrderAction = adminAction(
  async ({ user, form }) => {
    const targetType = normalizeTargetType(form.string('targetType'));
    if (!targetType) {
      return false;
    }

    const nextOrderPayload = parseAdminPaymentOrderInput(form, {
      defaultSource: ADMIN_MANUAL_ORDER_SOURCE,
      defaultEventType: ADMIN_MANUAL_ORDER_EVENT_TYPE
    });
    if (!nextOrderPayload.valid || !nextOrderPayload.value) {
      return false;
    }

    const requestedUserId = form.positiveInt('userId');
    const nextOrder = nextOrderPayload.value;

    if (targetType === 'team' && !nextOrder.teamId) {
      return false;
    }

    if (targetType === 'user' && !requestedUserId) {
      return false;
    }

    let targetUserId: number | null = null;

    if (targetType === 'user') {
      const userId = requestedUserId;
      if (!userId) {
        return false;
      }

      const [targetUser] = await db
        .select({
          id: users.id
        })
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            isNull(users.deletedAt),
            eq(users.accountStatus, 'active')
          )
        )
        .limit(1);

      if (!targetUser) {
        return false;
      }

      targetUserId = targetUser.id;
    }

    const templateId = nextOrder.subscriptionTemplateId;
    if (!templateId) {
      return false;
    }

    let templateName: string | null = null;

    const [template] = await db
      .select({
        id: subscriptionTemplates.id,
        name: subscriptionTemplates.name,
        targetScope: subscriptionTemplates.targetScope
      })
      .from(subscriptionTemplates)
      .where(eq(subscriptionTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return false;
    }

    const expectedTemplateScope = targetType === 'user' ? 'user' : 'organization';
    if (template.targetScope !== expectedTemplateScope) {
      return false;
    }

    templateName = template.name;

    const orderForInsert: AdminPaymentOrderInput = {
      ...nextOrder,
      teamId: targetType === 'team' ? nextOrder.teamId : null,
      planName: nextOrder.planName || templateName || null
    };

    await emitEvent(
      EVENT_HOOKS.adminOrdersBeforeCreate,
      orderForInsert,
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        teamId: orderForInsert.teamId ?? null,
        targetUserId: targetUserId ?? null,
        source: '/admin/orders/create'
      }
    );

    const manualMetadata = buildManualOrderMetadata({
      order: orderForInsert,
      targetType,
      userId: targetUserId
    });

    try {
      const [createdOrder] = await db
        .insert(paymentOrders)
        .values({
          ...orderForInsert,
          orderType: 'subscription',
          targetType,
          targetTeamId: targetType === 'team' ? orderForInsert.teamId : null,
          targetUserId: targetType === 'user' ? targetUserId : null,
          metadata: manualMetadata,
          updatedAt: new Date()
        })
        .returning({
          id: paymentOrders.id,
          orderType: paymentOrders.orderType,
          targetType: paymentOrders.targetType,
          targetTeamId: paymentOrders.targetTeamId,
          targetUserId: paymentOrders.targetUserId,
          metadata: paymentOrders.metadata
        });

      if (!createdOrder) {
        return false;
      }

      await runPaymentOrderSubscriptionLifecycle({
        orderId: createdOrder.id,
        orderType: createdOrder.orderType,
        provider: orderForInsert.provider,
        status: orderForInsert.status,
        eventType: orderForInsert.eventType,
        orderSource: orderForInsert.source,
        triggerSource: '/admin/orders/create',
        teamId: orderForInsert.teamId,
        targetType: createdOrder.targetType,
        targetTeamId: createdOrder.targetTeamId,
        targetUserId: createdOrder.targetUserId,
        subscriptionTemplateId: orderForInsert.subscriptionTemplateId,
        planName: orderForInsert.planName,
        providerPlanId: orderForInsert.providerPlanId,
        externalPaymentId: orderForInsert.externalPaymentId,
        metadata: createdOrder.metadata,
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role
      });

      await persistPaymentSettlementTransaction({
        orderId: createdOrder.id,
        provider: orderForInsert.provider,
        orderStatus: orderForInsert.status,
        amount: orderForInsert.amount,
        currency: orderForInsert.currency,
        externalTransactionId: orderForInsert.externalPaymentId,
        externalInvoiceId: orderForInsert.externalOrderId,
        dedupeKey: `admin:create:${createdOrder.id}:${orderForInsert.status}`,
        payload: createdOrder.metadata,
        metadata: {
          source: '/admin/orders/create',
          eventType: orderForInsert.eventType
        }
      });

      await createPaymentLog({
        provider: orderForInsert.provider,
        eventType: 'admin.orders.created',
        status: mapOrderStatusToLogStatus(orderForInsert.status),
        teamId: orderForInsert.teamId,
        externalId:
          orderForInsert.externalPaymentId ||
          orderForInsert.externalOrderId ||
          String(createdOrder.id),
        amount: orderForInsert.amount,
        currency: orderForInsert.currency,
        message:
          orderForInsert.message || 'Payment order created manually by admin.',
        payload: {
          orderId: createdOrder.id,
          source: 'admin.orders.create',
          status: orderForInsert.status,
          targetType,
          userId: targetUserId
        }
      });

      await createSysActivityLog({
        eventType: 'admin.orders.create',
        eventCategory: 'admin',
        action: 'create',
        status: 'success',
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetUserId: targetUserId,
        teamId: orderForInsert.teamId,
        entityType: 'payment_order',
        entityId: String(createdOrder.id),
        source: '/admin/orders/create',
        message: 'Admin created a payment order.',
        metadata: {
          provider: orderForInsert.provider,
          status: orderForInsert.status,
          source: orderForInsert.source,
          eventType: orderForInsert.eventType,
          targetType,
          userId: targetUserId
        }
      });

      await emitEventAsync(
        EVENT_HOOKS.adminOrdersCreated,
        {
          orderId: createdOrder.id,
          provider: orderForInsert.provider,
          status: orderForInsert.status,
          targetType,
          teamId: orderForInsert.teamId ?? null,
          userId: targetUserId ?? null
        },
        {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          teamId: orderForInsert.teamId ?? null,
          targetUserId: targetUserId ?? null,
          source: '/admin/orders/create'
        }
      );
    } catch (error) {
      console.error('Unable to create payment order:', error);
      return false;
    }
  },
  {
    revalidate: [
      revalidateAdminOrders,
      revalidateAdminPayments,
      revalidateAdminBilling,
      revalidateDashboard
    ]
  }
);

export const updatePaymentOrderAction = adminAction(
  async ({ user, form }) => {
    const orderId = form.positiveInt('orderId');
    if (!orderId) {
      return false;
    }

    const [existingOrder] = await db
      .select({
        id: paymentOrders.id,
        provider: paymentOrders.provider,
        status: paymentOrders.status,
        source: paymentOrders.source,
        eventType: paymentOrders.eventType,
        orderType: paymentOrders.orderType,
        targetType: paymentOrders.targetType,
        targetTeamId: paymentOrders.targetTeamId,
        targetUserId: paymentOrders.targetUserId,
        teamId: paymentOrders.teamId,
        subscriptionTemplateId: paymentOrders.subscriptionTemplateId,
        paymentMethod: paymentOrders.paymentMethod,
        planName: paymentOrders.planName,
        providerPlanId: paymentOrders.providerPlanId,
        externalOrderId: paymentOrders.externalOrderId,
        externalPaymentId: paymentOrders.externalPaymentId,
        amount: paymentOrders.amount,
        currency: paymentOrders.currency,
        message: paymentOrders.message,
        metadata: paymentOrders.metadata
      })
      .from(paymentOrders)
      .where(eq(paymentOrders.id, orderId))
      .limit(1);

    if (!existingOrder) {
      return false;
    }

    const nextOrderPayload = parseAdminPaymentOrderInput(form, {
      defaultSource:
        existingOrder.source === 'checkout' ||
        existingOrder.source === 'webhook' ||
        existingOrder.source === 'dashboard' ||
        existingOrder.source === 'system'
          ? existingOrder.source
          : 'dashboard',
      defaultEventType: existingOrder.eventType
    });
    if (!nextOrderPayload.valid || !nextOrderPayload.value) {
      return false;
    }
    if (
      existingOrder.orderType !== 'subscription' &&
      existingOrder.orderType !== 'one_time'
    ) {
      console.error('Cannot update payment order with invalid orderType.', {
        orderId,
        orderType: existingOrder.orderType
      });
      return false;
    }

    const nextOrder = nextOrderPayload.value;

    const changes = collectChangedFields(existingOrder, nextOrder);

    try {
      await emitEvent(
        EVENT_HOOKS.adminOrdersBeforeUpdate,
        nextOrder,
        {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          teamId: nextOrder.teamId ?? null,
          targetUserId: existingOrder.targetUserId ?? null,
          source: `/admin/orders/${orderId}/edit`
        }
      );

      await db
        .update(paymentOrders)
        .set({
          ...nextOrder,
          orderType: existingOrder.orderType,
          targetType: existingOrder.targetType,
          targetTeamId: existingOrder.targetTeamId,
          targetUserId: existingOrder.targetUserId,
          updatedAt: new Date()
        })
        .where(eq(paymentOrders.id, orderId));

      await runPaymentOrderSubscriptionLifecycle({
        orderId,
        orderType: existingOrder.orderType,
        provider: nextOrder.provider,
        status: nextOrder.status,
        eventType: nextOrder.eventType,
        orderSource: nextOrder.source,
        triggerSource: `/admin/orders/${orderId}/edit`,
        teamId: nextOrder.teamId,
        targetType: existingOrder.targetType,
        targetTeamId: existingOrder.targetTeamId,
        targetUserId: existingOrder.targetUserId,
        subscriptionTemplateId: nextOrder.subscriptionTemplateId,
        planName: nextOrder.planName,
        providerPlanId: nextOrder.providerPlanId,
        externalPaymentId: nextOrder.externalPaymentId,
        metadata: existingOrder.metadata,
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role
      });

      await persistPaymentSettlementTransaction({
        orderId,
        provider: nextOrder.provider,
        orderStatus: nextOrder.status,
        amount: nextOrder.amount,
        currency: nextOrder.currency,
        externalTransactionId: nextOrder.externalPaymentId,
        externalInvoiceId: nextOrder.externalOrderId,
        dedupeKey: `admin:update:${orderId}:${nextOrder.status}`,
        payload: existingOrder.metadata,
        metadata: {
          source: `/admin/orders/${orderId}/edit`,
          eventType: nextOrder.eventType
        }
      });

      await createPaymentLog({
        provider: nextOrder.provider,
        eventType:
          existingOrder.status === nextOrder.status
            ? 'admin.orders.updated'
            : 'admin.orders.status_changed',
        status: mapOrderStatusToLogStatus(nextOrder.status),
        teamId: nextOrder.teamId,
        externalId:
          nextOrder.externalPaymentId || nextOrder.externalOrderId || String(orderId),
        amount: nextOrder.amount,
        currency: nextOrder.currency,
        message: nextOrder.message || 'Payment order updated by admin.',
        payload: {
          orderId,
          changedFields: Object.keys(changes),
          fromStatus: existingOrder.status,
          toStatus: nextOrder.status,
          source: 'admin.orders.edit'
        }
      });

      await createSysActivityLog({
        eventType: 'admin.orders.update',
        eventCategory: 'admin',
        action: 'update',
        status: 'success',
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        teamId: nextOrder.teamId,
        entityType: 'payment_order',
        entityId: String(orderId),
        source: `/admin/orders/${orderId}/edit`,
        message: 'Admin updated payment order.',
        metadata: {
          changedFields: changes,
          provider: nextOrder.provider,
          status: nextOrder.status
        }
      });

      await emitEventAsync(
        EVENT_HOOKS.adminOrdersUpdated,
        {
          orderId,
          provider: nextOrder.provider,
          status: nextOrder.status,
          teamId: nextOrder.teamId ?? null,
          targetUserId: existingOrder.targetUserId ?? null,
          changedFields: Object.keys(changes)
        },
        {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          teamId: nextOrder.teamId ?? null,
          targetUserId: existingOrder.targetUserId ?? null,
          source: `/admin/orders/${orderId}/edit`
        }
      );
    } catch (error) {
      console.error('Unable to update payment order:', error);
      return false;
    }
  },
  {
    revalidate: [
      revalidateAdminOrders,
      revalidateAdminPayments,
      revalidateAdminBilling,
      revalidateDashboard
    ]
  }
);
