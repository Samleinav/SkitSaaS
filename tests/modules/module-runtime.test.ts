import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { db } from '../../lib/db/drizzle';
import { defineModule, validateModuleManifest } from '../../lib/modules/manifest';
import {
  resolveModuleRouteAlias,
  validateModuleRouteAliases
} from '../../lib/modules/routes';
import {
  buildEnabledModuleNavItems,
  buildEnabledModuleWidgets,
  evaluateFrontendModuleAccess,
  getEnabledDashboardModuleWidgets,
  mergeModuleRuntimeState,
  resolveEnabledModuleIdSet,
  resolveFrontendRouteAccessOutcome,
  resolveFrontendRouteAccessPolicy,
  resolveFrontendSlotProvider,
  resolveModuleApiHandler,
  resolveModulePage,
  resolveModulePageByPath,
  type ModuleRuntimeRow
} from '../../lib/modules/runtime';
import { featureFlags } from '../../lib/feature-flags';

const manifests = [
  defineModule({
    moduleId: 'mod.alpha',
    version: '1.0.0',
    displayName: 'Alpha'
  }),
  defineModule({
    moduleId: 'mod.beta',
    version: '2.0.0',
    displayName: 'Beta'
  })
];

function assertModulePageResolved(result: unknown, expectedText?: RegExp) {
  assert.ok(result);

  if (expectedText && typeof result === 'string') {
    assert.match(result, expectedText);
  }
}

test('resolveEnabledModuleIdSet resolves db mode from runtime rows only', () => {
  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.alpha',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.beta',
      status: 'disabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const enabled = resolveEnabledModuleIdSet({
    manifests,
    runtimeRows,
    moduleRuntimeMode: 'db',
    moduleFlags: {
      'mod.beta': true
    }
  });

  assert.deepEqual([...enabled], ['mod.alpha']);
});

test('resolveEnabledModuleIdSet resolves config mode from module flags only', () => {
  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.alpha',
      status: 'disabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.beta',
      status: 'disabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const enabled = resolveEnabledModuleIdSet({
    manifests,
    runtimeRows,
    moduleRuntimeMode: 'config',
    moduleFlags: {
      'mod.alpha': true,
      'mod.unknown': true
    }
  });

  assert.deepEqual([...enabled], ['mod.alpha']);
});

test('resolveEnabledModuleIdSet resolves hybrid mode with config override', () => {
  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.alpha',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.beta',
      status: 'disabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const enabled = resolveEnabledModuleIdSet({
    manifests,
    runtimeRows,
    moduleRuntimeMode: 'hybrid',
    moduleFlags: {
      'mod.alpha': false,
      'mod.beta': true
    }
  });

  assert.deepEqual([...enabled].sort(), ['mod.beta']);
});

test('mergeModuleRuntimeState annotates manifests with runtime status', () => {
  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.alpha',
      status: 'enabled',
      version: '1.2.3',
      installMode: 'plugin'
    }
  ];

  const merged = mergeModuleRuntimeState({ manifests, runtimeRows });
  assert.equal(merged.length, 2);

  const alpha = merged.find((entry) => entry.manifest.moduleId === 'mod.alpha');
  const beta = merged.find((entry) => entry.manifest.moduleId === 'mod.beta');

  assert.ok(alpha);
  assert.equal(alpha.status, 'enabled');
  assert.equal(alpha.version, '1.2.3');
  assert.equal(alpha.installMode, 'plugin');

  assert.ok(beta);
  assert.equal(beta.status, 'uninstalled');
  assert.equal(beta.version, '2.0.0');
  assert.equal(beta.installMode, 'core');
});

