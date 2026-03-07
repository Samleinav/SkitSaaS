import type { BuildFormDefinition, BuildFormValues } from '@skitsaas/sdk';
import {
  getBuildFormFieldByName,
  normalizeBuildFormValuesFromInput,
  shouldRunBuildFormPreflight,
  validateBuildFormLocally
} from '@skitsaas/sdk';
import { validateBuildFormDbRules } from '@skitsaas/sdk/server';
import {
  isBuildFormAdminRole,
  isTrustedBuildFormPreflightRequest,
  normalizeBuildFormArea
} from '@/lib/forms/security';
import { observeBuildFormValidation } from '@/lib/forms/observability';

type BuildFormPreflightBody = {
  formId?: unknown;
  area?: unknown;
  field?: unknown;
  values?: unknown;
};

type PreflightUser = {
  id: number;
  email?: string | null;
  role?: string | null;
} | null;

export type BuildFormPreflightRateLimitContext = {
  request: Request;
  formId: string;
  area: 'admin' | 'dashboard' | 'frontend';
  field: string | null;
  registration: BuildFormPreflightRegistration;
  currentUser: PreflightUser;
};

export type BuildFormPreflightRateLimitResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      status?: number;
      error?: string;
      retryAfterSeconds?: number;
    };

export type BuildFormPreflightRateLimitHandler = (
  context: BuildFormPreflightRateLimitContext
) =>
  | Promise<BuildFormPreflightRateLimitResult>
  | BuildFormPreflightRateLimitResult;

export type BuildFormPreflightHandlerDeps = {
  getCurrentUser?: () => Promise<PreflightUser>;
  resolveForm?: (formId: string) => Promise<BuildFormPreflightRegistration | null>;
  isTrustedOrigin?: (request: Request) => boolean;
  rateLimit?: BuildFormPreflightRateLimitHandler | null;
};

export type BuildFormPreflightRegistration = {
  formId: string;
  area: 'admin' | 'dashboard' | 'frontend';
  access: 'public' | 'user' | 'admin';
  route?: string | null;
  resolveDefinition: () => Promise<BuildFormDefinition> | BuildFormDefinition;
};

let configuredBuildFormPreflightRateLimit:
  | BuildFormPreflightRateLimitHandler
  | null = null;

async function getCurrentBuildFormPreflightUser() {
  const { getUser } = await import('@/lib/db/queries');
  return getUser();
}

async function resolveDefaultBuildFormPreflightRegistration(formId: string) {
  const { resolveRegisteredBuildFormController } = await import(
    '@/lib/forms/registry'
  );
  return resolveRegisteredBuildFormController(formId);
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toBuildFormValues(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function resolvePreflightBody(
  request: Request
): Promise<BuildFormPreflightBody | null> {
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as BuildFormPreflightBody;
  } catch {
    return null;
  }
}

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, init);
}

function createRateLimitedPreflightResponse(
  decision: Extract<BuildFormPreflightRateLimitResult, { allowed: false }>
) {
  const headers = new Headers();

  if (
    typeof decision.retryAfterSeconds === 'number' &&
    Number.isFinite(decision.retryAfterSeconds) &&
    decision.retryAfterSeconds > 0
  ) {
    headers.set('Retry-After', String(Math.ceil(decision.retryAfterSeconds)));
  }

  return createJsonResponse(
    {
      error: decision.error || 'Too many requests.'
    },
    {
      status: decision.status ?? 429,
      headers
    }
  );
}

async function observeRateLimitedPreflightRequest({
  request,
  formId,
  area,
  field,
  registration,
  currentUser,
  decision
}: {
  request: Request;
  formId: string;
  area: 'admin' | 'dashboard' | 'frontend';
  field: string | null;
  registration: BuildFormPreflightRegistration;
  currentUser: PreflightUser;
  decision: Extract<BuildFormPreflightRateLimitResult, { allowed: false }>;
}) {
  await observeBuildFormValidation({
    type: 'preflight.rate_limited',
    request,
    formId,
    area,
    field,
    access: registration.access,
    route: registration.route ?? null,
    status: decision.status ?? 429,
    retryAfterSeconds: decision.retryAfterSeconds,
    currentUser
  });
}

