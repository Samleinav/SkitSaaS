import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeCodeTemplate } from '../../components/theme/theme-code-template';
import { MODULE_CODE_TEMPLATE_REGISTRY } from '../../lib/templates/module-code-registry.generated';
import { THEME_CODE_REGISTRY } from '../../lib/themes/code-registry.generated';

const PROCESS_ENV = process.env as Record<string, string | undefined>;

test('ThemeCodeTemplate renders fallback when theme is missing', async () => {
  const rendered = await ThemeCodeTemplate({
    id: 'page.frontend.home',
    themeId: 'theme.unknown',
    fallback: <div data-test-id="fallback">fallback</div>
  });
  const html = renderToStaticMarkup(rendered);

  assert.match(html, /data-test-id="fallback"/);
  assert.match(html, /fallback/);
});

test('ThemeCodeTemplate renders active theme template when component id exists', async () => {
  const rendered = await ThemeCodeTemplate({
    id: 'layout.frontend.shell',
    themeId: 'theme.first.frontend',
    fallback: <div data-test-id="fallback">fallback</div>,
    children: <div data-test-id="child">child</div>
  });
  const html = renderToStaticMarkup(rendered);

  assert.match(html, /data-theme-template="layout.frontend.shell"/);
  assert.match(html, /data-test-id="child"/);
  assert.doesNotMatch(html, /data-test-id="fallback"/);
});

test('ThemeCodeTemplate renders fallback when template loader throws', async () => {
  const themeId = 'theme.test.throw';
  const templateId = 'ui.table';

  THEME_CODE_REGISTRY[themeId] = {
    themeId,
    configImport: null,
    providerImport: null,
    templates: {
      [templateId]: async () => {
        throw new Error('template-load-failed');
      }
    }
  };

  try {
    const rendered = await ThemeCodeTemplate({
      id: templateId,
      themeId,
      fallback: <div data-test-id="fallback">fallback</div>
    });
    const html = renderToStaticMarkup(rendered);

    assert.match(html, /data-test-id="fallback"/);
  } finally {
    delete THEME_CODE_REGISTRY[themeId];
  }
});

test('ThemeCodeTemplate resolves module code template when theme template is missing', async () => {
  MODULE_CODE_TEMPLATE_REGISTRY['mod.test.module'] = {
    moduleId: 'mod.test.module',
    templates: {
      'section.admin.products.table': async () => ({
        default: ({ children }: { children?: any }) => (
          <section data-test-id="module-fallback" data-template-id="section.admin.products.table">
            {children}
          </section>
        )
      })
    }
  };

  try {
    const rendered = await ThemeCodeTemplate({
      id: 'section.admin.products.table',
      themeId: 'theme.unknown',
      moduleId: 'mod.test.module',
      children: <div data-test-id="child">child</div>,
      fallback: <div data-test-id="fallback">fallback</div>
    });
    const html = renderToStaticMarkup(rendered);

    assert.match(html, /data-test-id="module-fallback"/);
    assert.match(html, /data-template-id="section\.admin\.products\.table"/);
    assert.match(html, /data-test-id="child"/);
    assert.doesNotMatch(html, /data-test-id="fallback"/);
  } finally {
    delete MODULE_CODE_TEMPLATE_REGISTRY['mod.test.module'];
  }
});

test('ThemeCodeTemplate throws when module fallback is requested but module registry is missing', async () => {
  await assert.rejects(
    async () => {
      await ThemeCodeTemplate({
        id: 'page.admin.products',
        themeId: 'theme.unknown',
        moduleId: 'mod.unknown.renderer'
      });
    },
    /Missing module code template registry/
  );
});

test('ThemeCodeTemplate logs standardized development error for missing template', async () => {
  const previousNodeEnv = PROCESS_ENV.NODE_ENV;
  const previousConsoleError = console.error;
  const capturedErrors: string[] = [];

  PROCESS_ENV.NODE_ENV = 'development';
  console.error = (...args: unknown[]) => {
    capturedErrors.push(args.map(String).join(' '));
  };

  try {
    const rendered = await ThemeCodeTemplate({
      id: 'page.frontend.home',
      themeId: 'theme.unknown',
      fallback: <div data-test-id="fallback">fallback</div>
    });
    const html = renderToStaticMarkup(rendered);

    assert.match(html, /data-test-id="fallback"/);
    assert.equal(capturedErrors.length, 1);
    assert.match(capturedErrors[0] ?? '', /\[theme-code-template\] template_not_found/);
    assert.match(capturedErrors[0] ?? '', /reason="theme_not_registered"/);
    assert.match(capturedErrors[0] ?? '', /componentId="page.frontend.home"/);
    assert.match(capturedErrors[0] ?? '', /themeId="theme.unknown"/);
    assert.match(capturedErrors[0] ?? '', /moduleId="none"/);
  } finally {
    PROCESS_ENV.NODE_ENV = previousNodeEnv;
    console.error = previousConsoleError;
  }
});
