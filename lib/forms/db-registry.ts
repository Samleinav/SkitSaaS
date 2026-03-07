import type {
  BuildFormDbValidationRequest,
  BuildFormDbValidationResult
} from '@skitsaas/sdk/server';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { subscriptionTemplates, users } from '@/lib/db/schema';
import { observeBuildFormValidation } from '@/lib/forms/observability';

type BuildFormDbResolver = (
  request: BuildFormDbValidationRequest
) => Promise<BuildFormDbValidationResult | null>;

const buildFormDbResolvers = new Map<string, BuildFormDbResolver>();
let hasBootstrappedBuildFormDbResolvers = false;

function normalizeBuildFormDbTarget(value: string) {
  return value.trim().toLowerCase();
}

function parsePositiveInteger(value: unknown) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function bootstrapBuildFormDbRegistry() {
  if (hasBootstrappedBuildFormDbResolvers) {
    return;
  }

  registerBuildFormDbResolver('core.users.email', async ({ value, ignore }) => {
    const email =
      typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!email) {
      return {
        exists: false
      };
    }

    const ignoreUserId = parsePositiveInteger(ignore);
    const conditions = [eq(users.email, email), isNull(users.deletedAt)];

    if (ignoreUserId) {
      conditions.push(ne(users.id, ignoreUserId));
    }

    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions))
      .limit(1);

    return {
      exists: existingUsers.length > 0
    };
  });

  registerBuildFormDbResolver(
    'core.subscription_templates.user',
    async ({ value }) => {
      const templateId = parsePositiveInteger(value);
      if (!templateId) {
        return {
          exists: false
        };
      }

      const templates = await db
        .select({ id: subscriptionTemplates.id })
        .from(subscriptionTemplates)
        .where(
          and(
            eq(subscriptionTemplates.id, templateId),
            eq(subscriptionTemplates.targetScope, 'user')
          )
        )
        .limit(1);

      return {
        exists: templates.length > 0
      };
    }
  );

  hasBootstrappedBuildFormDbResolvers = true;
}

export function registerBuildFormDbResolver(
  target: string,
  resolver: BuildFormDbResolver
) {
  const normalizedTarget = normalizeBuildFormDbTarget(target);
  if (!normalizedTarget) {
    throw new Error('registerBuildFormDbResolver requires a non-empty target.');
  }

  buildFormDbResolvers.set(normalizedTarget, resolver);
}

export function listRegisteredBuildFormDbTargets() {
  bootstrapBuildFormDbRegistry();
  return Array.from(buildFormDbResolvers.keys()).sort((left, right) =>
    left.localeCompare(right)
  );
}

export async function resolveBuildFormDbLookup(
  request: BuildFormDbValidationRequest
) {
  bootstrapBuildFormDbRegistry();

  const target = normalizeBuildFormDbTarget(request.target.target);
  if (!target) {
    return null;
  }

  const resolver = buildFormDbResolvers.get(target);
  if (!resolver) {
    await observeBuildFormValidation({
      type: 'db.resolver_missing',
      operator: request.operator,
      target,
      runtime: request.runtime ?? 'server',
      formId: request.formId ?? null,
      fieldName: request.fieldName ?? null,
      user:
        request.user && typeof request.user === 'object'
          ? (request.user as {
              id?: unknown;
              email?: unknown;
              role?: unknown;
            })
          : null
    });
    return null;
  }

  return resolver({
    ...request,
    target: {
      ...request.target,
      target
    }
  });
}
