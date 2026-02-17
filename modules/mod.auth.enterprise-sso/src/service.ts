import { createHash, randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import { and, eq, gt, isNull } from '@skitsaas/sdk/db';
import { getDb, parseJsonBody, setSessionForUser } from '@skitsaas/sdk/server';
import {
  AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
  AUTH_ENTERPRISE_SAML_PROVIDER_ID,
  type EnterpriseAuthArea,
  type EnterpriseProviderId
} from './constants';
import {
  evaluateEnterpriseOidcConfig,
  evaluateEnterpriseSamlConfig,
  getEnterpriseRuntimeConfig,
  resolveEnterpriseTenantId,
  type EnterpriseOidcProviderConfig,
  type EnterpriseSamlProviderConfig,
  type EnterpriseTenantConfig
} from './config';
import { mapEnterpriseClaimsToProfile } from './claim-mapping';
import {
  authExternalIdentities,
  modAuthEnterpriseSsoStates,
  teams,
  teamMembers,
  users
} from '../db/schema';

type ModuleUser = {
  id?: unknown;
  role?: unknown;
  email?: unknown;
};

type OidcTokenResult = {
  accessToken: string;
  idToken: string | null;
};

type ParsedSamlResponse = {
  issuer: string | null;
  subject: string | null;
  destination: string | null;
  inResponseTo: string | null;
  notBefore: string | null;
  notOnOrAfter: string | null;
  audiences: string[];
  hasSignature: boolean;
  x509Certificate: string | null;
  claims: Record<string, unknown>;
};

function getEnterpriseDb() {
  return getDb<any>();
}

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function toLowerString(value: unknown) {
  return toTrimmedString(value).toLowerCase();
}

function normalizeEmail(value: unknown) {
  const normalized = toLowerString(value);
  if (!normalized || !normalized.includes('@')) {
    return null;
  }

  return normalized;
}

function normalizeAuthArea(value: unknown): EnterpriseAuthArea {
  const normalized = toLowerString(value);
  return normalized === 'admin' ? 'admin' : 'dashboard';
}

function normalizePositiveInt(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function serializeJson(value: unknown) {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value).slice(0, 12000);
  } catch {
    return null;
  }
}

function parseOptionalRedirectPath(value: unknown, area: EnterpriseAuthArea) {
  const normalized = toTrimmedString(value);
  if (!normalized || !normalized.startsWith('/') || normalized.startsWith('//')) {
    return null;
  }

  if (area === 'admin' && !normalized.startsWith('/admin')) {
    return null;
  }

  return normalized;
}

function buildProviderSubject(tenantId: string, subject: string) {
  return `${tenantId}::${subject}`;
}

function extractModuleUserId(user: ModuleUser | null) {
  return normalizePositiveInt(user?.id);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store'
    }
  });
}

function redirectResponse(location: string, status = 302) {
  return new Response(null, {
    status,
    headers: {
      location,
      'cache-control': 'no-store'
    }
  });
}

function wantsJsonResponse(request: Request) {
  if (request.method !== 'GET') {
    return true;
  }

  const format = new URL(request.url).searchParams.get('format');
  if (toLowerString(format) === 'json') {
    return true;
  }

  const accept = toLowerString(request.headers.get('accept'));
  return accept.includes('application/json');
}

function buildLoginFailureRedirect({
  area,
  providerId,
  error
}: {
  area: EnterpriseAuthArea;
  providerId: EnterpriseProviderId;
  error: string;
}) {
  const basePath = area === 'admin' ? '/admin/login' : '/login';
  const search = new URLSearchParams({
    authError: error,
    provider: providerId
  });
  return `${basePath}?${search.toString()}`;
}

function resolvePostAuthRedirect({
  area,
  role,
  redirectOverride
}: {
  area: EnterpriseAuthArea;
  role: string;
  redirectOverride: string | null;
}) {
  if (area === 'admin') {
    if (role !== 'owner' && role !== 'admin') {
      return null;
    }

    return redirectOverride && redirectOverride.startsWith('/admin')
      ? redirectOverride
      : '/admin';
  }

  return redirectOverride || '/dashboard';
}

function generateToken(size = 32) {
  return randomBytes(size).toString('base64url');
}

function createPkceCodeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

function readRequestIpAddress(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded
      .split(',')
      .map((entry) => entry.trim())
      .find((entry) => entry.length > 0);
    if (first) {
      return first;
    }
  }

  return toTrimmedString(request.headers.get('x-real-ip')) || null;
}

async function loadActiveUserById(userId: number) {
  const db = getEnterpriseDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      deletedAt: users.deletedAt
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row || row.deletedAt || row.accountStatus !== 'active') {
    return null;
  }

  return row;
}

async function loadActiveUserByEmail(email: string) {
  const db = getEnterpriseDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      deletedAt: users.deletedAt
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!row || row.deletedAt || row.accountStatus !== 'active') {
    return null;
  }

  return row;
}