test('buildEnabledModuleNavItems returns only enabled module nav entries', () => {
  const navManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      adminNavItems: [
        {
          id: 'alpha',
          href: '/admin/modules/mod.alpha',
          label: 'Alpha',
          order: 2
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.beta',
      version: '1.0.0',
      displayName: 'Beta',
      adminNavItems: [
        {
          id: 'beta',
          href: '/admin/modules/mod.beta',
          label: 'Beta',
          order: 1
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.alpha',
      status: 'disabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.beta',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const items = buildEnabledModuleNavItems({
    manifests: navManifests,
    runtimeRows,
    area: 'admin'
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.label, 'Beta');
});

test('buildEnabledModuleNavItems resolves frontend nav entries', () => {
  const navManifests = [
    defineModule({
      moduleId: 'mod.front.alpha',
      version: '1.0.0',
      displayName: 'Front Alpha',
      frontendNavItems: [
        {
          id: 'front.alpha',
          href: '/landing/alpha',
          label: 'Front Alpha',
          order: 2
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.front.beta',
      version: '1.0.0',
      displayName: 'Front Beta',
      frontendNavItems: [
        {
          id: 'front.beta',
          href: '/landing/beta',
          label: 'Front Beta',
          order: 1
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.front.alpha',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.front.beta',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const items = buildEnabledModuleNavItems({
    manifests: navManifests,
    runtimeRows,
    area: 'frontend'
  });

  assert.deepEqual(
    items.map((item) => item.href),
    ['/landing/beta', '/landing/alpha']
  );
});

test('buildEnabledModuleNavItems sorts by order then label', () => {
  const navManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      adminNavItems: [
        {
          id: 'alpha',
          href: '/admin/modules/mod.alpha',
          label: 'Zulu',
          order: 1
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.beta',
      version: '1.0.0',
      displayName: 'Beta',
      adminNavItems: [
        {
          id: 'beta',
          href: '/admin/modules/mod.beta',
          label: 'Alpha',
          order: 1
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.gamma',
      version: '1.0.0',
      displayName: 'Gamma',
      adminNavItems: [
        {
          id: 'gamma',
          href: '/admin/modules/mod.gamma',
          label: 'Gamma',
          order: 2
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.alpha',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.beta',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.gamma',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const items = buildEnabledModuleNavItems({
    manifests: navManifests,
    runtimeRows,
    area: 'admin'
  });

  assert.deepEqual(
    items.map((item) => item.label),
    ['Alpha', 'Zulu', 'Gamma']
  );
});

test('buildEnabledModuleWidgets returns only enabled widgets for the selected area', () => {
  const widgetManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      adminDashboardWidgets: [
        {
          id: 'alpha.admin',
          Component: () => null,
          order: 20
        }
      ],
      dashboardWidgets: [
        {
          id: 'alpha.dashboard',
          Component: () => null,
          order: 10
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.beta',
      version: '1.0.0',
      displayName: 'Beta',
      adminDashboardWidgets: [
        {
          id: 'beta.admin',
          Component: () => null,
          order: 5
        }
      ],
      dashboardWidgets: [
        {
          id: 'beta.dashboard',
          Component: () => null,
          order: 5
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.alpha',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.beta',
      status: 'disabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const adminWidgets = buildEnabledModuleWidgets({
    manifests: widgetManifests,
    runtimeRows,
    area: 'admin'
  });
  const dashboardWidgets = buildEnabledModuleWidgets({
    manifests: widgetManifests,
    runtimeRows,
    area: 'dashboard'
  });

  assert.deepEqual(adminWidgets.map((widget) => widget.id), ['alpha.admin']);
  assert.deepEqual(dashboardWidgets.map((widget) => widget.id), [
    'alpha.dashboard'
  ]);
});

test('buildEnabledModuleWidgets sorts by order then id', () => {
  const widgetManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      dashboardWidgets: [
        {
          id: 'z.widget',
          Component: () => null,
          order: 1
        },
        {
          id: 'a.widget',
          Component: () => null,
          order: 1
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.beta',
      version: '1.0.0',
      displayName: 'Beta',
      dashboardWidgets: [
        {
          id: 'm.widget',
          Component: () => null,
          order: 2
        }
      ]
    })
  ];

  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.alpha',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.beta',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const widgets = buildEnabledModuleWidgets({
    manifests: widgetManifests,
    runtimeRows,
    area: 'dashboard'
  });

  assert.deepEqual(
    widgets.map((widget) => widget.id),
    ['a.widget', 'z.widget', 'm.widget']
  );
});

test('getEnabledDashboardModuleWidgets returns empty list when runtime is disabled', async () => {
  const runtimeFlags = featureFlags as { useAppModulesRuntime: boolean };
  const originalValue = runtimeFlags.useAppModulesRuntime;

  runtimeFlags.useAppModulesRuntime = false;
  try {
    const widgets = await getEnabledDashboardModuleWidgets();
    assert.deepEqual(widgets, []);
  } finally {
    runtimeFlags.useAppModulesRuntime = originalValue;
  }
});

test('resolveModuleRouteAlias matches custom admin route and forwards slug', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      adminRouteAliases: ['/admin/custom/alpha']
    })
  ];

  const match = resolveModuleRouteAlias({
    area: 'admin',
    path: '/admin/custom/alpha/settings/billing',
    manifests: aliasManifests
  });

  assert.ok(match);
  assert.equal(match.moduleId, 'mod.alpha');
  assert.equal(match.aliasPath, '/admin/custom/alpha');
  assert.deepEqual(match.slug, ['settings', 'billing']);
});

test('resolveModuleRouteAlias matches custom frontend route and forwards slug', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.front.alpha',
      version: '1.0.0',
      displayName: 'Front Alpha',
      frontendRouteAliases: ['/front-alpha']
    })
  ];

  const match = resolveModuleRouteAlias({
    area: 'frontend',
    path: '/front-alpha/form/enterprise',
    manifests: aliasManifests
  });

  assert.ok(match);
  assert.equal(match.moduleId, 'mod.front.alpha');
  assert.equal(match.aliasPath, '/front-alpha');
  assert.deepEqual(match.slug, ['form', 'enterprise']);
});

test('validateModuleRouteAliases rejects collisions with reserved admin routes', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      adminRouteAliases: ['/admin/users']
    })
  ];

  const errors = validateModuleRouteAliases(aliasManifests);
  assert.ok(
    errors.some(
      (error) =>
        error.code === 'alias_reserved_conflict' &&
        error.moduleId === 'mod.alpha'
    )
  );
});

test('validateModuleRouteAliases rejects collisions with reserved admin login route', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      adminRouteAliases: ['/admin/login']
    })
  ];

  const errors = validateModuleRouteAliases(aliasManifests);
  assert.ok(
    errors.some(
      (error) =>
        error.code === 'alias_reserved_conflict' &&
        error.moduleId === 'mod.alpha' &&
        error.path === '/admin/login'
    )
  );
});

test('validateModuleRouteAliases rejects collisions with reserved admin billing route', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      adminRouteAliases: ['/admin/billing']
    })
  ];

  const errors = validateModuleRouteAliases(aliasManifests);
  assert.ok(
    errors.some(
      (error) =>
        error.code === 'alias_reserved_conflict' &&
        error.moduleId === 'mod.alpha' &&
        error.path === '/admin/billing'
    )
  );
});

