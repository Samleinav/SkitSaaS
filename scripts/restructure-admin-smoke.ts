type SmokeResult = {
  path: string;
  status: number;
  location: string | null;
  ok: boolean;
  note?: string;
};

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);
const FALSY = new Set(['0', 'false', 'no', 'off']);

function readBoolean(value: string | undefined, defaultValue: boolean) {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUTHY.has(normalized)) {
    return true;
  }
  if (FALSY.has(normalized)) {
    return false;
  }

  return defaultValue;
}

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const allowUnauth = readBoolean(process.env.SMOKE_ALLOW_UNAUTH, true);
function normalizeAuthCookie(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  if (!value.includes('=')) {
    return `session=${value}`;
  }

  return value;
}

const cookie = normalizeAuthCookie(process.env.SMOKE_AUTH_COOKIE);
const moduleId = process.env.SMOKE_MODULE_ID;

const routes: string[] = [
  '/admin',
  '/admin/app-config',
  '/admin/orders',
  '/admin/orders/create',
  '/admin/payments',
  '/admin/subscriptions',
  '/admin/suscriptions',
  '/dashboard/subscriptions',
];

if (moduleId) {
  routes.push(`/admin/modules/${moduleId}`);
  routes.push(`/dashboard/modules/${moduleId}`);
}

function buildUrl(path: string) {
  return new URL(path, baseUrl).toString();
}

function isRedirectToSignIn(location: string | null) {
  return location?.includes('/sign-in') ?? false;
}

async function checkRoute(path: string): Promise<SmokeResult> {
  const headers: HeadersInit = {};
  if (cookie) {
    headers.cookie = cookie;
  }

  const response = await fetch(buildUrl(path), {
    headers,
    redirect: 'manual',
  });

  const location = response.headers.get('location');
  const status = response.status;
  const isSuccess = status >= 200 && status < 300;
  const isRedirect = status >= 300 && status < 400;
  const isUnauthorized = status === 401 || status === 403;

  if (isSuccess) {
    return { path, status, location, ok: true };
  }

  if (isRedirect && isRedirectToSignIn(location)) {
    return {
      path,
      status,
      location,
      ok: true,
      note: 'redirected_to_sign_in',
    };
  }

  if (allowUnauth && isUnauthorized) {
    return {
      path,
      status,
      location,
      ok: true,
      note: 'unauthorized_allowed',
    };
  }

  return {
    path,
    status,
    location,
    ok: false,
  };
}

async function run() {
  const results = await Promise.all(routes.map((path) => checkRoute(path)));
  const failures = results.filter((result) => !result.ok);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    allowUnauth,
    routesChecked: results.length,
    failures: failures.length,
    results,
  };

  console.log(JSON.stringify(report, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Admin smoke pack failed:', error);
  process.exitCode = 1;
});