async function findIdentityByProviderSubject({
  providerId,
  providerSubject
}: {
  providerId: EnterpriseProviderId;
  providerSubject: string;
}) {
  const db = getEnterpriseDb();
  const [row] = await db
    .select({
      id: authExternalIdentities.id,
      userId: authExternalIdentities.userId,
      providerSubject: authExternalIdentities.providerSubject
    })
    .from(authExternalIdentities)
    .where(
      and(
        eq(authExternalIdentities.providerId, providerId),
        eq(authExternalIdentities.providerSubject, providerSubject)
      )
    )
    .limit(1);

  return row ?? null;
}

async function findIdentityByUserProvider({
  userId,
  providerId
}: {
  userId: number;
  providerId: EnterpriseProviderId;
}) {
  const db = getEnterpriseDb();
  const [row] = await db
    .select({
      id: authExternalIdentities.id,
      providerSubject: authExternalIdentities.providerSubject
    })
    .from(authExternalIdentities)
    .where(
      and(
        eq(authExternalIdentities.userId, userId),
        eq(authExternalIdentities.providerId, providerId)
      )
    )
    .limit(1);

  return row ?? null;
}

async function upsertIdentity({
  userId,
  providerId,
  tenantId,
  subject,
  email,
  displayName,
  claims
}: {
  userId: number;
  providerId: EnterpriseProviderId;
  tenantId: string;
  subject: string;
  email: string | null;
  displayName: string | null;
  claims: Record<string, unknown>;
}) {
  const db = getEnterpriseDb();
  const now = new Date();
  const providerSubject = buildProviderSubject(tenantId, subject);

  const existingByUserProvider = await findIdentityByUserProvider({
    userId,
    providerId
  });
  if (
    existingByUserProvider &&
    existingByUserProvider.providerSubject !== providerSubject
  ) {
    return {
      ok: false,
      error: 'provider_account_conflict'
    } as const;
  }

  if (existingByUserProvider) {
    await db
      .update(authExternalIdentities)
      .set({
        providerEmail: email,
        displayName,
        claims: serializeJson(claims),
        metadata: serializeJson({ tenantId }),
        lastLoginAt: now,
        updatedAt: now
      })
      .where(eq(authExternalIdentities.id, existingByUserProvider.id));

    return {
      ok: true
    } as const;
  }

  await db.insert(authExternalIdentities).values({
    userId,
    providerId,
    providerSubject,
    providerEmail: email,
    providerAccountId: subject,
    displayName,
    claims: serializeJson(claims),
    metadata: serializeJson({ tenantId }),
    linkedAt: now,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now
  });

  return {
    ok: true
  } as const;
}

async function createUserWithDefaultTeam({
  email,
  displayName
}: {
  email: string;
  displayName: string | null;
}) {
  const db = getEnterpriseDb();
  const now = new Date();
  const randomPasswordHash = await hash(generateToken(24), 10);

  return db.transaction(async (tx: any) => {
    const [createdUser] = await tx
      .insert(users)
      .values({
        email,
        name: displayName || email,
        passwordHash: randomPasswordHash,
        role: 'member',
        accountStatus: 'active',
        createdAt: now,
        updatedAt: now
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        accountStatus: users.accountStatus,
        deletedAt: users.deletedAt
      });

    if (!createdUser) {
      throw new Error('user_create_failed');
    }

    const [createdTeam] = await tx
      .insert(teams)
      .values({
        name: `${email}'s Team`,
        createdAt: now,
        updatedAt: now
      })
      .returning({
        id: teams.id
      });

    if (!createdTeam) {
      throw new Error('team_create_failed');
    }

    await tx.insert(teamMembers).values({
      userId: createdUser.id,
      teamId: createdTeam.id,
      role: 'owner',
      joinedAt: now
    });

    return createdUser;
  });
}

async function createProviderState({
  providerId,
  tenantId,
  area,
  stateToken,
  stateNonce,
  pkceCodeVerifier,
  relayRequestId,
  redirectTo,
  requestedByUserId,
  ttlSeconds
}: {
  providerId: EnterpriseProviderId;
  tenantId: string;
  area: EnterpriseAuthArea;
  stateToken: string;
  stateNonce: string | null;
  pkceCodeVerifier: string | null;
  relayRequestId: string | null;
  redirectTo: string | null;
  requestedByUserId: number | null;
  ttlSeconds: number;
}) {
  const db = getEnterpriseDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  await db.insert(modAuthEnterpriseSsoStates).values({
    providerId,
    tenantId,
    flow: 'login',
    stateToken,
    stateNonce,
    pkceCodeVerifier,
    relayRequestId,
    area,
    redirectTo,
    requestedByUserId,
    metadata: null,
    issuedAt: now,
    expiresAt,
    createdAt: now,
    updatedAt: now
  });
}