test('validateModuleRouteAliases rejects collisions with reserved frontend routes', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.front.alpha',
      version: '1.0.0',
      displayName: 'Front Alpha',
      frontendRouteAliases: ['/pricing']
    })
  ];

  const errors = validateModuleRouteAliases(aliasManifests);
  assert.ok(
    errors.some(
      (error) =>
        error.code === 'alias_reserved_conflict' &&
        error.moduleId === 'mod.front.alpha'
    )
  );
});

test('validateModuleRouteAliases rejects collisions with reserved frontend contact route', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.front.alpha',
      version: '1.0.0',
      displayName: 'Front Alpha',
      frontendRouteAliases: ['/contact-us']
    })
  ];

  const errors = validateModuleRouteAliases(aliasManifests);
  assert.ok(
    errors.some(
      (error) =>
        error.code === 'alias_reserved_conflict' &&
        error.moduleId === 'mod.front.alpha' &&
        error.path === '/contact-us'
    )
  );
});

test('validateModuleRouteAliases rejects collisions with reserved frontend checkout route', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.front.alpha',
      version: '1.0.0',
      displayName: 'Front Alpha',
      frontendRouteAliases: ['/checkout/enterprise']
    })
  ];

  const errors = validateModuleRouteAliases(aliasManifests);
  assert.ok(
    errors.some(
      (error) =>
        error.code === 'alias_reserved_conflict' &&
        error.moduleId === 'mod.front.alpha' &&
        error.path === '/checkout/enterprise'
    )
  );
});

test('validateModuleRouteAliases rejects overlapping aliases across modules', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      adminRouteAliases: ['/admin/custom/reports']
    }),
    defineModule({
      moduleId: 'mod.beta',
      version: '1.0.0',
      displayName: 'Beta',
      adminRouteAliases: ['/admin/custom/reports/daily']
    })
  ];

  const errors = validateModuleRouteAliases(aliasManifests);
  assert.ok(
    errors.some(
      (error) =>
        error.code === 'alias_overlapping' &&
        error.moduleId === 'mod.alpha' &&
        error.conflictModuleId === 'mod.beta'
    )
  );
});

test('validateModuleRouteAliases allows overlapping aliases in the same module', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      adminRouteAliases: ['/admin/x', '/admin/x/create']
    })
  ];

  const errors = validateModuleRouteAliases(aliasManifests);
  assert.ok(
    !errors.some((error) => error.code === 'alias_overlapping')
  );
});

