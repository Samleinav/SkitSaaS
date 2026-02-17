import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildThemeRuntimeScript,
  resolveThemeAreaFromPath,
  resolveThemeSelection,
  type ThemePolicy,
  type ThemeRuntimeSnapshot
} from '../../lib/theme-runtime';

type ThemeSnapshotOverrides = {
  policy?: Partial<ThemePolicy>;
  activeThemes?: ThemeRuntimeSnapshot['activeThemes'];
  userPreferences?: ThemeRuntimeSnapshot['userPreferences'];
};

function buildSnapshot(overrides: ThemeSnapshotOverrides = {}) {
  const base: ThemeRuntimeSnapshot = {
    policy: {
      mode: 'system',
      allowUserOverride: true,
      defaults: {
        admin: 'classic-light',
        dashboard: 'classic-light'
      }
    },
    activeThemes: {
      admin: 'classic-light',
      dashboard: 'classic-light'
    },
    userPreferences: {}
  };

  return {
    ...base,
    policy: {
      ...base.policy,
      ...(overrides.policy ?? {})
    },
    activeThemes: {
      ...base.activeThemes,
      ...(overrides.activeThemes ?? {})
    },
    userPreferences: {
      ...base.userPreferences,
      ...(overrides.userPreferences ?? {})
    }
  };
}

test('theme selection prefers user override when allowed', () => {
  const snapshot = buildSnapshot({
    userPreferences: {
      admin: {
        themeKey: 'ops-dark',
        mode: 'dark'
      }
    }
  });

  const selection = resolveThemeSelection(snapshot, 'admin');
  assert.equal(selection.themeKey, 'ops-dark');
  assert.equal(selection.mode, 'dark');
  assert.equal(selection.source, 'override');
});

test('theme selection uses policy default when no override', () => {
  const snapshot = buildSnapshot();
  const selection = resolveThemeSelection(snapshot, 'admin');

  assert.equal(selection.themeKey, 'classic-light');
  assert.equal(selection.source, 'policy');
});

test('theme selection falls back to active theme when no policy default', () => {
  const snapshot = buildSnapshot({
    policy: {
      defaults: {}
    },
    activeThemes: {
      admin: 'active-theme'
    }
  });
  const selection = resolveThemeSelection(snapshot, 'admin');

  assert.equal(selection.themeKey, 'active-theme');
  assert.equal(selection.source, 'area_active');
});

test('theme selection ignores user override when policy disallows', () => {
  const snapshot = buildSnapshot({
    policy: {
      allowUserOverride: false
    },
    userPreferences: {
      admin: {
        themeKey: 'ops-dark',
        mode: 'dark'
      }
    }
  });

  const selection = resolveThemeSelection(snapshot, 'admin');
  assert.equal(selection.themeKey, 'classic-light');
  assert.equal(selection.source, 'policy');
});

test('theme selection uses policy mode when user override has no mode', () => {
  const snapshot = buildSnapshot({
    policy: {
      mode: 'dark'
    },
    userPreferences: {
      admin: {
        themeKey: 'ops-dark'
      }
    }
  });

  const selection = resolveThemeSelection(snapshot, 'admin');
  assert.equal(selection.themeKey, 'ops-dark');
  assert.equal(selection.mode, 'dark');
});

test('theme selection falls back to global defaults when area-specific missing', () => {
  const snapshot = buildSnapshot({
    policy: {
      defaults: {
        global: 'global-theme'
      }
    },
    activeThemes: {
      global: 'global-active'
    }
  });

  const selection = resolveThemeSelection(snapshot, 'dashboard');
  assert.equal(selection.themeKey, 'global-theme');
  assert.equal(selection.source, 'policy');
});

test('theme selection for frontend supports legacy public fallback', () => {
  const snapshot = buildSnapshot({
    policy: {
      defaults: {
        public: 'legacy-public-theme'
      }
    },
    activeThemes: {
      public: 'legacy-public-active-theme'
    }
  });

  const selection = resolveThemeSelection(snapshot, 'frontend');
  assert.equal(selection.themeKey, 'legacy-public-theme');
  assert.equal(selection.source, 'policy');
});

test('theme area resolution maps dashboard auth routes to dashboard area', () => {
  assert.equal(resolveThemeAreaFromPath('/login'), 'dashboard');
  assert.equal(resolveThemeAreaFromPath('/sign-in'), 'dashboard');
  assert.equal(resolveThemeAreaFromPath('/sign-up'), 'dashboard');
});

test('theme area resolution maps admin login route to admin area', () => {
  assert.equal(resolveThemeAreaFromPath('/admin/login'), 'admin');
  assert.equal(resolveThemeAreaFromPath('/admin/login/reset'), 'admin');
});

test('theme area resolution keeps public fallback for frontend pages', () => {
  assert.equal(resolveThemeAreaFromPath('/'), 'frontend');
  assert.equal(resolveThemeAreaFromPath('/pricing'), 'frontend');
});

test('theme runtime script clears stale themeKey when selection has no theme', () => {
  const script = buildThemeRuntimeScript({
    admin: {
      area: 'admin',
      mode: 'dark',
      themeKey: 'theme.admin',
      allowUserOverride: true,
      source: 'policy'
    },
    dashboard: {
      area: 'dashboard',
      mode: 'system',
      themeKey: null,
      allowUserOverride: true,
      source: 'fallback'
    },
    frontend: {
      area: 'frontend',
      mode: 'light',
      themeKey: null,
      allowUserOverride: true,
      source: 'fallback'
    },
    public: {
      area: 'public',
      mode: 'light',
      themeKey: null,
      allowUserOverride: true,
      source: 'fallback'
    },
    global: {
      area: 'global',
      mode: 'light',
      themeKey: null,
      allowUserOverride: true,
      source: 'fallback'
    }
  });

  assert.match(script, /delete root\.dataset\.themeKey;/);
});