async function consumeProviderState({
  providerId,
  stateToken
}: {
  providerId: EnterpriseProviderId;
  stateToken: string;
}) {
  const now = new Date();
  const db = getEnterpriseDb();
  const [row] = await db
    .update(modAuthEnterpriseSsoStates)
    .set({
      consumedAt: now,
      updatedAt: now
    })
    .where(
      and(
        eq(modAuthEnterpriseSsoStates.providerId, providerId),
        eq(modAuthEnterpriseSsoStates.stateToken, stateToken),
        isNull(modAuthEnterpriseSsoStates.consumedAt),
        gt(modAuthEnterpriseSsoStates.expiresAt, now)
      )
    )
    .returning({
      tenantId: modAuthEnterpriseSsoStates.tenantId,
      area: modAuthEnterpriseSsoStates.area,
      stateNonce: modAuthEnterpriseSsoStates.stateNonce,
      pkceCodeVerifier: modAuthEnterpriseSsoStates.pkceCodeVerifier,
      relayRequestId: modAuthEnterpriseSsoStates.relayRequestId,
      redirectTo: modAuthEnterpriseSsoStates.redirectTo
    });

  return row ?? null;
}

async function readRequestPayload(request: Request) {
  if (request.method === 'GET') {
    return null;
  }

  const contentType = toLowerString(request.headers.get('content-type'));
  if (contentType.includes('application/json')) {
    return parseJsonBody<Record<string, unknown>>(request);
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await request.formData().catch(() => null);
    if (!form) {
      return null;
    }

    const payload: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') {
        payload[key] = value;
      }
    }

    return payload;
  }

  return parseJsonBody<Record<string, unknown>>(request);
}

async function resolveStartInput(request: Request) {
  const url = new URL(request.url);
  const body = await readRequestPayload(request);

  const area = normalizeAuthArea(body?.area ?? url.searchParams.get('area'));
  const tenantHint =
    toLowerString(body?.tenant ?? url.searchParams.get('tenant')) || null;
  const emailHint =
    normalizeEmail(
      body?.email ??
        body?.emailHint ??
        url.searchParams.get('email') ??
        url.searchParams.get('email_hint')
    ) ?? null;
  const redirectTo = parseOptionalRedirectPath(
    body?.redirectTo ?? url.searchParams.get('redirectTo'),
    area
  );

  return {
    area,
    tenantHint,
    emailHint,
    redirectTo
  };
}

function buildProviderCallbackUrl({
  providerId,
  request,
  callbackBaseUrl
}: {
  providerId: EnterpriseProviderId;
  request: Request;
  callbackBaseUrl: string | null;
}) {
  const origin = callbackBaseUrl || new URL(request.url).origin;
  return `${origin.replace(/\/+$/, '')}/api/auth/providers/${providerId}/callback`;
}

function audIncludesClientId(aud: unknown, clientId: string) {
  if (typeof aud === 'string') {
    return aud === clientId;
  }

  if (Array.isArray(aud)) {
    return aud.some((entry) => toTrimmedString(entry) === clientId);
  }

  return false;
}

async function exchangeAuthorizationCode({
  tokenUrl,
  clientId,
  clientSecret,
  callbackUrl,
  code,
  codeVerifier
}: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  code: string;
  codeVerifier: string | null;
}): Promise<OidcTokenResult | null> {
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', callbackUrl);
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  if (codeVerifier) {
    body.set('code_verifier', codeVerifier);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  const parsed = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!parsed) {
    return null;
  }

  const accessToken = toTrimmedString(parsed.access_token);
  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    idToken: toTrimmedString(parsed.id_token) || null
  };
}

async function fetchJsonWithBearerToken({
  url,
  accessToken
}: {
  url: string;
  accessToken: string;
}) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json'
    }
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
}

async function validateOidcIdToken({
  idToken,
  issuer,
  jwksUrl,
  clientId,
  expectedNonce,
  verifyIdToken
}: {
  idToken: string | null;
  issuer: string | null;
  jwksUrl: string | null;
  clientId: string | null;
  expectedNonce: string | null;
  verifyIdToken: boolean;
}) {
  if (!idToken) {
    return null;
  }

  if (verifyIdToken) {
    if (!issuer || !jwksUrl || !clientId) {
      return null;
    }

    const jwks = createRemoteJWKSet(new URL(jwksUrl));
    const verified = await jwtVerify(idToken, jwks, {
      issuer,
      audience: clientId
    }).catch(() => null);
    if (!verified) {
      return null;
    }

    const payload = verified.payload as Record<string, unknown>;
    if (expectedNonce && toTrimmedString(payload.nonce) !== expectedNonce) {
      return null;
    }

    return payload;
  }

  const payload = decodeJwt(idToken) as Record<string, unknown>;
  if (issuer && toTrimmedString(payload.iss) !== issuer) {
    return null;
  }
  if (clientId && !audIncludesClientId(payload.aud, clientId)) {
    return null;
  }
  if (expectedNonce) {
    const nonce = toTrimmedString(payload.nonce);
    if (nonce && nonce !== expectedNonce) {
      return null;
    }
  }

  return payload;
}