test('validateModuleManifest accepts valid templatePack entries', () => {
  const errors = validateModuleManifest(
    defineModule({
      moduleId: 'mod.templates.ok',
      version: '1.0.0',
      displayName: 'Templates OK',
      templatePack: {
        defaults: [
          {
            componentId: 'ui.table',
            templateId: 'mod.templates.ok.default.table'
          }
        ],
        overrides: [
          {
            componentId: 'ui.async-submit-button',
            templateId: 'mod.templates.ok.override.async-submit',
            lockTemplate: true
          }
        ]
      }
    })
  );

  assert.deepEqual(errors, []);
});

test('validateModuleManifest rejects invalid templatePack component ids and duplicates', () => {
  const errors = validateModuleManifest(
    defineModule({
      moduleId: 'mod.templates.invalid',
      version: '1.0.0',
      displayName: 'Templates Invalid',
      templatePack: {
        defaults: [
          {
            componentId: 'invalid'
          } as { componentId: string },
          {
            componentId: 'ui.table'
          },
          {
            componentId: 'ui.table'
          }
        ]
      }
    })
  );

  assert.ok(
    errors.includes('module_template_pack_defaults_component_invalid:0')
  );
  assert.ok(
    errors.includes('module_template_pack_defaults_component_duplicate:ui.table')
  );
});

test('validateModuleManifest accepts valid frontendRouteAccess values', () => {
  const userAccessErrors = validateModuleManifest(
    defineModule({
      moduleId: 'mod.front.user',
      version: '1.0.0',
      displayName: 'Front User',
      frontendRouteAccess: 'user'
    })
  );
  const adminAccessErrors = validateModuleManifest(
    defineModule({
      moduleId: 'mod.front.admin',
      version: '1.0.0',
      displayName: 'Front Admin',
      frontendRouteAccess: 'admin'
    })
  );

  assert.deepEqual(userAccessErrors, []);
  assert.deepEqual(adminAccessErrors, []);
});

test('validateModuleManifest rejects invalid frontendRouteAccess values', () => {
  const errors = validateModuleManifest(
    defineModule({
      moduleId: 'mod.front.invalid',
      version: '1.0.0',
      displayName: 'Front Invalid',
      frontendRouteAccess: 'staff' as unknown as 'public'
    })
  );

  assert.ok(errors.includes('module_frontend_route_access_invalid'));
});

test('resolveFrontendRouteAccessPolicy defaults to public and preserves explicit values', () => {
  const defaultPolicy = resolveFrontendRouteAccessPolicy(
    defineModule({
      moduleId: 'mod.front.default',
      version: '1.0.0',
      displayName: 'Front Default'
    })
  );
  const userPolicy = resolveFrontendRouteAccessPolicy(
    defineModule({
      moduleId: 'mod.front.user',
      version: '1.0.0',
      displayName: 'Front User',
      frontendRouteAccess: 'user'
    })
  );

  assert.equal(defaultPolicy, 'public');
  assert.equal(userPolicy, 'user');
});

test('resolveFrontendRouteAccessOutcome enforces public/user/admin policies', () => {
  assert.equal(
    resolveFrontendRouteAccessOutcome({
      policy: 'public',
      userRole: null
    }),
    'granted'
  );
  assert.equal(
    resolveFrontendRouteAccessOutcome({
      policy: 'user',
      userRole: null
    }),
    'login_required'
  );
  assert.equal(
    resolveFrontendRouteAccessOutcome({
      policy: 'user',
      userRole: 'member'
    }),
    'granted'
  );
  assert.equal(
    resolveFrontendRouteAccessOutcome({
      policy: 'admin',
      userRole: 'member'
    }),
    'forbidden'
  );
  assert.equal(
    resolveFrontendRouteAccessOutcome({
      policy: 'admin',
      userRole: 'owner'
    }),
    'forbidden'
  );
  assert.equal(
    resolveFrontendRouteAccessOutcome({
      policy: 'admin',
      userRole: 'admin'
    }),
    'granted'
  );
});

test('validateModuleManifest accepts valid frontendSlots entries', () => {
  const errors = validateModuleManifest(
    defineModule({
      moduleId: 'mod.front.slots',
      version: '1.0.0',
      displayName: 'Front Slots',
      frontendSlots: [
        {
          slotId: 'frontend.contact.form.primary',
          handler: async () => null
        }
      ]
    })
  );

  assert.deepEqual(errors, []);
});