export function configureBuildFormPreflightRateLimit(
  handler: BuildFormPreflightRateLimitHandler | null
) {
  configuredBuildFormPreflightRateLimit = handler;
}

export async function handleBuildFormPreflightRequest(
  request: Request,
  deps: BuildFormPreflightHandlerDeps = {}
) {
  if (request.method.toUpperCase() !== 'POST') {
    return createJsonResponse(
      {
        error: 'Method not allowed.'
      },
      {
        status: 405
      }
    );
  }

  const trustedOrigin = deps.isTrustedOrigin ?? isTrustedBuildFormPreflightRequest;
  if (!trustedOrigin(request)) {
    return createJsonResponse(
      {
        error: 'Invalid origin.'
      },
      {
        status: 403
      }
    );
  }

  const body = await resolvePreflightBody(request);
  if (!body) {
    return createJsonResponse(
      {
        error: 'Invalid payload.'
      },
      {
        status: 400
      }
    );
  }

  const formId = normalizeString(body.formId);
  const area = normalizeBuildFormArea(body.area);
  const field = normalizeString(body.field);

  if (!formId || !area) {
    return createJsonResponse(
      {
        error: 'formId and area are required.'
      },
      {
        status: 400
      }
    );
  }

  const resolveForm =
    deps.resolveForm ?? resolveDefaultBuildFormPreflightRegistration;
  const registeredForm = await resolveForm(formId);

  if (!registeredForm) {
    return createJsonResponse(
      {
        error: 'Form not found.'
      },
      {
        status: 404
      }
    );
  }

  if (registeredForm.area !== area) {
    return createJsonResponse(
      {
        error: 'Form area mismatch.'
      },
      {
        status: 403
      }
    );
  }

  const getCurrentUser = deps.getCurrentUser ?? getCurrentBuildFormPreflightUser;
  const currentUser = await getCurrentUser();

  if (registeredForm.access === 'user' && !currentUser) {
    return createJsonResponse(
      {
        error: 'Authentication required.'
      },
      {
        status: 401
      }
    );
  }

  if (registeredForm.access === 'admin') {
    if (!currentUser) {
      return createJsonResponse(
        {
          error: 'Authentication required.'
        },
        {
          status: 401
        }
      );
    }

    if (!isBuildFormAdminRole(currentUser.role)) {
      return createJsonResponse(
        {
          error: 'Forbidden.'
        },
        {
          status: 403
        }
      );
    }
  }

  const rateLimit =
    deps.rateLimit === undefined
      ? configuredBuildFormPreflightRateLimit
      : deps.rateLimit;

  if (rateLimit) {
    const decision = await rateLimit({
      request,
      formId,
      area,
      field: field || null,
      registration: registeredForm,
      currentUser
    });

    if (!decision.allowed) {
      await observeRateLimitedPreflightRequest({
        request,
        formId,
        area,
        field: field || null,
        registration: registeredForm,
        currentUser,
        decision
      });
      return createRateLimitedPreflightResponse(decision);
    }
  }

  const definition = await registeredForm.resolveDefinition();
  if (!shouldRunBuildFormPreflight(definition)) {
    return createJsonResponse(
      {
        error: 'Form preflight is disabled.'
      },
      {
        status: 404
      }
    );
  }

  if (field && !getBuildFormFieldByName(definition, field)) {
    return createJsonResponse(
      {
        error: 'Field not found.'
      },
      {
        status: 400
      }
    );
  }

  const rawValues = toBuildFormValues(body.values);
  const normalizedValues = normalizeBuildFormValuesFromInput(
    definition,
    rawValues
  ) as BuildFormValues;

  const localResult = validateBuildFormLocally(definition, normalizedValues, {
    field: field || undefined,
    runtime: 'preflight'
  });

  if (!localResult.valid) {
    return createJsonResponse(localResult);
  }

  const dbResult = await validateBuildFormDbRules({
    definition,
    values: localResult.values,
    user: currentUser,
    runtime: 'preflight',
    field: field || undefined
  });

  return createJsonResponse(dbResult);
}