function normalizeCertificate(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '')
    .trim();

  return normalized || null;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function readXmlFirstMatch(source: string, pattern: RegExp) {
  const match = pattern.exec(source);
  if (!match) {
    return null;
  }

  return decodeXmlEntities(toTrimmedString(match[1] ?? '')) || null;
}

function parseSamlResponseXml(xml: string): ParsedSamlResponse | null {
  const normalized = toTrimmedString(xml);
  if (!normalized) {
    return null;
  }

  const issuer = readXmlFirstMatch(
    normalized,
    /<(?:\w+:)?Issuer[^>]*>([\s\S]*?)<\/(?:\w+:)?Issuer>/i
  );
  const subject = readXmlFirstMatch(
    normalized,
    /<(?:\w+:)?NameID[^>]*>([\s\S]*?)<\/(?:\w+:)?NameID>/i
  );
  const destination = readXmlFirstMatch(
    normalized,
    /<(?:\w+:)?Response[^>]*\bDestination="([^"]+)"/i
  );
  const inResponseTo = readXmlFirstMatch(normalized, /\bInResponseTo="([^"]+)"/i);
  const notBefore = readXmlFirstMatch(normalized, /\bNotBefore="([^"]+)"/i);
  const notOnOrAfter = readXmlFirstMatch(
    normalized,
    /\bNotOnOrAfter="([^"]+)"/i
  );

  const audiences = Array.from(
    normalized.matchAll(/<(?:\w+:)?Audience[^>]*>([\s\S]*?)<\/(?:\w+:)?Audience>/gi)
  )
    .map((match) => decodeXmlEntities(toTrimmedString(match[1] ?? '')))
    .filter((entry) => entry.length > 0);

  const hasSignature = /<(?:\w+:)?Signature\b/i.test(normalized);
  const x509Certificate = normalizeCertificate(
    readXmlFirstMatch(
      normalized,
      /<(?:\w+:)?X509Certificate[^>]*>([\s\S]*?)<\/(?:\w+:)?X509Certificate>/i
    )
  );

  const claims: Record<string, unknown> = {};
  const attributeMatches = normalized.matchAll(
    /<(?:\w+:)?Attribute\b[^>]*\bName="([^"]+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?Attribute>/gi
  );
  for (const match of attributeMatches) {
    const attributeName = decodeXmlEntities(toTrimmedString(match[1] ?? ''));
    const attributeBody = match[2] ?? '';
    if (!attributeName) {
      continue;
    }

    const values = Array.from(
      attributeBody.matchAll(
        /<(?:\w+:)?AttributeValue[^>]*>([\s\S]*?)<\/(?:\w+:)?AttributeValue>/gi
      )
    )
      .map((valueMatch) =>
        decodeXmlEntities(toTrimmedString(valueMatch[1] ?? ''))
      )
      .filter((entry) => entry.length > 0);

    if (!values.length) {
      continue;
    }

    claims[attributeName] = values.length === 1 ? values[0] : values;
  }

  if (subject) {
    claims.sub = subject;
    claims.nameid = subject;
  }

  return {
    issuer,
    subject,
    destination,
    inResponseTo,
    notBefore,
    notOnOrAfter,
    audiences,
    hasSignature,
    x509Certificate,
    claims
  };
}

function validateSamlResponse({
  parsed,
  expectedCallbackUrl,
  expectedRequestId,
  expectedIdpEntityId,
  expectedAudience,
  expectedCertificate,
  clockSkewSeconds
}: {
  parsed: ParsedSamlResponse;
  expectedCallbackUrl: string;
  expectedRequestId: string | null;
  expectedIdpEntityId: string | null;
  expectedAudience: string | null;
  expectedCertificate: string | null;
  clockSkewSeconds: number;
}) {
  if (!parsed.hasSignature) {
    return 'saml_signature_missing';
  }

  if (parsed.destination && parsed.destination !== expectedCallbackUrl) {
    return 'saml_destination_mismatch';
  }

  if (expectedRequestId && parsed.inResponseTo !== expectedRequestId) {
    return 'saml_in_response_to_mismatch';
  }

  if (expectedIdpEntityId && parsed.issuer !== expectedIdpEntityId) {
    return 'saml_issuer_mismatch';
  }

  if (expectedAudience) {
    const matched = parsed.audiences.some((entry) => entry === expectedAudience);
    if (!matched) {
      return 'saml_audience_mismatch';
    }
  }

  const normalizedExpectedCertificate = normalizeCertificate(expectedCertificate);
  if (
    normalizedExpectedCertificate &&
    parsed.x509Certificate !== normalizedExpectedCertificate
  ) {
    return 'saml_certificate_mismatch';
  }

  const now = Date.now();
  const skew = Math.max(0, clockSkewSeconds) * 1000;

  if (parsed.notBefore) {
    const notBefore = Date.parse(parsed.notBefore);
    if (Number.isFinite(notBefore) && now + skew < notBefore) {
      return 'saml_assertion_not_yet_valid';
    }
  }

  if (parsed.notOnOrAfter) {
    const notOnOrAfter = Date.parse(parsed.notOnOrAfter);
    if (Number.isFinite(notOnOrAfter) && now - skew >= notOnOrAfter) {
      return 'saml_assertion_expired';
    }
  }

  return null;
}