test('validateModuleManifest rejects invalid frontendSlots entries', () => {
  const errors = validateModuleManifest(
    defineModule({
      moduleId: 'mod.front.slots.invalid',
      version: '1.0.0',
      displayName: 'Front Slots Invalid',
      frontendSlots: [
        {
          slotId: 'invalid',
          handler: async () => null
        },
        {
          slotId: 'frontend.contact.form.primary',
          handler: async () => null
        },
        {
          slotId: 'frontend.contact.form.primary',
          handler: 'bad-handler' as unknown as () => null
        }
      ]
    })
  );

  assert.ok(errors.includes('module_frontend_slot_id_invalid:0'));
  assert.ok(
    errors.includes('module_frontend_slot_duplicate:frontend.contact.form.primary')
  );
});

test('resolveFrontendSlotProvider prioritizes target module and enabled fallback modules', () => {
  const targetSlot = { slotId: 'frontend.contact.form.primary', handler: () => 'target' };
  const fallbackSlot = { slotId: 'frontend.contact.form.primary', handler: () => 'fallback' };
  const slotId = 'frontend.contact.form.primary';

  const manifestsWithSlots = [
    defineModule({
      moduleId: 'mod.target',
      version: '1.0.0',
      displayName: 'Target',
      frontendSlots: [targetSlot]
    }),
    defineModule({
      moduleId: 'mod.fallback',
      version: '1.0.0',
      displayName: 'Fallback',
      frontendSlots: [fallbackSlot]
    })
  ];

  const targetResolution = resolveFrontendSlotProvider({
    slotId,
    targetModuleId: 'mod.target',
    manifests: manifestsWithSlots,
    enabledModuleIds: ['mod.target', 'mod.fallback']
  });
  assert.equal(targetResolution.source, 'target_module');
  assert.equal(targetResolution.moduleId, 'mod.target');
  assert.equal(targetResolution.slot, targetSlot);

  const fallbackResolution = resolveFrontendSlotProvider({
    slotId,
    targetModuleId: 'mod.missing',
    manifests: manifestsWithSlots,
    enabledModuleIds: ['mod.fallback']
  });
  assert.equal(fallbackResolution.source, 'enabled_module');
  assert.equal(fallbackResolution.moduleId, 'mod.fallback');
  assert.equal(fallbackResolution.slot, fallbackSlot);

  const missingResolution = resolveFrontendSlotProvider({
    slotId,
    targetModuleId: 'mod.target',
    manifests: manifestsWithSlots,
    enabledModuleIds: []
  });
  assert.equal(missingResolution.source, 'missing');
  assert.equal(missingResolution.moduleId, null);
  assert.equal(missingResolution.slot, null);
});

test('evaluateFrontendModuleAccess grants access for public frontend module policies', async () => {
  const access = await evaluateFrontendModuleAccess('mod.example.dashboard');
  assert.equal(access, 'granted');
});

test('evaluateFrontendModuleAccess returns manifest_missing for unknown module', async () => {
  const access = await evaluateFrontendModuleAccess('mod.unknown.missing');
  assert.equal(access, 'manifest_missing');
});

test('resolveModuleRouteAlias prefers longest alias match', () => {
  const aliasManifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      adminRouteAliases: ['/admin/x', '/admin/x/create']
    })
  ];

  const match = resolveModuleRouteAlias({
    area: 'admin',
    path: '/admin/x/create/edit',
    manifests: aliasManifests
  });

  assert.ok(match);
  assert.equal(match.moduleId, 'mod.alpha');
  assert.equal(match.aliasPath, '/admin/x/create');
  assert.deepEqual(match.slug, ['edit']);
});

function mockModuleEnabledStatus(status: 'enabled' | 'disabled') {
  const runtimeRows = [
    {
      moduleId: 'mod.example.admin',
      status,
      version: '0.1.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.example.dashboard',
      status,
      version: '0.1.0',
      installMode: 'plugin'
    },
    {
      moduleId: 'mod.example.api',
      status,
      version: '0.1.0',
      installMode: 'plugin'
    }
  ];

  return mock.method(
    db as unknown as {
      select: (...args: unknown[]) => {
        from: (...args: unknown[]) => Promise<
          Array<{
            moduleId: string;
            status: string;
            version: string;
            installMode: string;
          }>
        >;
      };
    },
    'select',
    () => ({
      from: async () => runtimeRows
    })
  );
}

