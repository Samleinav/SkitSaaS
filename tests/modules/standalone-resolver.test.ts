import assert from 'node:assert/strict';
import test from 'node:test';
import type { ComponentType } from 'react';
import { defineModule } from '../../lib/modules/manifest';
import {
  buildEnabledStandaloneHomeComponent,
  buildEnabledStandaloneNavItems,
  type ModuleRuntimeRow
} from '../../lib/modules/runtime';

test('buildEnabledStandaloneHomeComponent returns null when no enabled module registers it', () => {
  const manifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha'
    })
  ];
  const runtimeRows: ModuleRuntimeRow[] = [
    {
      moduleId: 'mod.alpha',
      status: 'enabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const standaloneHome = buildEnabledStandaloneHomeComponent({
    manifests,
    runtimeRows
  });
  assert.equal(standaloneHome, null);
});

test('buildEnabledStandaloneHomeComponent returns first enabled registered component', () => {
  const HomeAlpha: ComponentType<{ userId: number }> = () => null;
  const HomeBeta: ComponentType<{ userId: number }> = () => null;

  const manifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      standaloneHomeComponent: HomeAlpha
    }),
    defineModule({
      moduleId: 'mod.beta',
      version: '1.0.0',
      displayName: 'Beta',
      standaloneHomeComponent: HomeBeta
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

  const standaloneHome = buildEnabledStandaloneHomeComponent({
    manifests,
    runtimeRows
  });
  assert.equal(standaloneHome, HomeAlpha);
});

test('buildEnabledStandaloneNavItems merges and sorts standalone nav entries', async () => {
  const manifests = [
    defineModule({
      moduleId: 'mod.alpha',
      version: '1.0.0',
      displayName: 'Alpha',
      standaloneNavItems: [
        {
          id: 'alpha-two',
          href: '/dashboard/a-two',
          label: 'A Two',
          order: 20
        },
        {
          id: 'alpha-one',
          href: '/dashboard/a-one',
          label: 'A One',
          order: 10
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.beta',
      version: '1.0.0',
      displayName: 'Beta',
      standaloneNavItems: async (userId: number) => [
        {
          id: `beta-${userId}`,
          href: `/dashboard/b-${userId}`,
          label: 'B One',
          order: 15
        }
      ]
    }),
    defineModule({
      moduleId: 'mod.gamma',
      version: '1.0.0',
      displayName: 'Gamma',
      standaloneNavItems: [
        {
          id: 'gamma',
          href: '/dashboard/gamma',
          label: 'Gamma',
          order: 1
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
      status: 'disabled',
      version: '1.0.0',
      installMode: 'plugin'
    }
  ];

  const items = await buildEnabledStandaloneNavItems({
    manifests,
    runtimeRows,
    userId: 42
  });

  assert.deepEqual(
    items.map((item) => item.href),
    ['/dashboard/a-one', '/dashboard/b-42', '/dashboard/a-two']
  );
});