function resolveTenantForProvider({
  runtime,
  providerId,
  tenantId,
  area
}: {
  runtime: Awaited<ReturnType<typeof getEnterpriseRuntimeConfig>>;
  providerId: EnterpriseProviderId;
  tenantId: string;
  area: EnterpriseAuthArea;
}) {
  const tenant = runtime.tenants[tenantId];
  if (!runtime.enabled || !tenant || !tenant.enabled) {
    return {
      ok: false,
      error: 'tenant_not_available'
    } as const;
  }

  if (!tenant.loginAreas.includes(area)) {
    return {
      ok: false,
      error: 'tenant_area_not_allowed'
    } as const;
  }

  if (providerId === AUTH_ENTERPRISE_OIDC_PROVIDER_ID) {
    const health = evaluateEnterpriseOidcConfig(tenant.oidc);
    if (health.status !== 'ready') {
      return {
        ok: false,
        error: 'provider_not_ready'
      } as const;
    }

    return {
      ok: true,
      tenant,
      provider: tenant.oidc
    } as const;
  }

  const health = evaluateEnterpriseSamlConfig(tenant.saml);
  if (health.status !== 'ready') {
    return {
      ok: false,
      error: 'provider_not_ready'
    } as const;
  }

  return {
    ok: true,
    tenant,
    provider: tenant.saml
  } as const;
}

async function resolveUserForLogin({
  providerId,
  tenant,
  subject,
  email,
  emailVerified,
  displayName,
  claims
}: {
  providerId: EnterpriseProviderId;
  tenant: EnterpriseTenantConfig;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  claims: Record<string, unknown>;
}) {
  const providerSubject = buildProviderSubject(tenant.tenantId, subject);
  const identity = await findIdentityByProviderSubject({
    providerId,
    providerSubject
  });
  if (identity) {
    const user = await loadActiveUserById(identity.userId);
    if (!user) {
      return {
        ok: false,
        error: 'linked_user_not_available'
      } as const;
    }

    await upsertIdentity({
      userId: user.id,
      providerId,
      tenantId: tenant.tenantId,
      subject,
      email,
      displayName,
      claims
    });

    return {
      ok: true,
      user
    } as const;
  }

  if (!email) {
    return {
      ok: false,
      error: 'email_required'
    } as const;
  }

  if (tenant.roleMapping.requireVerifiedEmail && !emailVerified) {
    return {
      ok: false,
      error: 'email_verification_required'
    } as const;
  }

  let user = await loadActiveUserByEmail(email);
  if (!user) {
    if (!tenant.roleMapping.allowJitProvisioning) {
      return {
        ok: false,
        error: 'user_provisioning_disabled'
      } as const;
    }

    user = await createUserWithDefaultTeam({
      email,
      displayName
    });
  }

  const upsertResult = await upsertIdentity({
    userId: user.id,
    providerId,
    tenantId: tenant.tenantId,
    subject,
    email,
    displayName,
    claims
  });
  if (!upsertResult.ok) {
    return upsertResult;
  }

  return {
    ok: true,
    user
  } as const;
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function createEnterpriseOidcAuthorizationStart({
  request
}: {
  request: Request;
}) {
  const runtime = await getEnterpriseRuntimeConfig();
  const input = await resolveStartInput(request);

  const tenantId = resolveEnterpriseTenantId({
    runtime,
    tenantHint: input.tenantHint,
    emailHint: input.emailHint
  });
  if (!tenantId) {
    return jsonResponse(
      {
        ok: false,
        error: 'tenant_not_resolved'
      },
      409
    );
  }

  const resolved = resolveTenantForProvider({
    runtime,
    providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
    tenantId,
    area: input.area
  });
  if (!resolved.ok) {
    return jsonResponse(
      {
        ok: false,
        error: resolved.error,
        tenantId
      },
      503
    );
  }

  const provider = resolved.provider as EnterpriseOidcProviderConfig;
  const callbackUrl = buildProviderCallbackUrl({
    providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
    request,
    callbackBaseUrl: provider.callbackBaseUrl
  });

  const stateToken = generateToken(32);
  const stateNonce = generateToken(16);
  const codeVerifier = provider.usePkce ? generateToken(64) : null;

  await createProviderState({
    providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
    tenantId,
    area: input.area,
    stateToken,
    stateNonce,
    pkceCodeVerifier: codeVerifier,
    relayRequestId: null,
    redirectTo: input.redirectTo,
    requestedByUserId: null,
    ttlSeconds: provider.stateTtlSeconds
  });

  const authorizeUrl = new URL(provider.authorizeUrl);
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId ?? '',
    redirect_uri: callbackUrl,
    scope: provider.scopes.join(' '),
    state: stateToken,
    nonce: stateNonce
  });
  if (codeVerifier) {
    query.set('code_challenge', createPkceCodeChallenge(codeVerifier));
    query.set('code_challenge_method', 'S256');
  }
  authorizeUrl.search = query.toString();

  if (wantsJsonResponse(request)) {
    return jsonResponse({
      ok: true,
      providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
      tenantId,
      authorizationUrl: authorizeUrl.toString()
    });
  }

  return redirectResponse(authorizeUrl.toString());
}