test('resolveModulePage dispatches enabled admin/dashboard/frontend module routes', async () => {
  const runtimeFlags = featureFlags as unknown as {
    useAppModulesRuntime: boolean;
    useModuleDispatcherRoutes: boolean;
  };
  const originalRuntime = runtimeFlags.useAppModulesRuntime;
  const originalDispatcher = runtimeFlags.useModuleDispatcherRoutes;

  const selectMock = mockModuleEnabledStatus('enabled');
  runtimeFlags.useAppModulesRuntime = true;
  runtimeFlags.useModuleDispatcherRoutes = true;

  try {
    const adminResult = await resolveModulePage({
      area: 'admin',
      moduleId: 'mod.example.admin'
    });
    const dashboardResult = await resolveModulePage({
      area: 'dashboard',
      moduleId: 'mod.example.dashboard'
    });
    const frontendResult = await resolveModulePage({
      area: 'frontend',
      moduleId: 'mod.example.dashboard'
    });

    assertModulePageResolved(adminResult, /Example Admin/);
    assertModulePageResolved(dashboardResult, /Example Dashboard/);
    assertModulePageResolved(frontendResult, /Example Dashboard/);
    assert.equal(selectMock.mock.calls.length, 3);
  } finally {
    selectMock.mock.restore();
    runtimeFlags.useAppModulesRuntime = originalRuntime;
    runtimeFlags.useModuleDispatcherRoutes = originalDispatcher;
  }
});

test('resolveModulePageByPath resolves admin/dashboard/frontend aliases to module pages', async () => {
  const runtimeFlags = featureFlags as unknown as {
    useAppModulesRuntime: boolean;
    useModuleDispatcherRoutes: boolean;
  };
  const originalRuntime = runtimeFlags.useAppModulesRuntime;
  const originalDispatcher = runtimeFlags.useModuleDispatcherRoutes;

  const selectMock = mockModuleEnabledStatus('enabled');
  runtimeFlags.useAppModulesRuntime = true;
  runtimeFlags.useModuleDispatcherRoutes = true;

  try {
    const adminResult = await resolveModulePageByPath({
      area: 'admin',
      path: '/admin/custom/example-admin'
    });
    const dashboardResult = await resolveModulePageByPath({
      area: 'dashboard',
      path: '/dashboard/custom/example-dashboard'
    });
    const frontendResult = await resolveModulePageByPath({
      area: 'frontend',
      path: '/features/example-dashboard'
    });

    assertModulePageResolved(adminResult, /Example Admin/);
    assertModulePageResolved(dashboardResult, /Example Dashboard/);
    assertModulePageResolved(frontendResult, /Example Dashboard/);
    assert.equal(selectMock.mock.calls.length, 3);
  } finally {
    selectMock.mock.restore();
    runtimeFlags.useAppModulesRuntime = originalRuntime;
    runtimeFlags.useModuleDispatcherRoutes = originalDispatcher;
  }
});

test('resolveModuleApiHandler dispatches module API routes for enabled modules', async () => {
  const runtimeFlags = featureFlags as unknown as {
    useAppModulesRuntime: boolean;
    useModuleDispatcherRoutes: boolean;
  };
  const originalRuntime = runtimeFlags.useAppModulesRuntime;
  const originalDispatcher = runtimeFlags.useModuleDispatcherRoutes;

  const selectMock = mockModuleEnabledStatus('enabled');
  runtimeFlags.useAppModulesRuntime = true;
  runtimeFlags.useModuleDispatcherRoutes = true;

  try {
    const request = new Request('https://example.test/api/modules/mod.example.api/test', {
      method: 'GET'
    });
    const response = await resolveModuleApiHandler({
      moduleId: 'mod.example.api',
      slug: ['test'],
      request
    });

    assert.ok(response);
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      ok: boolean;
      moduleId: string;
      message: string;
    };
    assert.equal(body.ok, true);
    assert.equal(body.moduleId, 'mod.example.api');
    assert.equal(body.message, 'Example API module is enabled.');

    const notFoundResponse = await resolveModuleApiHandler({
      moduleId: 'mod.example.api',
      slug: ['missing'],
      request: new Request('https://example.test/api/modules/mod.example.api/missing', {
        method: 'GET'
      })
    });
    assert.equal(notFoundResponse, null);
    assert.equal(selectMock.mock.calls.length, 2);
  } finally {
    selectMock.mock.restore();
    runtimeFlags.useAppModulesRuntime = originalRuntime;
    runtimeFlags.useModuleDispatcherRoutes = originalDispatcher;
  }
});
