import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeFrontendRoute } from '../../components/theme/theme-frontend-route';
import { THEME_FRONTEND_ROUTE_REGISTRY } from '../../lib/themes/frontend-routes.generated';

const PROCESS_ENV = process.env as Record<string, string | undefined>;

test('ThemeFrontendRoute renders fallback when theme route registry is missing', async () => {
  const rendered = await ThemeFrontendRoute({
    path: '/',
    themeId: 'theme.unknown',
    fallback: <div data-test-id="fallback">fallback</div>
  });
  const html = renderToStaticMarkup(rendered);

  assert.match(html, /data-test-id="fallback"/);
  assert.match(html, /fallback/);
});

test('ThemeFrontendRoute renders active frontend route when registered', async () => {
  const rendered = await ThemeFrontendRoute({
    path: '/__layout',
    themeId: 'theme.first.frontend',
    fallback: <div data-test-id="fallback">fallback</div>,
    children: <div data-test-id="child">child</div>
  });
  const html = renderToStaticMarkup(rendered);

  assert.match(html, /data-theme-template="layout.frontend.shell"/);
  assert.match(html, /data-test-id="child"/);
  assert.doesNotMatch(html, /data-test-id="fallback"/);
});

test('ThemeFrontendRoute renders registered contact route for first frontend theme', async () => {
  const rendered = await ThemeFrontendRoute({
    path: '/contact-us',
    themeId: 'theme.first.frontend',
    fallback: <div data-test-id="fallback">fallback</div>,
    children: <div data-test-id="contact-form">contact-form</div>
  });
  const html = renderToStaticMarkup(rendered);

  assert.match(html, /data-theme-template="page.frontend.contact"/);
  assert.match(html, /data-test-id="contact-form"/);
  assert.doesNotMatch(html, /data-test-id="fallback"/);
});

test('ThemeFrontendRoute renders a custom registered frontend path', async () => {
  const themeId = 'theme.test.frontend.custom.outputs';

  THEME_FRONTEND_ROUTE_REGISTRY[themeId] = {
    themeId,
    routesImport: async () => ({
      default: [
        {
          path: '/outputs',
          loader: async () => ({
            default: function OutputsRoute() {
              return (
                <section data-theme-template="page.frontend.outputs">
                  outputs
                </section>
              );
            }
          })
        }
      ]
    })
  };

  try {
    const rendered = await ThemeFrontendRoute({
      path: '/outputs',
      themeId,
      fallback: <div data-test-id="fallback">fallback</div>
    });
    const html = renderToStaticMarkup(rendered);

    assert.match(html, /data-theme-template="page.frontend.outputs"/);
    assert.doesNotMatch(html, /data-test-id="fallback"/);
  } finally {
    delete THEME_FRONTEND_ROUTE_REGISTRY[themeId];
  }
});

test('ThemeFrontendRoute renders fallback when route loader throws', async () => {
  const themeId = 'theme.test.frontend.route.throw';

  THEME_FRONTEND_ROUTE_REGISTRY[themeId] = {
    themeId,
    routesImport: async () => ({
      default: [
        {
          path: '/',
          loader: async () => {
            throw new Error('route-load-failed');
          }
        }
      ]
    })
  };

  try {
    const rendered = await ThemeFrontendRoute({
      path: '/',
      themeId,
      fallback: <div data-test-id="fallback">fallback</div>
    });
    const html = renderToStaticMarkup(rendered);

    assert.match(html, /data-test-id="fallback"/);
  } finally {
    delete THEME_FRONTEND_ROUTE_REGISTRY[themeId];
  }
});

test('ThemeFrontendRoute logs standardized development error for missing route', async () => {
  const previousNodeEnv = PROCESS_ENV.NODE_ENV;
  const previousConsoleError = console.error;
  const capturedErrors: string[] = [];

  PROCESS_ENV.NODE_ENV = 'development';
  console.error = (...args: unknown[]) => {
    capturedErrors.push(args.map(String).join(' '));
  };

  try {
    const rendered = await ThemeFrontendRoute({
      path: '/missing-theme-route',
      themeId: 'theme.first.frontend',
      fallback: <div data-test-id="fallback">fallback</div>
    });
    const html = renderToStaticMarkup(rendered);

    assert.match(html, /data-test-id="fallback"/);
    assert.equal(capturedErrors.length, 1);
    assert.match(capturedErrors[0] ?? '', /\[theme-frontend-route\] route_not_found/);
    assert.match(capturedErrors[0] ?? '', /reason="route_not_registered"/);
    assert.match(capturedErrors[0] ?? '', /path="\/missing-theme-route"/);
    assert.match(capturedErrors[0] ?? '', /themeId="theme.first.frontend"/);
  } finally {
    PROCESS_ENV.NODE_ENV = previousNodeEnv;
    console.error = previousConsoleError;
  }
});