export async function handleEnterpriseOidcAuthorizationCallback({
  request
}: {
  request: Request;
}) {
  const wantsJson = wantsJsonResponse(request);
  const url = new URL(request.url);
  const body = await readRequestPayload(request);

  const callbackError = toTrimmedString(url.searchParams.get('error') || body?.error);
  const code = toTrimmedString(url.searchParams.get('code') || body?.code);
  const stateToken = toTrimmedString(url.searchParams.get('state') || body?.state);
  const areaHint = normalizeAuthArea(body?.area ?? url.searchParams.get('area'));

  if (callbackError) {
    if (wantsJson) {
      return jsonResponse(
        {
          ok: false,
          error: callbackError
        },
        400
      );
    }

    return redirectResponse(
      buildLoginFailureRedirect({
        area: areaHint,
        providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
        error: callbackError
      })
    );
  }

  if (!stateToken || !code) {
    return jsonResponse(
      {
        ok: false,
        error: 'invalid_callback_payload'
      },
      400
    );
  }

  const state = await consumeProviderState({
    providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
    stateToken
  });
  if (!state) {
    return jsonResponse(
      {
        ok: false,
        error: 'oauth_state_invalid_or_expired'
      },
      409
    );
  }

  const runtime = await getEnterpriseRuntimeConfig();
  const area = normalizeAuthArea(state.area);
  const resolved = resolveTenantForProvider({
    runtime,
    providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
    tenantId: toLowerString(state.tenantId),
    area
  });
  if (!resolved.ok) {
    return jsonResponse(
      {
        ok: false,
        error: resolved.error
      },
      503
    );
  }

  const tenant = resolved.tenant;
  const provider = resolved.provider as EnterpriseOidcProviderConfig;
  const callbackUrl = buildProviderCallbackUrl({
    providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
    request,
    callbackBaseUrl: provider.callbackBaseUrl
  });

  const tokenResult = await exchangeAuthorizationCode({
    tokenUrl: provider.tokenUrl,
    clientId: provider.clientId ?? '',
    clientSecret: provider.clientSecret ?? '',
    callbackUrl,
    code,
    codeVerifier: state.pkceCodeVerifier
  });
  if (!tokenResult) {
    return jsonResponse(
      {
        ok: false,
        error: 'token_exchange_failed'
      },
      401
    );
  }

  const idTokenClaims = await validateOidcIdToken({
    idToken: tokenResult.idToken,
    issuer: provider.issuer,
    jwksUrl: provider.jwksUrl,
    clientId: provider.clientId,
    expectedNonce: state.stateNonce,
    verifyIdToken: provider.verifyIdToken
  });
  if (provider.verifyIdToken && !idTokenClaims) {
    return jsonResponse(
      {
        ok: false,
        error: 'id_token_validation_failed'
      },
      401
    );
  }

  const userInfoClaims = provider.userInfoUrl
    ? await fetchJsonWithBearerToken({
        url: provider.userInfoUrl,
        accessToken: tokenResult.accessToken
      })
    : null;

  const mergedClaims = {
    ...(idTokenClaims ?? {}),
    ...(userInfoClaims ?? {})
  };

  const mapped = mapEnterpriseClaimsToProfile({
    claims: mergedClaims,
    policy: tenant.roleMapping
  });

  const subject = toTrimmedString(mapped.subject) || toTrimmedString(mergedClaims.sub);
  if (!subject) {
    return jsonResponse(
      {
        ok: false,
        error: 'provider_subject_missing'
      },
      401
    );
  }

  const userResult = await resolveUserForLogin({
    providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
    tenant,
    subject,
    email: mapped.email,
    emailVerified: mapped.emailVerified,
    displayName: mapped.displayName,
    claims: mergedClaims
  });
  if (!userResult.ok) {
    return jsonResponse(
      {
        ok: false,
        error: userResult.error
      },
      409
    );
  }

  const redirectOverride = parseOptionalRedirectPath(state.redirectTo, area);
  const redirectTarget = resolvePostAuthRedirect({
    area,
    role: toLowerString(userResult.user.role),
    redirectOverride
  });
  if (!redirectTarget) {
    return jsonResponse(
      {
        ok: false,
        error: 'admin_access_required'
      },
      403
    );
  }

  await setSessionForUser(userResult.user.id, {
    ipAddress: readRequestIpAddress(request),
    userAgent: request.headers.get('user-agent'),
    metadata: {
      authMethod: 'enterprise_sso',
      providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
      tenantId: tenant.tenantId,
      area,
      mappedRole: mapped.mappedRole,
      mappedGroups: mapped.groups
    }
  });

  if (wantsJson) {
    return jsonResponse({
      ok: true,
      providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
      tenantId: tenant.tenantId,
      userId: userResult.user.id,
      redirectTo: redirectTarget
    });
  }

  return redirectResponse(redirectTarget);
}

function buildSamlAuthnRequestXml({
  requestId,
  issueInstant,
  destination,
  callbackUrl,
  entityId
}: {
  requestId: string;
  issueInstant: string;
  destination: string;
  callbackUrl: string;
  entityId: string;
}) {
  return [
    '<samlp:AuthnRequest',
    ' xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"',
    ' xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"',
    ` ID="${xmlEscape(requestId)}"`,
    ' Version="2.0"',
    ` IssueInstant="${xmlEscape(issueInstant)}"`,
    ' ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"',
    ` Destination="${xmlEscape(destination)}"`,
    ` AssertionConsumerServiceURL="${xmlEscape(callbackUrl)}"`,
    '>',
    `<saml:Issuer>${xmlEscape(entityId)}</saml:Issuer>`,
    '<samlp:NameIDPolicy AllowCreate="true" />',
    '</samlp:AuthnRequest>'
  ].join('');
}

function renderSamlStartPage({
  ssoUrl,
  samlRequest,
  relayState
}: {
  ssoUrl: string;
  samlRequest: string;
  relayState: string;
}) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting to SSO</title>
  </head>
  <body>
    <form id="sso-form" method="post" action="${htmlEscape(ssoUrl)}">
      <input type="hidden" name="SAMLRequest" value="${htmlEscape(samlRequest)}" />
      <input type="hidden" name="RelayState" value="${htmlEscape(relayState)}" />
    </form>
    <script>
      document.getElementById('sso-form')?.submit();
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function createEnterpriseSamlStart({
  request
}: {
  request: Request;
}) {
  const runtime = await getEnterpriseRuntimeConfig();
  const input = await resolveStartInput(request);

  const tenantId = resolveEnterpriseTenantId({
    runtime,
    tenantHint: input.tenantHint,
    emailHint: input.emailHint
  });
  if (!tenantId) {
    return jsonResponse(
      {
        ok: false,
        error: 'tenant_not_resolved'
      },
      409
    );
  }

  const resolved = resolveTenantForProvider({
    runtime,
    providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
    tenantId,
    area: input.area
  });
  if (!resolved.ok) {
    return jsonResponse(
      {
        ok: false,
        error: resolved.error,
        tenantId
      },
      503
    );
  }

  const provider = resolved.provider as EnterpriseSamlProviderConfig;
  const callbackUrl = buildProviderCallbackUrl({
    providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
    request,
    callbackBaseUrl: provider.callbackBaseUrl
  });
  const requestId = `_${generateToken(18)}`;
  const stateToken = generateToken(32);

  await createProviderState({
    providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
    tenantId,
    area: input.area,
    stateToken,
    stateNonce: null,
    pkceCodeVerifier: null,
    relayRequestId: requestId,
    redirectTo: input.redirectTo,
    requestedByUserId: null,
    ttlSeconds: provider.stateTtlSeconds
  });

  const requestXml = buildSamlAuthnRequestXml({
    requestId,
    issueInstant: new Date().toISOString(),
    destination: provider.ssoUrl ?? '',
    callbackUrl,
    entityId: provider.entityId ?? ''
  });
  const samlRequest = Buffer.from(requestXml, 'utf8').toString('base64');

  if (wantsJsonResponse(request)) {
    return jsonResponse({
      ok: true,
      providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
      tenantId,
      binding: 'post',
      action: provider.ssoUrl,
      fields: {
        SAMLRequest: samlRequest,
        RelayState: stateToken
      }
    });
  }

  return renderSamlStartPage({
    ssoUrl: provider.ssoUrl ?? '',
    samlRequest,
    relayState: stateToken
  });
}

export async function handleEnterpriseSamlAcsCallback({
  request
}: {
  request: Request;
}) {
  const wantsJson = wantsJsonResponse(request);
  const url = new URL(request.url);
  const body = await readRequestPayload(request);

  const relayState = toTrimmedString(
    body?.RelayState ?? body?.relayState ?? url.searchParams.get('RelayState')
  );
  const samlResponse = toTrimmedString(
    body?.SAMLResponse ?? body?.samlResponse ?? url.searchParams.get('SAMLResponse')
  );

  if (!relayState || !samlResponse) {
    return jsonResponse(
      {
        ok: false,
        error: 'invalid_callback_payload'
      },
      400
    );
  }

  const state = await consumeProviderState({
    providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
    stateToken: relayState
  });
  if (!state) {
    return jsonResponse(
      {
        ok: false,
        error: 'saml_state_invalid_or_expired'
      },
      409
    );
  }

  const runtime = await getEnterpriseRuntimeConfig();
  const area = normalizeAuthArea(state.area);
  const resolved = resolveTenantForProvider({
    runtime,
    providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
    tenantId: toLowerString(state.tenantId),
    area
  });
  if (!resolved.ok) {
    return jsonResponse(
      {
        ok: false,
        error: resolved.error
      },
      503
    );
  }

  const tenant = resolved.tenant;
  const provider = resolved.provider as EnterpriseSamlProviderConfig;
  const callbackUrl = buildProviderCallbackUrl({
    providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
    request,
    callbackBaseUrl: provider.callbackBaseUrl
  });

  const decodedXml = Buffer.from(samlResponse, 'base64').toString('utf8');
  const parsed = parseSamlResponseXml(decodedXml);
  if (!parsed) {
    return jsonResponse(
      {
        ok: false,
        error: 'saml_response_invalid'
      },
      400
    );
  }

  const validationError = validateSamlResponse({
    parsed,
    expectedCallbackUrl: callbackUrl,
    expectedRequestId: toTrimmedString(state.relayRequestId) || null,
    expectedIdpEntityId: provider.idpEntityId,
    expectedAudience: provider.expectedAudience,
    expectedCertificate: provider.x509Cert,
    clockSkewSeconds: provider.clockSkewSeconds
  });
  if (validationError) {
    return jsonResponse(
      {
        ok: false,
        error: validationError
      },
      401
    );
  }

  const mapped = mapEnterpriseClaimsToProfile({
    claims: parsed.claims,
    policy: tenant.roleMapping
  });
  const subject = mapped.subject || parsed.subject;
  if (!subject) {
    return jsonResponse(
      {
        ok: false,
        error: 'provider_subject_missing'
      },
      401
    );
  }

  const userResult = await resolveUserForLogin({
    providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
    tenant,
    subject,
    email: mapped.email,
    emailVerified: mapped.emailVerified,
    displayName: mapped.displayName,
    claims: parsed.claims
  });
  if (!userResult.ok) {
    return jsonResponse(
      {
        ok: false,
        error: userResult.error
      },
      409
    );
  }

  const redirectOverride = parseOptionalRedirectPath(state.redirectTo, area);
  const redirectTarget = resolvePostAuthRedirect({
    area,
    role: toLowerString(userResult.user.role),
    redirectOverride
  });
  if (!redirectTarget) {
    return jsonResponse(
      {
        ok: false,
        error: 'admin_access_required'
      },
      403
    );
  }

  await setSessionForUser(userResult.user.id, {
    ipAddress: readRequestIpAddress(request),
    userAgent: request.headers.get('user-agent'),
    metadata: {
      authMethod: 'enterprise_sso',
      providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
      tenantId: tenant.tenantId,
      area,
      mappedRole: mapped.mappedRole,
      mappedGroups: mapped.groups
    }
  });

  if (wantsJson) {
    return jsonResponse({
      ok: true,
      providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
      tenantId: tenant.tenantId,
      userId: userResult.user.id,
      redirectTo: redirectTarget
    });
  }

  return redirectResponse(redirectTarget);
}

export async function getEnterpriseConnectionsForUser({
  user
}: {
  user: ModuleUser | null;
}) {
  const userId = extractModuleUserId(user);
  if (!userId) {
    return jsonResponse(
      {
        ok: false,
        error: 'auth_required'
      },
      401
    );
  }

  const db = getEnterpriseDb();
  const rows = await db
    .select({
      id: authExternalIdentities.id,
      providerId: authExternalIdentities.providerId,
      providerSubject: authExternalIdentities.providerSubject,
      providerEmail: authExternalIdentities.providerEmail,
      displayName: authExternalIdentities.displayName,
      linkedAt: authExternalIdentities.linkedAt,
      lastLoginAt: authExternalIdentities.lastLoginAt
    })
    .from(authExternalIdentities)
    .where(eq(authExternalIdentities.userId, userId));

  return jsonResponse({
    ok: true,
    userId,
    connections: rows
  });
}
